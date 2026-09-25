import io
import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional
from PIL import Image, ImageOps
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger("hostelshare.security")
security_scheme = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def strip_exif(image_bytes: bytes, max_dimension: int = 1600) -> tuple[bytes, str]:
    """
    Strips all EXIF metadata (camera data, GPS coordinates, timestamps) from image,
    transposes orientation correctly, and optionally resizes if oversized.
    Returns (cleaned_bytes, extension).
    """
    image = Image.open(io.BytesIO(image_bytes))
    
    # Correct orientation based on EXIF before stripping
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # Resize if excessive
    if max(image.size) > max_dimension:
        image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    # Re-save without any EXIF/metadata
    output = io.BytesIO()
    fmt = image.format if image.format in ["JPEG", "PNG", "WEBP"] else "JPEG"
    ext = "jpg" if fmt == "JPEG" else fmt.lower()
    
    # Convert RGBA to RGB for JPEG
    if fmt == "JPEG" and image.mode in ("RGBA", "P"):
        image = image.convert("RGB")
        
    image.save(output, format=fmt, quality=88, optimize=True)
    return output.getvalue(), ext

def upload_media_file(file_bytes: bytes, folder: str = "items") -> str:
    """
    Cleans EXIF and uploads to Supabase Storage if configured;
    falls back to local filesystem static serving.
    """
    clean_bytes, ext = strip_exif(file_bytes)
    file_id = f"{uuid.uuid4().hex}.{ext}"
    sub_path = f"{folder}/{file_id}"

    # Check if remote Supabase is configured
    if settings.SUPABASE_URL and settings.SUPABASE_KEY and "YOUR_" not in settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            
            # Upload to bucket
            res = client.storage.from_(settings.SUPABASE_BUCKET).upload(
                path=sub_path,
                file=clean_bytes,
                file_options={"content-type": f"image/{ext}"}
            )
            # Retrieve public URL
            public_url = client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(sub_path)
            logger.info("Successfully uploaded image to Supabase Storage: %s", public_url)
            return public_url
        except Exception as e:
            logger.warning("Supabase storage upload failed (%s). Falling back to local storage.", e)

    # Local fallback
    upload_dir = os.path.join("uploads", folder)
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file_id)
    with open(file_path, "wb") as f:
        f.write(clean_bytes)

    # Return URL for local static serving
    return f"/uploads/{folder}/{file_id}"

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    from app.models.user import User

    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(auth.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    return user

def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    from app.models.user import User

    if not auth or not auth.credentials:
        return None
    payload = decode_token(auth.credentials)
    if not payload or not payload.get("sub"):
        return None
    try:
        user_id = int(payload.get("sub"))
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None
