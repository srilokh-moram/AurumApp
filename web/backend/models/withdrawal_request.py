import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Enum, ForeignKey
from database import Base


class WithdrawalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    note = Column(String, nullable=True)
    status = Column(Enum(WithdrawalStatus), default=WithdrawalStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reject_reason = Column(String, nullable=True)
