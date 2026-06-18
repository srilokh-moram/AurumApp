import logging
from logging.handlers import RotatingFileHandler
import os
from datetime import datetime, timedelta

LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "bot.log")

os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("bot")
logger.setLevel(logging.INFO)
logger.propagate = False  # prevent duplicate logs from root logger

# Prevent duplicate handlers
if not logger.handlers:

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s"
    )

    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=2 * 1024 * 1024,   # 2 MB
        backupCount=3
    )
    file_handler.setFormatter(formatter)

    logger.addHandler(file_handler)


def cleanup_old_logs(days=2):
    now = datetime.now()
    for file in os.listdir(LOG_DIR):
        path = os.path.join(LOG_DIR, file)
        if os.path.isfile(path):
            file_time = datetime.fromtimestamp(os.path.getmtime(path))
            if now - file_time > timedelta(days=days):
                try:
                    os.remove(path)
                except Exception:
                    pass


cleanup_old_logs()


def log(msg):
    logger.info(str(msg))


def err(msg):
    logger.error(str(msg))
