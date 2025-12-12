from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class EmergencyContact(BaseModel):
    type: str = Field(..., example="phone")
    value: str = Field(..., example="+911234567890")

class TouristRegistration(BaseModel):
    full_name: str
    kyc_id: str
    visit_start: datetime
    visit_end: datetime
    emergency_contacts: List[EmergencyContact]


# === New Models for OTP + KYC Flow ===
class OTPRequest(BaseModel):
    phone_number: str = Field(..., example="+911234567890")

class OTPVerifyRequest(BaseModel):
    phone_number: str = Field(..., example="+911234567890")
    otp: str = Field(..., example="123456")

class KYCSubmitRequest(BaseModel):
    phone_number: str = Field(..., example="+911234567890")
    full_name: str
    kyc_id: str
    dob: datetime
    address: str

class KYCDecisionRequest(BaseModel):
    phone_number: str = Field(..., example="+911234567890")
    approved: bool
    reason: Optional[str] = None