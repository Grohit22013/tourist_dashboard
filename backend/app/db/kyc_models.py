# backend/app/db/kyc_models.py
from sqlalchemy import Column, Integer, String, LargeBinary, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base  # adjust import path if different

class KycRecord(Base):
    __tablename__ = "kyc_records"
    id = Column(Integer, primary_key=True, index=True)
    subject_hash = Column(String, index=True, unique=True)   # hex string of keccak256
    cid = Column(String, nullable=False)                     # IPFS CID of encrypted blob
    meta = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # AES-GCM nonce + tag stored for reconstructing on decryption (nonce stored with cipher text optionally)
    aes_nonce = Column(LargeBinary, nullable=False)
    # store the ciphertext length etc if needed

    # relationships
    keys = relationship("KycKeyForGrantee", back_populates="kyc_record", cascade="all, delete-orphan")

class KycKeyForGrantee(Base):
    __tablename__ = "kyc_keys"
    id = Column(Integer, primary_key=True, index=True)
    kyc_id = Column(Integer, ForeignKey("kyc_records.id"), nullable=False)
    grantee_address = Column(String, index=True)   # eth address of grantee (or a user id)
    encrypted_sym_key = Column(LargeBinary, nullable=False)  # RSA/OAEP encrypted symmetric key
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_revoked = Column(Boolean, default=False)

    kyc_record = relationship("KycRecord", back_populates="keys")
