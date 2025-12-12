# backend/app/services/location_service.py
from sqlalchemy.orm import Session
from app.models.location_model import Location
from typing import Dict, Any

def save_location(db: Session, payload: Dict[str, Any]) -> Location:
    """
    Accepts payload that may or may not contain lat/lon. Stores None for missing fields.
    """
    loc = Location(
        device_id=str(payload.get("device_id")),
        status=str(payload.get("status")) if payload.get("status") is not None else None,
        lat=float(payload.get("lat")) if payload.get("lat") is not None else None,
        lon=float(payload.get("lon")) if payload.get("lon") is not None else None,
        sats=int(payload.get("sats")) if payload.get("sats") is not None else None,
        utc=str(payload.get("utc")) if payload.get("utc") is not None else None
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc
