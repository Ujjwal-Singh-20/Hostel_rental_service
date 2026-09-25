import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_user, upload_media_file, get_optional_user
from app.models.item import Item
from app.models.user import User
from app.schemas.item import ItemCreateIn, ItemUpdateIn, ItemOut, VALID_CATEGORIES
from app.schemas.user import UserBasicOut

logger = logging.getLogger("hostelshare.items")
router = APIRouter(prefix="/items", tags=["Items & Feed"])

def format_item_out(item: Item) -> ItemOut:
    lender_out = None
    if item.lender:
        lender_out = UserBasicOut(
            id=item.lender.id,
            username=item.lender.username,
            display_name=item.lender.display_name,
            avatar_url=item.lender.avatar_url,
            trust_rating=round(item.lender.trust_rating or 5.0, 1),
            completed_rentals=item.lender.completed_rentals or 0
        )
    return ItemOut(
        id=item.id,
        lender_id=item.lender_id,
        title=item.title,
        description=item.description,
        category=item.category,
        daily_rate=item.daily_rate,
        status=item.status,
        image_url=item.image_url,
        created_at=item.created_at,
        lender=lender_out
    )

@router.get("", response_model=List[ItemOut])
def get_feed_items(
    category: Optional[str] = Query(None, description="Category filter"),
    free_only: Optional[bool] = Query(None, description="Filter for free borrows (daily_rate == 0)"),
    status: Optional[str] = Query("available", description="Item availability status (available, rented, all)"),
    search: Optional[str] = Query(None, description="Search keyword in title or description"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Home Feed with filters:
    - Category (Electronics, Tools, Academic, Daily Living)
    - Free vs. Paid
    - Availability status
    - Search query matching title or description
    """
    query = db.query(Item)

    # Status filter
    if status and status.lower() != "all":
        query = query.filter(Item.status == status.lower())

    # Category filter
    if category and category.strip():
        query = query.filter(Item.category.ilike(f"%{category.strip()}%"))

    # Free only filter
    if free_only is True:
        query = query.filter(Item.daily_rate == 0.0)

    # Search keyword filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Item.title.ilike(term), Item.description.ilike(term)))

    # Order newest first
    query = query.order_by(Item.created_at.desc())
    items = query.offset(offset).limit(limit).all()

    return [format_item_out(it) for it in items]

@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new rental item listing."""
    if not current_user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile onboarding before listing an item."
        )

    # Validate category
    cat_match = next((c for c in VALID_CATEGORIES if c.lower() == payload.category.lower()), None)
    if not cat_match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Allowed categories: {', '.join(VALID_CATEGORIES)}"
        )

    new_item = Item(
        lender_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else "",
        category=cat_match,
        daily_rate=max(0.0, float(payload.daily_rate)),
        status="available",
        image_url=payload.image_url
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return format_item_out(new_item)

@router.post("/upload-image")
async def upload_item_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Uploads listing photo: strips EXIF metadata and uploads to Supabase Storage."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image.")

    content = await file.read()
    image_url = upload_media_file(content, folder="items")
    return {"image_url": image_url}

@router.get("/{item_id}", response_model=ItemOut)
def get_item_detail(item_id: int, db: Session = Depends(get_db)):
    """Retrieves single item listing detail."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")
    return format_item_out(item)

@router.put("/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    payload: ItemUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates listing details (only owner can modify)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")
    if item.lender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this listing.")

    if payload.title is not None:
        item.title = payload.title.strip()
    if payload.description is not None:
        item.description = payload.description.strip()
    if payload.category is not None:
        cat_match = next((c for c in VALID_CATEGORIES if c.lower() == payload.category.lower()), None)
        if cat_match:
            item.category = cat_match
    if payload.daily_rate is not None:
        item.daily_rate = max(0.0, float(payload.daily_rate))
    if payload.status is not None:
        if payload.status in ["available", "rented", "hidden"]:
            item.status = payload.status
    if payload.image_url is not None:
        item.image_url = payload.image_url

    db.commit()
    db.refresh(item)
    return format_item_out(item)

@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes an item listing (only owner can delete)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")
    if item.lender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this listing.")

    db.delete(item)
    db.commit()
    return {"success": True, "message": "Item deleted successfully."}
