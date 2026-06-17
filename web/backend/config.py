import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/aurum")

SECRET_KEY = os.getenv("SECRET_KEY", "changeme-insecure-default")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))

MT5_LOGIN = int(os.getenv("MT5_LOGIN", 0))
MT5_PASSWORD = os.getenv("MT5_PASSWORD", "")
MT5_SERVER = os.getenv("MT5_SERVER", "")
SYMBOL = os.getenv("SYMBOL", "XAUUSD")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

OTP_EXPIRE_MINUTES = 10
