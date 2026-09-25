from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    lender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), index=True, nullable=False)  # Electronics, Tools, Academic, Daily Living
    daily_rate = Column(Float, default=0.0)  # 0.0 for free borrow
    status = Column(String(20), default="available")  # available, rented, hidden
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lender = relationship("User", back_populates="items")
    rentals = relationship("RentalRequest", back_populates="item", cascade="all, delete-orphan")
