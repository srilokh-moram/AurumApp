from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class PendingOrder(Base):
    __tablename__ = "pending_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mt5_ticket = Column(Integer, unique=True, nullable=False, index=True)
    symbol = Column(String, nullable=False)
    direction = Column(String, nullable=False)       # "buy" or "sell"
    order_type = Column(String, nullable=False)      # "buy_limit" | "buy_stop" | "sell_limit" | "sell_stop"
    target_price = Column(Numeric(10, 5), nullable=False)
    volume = Column(Numeric(10, 2), nullable=False)
    lot_size = Column(Numeric(10, 2), nullable=False)
    take_profit = Column(Numeric(10, 5), nullable=True)
    stop_loss = Column(Numeric(10, 5), nullable=True)
    status = Column(String, default="pending", nullable=False, index=True)  # pending | filled | cancelled
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    filled_at = Column(DateTime, nullable=True)

    user = relationship("User")
