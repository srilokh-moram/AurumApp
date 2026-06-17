import enum
from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class TransactionType(str, enum.Enum):
    buy = "buy"
    sell = "sell"
    deposit = "deposit"
    withdrawal = "withdrawal"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    price = Column(Numeric(10, 5), nullable=True)
    volume = Column(Numeric(10, 2), nullable=True)
    lot_size = Column(Numeric(10, 2), nullable=True)
    mt5_ticket = Column(Integer, nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="transactions")
