import MetaTrader5 as mt5
from config import SYMBOL


def connect():
    if not mt5.initialize():
        raise Exception(f"MT5 init failed: {mt5.last_error()}")
    print("✅ MT5 Connected")


def get_price():
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick is None:
        return None
    return tick.ask


def is_market_open():
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick is None:
        return False
    if tick.ask == 0 or tick.bid == 0:
        return False
    return True