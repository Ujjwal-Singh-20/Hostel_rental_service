import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rental import RentalRequest
from app.models.chat import Chat, Message
from app.models.user import User
from app.schemas.chat import ChatOut, MessageOut, MessageCreateIn, PhoneRevealState

logger = logging.getLogger("hostelshare.chat")
router = APIRouter(prefix="/chat", tags=["Chat & Mutual Privacy Shield"])

def mask_phone(phone: Optional[str]) -> str:
    """Masks phone number (e.g. +91 98765 43210 -> +91 ****** 210)."""
    if not phone or len(phone) < 4:
        return "**********"
    visible_digits = phone[-3:]
    prefix = phone[:3] if phone.startswith("+") else ""
    return f"{prefix} ****** {visible_digits}".strip()

def build_chat_out(chat: Chat, current_user_id: int) -> ChatOut:
    rental = chat.rental
    is_lender = rental.lender_id == current_user_id
    is_borrower = rental.borrower_id == current_user_id

    counterparty = rental.borrower if is_lender else rental.lender
    both_shared = bool(chat.lender_shared_phone and chat.borrower_shared_phone)

    # Counterparty phone visibility
    if both_shared:
        revealed_phone = counterparty.phone_number if counterparty else None
    else:
        revealed_phone = mask_phone(counterparty.phone_number if counterparty else None)

    phone_privacy = PhoneRevealState(
        is_revealed=both_shared,
        lender_consented=chat.lender_shared_phone,
        borrower_consented=chat.borrower_shared_phone,
        counterparty_phone=revealed_phone
    )

    formatted_messages = [
        MessageOut(
            id=m.id,
            chat_id=m.chat_id,
            sender_id=m.sender_id,
            sender_name=m.sender.display_name or m.sender.username or "Peer",
            sender_avatar=m.sender.avatar_url,
            content=m.content,
            created_at=m.created_at
        )
        for m in chat.messages
    ]

    return ChatOut(
        id=chat.id,
        rental_id=rental.id,
        rental_status=rental.status,
        item_title=rental.item.title if rental.item else "Rental Item",
        counterparty_name=counterparty.display_name or counterparty.username if counterparty else "Peer",
        counterparty_avatar=counterparty.avatar_url if counterparty else None,
        lender_shared_phone=chat.lender_shared_phone,
        borrower_shared_phone=chat.borrower_shared_phone,
        expires_at=chat.expires_at,
        created_at=chat.created_at,
        phone_privacy=phone_privacy,
        messages=formatted_messages
    )

@router.get("/{rental_id}", response_model=ChatOut)
def get_rental_chat(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves chat room messages, counterpart info, and mutual privacy shield status.
    Available once rental request has been ACCEPTED.
    """
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if current_user.id not in [rental.lender_id, rental.borrower_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this chat room.")
    if rental.status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat opens only after lender accepts the rental request."
        )

    # Retrieve or auto-create chat
    chat = db.query(Chat).filter(Chat.rental_id == rental_id).first()
    if not chat:
        chat = Chat(rental_id=rental_id)
        db.add(chat)
        db.commit()
        db.refresh(chat)

    return build_chat_out(chat, current_user.id)

@router.post("/{rental_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def send_chat_message(
    rental_id: int,
    payload: MessageCreateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sends a new message in the rental chat room."""
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if current_user.id not in [rental.lender_id, rental.borrower_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this chat room.")

    chat = db.query(Chat).filter(Chat.rental_id == rental_id).first()
    if not chat:
        chat = Chat(rental_id=rental_id)
        db.add(chat)
        db.commit()
        db.refresh(chat)

    msg = Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=payload.content.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return MessageOut(
        id=msg.id,
        chat_id=msg.chat_id,
        sender_id=msg.sender_id,
        sender_name=current_user.display_name or current_user.username or "Peer",
        sender_avatar=current_user.avatar_url,
        content=msg.content,
        created_at=msg.created_at
    )

@router.post("/{rental_id}/share-phone", response_model=ChatOut)
def toggle_share_phone(
    rental_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    MUTUAL PRIVACY SHIELD CONSENT:
    Toggles the calling party's consent to share their phone number.
    Only when BOTH lender and borrower consent is the raw phone number revealed.
    """
    rental = db.query(RentalRequest).filter(RentalRequest.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found.")
    if current_user.id not in [rental.lender_id, rental.borrower_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this chat room.")

    chat = db.query(Chat).filter(Chat.rental_id == rental_id).first()
    if not chat:
        chat = Chat(rental_id=rental_id)
        db.add(chat)

    if current_user.id == rental.lender_id:
        chat.lender_shared_phone = not chat.lender_shared_phone
    else:
        chat.borrower_shared_phone = not chat.borrower_shared_phone

    db.commit()
    db.refresh(chat)

    return build_chat_out(chat, current_user.id)
