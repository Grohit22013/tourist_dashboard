# create_db.py
import os
import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, JSON, ForeignKey, Text, Date, Boolean, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

# ------------------------
# Database URL (default: SQLite)
# ------------------------
DATABASE_URL = os.getenv("TOURIST_DATABASE_URL", "sqlite:///./tourists.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


# ------------------------
# Tables
# ------------------------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(32), unique=True, index=True, nullable=False)
    full_name = Column(String(256))
    email = Column(String(256))
    did = Column(String(512))        # DID or tx hash
    kyc_id = Column(String(512))     # reference to KYC record
    profile = Column(JSON)           # stores metadata pointers (ipfs_cid, wrapped_key, iv)
    state = Column(String(64), nullable=False, default="unregistered")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_location = Column(JSON)
    receipt = Column(JSON)
    wallet_address = Column(String(128))

    itineraries = relationship("Itinerary", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class Itinerary(Base):
    __tablename__ = "itineraries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    date = Column(Date, nullable=False)
    location = Column(String(256), nullable=False)
    activity = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="itineraries")


class KYCRecord(Base):
    __tablename__ = "kyc_records"
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(32), index=True, nullable=False)
    ipfs_cid = Column(String(256), nullable=False)
    meta = Column(JSON)
    status = Column(String(64), default="submitted")  # submitted, approved, rejected
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewer = Column(String(128))
    tx_hash = Column(String(256))


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    lat = Column(String(64))
    lng = Column(String(64))
    note = Column(Text)
    status = Column(String(64), default="triggered")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="alerts")


# ------------------------
# Run
# ------------------------
def init_db():
    print(f"[INFO] Creating tables in {DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    print("[INFO] Tables created successfully.")


if __name__ == "__main__":
    init_db()
