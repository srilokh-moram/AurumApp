import os
from dotenv import load_dotenv

load_dotenv()

MT5_LOGIN = int(os.getenv("MT5_LOGIN"))
MT5_PASSWORD = os.getenv("MT5_PASSWORD")
MT5_SERVER = os.getenv("MT5_SERVER")

SYMBOL = os.getenv("SYMBOL", "XAUUSD")
LOT_SIZE = float(os.getenv("LOT_SIZE", 0.01))
GRID_GAP = float(os.getenv("GRID_GAP", 5))
SLEEP_SECONDS = int(os.getenv("SLEEP_SECONDS", 1))