from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class MessageCreateIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class MessageOut(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    sender_name: str
    sender_avatar: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class PhoneRevealState(BaseModel):
    is_revealed: bool
    lender_consented: bool
    borrower_consented: bool
    counterparty_phone: Optional[str] = None  # Revealed only when is_revealed is True, otherwise masked

class ChatOut(BaseModel):
    id: int
    rental_id: int
    rental_status: str
    item_title: str
    counterparty_name: str
    counterparty_avatar: Optional[str] = None
    lender_shared_phone: bool
    borrower_shared_phone: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    phone_privacy: PhoneRevealState
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True
