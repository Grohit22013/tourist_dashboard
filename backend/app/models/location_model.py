# backend/app/models/location_model.py
from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
from app.db.session import Base

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(128), index=True, nullable=False)
    status = Column(String(32), nullable=True)   # "fix", "no_fix", "off"
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    sats = Column(Integer, nullable=True)
    utc = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
