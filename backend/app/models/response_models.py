from pydantic import BaseModel
from typing import Optional

class TouristResponse(BaseModel):
    digital_id: str

# === New Models for OTP + KYC Flow ===

class BasicMessage(BaseModel):
    message: str


class RegistrationStatus(BaseModel):
    phone_number: str
    state: str
    digital_id: Optional[str] = None

class TouristResponse(BaseModel):
    phone_number: str
    state: str
    digital_id: Optional[str] = None
    # add other fields you need...