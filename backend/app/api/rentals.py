import random
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rental import RentalRequest
from app.models.item import Item
from app.models.user import User
from app.models.chat import Chat
from app.models.review import Review
from app.schemas.rental import (
    RentalCreateIn, HandshakeVerifyIn, ReviewCreateIn, ReviewOut, RentalOut, ItemBasicOut
)
from app.schemas.user import UserBasicOut

router = APIRouter(prefix="/rentals", tags=["Rental State Machine & Handshakes"])

def generate_pin() -> str:
    """Generates a secure 4-digit numeric handshake PIN."""
    return f"{random.randint(1000, 9999)}"

def format_rental_out(rental: RentalRequest, current_user_id: int) -> RentalOut:
    is_lender = rental.lender_id == current_user_id
    is_borrower = rental.borrower_id == current_user_id

    # Mask PINs based on the Dual Handshake Protocol:
    # - Handover PIN: generated for lender, shown ONLY to lender so lender can verbally tell borrower.
    # - Return PIN: generated for borrower, shown ONLY to borrower so borrower can verbally tell lender.
    visible_handover_pin = rental.handover_pin if is_lender else None
    visible_return_pin = rental.return_pin if is_borrower else None

    # Check if current user has already submitted a review
    has_reviewed = any(r.reviewer_id == current_user_id for r in rental.reviews)

    lender_out = None
    if rental.lender:
        lender_out = UserBasicOut(
            id=rental.lender.id,
            username=rental.lender.username,
            display_name=rental.lender.display_name,
            avatar_url=rental.lender.avatar_url,
            trust_rating=round(rental.lender.trust_rating or 5.0, 1),
            completed_rentals=rental.lender.completed_rentals or 0
        )

    borrower_out = None
    if rental.borrower:
        borrower_out = UserBasicOut(
            id=rental.borrower.id,
            username=rental.borrower.username,
            display_name=rental.borrower.display_name,
            avatar_url=rental.borrower.avatar_url,
            trust_rating=round(rental.borrower.trust_rating or 5.0, 1),
            completed_rentals=rental.borrower.completed_rentals or 0
        )

    item_out = None
    if rental.item:
        item_out = ItemBasicOut(
            id=rental.item.id,
            title=rental.item.title,
            category=rental.item.category,
            daily_rate=rental.item.daily_rate,
            status=rental.item.status,
            image_url=rental.item.image_url
        )

    chat_id = rental.chat.id if rental.chat else None

    return RentalOut(
        id=rental.id,
        item_id=rental.item_id,
        lender_id=rental.lender_id,
        borrower_id=rental.borrower_id,
        status=rental.status,
        handover_pin=visible_handover_pin,
        return_pin=visible_return_pin,
        start_date=rental.start_date,
        end_date=rental.end_date,
        total_price=rental.total_price,
        note=rental.note,
        accepted_at=rental.accepted_at,
        active_at=rental.active_at,
        returned_at=rental.returned_at,
        completed_at=rental.completed_at,
        cancelled_at=rental.cancelled_at,
        created_at=rental.created_at,
        item=item_out,
        lender=lender_out,
        borrower=borrower_out,
        is_lender=is_lender,
        is_borrower=is_borrower,
        has_reviewed=has_reviewed,
        chat_id=chat_id
    )

