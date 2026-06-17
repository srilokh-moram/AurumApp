from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config import DATABASE_URL

_is_sqlite = DATABASE_URL.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=not _is_sqlite)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
