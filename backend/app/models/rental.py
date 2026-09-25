from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RentalRequest(Base):
    __tablename__ = "rental_requests"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    lender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # State Machine: PENDING -> ACCEPTED -> ACTIVE -> RETURNED -> COMPLETED (or CANCELLED)
    status = Column(String(20), default="PENDING", index=True)
    
    # Dual Handshake PINs (random 4-digit codes)
    handover_pin = Column(String(10), nullable=True)  # Generated when accepted, given to lender, borrower enters to activate
    return_pin = Column(String(10), nullable=True)    # Given to borrower upon return initiation, lender enters to confirm return
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    total_price = Column(Float, default=0.0)
    note = Column(Text, nullable=True)

    # Lifecycle Timestamps
    accepted_at = Column(DateTime, nullable=True)
    active_at = Column(DateTime, nullable=True)
    returned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    item = relationship("Item", back_populates="rentals")
    lender = relationship("User", foreign_keys=[lender_id], back_populates="lend_rentals")
    borrower = relationship("User", foreign_keys=[borrower_id], back_populates="borrow_rentals")
    chat = relationship("Chat", back_populates="rental", uselist=False, cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="rental", cascade="all, delete-orphan")
