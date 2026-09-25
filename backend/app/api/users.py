import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, upload_media_file
from app.models.user import User
from app.models.item import Item
from app.schemas.user import (
    UserOut, PublicProfileOut, UserOnboardIn, UserUpdateIn,
    ItemSummaryOut, USERNAME_REGEX
)

router = APIRouter(tags=["Users & Profiles"])

@router.get("/users/me", response_model=UserOut)
def get_current_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's private full profile."""
    return current_user

@router.post("/users/onboard", response_model=UserOut)
def onboard_user(
    payload: UserOnboardIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Completes user profile onboarding:
    - Display Name
    - Unique @username (enforces regex ^[a-zA-Z0-9_]{3,20}$)
    - Hostel Block / Wing
    - Optional Avatar URL
    """
    clean_username = payload.username.strip().lower()
    if not re.match(USERNAME_REGEX, clean_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-20 characters and contain only alphanumeric characters or underscores."
        )

    # Check username uniqueness across existing users
    existing = db.query(User).filter(
        User.username == clean_username,
        User.id != current_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username @{clean_username} is already taken by another student."
        )

    current_user.display_name = payload.display_name.strip()
    current_user.username = clean_username
    current_user.hostel_block = payload.hostel_block.strip()
    if payload.avatar_url:
        current_user.avatar_url = payload.avatar_url.strip()
    current_user.is_onboarded = True

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/users/me", response_model=UserOut)
def update_profile(
    payload: UserUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates editable profile fields (display name, hostel wing, avatar)."""
    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip()
    if payload.hostel_block is not None:
        current_user.hostel_block = payload.hostel_block.strip()
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/users/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads user avatar: strips EXIF metadata, saves to Supabase Storage (or local fallback),
    and updates user's avatar_url.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be an image.")

    content = await file.read()
    image_url = upload_media_file(content, folder="avatars")
    
    current_user.avatar_url = image_url
    db.commit()
    db.refresh(current_user)

    return {"avatar_url": image_url}

@router.get("/u/{username}", response_model=PublicProfileOut)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    """
    PUBLIC PROFILE ENDPOINT:
    CRITICAL PRIVACY SHIELD:
    MUST NEVER expose phone numbers, room numbers, or hostel wings.
    Only displays: display name, username, avatar, trust rating (1-5),
    completed rentals count, and active listings.
    """
    clean_username = username.strip().lower().lstrip("@")
    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User @{clean_username} was not found."
        )

    # Fetch active items only
    active_items = db.query(Item).filter(
        Item.lender_id == user.id,
        Item.status == "available"
    ).all()

    item_summaries = [
        ItemSummaryOut(
            id=item.id,
            title=item.title,
            category=item.category,
            daily_rate=item.daily_rate,
            status=item.status,
            image_url=item.image_url
        )
        for item in active_items
    ]

    return PublicProfileOut(
        id=user.id,
        username=user.username or "anonymous",
        display_name=user.display_name or "Hostel Peer",
        avatar_url=user.avatar_url,
        trust_rating=round(user.trust_rating or 5.0, 1),
        completed_rentals=user.completed_rentals or 0,
        active_listings=item_summaries
    )
