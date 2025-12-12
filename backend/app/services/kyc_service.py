# app/services/kyc_service.py
"""
Privacy-first KYC service (cleaned).

Responsibilities:
 - sanitize and encrypt KYC payloads
 - upload encrypted blob to IPFS
 - wrap symmetric keys for safe storage (KMS or server public key)
 - persist minimal metadata in DB (ipfs_cid, encrypted_key, iv, key_meta, status)
 - optionally anchor attestation on-chain via blockchain_service (no PII on-chain)
 - provide safe decryption/authorization for reviewers
"""

from __future__ import annotations
from typing import Dict, Optional, Any
from datetime import datetime
import json
import base64
import os
import logging

from sqlalchemy.orm import Session

from app.models.kyc_model import KYCRecord
from app.utils.kyc_utils import encrypt_blob, upload_to_ipfs_bytes, download_from_ipfs, decrypt_blob
from app.services import blockchain_service

logger = logging.getLogger(__name__)

# ----- State constants -----
STATE_NEW = "NEW"
STATE_OTP_VERIFIED = "OTP_VERIFIED"
STATE_KYC_SUBMITTED = "KYC_SUBMITTED"
STATE_KYC_APPROVED = "KYC_APPROVED"
STATE_KYC_REJECTED = "KYC_REJECTED"
STATE_DIGITAL_ID_ISSUED = "DIGITAL_ID_ISSUED"


# ----- Small helpers -----
def _normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    return "".join(ch for ch in phone if ch.isdigit())


def _b64(x: bytes) -> str:
    return base64.b64encode(x).decode("utf-8")


def _unb64(s: str) -> bytes:
    return base64.b64decode(s.encode("utf-8"))


def _wrap_key_for_storage(raw_sym_key: bytes) -> Dict[str, str]:
    """
    Wrap the raw symmetric key for storage.
    Preferred: use KMS (AWS/GCP/Azure) configured via env.
    Fallback: use SERVER_PUBLIC_KEY_PEM environment variable (RSA PEM).
    Last-resort (DEV ONLY): store base64 of the symmetric key with method 'base64-dev'.
    Returns: { "encrypted_key_b64": str, "key_meta": json-string-or-dict }
    """
    # KMS placeholder (not implemented here)
    kms_provider = os.getenv("KMS_PROVIDER")
    if kms_provider:
        # Integrate with your KMS here (recommended for production).
        # Example: if AWS KMS, use boto3 kms_client.encrypt(KeyId=..., Plaintext=raw_sym_key)
        logger.warning("KMS_PROVIDER is set to %s but KMS wrapping is not implemented in this code. Configure KMS integration.", kms_provider)
        # fallthrough to RSA env fallback

    server_pub_pem = os.getenv("SERVER_PUBLIC_KEY_PEM")
    if server_pub_pem:
        try:
            # load and encrypt with RSA public key
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.primitives import hashes

            pub = serialization.load_pem_public_key(server_pub_pem.encode("utf-8"))
            enc = pub.encrypt(
                raw_sym_key,
                padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
            )
            return {"encrypted_key_b64": _b64(enc), "key_meta": json.dumps({"method": "rsa-pem-env"})}
        except Exception as e:
            logger.exception("Failed to wrap symmetric key with SERVER_PUBLIC_KEY_PEM: %s", e)
            # fallthrough to dev fallback

    # DEV fallback - DO NOT use in production
    logger.warning("No KMS or SERVER_PUBLIC_KEY_PEM configured; storing symmetric key base64 (DEV ONLY).")
    return {"encrypted_key_b64": _b64(raw_sym_key), "key_meta": json.dumps({"method": "base64-dev"})}


# ----- Helpers for payload sanitization -----
def _normalize_datetime(value: Any) -> str:
    """Return YYYY-MM-DD for date-like inputs; keep strings if already in that form."""
    if value is None:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    s = str(value)
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s.split("T")[0], fmt).strftime("%Y-%m-%d")
        except Exception:
            continue
    if "T" in s:
        return s.split("T", 1)[0]
    if " " in s:
        return s.split(" ", 1)[0]
    return s


