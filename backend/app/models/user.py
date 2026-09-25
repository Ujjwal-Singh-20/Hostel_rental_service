from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    hostel_block = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    trust_rating = Column(Float, default=5.0)
    completed_rentals = Column(Integer, default=0)
    is_onboarded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    items = relationship("Item", back_populates="lender", cascade="all, delete-orphan")
    borrow_rentals = relationship("RentalRequest", back_populates="borrower", foreign_keys="RentalRequest.borrower_id")
    lend_rentals = relationship("RentalRequest", back_populates="lender", foreign_keys="RentalRequest.lender_id")
    reviews_written = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    reviews_received = relationship("Review", back_populates="reviewee", foreign_keys="Review.reviewee_id")
