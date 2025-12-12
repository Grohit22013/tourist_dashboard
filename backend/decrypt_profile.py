import sqlite3, json, base64, requests, argparse
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def get_profile(db_path, phone):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT profile FROM users WHERE phone_number = ?", (phone,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise ValueError("No user with phone " + phone)
    prof = row["profile"]
    return json.loads(prof) if isinstance(prof, str) else prof

def fetch_ipfs_blob(cid, gateway):
    url = gateway.rstrip("/") + "/" + cid
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    return r.content

def unwrap_key(privkey_path, enc_key_b64):
    enc = base64.b64decode(enc_key_b64)
    with open(privkey_path, "rb") as f:
        priv = serialization.load_pem_private_key(f.read(), password=None)
    return priv.decrypt(enc, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--phone", required=True)
    p.add_argument("--privkey", required=False, help="Path to server private PEM")
    p.add_argument("--ipfs", default="http://127.0.0.1:8080/ipfs")
    args = p.parse_args()

    profile = get_profile(args.db, args.phone)
    print("Profile pointer from DB:", json.dumps(profile, indent=2))

    cid = profile["ipfs_cid"]
    enc_key_b64 = profile["encrypted_key_b64"]
    iv_b64 = profile["iv_b64"]

    blob = fetch_ipfs_blob(cid, args.ipfs)
    print(f"Fetched {len(blob)} bytes from IPFS")

    # unwrap symmetric key
    method = profile.get("key_meta", {}).get("method")
    if method == "rsa-server-pem" and args.privkey:
        sym_key = unwrap_key(args.privkey, enc_key_b64)
    else:
        # dev fallback
        sym_key = base64.b64decode(enc_key_b64)

    nonce = base64.b64decode(iv_b64)
    ciphertext = blob if not blob.startswith(nonce) else blob[len(nonce):]

    aesgcm = AESGCM(sym_key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)

    print("\n=== Decrypted JSON ===")
    print(json.dumps(json.loads(plaintext.decode()), indent=2))
