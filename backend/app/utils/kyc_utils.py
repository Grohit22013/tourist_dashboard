# app/utils/kyc_utils.py
"""
Encryption + IPFS helpers.

DEV MODE (default): Use KYC_MASTER_KEY_BASE64 env var to derive a dev envelope.
PROD MODE: Set KYC_USE_KMS=true and implement KMS calls in kms_* placeholders.
"""

import os
import base64
import json
import secrets
import requests
import typing
import logging

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

KYC_USE_KMS = os.getenv("KYC_USE_KMS", "false").lower() == "true"
KYC_MASTER_KEY_BASE64 = os.getenv("KYC_MASTER_KEY_BASE64")  # dev-only: base64 32 bytes
IPFS_API_URL = os.getenv("IPFS_API_URL", "http://127.0.0.1:5001/api/v0")
IPFS_PIN_SERVICE = os.getenv("IPFS_PIN_SERVICE")  # optional: nft.storage key or pinata key

def _derive_dev_master_key() -> bytes:
    if not KYC_MASTER_KEY_BASE64:
        raise RuntimeError("KYC_MASTER_KEY_BASE64 is required in dev mode")
    return base64.b64decode(KYC_MASTER_KEY_BASE64)

def encrypt_blob(plaintext_bytes: bytes) -> dict:
    """
    Encrypt plaintext bytes with a random AES-256-GCM key.
    Returns dict with:
      - ciphertext_b64
      - iv_b64
      - encrypted_key (base64 envelope)
      - key_meta (dict)
    """
    # 1) generate random data key
    data_key = secrets.token_bytes(32)  # AES-256
    aesgcm = AESGCM(data_key)
    iv = secrets.token_bytes(12)
    ciphertext = aesgcm.encrypt(iv, plaintext_bytes, None)  # ciphertext includes tag
    ciphertext_b64 = base64.b64encode(ciphertext).decode("utf-8")
    iv_b64 = base64.b64encode(iv).decode("utf-8")

    # 2) envelope encrypted key
    if KYC_USE_KMS:
        # TODO: integrate KMS SDK to generate an encrypted data key
        # Example placeholder (must be replaced with actual KMS calls):
        # encrypted_key_blob = kms_generate_data_key_and_encrypt(data_key)
        raise NotImplementedError("KMS mode is enabled but no KMS implementation is provided.")
    else:
        # DEV: simple insecure envelope: XOR data_key with master key (dev only)
        mk = _derive_dev_master_key()
        if len(mk) < len(data_key):
            raise RuntimeError("Master key must be at least 32 bytes for dev mode")
        enc = bytes(a ^ b for a, b in zip(data_key, mk[:len(data_key)]))
        encrypted_key_blob = base64.b64encode(enc).decode("utf-8")
        key_meta = {"mode": "dev", "note": "dev-envelope-xor-not-for-prod"}

    return {
        "ciphertext_b64": ciphertext_b64,
        "iv_b64": iv_b64,
        "encrypted_key": encrypted_key_blob,
        "key_meta": key_meta,
    }

def decrypt_blob(ciphertext_b64: str, iv_b64: str, encrypted_key_blob: str) -> bytes:
    """
    Reverse encrypt_blob (dev-mode) and return plaintext bytes.
    """
    if KYC_USE_KMS:
        # TODO: call KMS to decrypt encrypted_key_blob -> data_key
        raise NotImplementedError("KMS decrypt not implemented")
    else:
        mk = _derive_dev_master_key()
        enc = base64.b64decode(encrypted_key_blob)
        data_key = bytes(a ^ b for a, b in zip(enc, mk[:len(enc)]))
    ciphertext = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    aesgcm = AESGCM(data_key)
    plaintext = aesgcm.decrypt(iv, ciphertext, None)
    return plaintext

# -------- IPFS helpers --------
def upload_to_ipfs_bytes(bytes_data: bytes) -> str:
    """
    Upload bytes to IPFS and return CID.
    Uses NFT.Storage if IPFS_PIN_SERVICE provided; else tries local IPFS daemon.
    """
    if IPFS_PIN_SERVICE:
        # nft.storage upload endpoint
        headers = {"Authorization": f"Bearer {IPFS_PIN_SERVICE}"}
        files = {"file": ("kyc_blob.enc", bytes_data)}
        resp = requests.post("https://api.nft.storage/upload", headers=headers, files=files, timeout=60)
        resp.raise_for_status()
        j = resp.json()
        # nft.storage returns { "ok": true, "value": { "cid": "...", ... } } in some clients or { "value": { "cid": "..." } }
        cid = None
        if isinstance(j, dict):
            v = j.get("value") or j.get("data") or j
            if isinstance(v, dict):
                cid = v.get("cid") or v.get("Hash")
        if not cid:
            # try nested patterns
            try:
                cid = j["value"]["cid"]
            except Exception:
                pass
        if not cid:
            raise RuntimeError("Unexpected nft.storage response: %s" % j)
        logger.info("Uploaded encrypted KYC to nft.storage cid=%s", cid)
        return cid

    # Local IPFS daemon (/api/v0/add)
    files = {"file": ("kyc_blob.enc", bytes_data)}
    resp = requests.post(f"{IPFS_API_URL}/add", files=files, timeout=60)
    resp.raise_for_status()

    # Some IPFS daemon responses are JSON objects, some are newline-delimited JSON strings.
    try:
        j = resp.json()
    except ValueError:
        # attempt to parse line-delimited json
        text = resp.text.strip()
        # take last non-empty line
        last = None
        for line in text.splitlines():
            line = line.strip()
            if line:
                last = line
        if last:
            try:
                j = json.loads(last)
            except Exception:
                j = None
        else:
            j = None

    cid = None
    if isinstance(j, dict):
        cid = j.get("Hash") or j.get("hash") or j.get("Id")
    elif isinstance(j, list) and j:
        cid = j[0].get("Hash") or j[0].get("hash")
    if not cid:
        raise RuntimeError("Unexpected IPFS response from /add: %s" % (j or resp.text))
    logger.info("Uploaded encrypted KYC to local IPFS cid=%s", cid)
    return cid


def download_from_ipfs(cid: str) -> bytes:
    """
    Download raw bytes from IPFS. For nft.storage, try gateway endpoints; otherwise call local IPFS /cat.
    """
    if IPFS_PIN_SERVICE:
        # Try nft.storage gateway and public gateways as fallback
        gateways = [
            f"https://{cid}.ipfs.dweb.link",
            f"https://{cid}.ipfs.nftstorage.link",
            f"https://ipfs.io/ipfs/{cid}",
        ]
        last_err = None
        for url in gateways:
            try:
                resp = requests.get(url, timeout=30)
                resp.raise_for_status()
                return resp.content
            except Exception as e:
                last_err = e
                continue
        raise RuntimeError(f"Failed to fetch CID {cid} from nft.storage/public gateways: {last_err}")

    # Local IPFS daemon: prefer GET /cat?arg={cid}
    try:
        resp = requests.get(f"{IPFS_API_URL}/cat", params={"arg": cid}, timeout=60)
        resp.raise_for_status()
        return resp.content
    except Exception:
        # Fallback to POST (older clients might accept it)
        resp = requests.post(f"{IPFS_API_URL}/cat?arg={cid}", timeout=60)
        resp.raise_for_status()
        return resp.content
