import uuid
import random
import time
from typing import Optional
from app.db.fake_db import USERS
from app.services import blockchain_service

# Temporary OTP store: { phone: {"otp": ..., "ts": ...} }
_OTP_STORE = {}


# =========================
# Digital ID generation
# =========================
def generate_digital_id(subject_id: Optional[str] = None, ipfs_cid: Optional[str] = None) -> str:
    """
    Generate a Digital ID for a user.
    - If blockchain inputs are provided, anchor an attestation and return the tx hash.
    - Otherwise, fallback to a UUID (legacy mode).
    """
    if subject_id and ipfs_cid:
        try:
            tx_hash = blockchain_service.register_kyc_attestation_on_chain(
                subject_id=subject_id,
                ipfs_cid=ipfs_cid,
                metadata={"generated_by": "id_service"}
            )
            if tx_hash:
                return tx_hash  # tx hash as Digital ID
        except Exception as e:
            print(f"[WARN] Blockchain anchoring failed, using fallback: {e}")

    # fallback if no blockchain or tx failed
    return f"DID-{uuid.uuid4().hex[:12].upper()}"


# =========================
# OTP Handling
# =========================
def ensure_user(phone: str):
    """Make sure user record exists in USERS fake DB."""
    USERS.setdefault(
        phone,
        {"phone": phone, "state": "NEW", "kyc": None, "digital_id": None},
    )


def generate_otp(phone: str) -> str:
    """Generate and store OTP for a phone number."""
    ensure_user(phone)
    otp = str(random.randint(100000, 999999))
    _OTP_STORE[phone] = {"otp": otp, "ts": time.time()}
    print(f"[DEV] OTP for {phone}: {otp}")  # TODO: replace with SMS API
    return otp


def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP for a phone number with 5-minute expiry."""
    data = _OTP_STORE.get(phone)
    if not data:
        return False

    if time.time() - data["ts"] > 300:  # 5 min expiry
        _OTP_STORE.pop(phone, None)
        return False

    if data["otp"] == otp:
        _OTP_STORE.pop(phone, None)
        ensure_user(phone)
        USERS[phone]["state"] = "OTP_VERIFIED"
        return True

    return False
