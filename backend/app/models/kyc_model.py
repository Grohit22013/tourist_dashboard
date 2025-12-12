# app/models/kyc_model.py
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.orm import declarative_base
import datetime
import os

# If you already have a shared Base in app.db.session, replace this with:
# from app.db.session import Base
Base = declarative_base()

class KYCRecord(Base):
    __tablename__ = "kyc_records"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(64), index=True, nullable=False)
    ipfs_cid = Column(String(255), nullable=False)        # IPFS CID of encrypted blob
    encrypted_key = Column(Text, nullable=False)          # envelope (base64)
    key_meta = Column(JSON, nullable=True)                # KMS metadata or dev info
    iv = Column(String(128), nullable=True)               # base64 IV (optional)
    status = Column(String(64), nullable=False, default="submitted")
    reviewer = Column(String(128), nullable=True)
    decision_note = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)
    audit_log = Column(JSON, nullable=True)               # list of audit events
    onchain_tx = Column(String(256), nullable=True)       # optional TX hash if anchored

# If you use a single Base, remove the local Base and import the shared Base instead.
