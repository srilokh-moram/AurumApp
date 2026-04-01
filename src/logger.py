import logging
from logging.handlers import RotatingFileHandler
import os

os.makedirs("logs", exist_ok=True)

logger = logging.getLogger("bot")
logger.setLevel(logging.INFO)

formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

file_handler = RotatingFileHandler("logs/bot.log", maxBytes=5_000_000, backupCount=5)
file_handler.setFormatter(formatter)

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)

def log(msg):
    safe_msg = msg.encode("utf-8", errors="ignore").decode("utf-8")
    logger.info(safe_msg)

def err(msg):
    safe_msg = msg.encode("utf-8", errors="ignore").decode("utf-8")
    logger.error(safe_msg)