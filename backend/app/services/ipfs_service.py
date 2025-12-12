# simple IPFS uploader using either local IPFS HTTP API or Pinata (fallback)
import os
import requests
import json
from typing import Optional

IPFS_API_URL = os.getenv("IPFS_API_URL")  # e.g. http://127.0.0.1:5001/api/v0
# or Pinata creds
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET = os.getenv("PINATA_SECRET")

def upload_bytes_to_ipfs(b: bytes, filename: str = "blob.dat") -> str:
    """
    Upload bytes to IPFS; return CID string.
    Tries local IPFS HTTP API first, then Pinata if configured.
    """
    if IPFS_API_URL:
        try:
            url = f"{IPFS_API_URL}/add"
            files = {'file': (filename, b)}
            r = requests.post(url, files=files, timeout=20)
            r.raise_for_status()
            data = r.json()
            # 'Hash' key contains the CID
            return data.get("Hash") or data.get("hash")
        except Exception:
            # fall through to pinata
            pass

    if PINATA_API_KEY and PINATA_SECRET:
        url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET,
        }
        # send multipart
        files = {"file": (filename, b)}
        r = requests.post(url, files=files, headers=headers, timeout=30)
        r.raise_for_status()
        j = r.json()
        return j["IpfsHash"]

    raise RuntimeError("No IPFS backend configured or upload failed")
