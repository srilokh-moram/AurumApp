import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import MetaTrader5 as mt5
from config import MT5_LOGIN, MT5_PASSWORD, MT5_SERVER, SYMBOL

_executor = ThreadPoolExecutor(max_workers=4)
_connected = False


# ── Connection ────────────────────────────────────────────────────────────────

def _connect() -> bool:
    global _connected
    if mt5.terminal_info() is not None:
        _connected = True
        return True
    ok = mt5.initialize(login=MT5_LOGIN, password=MT5_PASSWORD, server=MT5_SERVER)
    if ok:
        mt5.symbol_select(SYMBOL, True)
        _connected = True
    return ok


async def ensure_connected() -> bool:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _connect)


# ── Tick data ─────────────────────────────────────────────────────────────────

def _get_tick() -> Optional[dict]:
    if not _connect():
        return None
    tick = mt5.symbol_info_tick(SYMBOL)
    if tick is None or tick.ask == 0:
        return None
    return {"ask": tick.ask, "bid": tick.bid, "time": tick.time}


async def get_tick() -> Optional[dict]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_tick)


# ── Historical candles ────────────────────────────────────────────────────────

def _get_candles(count: int = 300) -> list:
    if not _connect():
        return []
    rates = mt5.copy_rates_from_pos(SYMBOL, mt5.TIMEFRAME_M1, 0, count)
    if rates is None:
        return []
    return [
        {"time": int(r["time"]), "open": r["open"], "high": r["high"],
         "low": r["low"], "close": r["close"]}
        for r in rates
    ]


async def get_candles(count: int = 300) -> list:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_candles, count)


# ── Order execution ───────────────────────────────────────────────────────────

def _place_buy(price: float, volume: float, user_id: int, grid_gap: float):
    if not _connect():
        return None
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": volume,
        "type": mt5.ORDER_TYPE_BUY,
        "price": price,
        "deviation": 50,
        "magic": 10001,
        "comment": f"uid:{user_id}:gap:{grid_gap}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    return mt5.order_send(request)


def _place_sell(price: float, volume: float, user_id: int, grid_gap: float):
    """Open a new short (sell) position."""
    if not _connect():
        return None
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": volume,
        "type": mt5.ORDER_TYPE_SELL,
        "price": price,
        "deviation": 50,
        "magic": 10001,
        "comment": f"uid:{user_id}:short:gap:{grid_gap}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    return mt5.order_send(request)


def _close_position(ticket: int, volume: float, price: float, user_id: int, is_short: bool = False):
    """Close a position. Use is_short=True to close a short (sends a BUY to close)."""
    if not _connect():
        return None
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": volume,
        "type": mt5.ORDER_TYPE_BUY if is_short else mt5.ORDER_TYPE_SELL,
        "position": ticket,
        "price": price,
        "deviation": 50,
        "magic": 10001,
        "comment": f"uid:{user_id}:close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    return mt5.order_send(request)


async def place_buy(price: float, volume: float, user_id: int, grid_gap: float):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _place_buy, price, volume, user_id, grid_gap)


async def place_sell(price: float, volume: float, user_id: int, grid_gap: float):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _place_sell, price, volume, user_id, grid_gap)


async def close_position(ticket: int, volume: float, price: float, user_id: int, is_short: bool = False):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _close_position, ticket, volume, price, user_id, is_short)


# ── Live position profit from MT5 ─────────────────────────────────────────────

def _get_live_profits() -> dict:
    if not _connect():
        return {}
    positions = mt5.positions_get()
    if not positions:
        return {}
    return {p.ticket: p.profit for p in positions if p.magic == 10001}


async def get_live_profits() -> dict:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_live_profits)


# ── Deal profit after close ───────────────────────────────────────────────────

def _get_closed_profit(ticket: int) -> float:
    deals = mt5.history_deals_get(position=ticket)
    if deals:
        return sum(d.profit for d in deals if d.entry == 1)
    return 0.0


async def get_closed_profit(ticket: int) -> float:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_closed_profit, ticket)


# ── Real MT5 account info ─────────────────────────────────────────────────────

def _get_account_info() -> Optional[dict]:
    if not _connect():
        return None
    info = mt5.account_info()
    if info is None:
        return None
    return {
        "balance": info.balance,
        "equity": info.equity,
        "profit": info.profit,
        "margin": info.margin,
        "margin_free": info.margin_free,
        "margin_level": round(info.margin_level, 2) if info.margin_level else 0,
        "currency": info.currency,
        "login": info.login,
        "server": info.server,
        "leverage": info.leverage,
    }


async def get_account_info() -> Optional[dict]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_account_info)
