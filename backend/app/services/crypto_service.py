import os
import base64
import logging
from typing import Optional, Tuple

from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.PublicKey import RSA
from Crypto.Random import get_random_bytes

logger = logging.getLogger(__name__)


def generate_aes_key(length: int = 32) -> bytes:
    """Return random AES key (default 256-bit)."""
    return get_random_bytes(length)

def aes_encrypt(plaintext: bytes, key: bytes) -> Tuple[bytes, bytes]:
    """
    AES-GCM encrypt.
    Returns (nonce, ciphertext_with_tag).
    """
    # 12 byte nonce standard for GCM
    nonce = get_random_bytes(12)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ct, tag = cipher.encrypt_and_digest(plaintext)
    # store ciphertext + tag together (client expects "ciphertext bytes (with tag)")
    return nonce, ct + tag

def aes_decrypt(nonce: bytes, ciphertext_with_tag: bytes, key: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    # split tag (last 16 bytes)
    ct, tag = ciphertext_with_tag[:-16], ciphertext_with_tag[-16:]
    return cipher.decrypt_and_verify(ct, tag)

# app/services/crypto_service.py


logger = logging.getLogger(__name__)

def _load_server_public_pem() -> Optional[bytes]:
    """
    Try, in order:
      1) SERVER_PUBLIC_KEY_PATH -> read PEM file from filesystem
      2) SERVER_PUBLIC_KEY_PEM  -> PEM contents stored in env var
    Return bytes or None.
    """
    path = os.getenv("SERVER_PUBLIC_KEY_PATH")
    if path:
        try:
            with open(path, "rb") as fh:
                data = fh.read()
                logger.info("Loaded server public key from path: %s", path)
                return data
        except Exception as e:
            logger.exception("Failed to read SERVER_PUBLIC_KEY_PATH=%s: %s", path, e)

    # fallback: inline PEM content (may be broken if newlines lost)
    inline = os.getenv("SERVER_PUBLIC_KEY_PEM")
    if inline:
        # if it's a single-line with literal \n sequences, convert them
        if "\\n" in inline and not inline.startswith("-----"):
            inline = inline.replace("\\n", "\n")
        try:
            return inline.encode("utf-8")
        except Exception:
            logger.exception("Failed to encode SERVER_PUBLIC_KEY_PEM")
    return None

def encrypt_sym_key_with_rsa(sym_key_bytes: bytes) -> bytes:
    """
    Encrypt (wrap) the symmetric AES key using server RSA public key.
    Reads key from SERVER_PUBLIC_KEY_PATH or SERVER_PUBLIC_KEY_PEM.
    Returns encrypted bytes.
    Raises RuntimeError if no valid key.
    """
    server_pub = _load_server_public_pem()
    if not server_pub:
        raise RuntimeError("Server public key not found (SERVER_PUBLIC_KEY_PATH or SERVER_PUBLIC_KEY_PEM)")

    try:
        pub = RSA.import_key(server_pub)
    except Exception as e:
        logger.exception("RSA.import_key failed for server public key")
        raise RuntimeError(f"Failed to import server public key: {e}") from e

    cipher = PKCS1_OAEP.new(pub)
    try:
        enc = cipher.encrypt(sym_key_bytes)
        return enc
    except Exception as e:
        logger.exception("RSA encryption failed")
        raise RuntimeError(f"Failed to encrypt symmetric key with RSA: {e}") from e

