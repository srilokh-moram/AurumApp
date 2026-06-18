from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    account = relationship("Account", back_populates="user", uselist=False)
    otp_tokens = relationship("OTPToken", back_populates="user")
    deposits = relationship("Deposit", back_populates="user", foreign_keys="Deposit.user_id")
    positions = relationship("Position", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    balance_snapshots = relationship("BalanceSnapshot", back_populates="user")
