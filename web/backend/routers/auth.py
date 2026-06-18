import random
import secrets
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt
from pydantic import BaseModel

from database import get_db
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, OTP_EXPIRE_MINUTES, ADMIN_PASSWORD
from models.user import User
from models.otp import OTPToken
from models.account import Account
from schemas import RegisterRequest, VerifyOTPRequest, LoginRequest, Token
from services.email_service import send_otp_email


class AdminLoginRequest(BaseModel):
    email: str
    password: str

router = APIRouter(prefix="/auth", tags=["auth"])


def _send_otp(email: str, otp: str, name: str):
    """Try SMTP; fall back to console log so the server never returns 500 on SMTP issues."""
    import sys
    try:
        send_otp_email(email, otp, name)
    except Exception as e:
        print(
            f"\n{'='*50}\nAURUM OTP (SMTP error: {e})\nTo: {email}\nOTP: {otp}\n{'='*50}\n",
            file=sys.stderr, flush=True,
        )


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _create_token(user: User) -> Token:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode({"sub": str(user.id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
    return Token(access_token=token, is_admin=user.is_admin, name=user.name)


def _issue_otp(user: User, db: Session):
    db.query(OTPToken).filter(OTPToken.user_id == user.id, OTPToken.used == False).update({"used": True})
    otp = _generate_otp()
    db.add(OTPToken(
        user_id=user.id,
        token=otp,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES),
    ))
    db.commit()
    return otp


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if user and user.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered. Please log in.")

    if not user:
        user = User(email=data.email, name=data.name)
        db.add(user)
        db.flush()
        db.add(Account(user_id=user.id))
        db.commit()
        db.refresh(user)

    otp = _issue_otp(user, db)
    _send_otp(user.email, otp, user.name)
    return {"message": "OTP sent to your email. Valid for 10 minutes."}


@router.post("/verify", response_model=Token)
def verify_registration(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    record = (
        db.query(OTPToken)
        .filter(
            OTPToken.user_id == user.id,
            OTPToken.token == data.otp,
            OTPToken.used == False,
            OTPToken.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    record.used = True
    user.is_verified = True
    db.commit()
    return _create_token(user)


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email, User.is_verified == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="No verified account found for this email")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact support.")

    otp = _issue_otp(user, db)
    _send_otp(user.email, otp, user.name)
    return {"message": "OTP sent to your email. Valid for 10 minutes."}


@router.post("/login/verify", response_model=Token)
def verify_login(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    return verify_registration(data, db)


@router.post("/admin-login", response_model=Token)
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Admin login not configured")

    user = db.query(User).filter(User.email == data.email, User.is_admin == True).first()
    # Use compare_digest to prevent timing attacks; fail with the same message either way
    password_ok = user is not None and secrets.compare_digest(data.password, ADMIN_PASSWORD)
    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return _create_token(user)
