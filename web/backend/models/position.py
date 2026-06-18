import enum
from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey, Enum, text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class PositionStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mt5_ticket = Column(Integer, unique=True, nullable=False, index=True)
    symbol = Column(String, nullable=False)
    entry_price = Column(Numeric(10, 5), nullable=False)
    volume = Column(Numeric(10, 2), nullable=False)
    lot_size = Column(Numeric(10, 2), nullable=False)
    grid_gap = Column(Numeric(10, 2), nullable=False)
    direction = Column(String, default="buy", nullable=True)
    status = Column(Enum(PositionStatus), default=PositionStatus.open, nullable=False, index=True)
    entry_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    close_time = Column(DateTime, nullable=True)
    close_price = Column(Numeric(10, 5), nullable=True)
    profit = Column(Numeric(15, 2), nullable=True)

    user = relationship("User", back_populates="positions")
