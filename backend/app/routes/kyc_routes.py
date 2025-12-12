# app/routes/kyc_routes.py
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from app.services import kyc_service
from app.services import blockchain_service
from app.db.session import get_db
from app.models.kyc_model import KYCRecord

# Auth dependency - implement per earlier suggestion (JWT/OAuth2)
from app.auth import get_current_user

router = APIRouter(prefix="/kyc", tags=["kyc"])

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 5 * 1024 * 1024))  # 5 MB default
ALLOWED_CONTENT_TYPES = {"application/pdf", "image/png", "image/jpeg", "application/json", "text/plain"}


class KYCSubmitRequest(BaseModel):
    phone_number: str
    kyc_data: Dict[str, Any]


class KYCSubmitResponse(BaseModel):
    kyc_id: int
    ipfs_cid: str
    tx_hash: Optional[str] = None


class KYCDecisionRequest(BaseModel):
    kyc_id: int
    reviewer: str
    approved: bool
    note: Optional[str] = None


@router.post("/submit", response_model=KYCSubmitResponse)
def kyc_submit(req: KYCSubmitRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Submit structured KYC JSON. Protected endpoint (requires authentication).
    Expects kyc_service.submit_kyc to perform encryption, IPFS upload, on-chain anchoring, DB insert.
    """
    # Basic server-side validation
    if not req.phone_number or not isinstance(req.kyc_data, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")

    try:
        out = kyc_service.submit_kyc(db, req.phone_number, req.kyc_data, actor=user)
        return KYCSubmitResponse(
            kyc_id=int(out["kyc_id"]),
            ipfs_cid=out["ipfs_cid"],
            tx_hash=out.get("tx_hash"),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Don't leak internal exceptions to clients in prod - log server-side instead (not shown)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/upload", status_code=201)
async def kyc_upload(
    request: Request,
    phone_number: str = Form(...),
    meta: Optional[str] = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Secure binary upload flow:
      - enforce size/type limits
      - optional malware/AV scan hook
      - encrypt locally using per-record symmetric key
      - upload encrypted blob to IPFS
      - anchor ipfs cid on-chain with only a hash or CID (no PII)
      - store metadata and encrypted sym-key mapping in DB
    """
    # Validate content-type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    # Optional: place to call malware scanner (ClamAV) or quarantine
    # Example placeholder:
    if hasattr(kyc_service, "scan_bytes_for_malware"):
        clean_ok = kyc_service.scan_bytes_for_malware(content)
        if not clean_ok:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file failed malware scan")

    try:
        out = kyc_service.submit_kyc(db, phone_number, {"filename": file.filename, "content_bytes": content, "meta": meta}, actor=user)
        return {
            "kyc_id": int(out["kyc_id"]),
            "ipfs_cid": out["ipfs_cid"],
            "tx_hash": out.get("tx_hash"),
        }
    except NotImplementedError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Binary upload flow not implemented in submit_kyc on server",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/{kyc_id}/download")
def kyc_download(kyc_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Decrypt KYC blob for review. Protected; only authorized roles should be allowed."""
    # Authorize user: you can check role or use additional DB ACL
    # For example:
    if user.get("role") not in ("admin", "verifier"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = kyc_service.get_kyc(db, kyc_id, actor=user)
        # Return minimal required info; prefer streaming bytes in production
        return {"kyc_id": kyc_id, "kyc_data": data}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/decision")
def kyc_decision(req: KYCDecisionRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Authorize reviewer role
    if user.get("role") not in ("admin", "verifier"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        status_str = kyc_service.decide_kyc(db, req.kyc_id, req.approved, req.reviewer, req.note, actor=user)
        return {"kyc_id": req.kyc_id, "status": status_str}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/status/{phone}")
def kyc_status(phone: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Allow the owner (if phone belongs to requester) or verifiers/admins only
    # For now require auth; implement additional checks in service
    phone_norm = "".join(ch for ch in phone if ch.isdigit())
    rec = db.query(KYCRecord).filter(KYCRecord.phone_number == phone_norm).order_by(KYCRecord.submitted_at.desc()).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    # Minimal data
    return {
        "kyc_id": rec.id,
        "ipfs_cid": rec.ipfs_cid,
        "status": rec.status,
        "submitted_at": rec.submitted_at,
    }


# Grant + key endpoints unchanged except protected and using kyc_service functions
class GrantAccessRequest(BaseModel):
    kyc_id: int
    grantee_address: str
    grantee_pubkey_pem: str


@router.post("/grant")
def kyc_grant(req: GrantAccessRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") not in ("admin", "verifier"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        if not hasattr(kyc_service, "grant_access"):
            raise NotImplementedError("kyc_service.grant_access not implemented")
        kyc_service.grant_access(db, req.kyc_id, req.grantee_address, req.grantee_pubkey_pem, actor=user)
        return {"message": "granted", "kyc_id": req.kyc_id, "grantee": req.grantee_address}
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/key/{kyc_id}")
def kyc_get_encrypted_key(kyc_id: int, grantee_address: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Only return encrypted symmetric key if caller is authorized (backend policy)
    if user.get("role") not in ("admin", "verifier"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        if not hasattr(kyc_service, "get_encrypted_key"):
            raise NotImplementedError("kyc_service.get_encrypted_key not implemented")
        enc = kyc_service.get_encrypted_key(db, kyc_id, grantee_address, actor=user)
        if not enc:
            raise HTTPException(status_code=404, detail="Encrypted key not found or access revoked")
        return {"kyc_id": kyc_id, "grantee": grantee_address, "encrypted_sym_key_b64": enc}
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/fetch/{kyc_id}")
def kyc_fetch_metadata(kyc_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Return metadata only to authorized callers
    if user.get("role") not in ("admin", "verifier", "auditor"):
        raise HTTPException(status_code=403, detail="Forbidden")
    rec = db.query(KYCRecord).filter(KYCRecord.id == kyc_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="KYC record not found")
    return {
        "kyc_id": rec.id,
        "phone_number": rec.phone_number,
        "ipfs_cid": rec.ipfs_cid,
        "meta": rec.meta,
        "submitted_at": rec.submitted_at,
        "status": rec.status,
    }


@router.get("/attestation/{kyc_id}")
def kyc_attestation(kyc_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # restrict to contract role holders at backend too
    if user.get("role") not in ("admin", "verifier"):
        raise HTTPException(status_code=403, detail="Forbidden")
    rec = db.query(KYCRecord).filter(KYCRecord.id == kyc_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="KYC record not found")
    try:
        cid, timestamp, issuer, meta = blockchain_service.contract_instance.functions.getLatestAttestation(
            blockchain_service.w3.keccak(text=str(rec.phone_number))
        ).call()
        return {
            "kyc_id": rec.id,
            "subject": rec.phone_number,
            "cid": cid,
            "timestamp": timestamp,
            "issuer": issuer,
            "meta": meta,
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Blockchain attestation error")
