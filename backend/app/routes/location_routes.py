# backend/app/routes/location_routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from app.services.location_service import save_location
from app.db.session import get_db

router = APIRouter()

class LocationIn(BaseModel):
    device_id: str = Field(..., example="device_001")
    status: str = Field(..., example="fix")    # "fix" or "no_fix" or "off"
    lat: Optional[float] = Field(None, example=12.345678)
    lon: Optional[float] = Field(None, example=77.123456)
    sats: Optional[int] = Field(None, example=5)
    utc: Optional[str] = Field(None, example="14:23:55")

@router.post("/api/location", status_code=201)
def receive_location(payload: LocationIn, db: Session = Depends(get_db)):
    try:
        loc = save_location(db, payload.dict())
        return {"status": "ok", "id": loc.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
