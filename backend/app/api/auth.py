import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import SendOTPIn, VerifyOTPIn, TokenOut, UserOut

logger = logging.getLogger("hostelshare.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/send-otp")
def send_otp(payload: SendOTPIn):
    """
    Initiates phone login by sending a 6-digit OTP.
    For development and testing, mock OTP is '123456'.
    """
    clean_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    if len(clean_phone) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid phone number with country code."
        )

    # In production, integrate SMS provider (e.g. Twilio or Fast2SMS) here.
    logger.info("Mock OTP for phone %s is %s", clean_phone, settings.DEV_MOCK_OTP)
    return {
        "success": True,
        "message": f"Verification code sent to {clean_phone}",
        "dev_mock_otp": settings.DEV_MOCK_OTP  # Helpful for local testing
    }

@router.post("/verify-otp", response_model=TokenOut)
def verify_otp(payload: VerifyOTPIn, db: Session = Depends(get_db)):
    """
    Verifies the OTP code. If user is new, an account shell is provisioned.
    Returns JWT bearer token and onboarding status.
    """
    clean_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    code = payload.otp_code.strip()

    # Validate against configured mock OTP (default 123456)
    if code != settings.DEV_MOCK_OTP and code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please use the test code 123456."
        )

    user = db.query(User).filter(User.phone_number == clean_phone).first()
    if not user:
        user = User(
            phone_number=clean_phone,
            display_name=None,
            username=None,
            hostel_block=None,
            trust_rating=5.0,
            completed_rentals=0,
            is_onboarded=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Provisioned new user account with phone %s", clean_phone)

    token = create_access_token(data={"sub": str(user.id), "phone": user.phone_number})
    
    return TokenOut(
        access_token=token,
        token_type="bearer",
        is_onboarded=bool(user.is_onboarded and user.username),
        user=UserOut.model_validate(user)
    )
