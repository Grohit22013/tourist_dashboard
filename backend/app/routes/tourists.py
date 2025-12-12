"""
Tourists router with SQLite persistence + encryption-on-register.

Behavior:
 - /register: accepts optional detailed `itinerary` (list of date/location/activity),
   includes itinerary in profile_plain, encrypts profile (AES-GCM), uploads encrypted blob to IPFS,
   wraps AES key with server RSA public key (if provided), and stores only the
   IPFS CID + wrapped key + iv + key_meta in the user's profile JSON.
 - KYC flow (/kyc/submit) remains delegated to kyc_service (which already encrypts).
 - Blockchain anchoring is attempted but non-blocking (failure -> pending state).
"""

import datetime
import json
import os
import re
import base64
import logging
from typing import Optional, Dict, Any, List

from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    Request,
    Query,
    BackgroundTasks,
)
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Services (existing)
from app.models.request_models import (
    OTPRequest,
    OTPVerifyRequest,
    KYCSubmitRequest,
    KYCDecisionRequest,
)
from app.models.response_models import (
    TouristResponse,
    BasicMessage,
    RegistrationStatus,
)
from app.services.blockchain_service import register_tourist_on_chain
from app.services.id_service import generate_otp, verify_otp as svc_verify_otp
from app.services.kyc_service import submit_kyc, decide_kyc
from app.services.digital_id_service import issue_digital_id

# Encryption & IPFS services (must exist)
from app.services import crypto_service
from app.services import ipfs_service

# Shared models
from app.models.tourist_models import Base, User, Itinerary

logger = logging.getLogger(__name__)