@router.post("/request", response_model=RentalOut, status_code=status.HTTP_201_CREATED)
def request_rental(
    payload: RentalCreateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Borrower submits a new rental/borrow request."""
    if not current_user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile onboarding before requesting a rental."
        )

    item = db.query(Item).filter(Item.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")
    
    if item.status != "available":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This item is currently not available.")
    
    if item.lender_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot borrow your own item.")

    # Compute estimated total price
    days = 1
    if payload.start_date and payload.end_date and payload.end_date > payload.start_date:
        days = max(1, (payload.end_date - payload.start_date).days)
    total_price = days * item.daily_rate

    rental = RentalRequest(
        item_id=item.id,
        lender_id=item.lender_id,
        borrower_id=current_user.id,
        status="PENDING",
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_price=total_price,
        note=payload.note
    )
    db.add(rental)
    db.commit()
    db.refresh(rental)

    return format_rental_out(rental, current_user.id)

@router.post("/{rental_id}/accept", response_model=RentalOut)
def accept_rental(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lender accepts rental request:
    - Generates 4-digit Handover PIN for lender.
    - Transitions status PENDING -> ACCEPTED.
    - Creates dedicated Chat room for the deal.
    """
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if rental.lender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the lender can accept this request.")
    if rental.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot accept rental in '{rental.status}' state.")

    # Generate Handover PIN for Lender
    rental.handover_pin = generate_pin()
    rental.status = "ACCEPTED"
    rental.accepted_at = datetime.utcnow()

    # Mark item status as reserved/rented
    if rental.item:
        rental.item.status = "rented"

    # Create dedicated Chat room if not existing
    if not rental.chat:
        chat = Chat(
            rental_id=rental.id,
            lender_shared_phone=False,
            borrower_shared_phone=False,
            expires_at=None
        )
        db.add(chat)

    db.commit()
    db.refresh(rental)
    return format_rental_out(rental, current_user.id)

@router.post("/{rental_id}/verify-handover", response_model=RentalOut)
def verify_handover(
    rental_id: int,
    payload: HandshakeVerifyIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    HANDOVER HANDSHAKE:
    - Borrower inputs the Handover PIN given verbally by Lender upon meeting.
    - Transitions status ACCEPTED -> ACTIVE.
    - Generates Return PIN for the Borrower (ready for the return phase).
    """
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if rental.borrower_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the borrower can input the Handover PIN.")
    if rental.status != "ACCEPTED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot perform handover in '{rental.status}' state.")

    if payload.pin.strip() != rental.handover_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect Handover PIN. Ask lender for the 4-digit code.")

    # Transition to ACTIVE
    rental.status = "ACTIVE"
    rental.active_at = datetime.utcnow()
    # Provision return PIN for borrower
    rental.return_pin = generate_pin()

    db.commit()
    db.refresh(rental)
    return format_rental_out(rental, current_user.id)

@router.post("/{rental_id}/verify-return", response_model=RentalOut)
def verify_return(
    rental_id: int,
    payload: HandshakeVerifyIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    RETURN HANDSHAKE:
    - Lender inputs the Return PIN given verbally by Borrower upon returning item.
    - Transitions status ACTIVE -> RETURNED.
    - Item status is restored to 'available'.
    - Sets chat expires_at = return_time + 24 hours.
    """
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if rental.lender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the lender can verify the Return PIN.")
    if rental.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot verify return in '{rental.status}' state.")

    if payload.pin.strip() != rental.return_pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect Return PIN. Ask borrower for the return code.")

    now = datetime.utcnow()
    rental.status = "RETURNED"
    rental.returned_at = now

    # Restore item availability
    if rental.item:
        rental.item.status = "available"

    # Set ephemeral chat expiration: return_time + 24 hours
    if rental.chat:
        rental.chat.expires_at = now + timedelta(hours=24)

    db.commit()
    db.refresh(rental)
    return format_rental_out(rental, current_user.id)

@router.post("/{rental_id}/cancel", response_model=RentalOut)
def cancel_rental(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancels a pending or accepted rental.
    Sets chat expires_at = cancellation_time + 72 hours.
    """
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if current_user.id not in [rental.lender_id, rental.borrower_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to cancel this rental.")
    if rental.status in ["ACTIVE", "RETURNED", "COMPLETED", "CANCELLED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel a deal in '{rental.status}' state.")

    now = datetime.utcnow()
    rental.status = "CANCELLED"
    rental.cancelled_at = now

    if rental.item:
        rental.item.status = "available"

    # Set ephemeral chat expiration: cancellation_time + 72 hours
    if rental.chat:
        rental.chat.expires_at = now + timedelta(hours=72)

    db.commit()
    db.refresh(rental)
    return format_rental_out(rental, current_user.id)

@router.post("/{rental_id}/review", response_model=ReviewOut)
def submit_review(
    rental_id: int,
    payload: ReviewCreateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits mandatory post-return 1-5 star review:
    - Recalculates counterparty's overall trust score.
    - When both parties submit reviews, transitions rental status to COMPLETED.
    """
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if current_user.id not in [rental.lender_id, rental.borrower_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You were not part of this transaction.")
    if rental.status not in ["RETURNED", "COMPLETED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reviews can only be submitted after item return.")

    # Determine reviewer and reviewee
    reviewee_id = rental.borrower_id if current_user.id == rental.lender_id else rental.lender_id

    # Check for existing review by this user
    existing_review = db.query(Review).filter(
        Review.rental_id == rental_id,
        Review.reviewer_id == current_user.id
    ).first()
    if existing_review:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already submitted a review for this rental.")

    review = Review(
        rental_id=rental_id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        rating=payload.rating,
        comment=payload.comment.strip() if payload.comment else ""
    )
    db.add(review)

    # Recalculate reviewee's overall trust score
    all_reviews = db.query(Review).filter(Review.reviewee_id == reviewee_id).all()
    # include the new review in recalculation
    total_stars = sum(r.rating for r in all_reviews) + payload.rating
    count = len(all_reviews) + 1
    new_avg = round(total_stars / count, 2)

    reviewee = db.query(User).filter(User.id == reviewee_id).first()
    if reviewee:
        reviewee.trust_rating = new_avg

    # Check if both parties have reviewed now
    reviews_count = db.query(Review).filter(Review.rental_id == rental_id).count() + 1
    if reviews_count >= 2:
        rental.status = "COMPLETED"
        rental.completed_at = datetime.utcnow()
        # Increment completed rentals count for both users
        if rental.lender:
            rental.lender.completed_rentals = (rental.lender.completed_rentals or 0) + 1
        if rental.borrower:
            rental.borrower.completed_rentals = (rental.borrower.completed_rentals or 0) + 1

    db.commit()
    db.refresh(review)

    reviewer_out = UserBasicOut(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        trust_rating=current_user.trust_rating or 5.0,
        completed_rentals=current_user.completed_rentals or 0
    )

    return ReviewOut(
        id=review.id,
        rental_id=review.rental_id,
        reviewer_id=review.reviewer_id,
        reviewee_id=review.reviewee_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        reviewer=reviewer_out
    )

@router.get("/my-rentals", response_model=List[RentalOut])
def get_my_rentals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all rental requests where the user is either borrower or lender."""
    rentals = db.query(RentalRequest).filter(
        (RentalRequest.borrower_id == current_user.id) | (RentalRequest.lender_id == current_user.id)
    ).order_by(RentalRequest.created_at.desc()).all()

    return [format_rental_out(r, current_user.id) for r in rentals]

@router.get("/{rental_id}", response_model=RentalOut)
def get_rental_by_id(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves single rental details with current user's role-based PIN visibility."""
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if current_user.id not in [rental.lender_id, rental.borrower_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to this rental.")

    return format_rental_out(rental, current_user.id)