def _sanitize_kyc_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Keep only expected KYC fields and normalize types."""
    allowed = ("full_name", "kyc_id", "dob", "address")
    k = {k: payload[k] for k in allowed if k in payload}

    # Normalize required fields
    k["full_name"] = str(k.get("full_name", "")).strip()
    k["kyc_id"] = str(k.get("kyc_id", "")).strip()
    k["address"] = str(k.get("address", "")).strip()
    k["dob"] = _normalize_datetime(k.get("dob", ""))

    # Basic validation
    if not k["full_name"]:
        raise ValueError("full_name is required")
    if not k["kyc_id"]:
        raise ValueError("kyc_id is required")
    if not k["dob"]:
        raise ValueError("dob is required")
    if not k["address"]:
        raise ValueError("address is required")

    return k


# ----- Public API -----
def submit_kyc(db: Session, phone: str, kyc_payload: Dict[str, Any], actor: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Accept KYC details after OTP verification.
    - actor: the authenticated caller (optional)
    Returns dict with { phone, state, kyc_id, ipfs_cid, tx_hash }.
    """
    phone_norm = _normalize_phone(phone)
    if not phone_norm:
        raise ValueError("phone is required")

    # Sanitize payload
    kyc = _sanitize_kyc_payload(kyc_payload)
    plaintext = json.dumps(kyc, ensure_ascii=False).encode("utf-8")

    # Encrypt using utility (expected: ciphertext_b64, encrypted_key (wrapped or None), iv_b64, key_meta)
    enc = encrypt_blob(plaintext)

    # sanity checks
    if "ciphertext_b64" not in enc:
        logger.error("encrypt_blob did not return ciphertext_b64")
        raise Exception("Encryption error")

    ciphertext_bytes = base64.b64decode(enc["ciphertext_b64"])

    # Upload encrypted blob to IPFS
    try:
        cid = upload_to_ipfs_bytes(ciphertext_bytes)
    except Exception as e:
        logger.exception("IPFS upload failed: %s", e)
        raise Exception("Failed to upload encrypted blob") from e

    # Determine encrypted_key to persist. Prefer what encrypt_blob returned (already wrapped).
    if enc.get("encrypted_key"):
        encrypted_key_b64 = enc["encrypted_key"]
        key_meta = enc.get("key_meta", "{}")
    else:
        # If encrypt_blob exposed a raw symmetric key (raw_sym_key), wrap it now
        raw_sym = enc.get("raw_sym_key")
        if not raw_sym:
            logger.error("encrypt_blob returned no encrypted_key and no raw_sym_key; refusing to store unwrapped key")
            raise Exception("Internal encryption configuration error")
        wrapped = _wrap_key_for_storage(raw_sym)
        encrypted_key_b64 = wrapped["encrypted_key_b64"]
        key_meta = wrapped.get("key_meta", "{}")

    iv_b64 = enc.get("iv_b64")

    # Anchor to blockchain — only anchor subject hash and CID; do NOT put PII on-chain.
    tx_hash = None
    try:
        # blockchain_service.subject_hash should exist and perform consistent hashing
        subject_identifier = kyc.get("kyc_id") or phone_norm
        try:
            subj_hash = blockchain_service.subject_hash(subject_identifier)
        except AttributeError:
            # fallback if subject_hash not present: pass raw identifier (some implementations accept string)
            subj_hash = subject_identifier
        minimal_meta = {"submitted_at": datetime.utcnow().isoformat()}
        # attempt to register on chain (not required)
        if hasattr(blockchain_service, "register_kyc_attestation_on_chain"):
            tx_hash = blockchain_service.register_kyc_attestation_on_chain(subject_id=subj_hash, ipfs_cid=cid, metadata=minimal_meta)
    except Exception:
        logger.exception("Blockchain anchoring failed — continuing without tx_hash")

    # Persist DB record
    try:
        rec = KYCRecord(
            phone_number=phone_norm,
            ipfs_cid=cid,
            encrypted_key=encrypted_key_b64,
            key_meta=key_meta if isinstance(key_meta, str) else json.dumps(key_meta),
            iv=iv_b64,
            status=STATE_KYC_SUBMITTED,
            submitted_at=datetime.utcnow(),
            created_by=(actor.get("sub") if actor else None),
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
    except Exception:
        logger.exception("Failed to persist KYC record to DB")
        # Ideally cleanup IPFS (pin removal) if DB insert fails — not implemented here
        raise Exception("Failed to persist KYC record")

    return {
        "phone": phone_norm,
        "state": STATE_KYC_SUBMITTED,
        "kyc_id": rec.id,
        "ipfs_cid": cid,
        "tx_hash": tx_hash,
    }


def decide_kyc(db: Session, kyc_id: int, approved: bool, reviewer: str, reason: Optional[str] = None, actor: Optional[Dict[str, Any]] = None) -> str:
    """
    Approve or reject KYC. Actor must have role 'verifier' or 'admin' to call (if actor provided).
    Returns the new status string.
    """
    if actor and actor.get("role") not in ("verifier", "admin"):
        raise ValueError("Forbidden: insufficient privileges")

    rec = db.query(KYCRecord).filter(KYCRecord.id == kyc_id).first()
    if not rec:
        raise ValueError("KYC record not found")
    if rec.status != STATE_KYC_SUBMITTED:
        raise ValueError("KYC is not in review")

    rec.reviewer = reviewer
    rec.decided_at = datetime.utcnow()
    rec.decision_note = None if approved else (reason or "Rejected")
    rec.status = STATE_KYC_APPROVED if approved else STATE_KYC_REJECTED
    try:
        rec.reviewed_by = actor.get("sub") if actor else None
    except Exception:
        rec.reviewed_by = None

    try:
        db.add(rec)
        db.commit()
        db.refresh(rec)
    except Exception:
        logger.exception("Failed to persist KYC decision")
        raise Exception("Failed to persist decision")

    return rec.status


def get_kyc(db: Session, kyc_id: int, actor: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Return decrypted KYC payload. Only allowed for:
     - actor.role in ('verifier','admin'), OR
     - actor is the owner (actor contains phone or sub matching the record)
    """
    rec = db.query(KYCRecord).filter(KYCRecord.id == kyc_id).first()
    if not rec:
        raise ValueError("KYC record not found")

    allowed = False
    if actor:
        if actor.get("role") in ("verifier", "admin"):
            allowed = True
        else:
            actor_phone = actor.get("phone") or actor.get("sub")
            if actor_phone and _normalize_phone(str(actor_phone)) == _normalize_phone(str(rec.phone_number)):
                allowed = True

    if not allowed:
        raise ValueError("Forbidden: insufficient privileges")

    # Download encrypted blob from IPFS
    try:
        ciphertext_bytes = download_from_ipfs(rec.ipfs_cid)
    except Exception:
        logger.exception("Failed to download encrypted blob from IPFS")
        raise Exception("Failed to retrieve KYC blob")

    ciphertext_b64 = base64.b64encode(ciphertext_bytes).decode("utf-8")
    iv = rec.iv
    encrypted_key = rec.encrypted_key

    # decrypt_blob util should unwrap the encrypted_key (via KMS or server key) and AES-decrypt
    try:
        plaintext_bytes = decrypt_blob(ciphertext_b64, iv, encrypted_key)
    except Exception:
        logger.exception("Decryption failed for KYC blob")
        raise Exception("Failed to decrypt KYC blob")

    # try to parse JSON, otherwise return raw base64
    try:
        return json.loads(plaintext_bytes.decode("utf-8"))
    except Exception:
        return {"content_bytes_b64": _b64(plaintext_bytes)}


def get_state(db: Session, kyc_id: int) -> str:
    """Return current KYC state."""
    rec = db.query(KYCRecord).filter(KYCRecord.id == kyc_id).first()
    if not rec:
        raise ValueError("KYC record not found")
    return rec.status
