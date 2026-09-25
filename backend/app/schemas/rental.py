from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserBasicOut

class RentalCreateIn(BaseModel):
    item_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    note: Optional[str] = None

class HandshakeVerifyIn(BaseModel):
    pin: str = Field(..., min_length=4, max_length=10)

class ReviewCreateIn(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    rental_id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    reviewer: Optional[UserBasicOut] = None

    class Config:
        from_attributes = True

class ItemBasicOut(BaseModel):
    id: int
    title: str
    category: str
    daily_rate: float
    status: str
    image_url: Optional[str]

    class Config:
        from_attributes = True

class RentalOut(BaseModel):
    id: int
    item_id: int
    lender_id: int
    borrower_id: int
    status: str  # PENDING, ACCEPTED, ACTIVE, RETURNED, COMPLETED, CANCELLED
    
    # Handshake PIN visibility:
    # Lender can see handover_pin (to tell borrower).
    # Borrower can see return_pin (to tell lender).
    # Backend computes/returns this contextually based on user role.
    handover_pin: Optional[str] = None
    return_pin: Optional[str] = None
    
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_price: float = 0.0
    note: Optional[str] = None
    
    accepted_at: Optional[datetime] = None
    active_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime

    item: Optional[ItemBasicOut] = None
    lender: Optional[UserBasicOut] = None
    borrower: Optional[UserBasicOut] = None
    
    # Context flags for current caller
    is_lender: Optional[bool] = False
    is_borrower: Optional[bool] = False
    has_reviewed: Optional[bool] = False
    chat_id: Optional[int] = None

    class Config:
        from_attributes = True
