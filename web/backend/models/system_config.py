from sqlalchemy import Column, String, Numeric
from database import Base


class SystemConfig(Base):
    __tablename__ = "system_config"

    key = Column(String, primary_key=True)
    value = Column(Numeric(15, 2), nullable=False)
