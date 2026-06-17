from sqlalchemy import Column, Integer, Numeric, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class BalanceSnapshot(Base):
    __tablename__ = "balance_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    balance = Column(Numeric(15, 2), nullable=False)
    floating_pl = Column(Numeric(15, 2), default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="balance_snapshots")
