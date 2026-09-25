import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

USERNAME_REGEX = r"^[a-zA-Z0-9_]{3,20}$"

class SendOTPIn(BaseModel):
    phone_number: str = Field(..., example="+919876543210")

class VerifyOTPIn(BaseModel):
    phone_number: str = Field(..., example="+919876543210")
    otp_code: str = Field(..., example="123456")

class UserOnboardIn(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=20)
    hostel_block: str = Field(..., min_length=2, max_length=100)
    avatar_url: Optional[str] = None

    @field_validator("username")
    def validate_username(cls, v: str) -> str:
        if not re.match(USERNAME_REGEX, v):
            raise ValueError("Username must be 3-20 characters long and contain only letters, numbers, and underscores.")
        return v.lower()

class UserUpdateIn(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=100)
    hostel_block: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = None

class UserBasicOut(BaseModel):
    id: int
    username: Optional[str]
    display_name: Optional[str]
    avatar_url: Optional[str]
    trust_rating: float = 5.0
    completed_rentals: int = 0

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    phone_number: str
    display_name: Optional[str]
    username: Optional[str]
    hostel_block: Optional[str]
    avatar_url: Optional[str]
    trust_rating: float
    completed_rentals: int
    is_onboarded: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ItemSummaryOut(BaseModel):
    id: int
    title: str
    category: str
    daily_rate: float
    status: str
    image_url: Optional[str]

    class Config:
        from_attributes = True

class PublicProfileOut(BaseModel):
    """
    STRICT PRIVACY SHIELD:
    MUST NEVER expose phone numbers, room numbers, or hostel wings.
    Only displays: display name, username, avatar, trust rating (1-5),
    completed rentals count, and active listings.
    """
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    trust_rating: float = 5.0
    completed_rentals: int = 0
    active_listings: List[ItemSummaryOut] = []

    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_onboarded: bool
    user: UserOut
