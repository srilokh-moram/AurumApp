import MetaTrader5 as mt5
from config import MT5_LOGIN, MT5_PASSWORD, MT5_SERVER, SYMBOL
from logger import log, err


def connect():
    if not mt5.initialize(login=MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER):
        err(f"❌ MT5 init failed: {mt5.last_error()}")
        return False

    log("✅ MT5 Connected")

    mt5.symbol_select(SYMBOL, True)
    return True


def ensure_connection():
    if mt5.terminal_info() is None:
        log("🔁 Reconnecting MT5...")
        return connect()
    return True


def get_price():
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick:
        return tick.ask
    return None


def is_market_open():
    info = mt5.symbol_info(SYMBOL)
    if info is None:
        return False
    return info.visible