# Database (SQLAlchemy)
DATABASE_URL = os.getenv("TOURIST_DATABASE_URL", "sqlite:///./tourists.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# create tables if not exists
Base.metadata.create_all(bind=engine)


def _anchor_user_on_chain(user_id: int, payload_for_chain: Dict[str, Any]):
    """
    Background worker: attempt to send register_tourist_on_chain and persist tx hash or mark pending.
    Creates its own DB session.
    """
    db = SessionLocal()
    try:
        try:
            tx_hash = register_tourist_on_chain(payload_for_chain)
        except Exception as e:
            logger.exception("Blockchain anchoring failed for user_id=%s", user_id)
            # persist pending state
            u = db.query(User).get(user_id)
            if u:
                u.state = "registered_pending_onchain"
                # keep a marker in receipt to indicate last error
                u.receipt = {"onchain_error": str(e)}
                db.add(u)
                db.commit()
            return

        # on success, update user
        u = db.query(User).get(user_id)
        if u:
            u.did = tx_hash
            u.state = "registered_onchain"
            # optionally store a minimal receipt-like object
            u.receipt = {
                "txHash": tx_hash,
                "anchored_at": datetime.datetime.utcnow().isoformat(),
            }
            db.add(u)
            db.commit()
    except Exception:
        logger.exception(
            "Error while persisting on-chain result for user_id=%s", user_id
        )
    finally:
        db.close()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


router = APIRouter()

# -----------------------
# Helpers
# -----------------------


def normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    return re.sub(r"\D+", "", str(phone))


def _first_non_empty(*vals):
    for v in vals:
        if v is not None and (not (isinstance(v, str) and v.strip() == "")):
            return v
    return None


def _extract_emergency_phone(payload):
    ep = _first_non_empty(
        payload.get("emergencyPhone"),
        payload.get("emergency_phone"),
        payload.get("emergencyContact"),
    )
    if ep:
        return str(ep)
    arr = (
        payload.get("emergency_contacts")
        or payload.get("emergencyContacts")
        or payload.get("emergency_contact")
    )
    if isinstance(arr, (list, tuple)):
        for item in arr:
            if isinstance(item, dict):
                v = _first_non_empty(
                    item.get("value"), item.get("phone"), item.get("contact")
                )
                if v:
                    return str(v)
    return None


def _wrap_sym_key_for_storage(sym_key_bytes: bytes) -> (str, str):
    """
    Wrap the AES symmetric key for storage. Prefer server RSA public key (SERVER_PUBLIC_KEY_PATH or SERVER_PUBLIC_KEY_PEM),
    fallback to base64 (DEV ONLY). Returns (encrypted_key_b64, key_meta_json_str).
    """
    # prefer path -> crypto_service knows how to load
    try:
        enc = crypto_service.encrypt_sym_key_with_rsa(sym_key_bytes)
        return base64.b64encode(enc).decode("utf-8"), json.dumps(
            {"method": "rsa-server-pem"}
        )
    except Exception:
        # log and fall back
        logger.exception(
            "Failed to wrap symmetric key with server public key (fall back to base64-dev)"
        )
    # DEV fallback - DO NOT use in production
    logger.warning(
        "SERVER public key not configured or wrapping failed — storing sym key base64 (DEV only)"
    )
    return base64.b64encode(sym_key_bytes).decode("utf-8"), json.dumps(
        {"method": "base64-dev"}
    )


from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP


def rewrap_key_for_grantee(
    stored_encrypted_key_b64: str, grantee_pubkey_pem: str, key_meta: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Rewrap a stored wrapped-sym-key so a third party (grantee) can decrypt the profile.
    - stored_encrypted_key_b64: the encrypted symmetric key currently stored (wrapped to server)
    - grantee_pubkey_pem: PEM string of grantee's RSA public key
    - key_meta: metadata about how the stored key is wrapped (method)
    Returns dict with {'encrypted_for_grantee_b64':..., 'grantee_meta': {...}}
    NOTE: this function assumes the server can unwrap the stored key (i.e., it has server private key or KMS access).
    """
    # 1) Unwrap the stored key (server must be able to)
    method = key_meta.get("method")
    if method == "rsa-server-pem":
        # server must have PRIVATE_KEY_PEM in env to decrypt
        server_priv_pem = os.getenv("SERVER_PRIVATE_KEY_PEM")
        if not server_priv_pem:
            raise RuntimeError("SERVER_PRIVATE_KEY_PEM required to rewrap for grantee")
        # decode stored and decrypt
        wrapped_bytes = base64.b64decode(stored_encrypted_key_b64)
        server_priv = RSA.import_key(server_priv_pem.encode("utf-8"))
        dec_cipher = PKCS1_OAEP.new(server_priv)
        sym_key = dec_cipher.decrypt(wrapped_bytes)
    elif method == "kms":
        # If wrapped with KMS, call crypto_service.kms_unwrap to get plaintext (must be implemented)
        sym_key = crypto_service.kms_unwrap(stored_encrypted_key_b64, key_meta)
    elif method == "base64-dev":
        # DEVELOPMENT ONLY: base64 encoded raw key
        sym_key = base64.b64decode(stored_encrypted_key_b64)
    else:
        raise RuntimeError(f"Unknown key wrap method: {method}")

    # 2) Wrap sym_key with grantee's public key
    gr_pub = RSA.import_key(grantee_pubkey_pem.encode("utf-8"))
    wrap_cipher = PKCS1_OAEP.new(gr_pub)
    enc_for_grantee = wrap_cipher.encrypt(sym_key)
    return {
        "encrypted_for_grantee_b64": base64.b64encode(enc_for_grantee).decode("utf-8"),
        "grantee_meta": {"method": "rsa-grantee-pem"},
    }


# itinerary validation constants
MAX_ITINERARY_ITEMS = int(os.getenv("MAX_ITINERARY_ITEMS", "50"))
MAX_PROFILE_BYTES = int(
    os.getenv("MAX_PROFILE_BYTES", str(50 * 1024))
)  # 50 KB default


def _validate_itinerary(itinerary: Any) -> List[Dict[str, str]]:
    """
    Validates itinerary is a list of small objects with keys: date, location, activity.
    Returns sanitized itinerary list (strings).
    Raises HTTPException on invalid input.
    """
    if itinerary is None:
        return []
    if not isinstance(itinerary, list):
        raise HTTPException(status_code=400, detail="itinerary must be a list")
    if len(itinerary) > MAX_ITINERARY_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"itinerary too long (max {MAX_ITINERARY_ITEMS})",
        )
    out = []
    for idx, item in enumerate(itinerary):
        if not isinstance(item, dict):
            raise HTTPException(
                status_code=400,
                detail=f"itinerary items must be objects (index {idx})",
            )
        date = _first_non_empty(item.get("date"), item.get("day"))
        location = _first_non_empty(item.get("location"), item.get("place"))
        activity = _first_non_empty(
            item.get("activity"), item.get("note"), item.get("description")
        )
        # basic sanitization
        date = str(date).strip() if date else ""
        location = str(location).strip() if location else ""
        activity = str(activity).strip() if activity else ""
        if not date or not location:
            raise HTTPException(
                status_code=400,
                detail=f"itinerary items require 'date' and 'location' (index {idx})",
            )
        # keep fields small
        if len(location) > 200 or len(activity) > 500:
            raise HTTPException(
                status_code=400,
                detail=f"itinerary item too large (index {idx})",
            )
        out.append({"date": date, "location": location, "activity": activity})
    return out


# -----------------------
# Register endpoint (encrypted profile stored in IPFS)
# -----------------------
class TouristRegisterRequest(BaseModel):
    phone_number: str
    full_name: str
    kyc_id: Optional[str]
    visitStart: str  # ISO date string
    visitEnd: str
    emergencyPhone: Optional[str]
    itinerary: Optional[List[Dict[str, str]]] = None


@router.post("/register", response_model=TouristResponse)
async def register_tourist_flexible(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Flexible register endpoint:
      - Accepts multiple key variants,
      - Accepts optional `itinerary` list which will be encrypted with the profile,
      - Encrypts profile (AES-GCM), uploads encrypted bytes to IPFS,
      - Wraps AES key (server RSA PEM or base64 dev),
      - Stores only ipfs pointer + wrapped key + iv in DB.profile,
      - Attempts blockchain anchoring (non-blocking; failure marks pending).
    """
    body_raw = await request.body()
    try:
        payload = await request.json()
    except Exception:
        try:
            payload = json.loads(
                body_raw.decode("utf-8") if isinstance(body_raw, bytes) else body_raw
            )
        except Exception:
            raise HTTPException(status_code=422, detail="Invalid JSON payload")

    # accept multiple key name variants
    phone_number = _first_non_empty(
        payload.get("phone_number"), payload.get("phone"), payload.get("mobile")
    )
    full_name = _first_non_empty(
        payload.get("full_name"), payload.get("fullName"), payload.get("name")
    )
    kyc_id = _first_non_empty(
        payload.get("kyc_id"), payload.get("kycId"), payload.get("kyc")
    )
    visit_start = _first_non_empty(
        payload.get("visitStart"),
        payload.get("visit_start"),
        payload.get("visit_start_date"),
        payload.get("visitStartDate"),
    )
    visit_end = _first_non_empty(
        payload.get("visitEnd"),
        payload.get("visit_end"),
        payload.get("visit_end_date"),
        payload.get("visitEndDate"),
    )
    emergency_phone = _extract_emergency_phone(payload)
    itinerary_raw = payload.get("itinerary")

    if not phone_number:
        raise HTTPException(
            status_code=422, detail="Missing required field: phone_number"
        )
    if not visit_start or not visit_end:
        raise HTTPException(
            status_code=422, detail="Missing required visitStart / visitEnd"
        )

    phone_norm = normalize_phone(phone_number)
    if not phone_norm:
        raise HTTPException(status_code=422, detail="Invalid phone number")

    # validate itinerary (if present)
    try:
        itinerary = _validate_itinerary(itinerary_raw)
    except HTTPException:
        raise  # forward validation error

    logger.info("validated itinerary count=%d for phone=%s", len(itinerary), phone_norm)

    # fetch or create user
    user = db.query(User).filter(User.phone_number == phone_norm).first()
    if not user:
        user = User(
            phone_number=phone_norm,
            state="unregistered",
            created_at=datetime.datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # update top-level fields
    if full_name:
        user.full_name = full_name
    if kyc_id:
        user.kyc_id = str(kyc_id)

    # build profile dict (sensitive) and encrypt it
    profile_plain: Dict[str, Any] = {
        "visitStart": str(visit_start),
        "visitEnd": str(visit_end),
    }
    if emergency_phone:
        profile_plain["emergencyPhone"] = normalize_phone(emergency_phone)
    if itinerary:
        profile_plain["itinerary"] = itinerary

    # small safety: prevent accidental huge profiles
    sample_profile_bytes = json.dumps(profile_plain, ensure_ascii=False).encode(
        "utf-8"
    )
    if len(sample_profile_bytes) > MAX_PROFILE_BYTES:
        raise HTTPException(status_code=400, detail="Profile too large")

    # Encrypt profile_plain using AES-GCM and upload to IPFS
    try:
        plaintext = json.dumps(profile_plain, ensure_ascii=False).encode("utf-8")
        sym_key = crypto_service.generate_aes_key()  # bytes
        nonce, ciphertext = crypto_service.aes_encrypt(
            plaintext, sym_key
        )  # nonce bytes, ciphertext bytes (with tag)
        blob = nonce + ciphertext  # store nonce (12 bytes) + ciphertext

        # upload to IPFS
        cid = ipfs_service.upload_bytes_to_ipfs(
            blob, filename=f"profile-{phone_norm}.enc"
        )

        # wrap sym key for storage
        encrypted_key_b64, key_meta = _wrap_sym_key_for_storage(sym_key)
        iv_b64 = base64.b64encode(nonce).decode("utf-8")

        # store pointer in DB.profile (do not store plaintext)
        user.profile = {
            "ipfs_cid": cid,
            "encrypted_key_b64": encrypted_key_b64,
            "iv_b64": iv_b64,
            "key_meta": json.loads(key_meta)
            if isinstance(key_meta, str)
            else key_meta,
        }
    except Exception:
        logger.exception("Failed to encrypt & store tourist profile for %s", phone_norm)
        raise HTTPException(
            status_code=500, detail="Failed to encrypt tourist profile"
        )

    # persist before chain call
    db.add(user)
    db.commit()
    db.refresh(user)

    # --- persist itinerary items into itineraries table (plaintext copy for quick query/analytics)
    # Only store if itinerary list is not empty
    if itinerary:
        logger.info("validated itinerary count=%d for phone=%s", len(itinerary), phone_norm)
        # clear any existing itinerary rows for this user (optional)
        try:
            db.query(Itinerary).filter(Itinerary.user_id == user.id).delete(
                synchronize_session=False
            )
        except Exception as e:
            logger.exception(
                "Error deleting existing itinerary rows (may not exist yet): %s", e
            )

        for item in itinerary:
            # item is {"date": "YYYY-MM-DD", "location": "...", "activity": "..."}
            # Parse date safely into DateTime
            try:
                date_str = str(item.get("date", "")).split("T")[0]
                dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
            except Exception:
                # fallback: use visitStart as date if parsing fails
                try:
                    dt = datetime.datetime.strptime(
                        str(visit_start).split("T")[0], "%Y-%m-%d"
                    )
                except Exception:
                    dt = datetime.datetime.utcnow()

            loc = item.get("location", "")[:256]
            act = item.get("activity") or None
            row = Itinerary(user_id=user.id, date=dt, location=loc, activity=act)
            db.add(row)
        db.commit()
        db.refresh(user)

    # schedule background on-chain anchoring (non-blocking)
    chain_payload = {
        "full_name": user.full_name or "",
        "kyc_id": user.kyc_id or "",
        "visitStart": profile_plain.get("visitStart"),
        "visitEnd": profile_plain.get("visitEnd"),
        # prefer storing IPFS CID instead of plaintext profile on-chain
        "ipfs_cid": (user.profile or {}).get("ipfs_cid"),
        # include phone or hashed identifier according to your privacy policy
        "phone": user.phone_number,
    }
    try:
        background_tasks.add_task(_anchor_user_on_chain, user.id, chain_payload)
    except Exception:
        logger.exception(
            "Failed to schedule background anchoring task for user_id=%s", user.id
        )
        # do not fail the request — we'll mark pending state
        user.state = "registered_pending_onchain"
        db.add(user)
        db.commit()
        db.refresh(user)

    # return minimal registration info
    return {
        "digital_id": user.did or "",
        "state": user.state,
        "phone_number": user.phone_number,
    }


# =========================
# OTP → KYC → Digital ID flow
# =========================
@router.post("/send-otp", response_model=BasicMessage)
async def send_otp(req: OTPRequest):
    try:
        generate_otp(req.phone_number)
        return {"message": "OTP sent"}
    except Exception:
        logger.exception("OTP error sending to %s", req.phone_number)
        raise HTTPException(status_code=500, detail="OTP error")


@router.post("/verify-otp", response_model=RegistrationStatus)
async def verify_otp_route(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    ok = svc_verify_otp(req.phone_number, req.otp)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    phone_norm = normalize_phone(req.phone_number)
    user = db.query(User).filter(User.phone_number == phone_norm).first()
    if not user:
        user = User(
            phone_number=phone_norm,
            state="unregistered",
            created_at=datetime.datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "phone_number": phone_norm,
        "state": user.state,
        "digital_id": user.did,
    }


@router.post("/kyc/submit", response_model=RegistrationStatus)
async def kyc_submit(req: KYCSubmitRequest, db: Session = Depends(get_db)):
    try:
        phone_norm = normalize_phone(req.phone_number)
        user = db.query(User).filter(User.phone_number == phone_norm).first()
        if not user:
            raise ValueError("User not found - verify OTP first")

        submit_kyc(db, phone_norm, req.dict(exclude={"phone_number"}))

        # optionally store a reference to the submitted KYC
        user.kyc_id = f"kyc:{phone_norm}:{int(datetime.datetime.utcnow().timestamp())}"
        user.state = "kyc_submitted"
        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "phone_number": phone_norm,
            "state": user.state,
            "digital_id": user.did,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("KYC submit error for %s", req.phone_number)
        raise HTTPException(status_code=500, detail="KYC submit error")


@router.post("/kyc/approve", response_model=RegistrationStatus)
async def kyc_approve(req: KYCDecisionRequest, db: Session = Depends(get_db)):
    try:
        phone_norm = normalize_phone(req.phone_number)
        user = db.query(User).filter(User.phone_number == phone_norm).first()
        if not user:
            raise ValueError("User not found")

        decide_kyc(db, user.kyc_id, req.approved, reviewer="admin")

        user.state = "kyc_approved" if req.approved else "kyc_rejected"
        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "phone_number": phone_norm,
            "state": user.state,
            "digital_id": user.did,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("KYC approval error for %s", req.phone_number)
        raise HTTPException(status_code=500, detail="KYC approval error")


# ========= Device binding + DID endpoints =========
class DeviceBindRequest(BaseModel):
    """
    Bind a hardware device (LoRa node) to a user.
    You can identify the user either by phone_number or by digital_id.
    """
    phone_number: Optional[str] = None
    digital_id: Optional[str] = None
    device_id: str
    device_type: Optional[str] = None


class DeviceProfileResponse(BaseModel):
    """
    Minimal profile for the device/gateway to display + a 'registered' flag.
    """
    digital_id: str
    is_registered: bool
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    state: str


from app.models.tourist_models import User  # make sure this import exists at the top!
# If you already import User from tourist_models somewhere, don't repeat it.

  # 👈 make sure this is near the top of the file


@router.post("/issue-digital-id-v2", response_model=RegistrationStatus)
async def issue_did_v2(payload: Dict[str, str], db: Session = Depends(get_db)):
    phone_number = payload.get("phone_number")
    device_id = payload.get("device_id")
    device_type = payload.get("device_type")

    try:
        phone_norm = normalize_phone(phone_number)
        if not phone_norm:
            raise HTTPException(status_code=400, detail="Invalid phone_number")

        user = db.query(User).filter(User.phone_number == phone_norm).first()
        if not user:
            user = User(phone_number=phone_norm, state="unregistered", created_at=datetime.datetime.utcnow())
            db.add(user)
            db.commit()
            db.refresh(user)

        if device_id:
            existing = db.query(User).filter(User.device_id == device_id).first()
            if existing and existing.id != user.id:
                raise HTTPException(status_code=400, detail="Device already bound to another user")

        # Strict blockchain ID issuance
        try:
            digital_id = issue_digital_id(phone_norm)
        except Exception:
            raise HTTPException(status_code=500, detail="Blockchain issuance failed")

        user.did = digital_id
        user.state = "registered"
        user.device_id = device_id
        user.device_type = device_type

        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "phone_number": phone_norm,
            "state": user.state,
            "digital_id": digital_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("DID issuance error (v2) for %s: %s", phone_number, e)
        raise HTTPException(status_code=500, detail="DID issuance error (v2)")


@router.post("/device/bind", response_model=RegistrationStatus)
async def bind_device(req: DeviceBindRequest, db: Session = Depends(get_db)):
    """
    Bind or re-bind a LoRa device to an existing user.

    Identify user by:
      - phone_number, or
      - digital_id (DID / tx hash)
    """
    if not req.phone_number and not req.digital_id:
        raise HTTPException(
            status_code=400, detail="phone_number or digital_id required"
        )

    # Find user either by phone or digital ID
    user: Optional[User] = None
    if req.phone_number:
        phone_norm = normalize_phone(req.phone_number)
        user = db.query(User).filter(User.phone_number == phone_norm).first()
    else:
        user = db.query(User).filter(User.did == req.digital_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure device_id is not used by another user
    existing = db.query(User).filter(User.device_id == req.device_id).first()
    if existing and existing.id != user.id:
        raise HTTPException(
            status_code=400, detail="Device already bound to another user"
        )

    user.device_id = req.device_id
    if req.device_type:
        user.device_type = req.device_type

    db.add(user)
    db.commit()
    db.refresh(user)

    phone_out = normalize_phone(user.phone_number)
    return {
        "phone_number": phone_out,
        "state": user.state,
        "digital_id": user.did,
    }


@router.get("/device/profile", response_model=DeviceProfileResponse)
async def device_profile(
    did: Optional[str] = Query(None, alias="digital_id"),
    device_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Endpoint for hardware devices / gateways.

    - If you know the DID:   /tourists/device/profile?digital_id=<DID>
    - Or by device_id:       /tourists/device/profile?device_id=<DEVICE_ID>

    Returns minimal user info + is_registered flag so the device
    can decide whether to trust and display the profile.
    """
    if not did and not device_id:
        raise HTTPException(status_code=400, detail="Provide digital_id or device_id")

    q = db.query(User)
    if did:
        user = q.filter(User.did == did).first()
    else:
        user = q.filter(User.device_id == device_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    registered_states = {
        "registered",
        "registered_onchain",
        "registered_pending_onchain",
        "kyc_approved",
    }
    is_registered = user.state in registered_states

    return DeviceProfileResponse(
        digital_id=user.did or "",
        is_registered=is_registered,
        full_name=user.full_name,
        phone_number=user.phone_number,
        state=user.state,
    )


@router.get("/status/{phone}", response_model=RegistrationStatus)
async def status(phone: str, db: Session = Depends(get_db)):
    phone_norm = normalize_phone(phone)
    user = db.query(User).filter(User.phone_number == phone_norm).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "phone_number": phone_norm,
        "state": user.state,
        "digital_id": user.did,
    }


# ----------------------
# Alerts & Locations
# ----------------------
alerts_router = APIRouter()
ALERTS: List[Dict[str, Any]] = []


class LocationUpdateRequest(BaseModel):
    phone_number: str
    lat: float
    lng: float
    accuracy: Optional[float] = None
    timestamp: Optional[str] = None  # ISO string optional


class SOSRequest(BaseModel):
    phone_number: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: Optional[str] = None
    timestamp: Optional[str] = None


class AttachReceiptRequest(BaseModel):
    phone_number: str
    digital_id: Optional[str] = None  # tx hash
    receipt: Optional[Dict[str, Any]] = None  # full tx receipt JSON (optional)
    wallet_address: Optional[str] = None
    kyc_id: Optional[str] = None


@alerts_router.post("/locations/update", response_model=BasicMessage)
async def update_location(payload: LocationUpdateRequest, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone_number)
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        user = User(phone_number=phone, state="unregistered")
        db.add(user)
        db.commit()
        db.refresh(user)

    ts = payload.timestamp or datetime.datetime.utcnow().isoformat()
    last_loc = {
        "lat": payload.lat,
        "lng": payload.lng,
        "accuracy": payload.accuracy,
        "timestamp": ts,
    }

    user.last_location = last_loc
    profile = user.profile or {}
    locs = profile.get("locations", [])
    locs.append({**last_loc, "recorded_at": datetime.datetime.utcnow().isoformat()})
    profile["locations"] = locs[-50:]
    user.profile = profile

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Location updated"}


import traceback

alerts_logger = logging.getLogger("alerts_minimal")
alerts_logger.setLevel(logging.DEBUG)
if not alerts_logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    ch.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    alerts_logger.addHandler(ch)


class SOSRequestSimple(BaseModel):
    phone_number: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: Optional[str] = None
    timestamp: Optional[str] = None


@alerts_router.post("/sos")
async def send_sos_no_db(request: Request):
    """
    Minimal SOS handler: no DB. Logs and prints everything and returns a simple JSON response.
    Stores the parsed payload into the in-memory ALERTS list so dashboard can read it.
    """
    try:
        print(">>> Received SOS request (raw) <<<")
        alerts_logger.info("Received SOS request (raw)")

        # show headers
        headers = dict(request.headers)
        print("Headers:", headers)
        alerts_logger.debug("Headers: %s", json.dumps(headers))

        # raw body text
        raw_bytes = await request.body()
        try:
            raw_text = raw_bytes.decode("utf-8")
        except Exception:
            raw_text = str(raw_bytes)
        print("Raw body:", raw_text)
        alerts_logger.debug("Raw body: %s", raw_text)

        # parse JSON payload
        try:
            payload = await request.json()
        except Exception:
            try:
                payload = json.loads(raw_text)
            except Exception:
                payload = {"_raw": raw_text}

        # ensure a consistent structure
        if not isinstance(payload, dict):
            payload = {"_raw": payload}

        # fill timestamp if missing
        if "timestamp" not in payload or not payload.get("timestamp"):
            payload["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"

        # normalize phone (optional)
        if "phone_number" in payload:
            payload["phone_number"] = normalize_phone(payload["phone_number"])

        # convert lat/lng to floats if possible
        def _to_float(v):
            try:
                return float(v)
            except Exception:
                return None

        payload["lat"] = _to_float(payload.get("lat"))
        payload["lng"] = _to_float(payload.get("lng"))

        # log parsed payload
        print("Parsed payload:", json.dumps(payload, indent=2))
        alerts_logger.info("Parsed payload: %s", json.dumps(payload))

        # append to in-memory ALERTS list
        try:
            alert_item = {
                "phone_number": payload.get("phone_number"),
                "lat": payload.get("lat"),
                "lng": payload.get("lng"),
                "note": payload.get("note", "")[:1000],
                "timestamp": payload.get("timestamp"),
                "raw": payload,
            }
            ALERTS.append(alert_item)
            if len(ALERTS) > 200:
                del ALERTS[0 : len(ALERTS) - 200]
            alerts_logger.info("Appended alert; alerts_count=%d", len(ALERTS))
        except Exception:
            alerts_logger.exception("Failed to append to ALERTS")

        return {"message": "SOS received (no-db)", "payload": payload}
    except Exception as e:
        print("Exception in send_sos_no_db:", e)
        traceback.print_exc()
        alerts_logger.exception("Exception in send_sos_no_db: %s", e)
        raise HTTPException(
            status_code=500, detail="Internal server error (sos debug)"
        )


@alerts_router.get("/", response_model=Dict[str, Any])
async def get_alerts_root():
    return {"alerts": ALERTS}


@alerts_router.get("/alerts")
async def get_alerts_no_db():
    """
    Return all received SOS alerts (collected in memory).
    """
    return {"alerts": ALERTS}


@alerts_router.post("/users/attach-receipt", response_model=BasicMessage)
async def attach_receipt(
    payload: AttachReceiptRequest, db: Session = Depends(get_db)
):
    phone = normalize_phone(payload.phone_number)
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.receipt:
        user.receipt = payload.receipt
        txh = payload.receipt.get("transactionHash") or payload.receipt.get("txHash")
        if txh:
            user.did = txh
    if payload.digital_id:
        user.did = payload.digital_id

    if payload.wallet_address:
        user.wallet_address = payload.wallet_address
    if payload.kyc_id:
        user.kyc_id = payload.kyc_id

    if user.did:
        user.state = "registered"

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Receipt attached"}
