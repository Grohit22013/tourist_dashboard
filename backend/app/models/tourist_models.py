# app/models/tourist_models.py
from sqlalchemy import (
    Column, Integer, String, DateTime, JSON, Boolean, ForeignKey, Float, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
import datetime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(32), unique=True, index=True, nullable=False)
    full_name = Column(String(256))
    email = Column(String(256))
    did = Column(String(512))           # DID or tx hash
    kyc_id = Column(String(512))
    profile = Column(JSON)              # pointer: {"ipfs_cid": "...", "encrypted_key_b64": "...", "iv_b64": "...", "key_meta": {...}}
    state = Column(String(64), nullable=False, default="unregistered", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_location = Column(JSON)
    receipt = Column(JSON)
    wallet_address = Column(String(128))

    # 🔹 NEW: bind hardware device to this user/DID
    device_id = Column(String(128), unique=True, index=True, nullable=True)
    device_type = Column(String(64))

    itineraries = relationship("Itinerary", back_populates="user", cascade="all, delete-orphan")
    kyc_records = relationship("KYCRecord", back_populates="user")
    locations = relationship("Location", back_populates="user")
    alerts = relationship("Alert", back_populates="user")

    __table_args__ = (
        Index("ix_users_phone_state", "phone_number", "state"),
    )


class Itinerary(Base):
    __tablename__ = "itineraries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    location = Column(String(256), nullable=False)
    activity = Column(String(1024))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="itineraries")

class KYCRecord(Base):
    __tablename__ = "kyc_records"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    phone_number = Column(String(32), index=True)  # copy for quick lookup
    ipfs_cid = Column(String(128), nullable=False)
    encrypted_key = Column(Text, nullable=False)   # encrypted symmetric key (base64 or KMS blob)
    key_meta = Column(JSON, nullable=False)        # {method: "kms"/"rsa-server-pem"/... , provider:..., key_id:...}
    iv_b64 = Column(String(64), nullable=False)    # AES-GCM nonce base64
    submitter = Column(String(128))                # username or service who submitted
    status = Column(String(64), nullable=False, default="submitted", index=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    reviewed_at = Column(DateTime)
    reviewer = Column(String(128))
    review_note = Column(Text)

    user = relationship("User", back_populates="kyc_records")
    grants = relationship("KYCAccessGrant", back_populates="kyc_record", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_kyc_phone_status", "phone_number", "status"),
    )

class KYCAccessGrant(Base):
    __tablename__ = "kyc_access_grants"
    id = Column(Integer, primary_key=True)
    kyc_id = Column(Integer, ForeignKey("kyc_records.id", ondelete="CASCADE"), nullable=False, index=True)
    grantee_address = Column(String(256), nullable=False)  # e.g. eth address of grantee or identifier
    encrypted_key_for_grantee = Column(Text, nullable=False) # base64 of AES key wrapped by grantee pubkey
    grantee_pubkey_meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by = Column(String(128))  # actor who granted

    kyc_record = relationship("KYCRecord", back_populates="grants")

class Attestation(Base):
    __tablename__ = "attestations"
    id = Column(Integer, primary_key=True)
    subject_hash = Column(String(66), nullable=False, index=True)  # hex keccak bytes32 '0x...'
    ipfs_cid = Column(String(128), nullable=False, index=True)
    tx_hash = Column(String(128))
    issuer = Column(String(128))
    attestation_index = Column(Integer)  # on-chain attestation index if available
    meta = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    accuracy = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    raw = Column(JSON)
    user = relationship("User", back_populates="locations")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    lat = Column(Float)
    lng = Column(Float)
    note = Column(Text)
    status = Column(String(32), default="triggered", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="alerts")

class DangerZone(Base):
    __tablename__ = "danger_zones"
    id = Column(String(64), primary_key=True)  # use stable string id like zone-hyderabad-charminar
    name = Column(String(256), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    radius_m = Column(Integer, nullable=False)
    severity = Column(String(16), default="medium")
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ZoneEvent(Base):
    __tablename__ = "zone_events"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(128), nullable=False, index=True)
    zone_id = Column(String(64), nullable=False, index=True)
    event = Column(String(16))  # enter or exit
    lat = Column(Float)
    lng = Column(Float)
    accuracy_m = Column(Integer)
    ts = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    debug = Column(Boolean, default=False)

class UserToken(Base):
    __tablename__ = "user_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token = Column(String(512), nullable=False)
    provider = Column(String(32), default="fcm")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    actor = Column(String(128))
    action = Column(String(64), index=True)  # e.g., "kyc_view", "key_unwrap", "grant_access"
    target = Column(String(256))
    meta = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
