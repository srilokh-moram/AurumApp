import MetaTrader5 as mt5
from config import MT5_LOGIN, MT5_PASSWORD, MT5_SERVER, SYMBOL
from logger import log, err


def connect():
    if not mt5.initialize(login=MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER):
        err(f"MT5 init failed: {mt5.last_error()}")
        return False

    if not mt5.symbol_select(SYMBOL, True):
        err(f"Failed to select symbol {SYMBOL}")
        return False

    log("MT5 Connected")
    return True


def ensure_connection():
    if mt5.terminal_info() is None:
        log("Reconnecting MT5...")
        return connect()
    return True


def get_price():
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick is None:
        return None

    return {
        "ask": tick.ask,
        "bid": tick.bid
    }


def is_market_open():
    tick = mt5.symbol_info_tick(SYMBOL)
    return tick is not None and tick.ask > 0 and tick.bid > 0
