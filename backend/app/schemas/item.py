from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.user import UserBasicOut

VALID_CATEGORIES = ["Electronics", "Tools", "Academic", "Daily Living"]

class ItemCreateIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., example="Electronics")
    daily_rate: float = Field(0.0, ge=0.0)  # 0.0 for free borrow
    image_url: Optional[str] = None

class ItemUpdateIn(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    daily_rate: Optional[float] = Field(None, ge=0.0)
    status: Optional[str] = Field(None, example="available")  # available, rented, hidden
    image_url: Optional[str] = None

class ItemOut(BaseModel):
    id: int
    lender_id: int
    title: str
    description: Optional[str]
    category: str
    daily_rate: float
    status: str
    image_url: Optional[str]
    created_at: datetime
    lender: Optional[UserBasicOut] = None

    class Config:
        from_attributes = True

class PaginatedItemsOut(BaseModel):
    items: List[ItemOut]
    total: int
    page: int
    size: int
