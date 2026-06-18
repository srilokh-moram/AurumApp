import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import MetaTrader5 as mt5
from config import MT5_LOGIN, MT5_PASSWORD, MT5_SERVER, SYMBOL, SYMBOL_SILVER, SYMBOL_SPREADS

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
        mt5.symbol_select(SYMBOL_SILVER, True)
        _connected = True
    return ok


async def ensure_connected() -> bool:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _connect)


# ── Tick data ─────────────────────────────────────────────────────────────────

def _get_tick(symbol: str) -> Optional[dict]:
    if not _connect():
        return None
    tick = mt5.symbol_info_tick(symbol)
    if tick is None or tick.bid == 0:
        return None
    spread = SYMBOL_SPREADS.get(symbol, 1.8)
    return {"bid": tick.bid, "ask": round(tick.bid + spread, 5), "time": tick.time}


async def get_tick(symbol: str = SYMBOL) -> Optional[dict]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_tick, symbol)


# ── Historical candles ────────────────────────────────────────────────────────

_TF_MAP = {
    "M1":  "TIMEFRAME_M1",
    "M5":  "TIMEFRAME_M5",
    "M15": "TIMEFRAME_M15",
    "M30": "TIMEFRAME_M30",
    "H1":  "TIMEFRAME_H1",
    "H4":  "TIMEFRAME_H4",
    "D1":  "TIMEFRAME_D1",
    "W1":  "TIMEFRAME_W1",
}


def _get_candles(count: int = 200, timeframe: str = "M1", symbol: str = SYMBOL) -> list:
    if not _connect():
        return []
    tf_attr = _TF_MAP.get(timeframe.upper(), "TIMEFRAME_M1")
    tf = getattr(mt5, tf_attr, mt5.TIMEFRAME_M1)
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    if rates is None:
        return []
    return [
        {"time": int(r["time"]), "open": r["open"], "high": r["high"],
         "low": r["low"], "close": r["close"]}
        for r in rates
    ]


async def get_candles(count: int = 200, timeframe: str = "M1", symbol: str = SYMBOL) -> list:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_candles, count, timeframe, symbol)


# ── Order execution ───────────────────────────────────────────────────────────

def _short_name(user_name: str, user_id: int) -> str:
    """First word of user's name, max 8 chars, fallback to uid."""
    word = user_name.split()[0][:8] if user_name.strip() else ""
    return word if word else f"u{user_id}"


def _place_buy(price: float, volume: float, user_id: int, grid_gap: float, user_name: str = "", tp: float = 0.0, sl: float = 0.0, symbol: str = SYMBOL):
    if not _connect():
        return None
    tag = _short_name(user_name, user_id)
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5.ORDER_TYPE_BUY,
        "price": price,
        "tp": tp,
        "sl": sl,
        "deviation": 50,
        "magic": 10001,
        "comment": f"u{user_id}:{tag}:buy:g{grid_gap}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    return mt5.order_send(request)


def _place_sell(price: float, volume: float, user_id: int, grid_gap: float, user_name: str = "", tp: float = 0.0, sl: float = 0.0, symbol: str = SYMBOL):
    """Open a new short (sell) position."""
    if not _connect():
        return None
    tag = _short_name(user_name, user_id)
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5.ORDER_TYPE_SELL,
        "price": price,
        "tp": tp,
        "sl": sl,
        "deviation": 50,
        "magic": 10001,
        "comment": f"u{user_id}:{tag}:sell:g{grid_gap}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    return mt5.order_send(request)


def _close_position(ticket: int, volume: float, price: float, user_id: int, is_short: bool = False, user_name: str = "", symbol: str = SYMBOL):
    """Close a position. Use is_short=True to close a short (sends a BUY to close)."""
    if not _connect():
        return None
    tag = _short_name(user_name, user_id)
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5.ORDER_TYPE_BUY if is_short else mt5.ORDER_TYPE_SELL,
        "position": ticket,
        "price": price,
        "deviation": 50,
        "magic": 10001,
        "comment": f"u{user_id}:{tag}:close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    return mt5.order_send(request)


async def place_buy(price: float, volume: float, user_id: int, grid_gap: float, user_name: str = "", tp: float = 0.0, sl: float = 0.0, symbol: str = SYMBOL):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _place_buy, price, volume, user_id, grid_gap, user_name, tp, sl, symbol)


async def place_sell(price: float, volume: float, user_id: int, grid_gap: float, user_name: str = "", tp: float = 0.0, sl: float = 0.0, symbol: str = SYMBOL):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _place_sell, price, volume, user_id, grid_gap, user_name, tp, sl, symbol)


async def close_position(ticket: int, volume: float, price: float, user_id: int, is_short: bool = False, user_name: str = "", symbol: str = SYMBOL):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _close_position, ticket, volume, price, user_id, is_short, user_name, symbol)


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


def _get_position_tpsl(ticket: int) -> dict:
    if not _connect():
        return {"tp": 0.0, "sl": 0.0}
    positions = mt5.positions_get(ticket=ticket)
    if positions:
        p = positions[0]
        return {"tp": float(p.tp), "sl": float(p.sl)}
    return {"tp": 0.0, "sl": 0.0}


async def get_position_tpsl(ticket: int) -> dict:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_position_tpsl, ticket)


def _modify_position(ticket: int, tp: float, sl: float, symbol: str = SYMBOL):
    if not _connect():
        return None
    request = {
        "action": mt5.TRADE_ACTION_SLTP,
        "symbol": symbol,
        "position": ticket,
        "tp": tp,
        "sl": sl,
    }
    return mt5.order_send(request)


async def modify_position(ticket: int, tp: float, sl: float, symbol: str = SYMBOL):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _modify_position, ticket, tp, sl, symbol)


# ── Deal profit after close ───────────────────────────────────────────────────

def _get_deal_profit(deal_ticket: int) -> float:
    """Fetch profit by deal ticket — fast single-deal lookup."""
    if not _connect():
        return 0.0
    deals = mt5.history_deals_get(ticket=deal_ticket)
    if deals:
        return sum(d.profit for d in deals)
    return 0.0


def _get_closed_profit(position_ticket: int) -> float:
    """Fetch profit by position ticket — used for externally-closed positions."""
    if not _connect():
        return 0.0
    from datetime import datetime, timedelta
    date_from = datetime.utcnow() - timedelta(days=7)
    date_to = datetime.utcnow() + timedelta(hours=1)
    deals = mt5.history_deals_get(date_from, date_to, position=position_ticket)
    if deals:
        return sum(d.profit for d in deals if d.entry == 1)
    return 0.0


async def get_deal_profit(deal_ticket: int) -> float:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_deal_profit, deal_ticket)


async def get_closed_profit(position_ticket: int) -> float:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _get_closed_profit, position_ticket)


# ── Pending orders ────────────────────────────────────────────────────────────

_PENDING_TYPE_MAP = {
    "buy_limit":  None,  # filled at runtime
    "buy_stop":   None,
    "sell_limit": None,
    "sell_stop":  None,
}

def _place_pending_order(
    order_type_str: str,
    price: float,
    volume: float,
    user_id: int,
    user_name: str = "",
    tp: float = 0.0,
    sl: float = 0.0,
    symbol: str = SYMBOL,
):
    if not _connect():
        return None
    tag = _short_name(user_name, user_id)
    type_map = {
        "buy_limit":  mt5.ORDER_TYPE_BUY_LIMIT,
        "buy_stop":   mt5.ORDER_TYPE_BUY_STOP,
        "sell_limit": mt5.ORDER_TYPE_SELL_LIMIT,
        "sell_stop":  mt5.ORDER_TYPE_SELL_STOP,
    }
    direction = "buy" if "buy" in order_type_str else "sell"
    request = {
        "action": mt5.TRADE_ACTION_PENDING,
        "symbol": symbol,
        "volume": volume,
        "type": type_map[order_type_str],
        "price": price,
        "tp": tp,
        "sl": sl,
        "magic": 10001,
        "comment": f"u{user_id}:{tag}:pending:{direction}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    return mt5.order_send(request)


async def place_pending_order(
    order_type_str: str,
    price: float,
    volume: float,
    user_id: int,
    user_name: str = "",
    tp: float = 0.0,
    sl: float = 0.0,
    symbol: str = SYMBOL,
):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor, _place_pending_order, order_type_str, price, volume, user_id, user_name, tp, sl, symbol
    )


def _modify_pending_order(ticket: int, price: float, tp: float = 0.0, sl: float = 0.0):
    if not _connect():
        return None
    request = {
        "action": mt5.TRADE_ACTION_MODIFY,
        "order": ticket,
        "price": price,
        "tp": tp,
        "sl": sl,
        "type_time": mt5.ORDER_TIME_GTC,
    }
    return mt5.order_send(request)


async def modify_pending_order(ticket: int, price: float, tp: float = 0.0, sl: float = 0.0):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _modify_pending_order, ticket, price, tp, sl)


def _cancel_pending_order(ticket: int):
    if not _connect():
        return None
    request = {
        "action": mt5.TRADE_ACTION_REMOVE,
        "order": ticket,
    }
    return mt5.order_send(request)


async def cancel_pending_order(ticket: int):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _cancel_pending_order, ticket)


def _check_pending_fills(order_tickets: list) -> dict:
    """For each order ticket, determine if it filled and return {ticket: position_ticket} or {ticket: 'cancelled'}."""
    if not _connect() or not order_tickets:
        return {}
    from datetime import datetime, timedelta
    date_from = datetime.utcnow() - timedelta(days=7)
    date_to = datetime.utcnow() + timedelta(hours=1)

    # Current pending order tickets in MT5
    mt5_pending = {o.ticket for o in (mt5.orders_get() or [])}

    result = {}
    for ticket in order_tickets:
        if ticket in mt5_pending:
            continue  # still pending

        hist = mt5.history_orders_get(ticket=ticket)
        if not hist:
            continue
        order = hist[0]

        if order.state == 4:  # ORDER_STATE_FILLED
            deals = mt5.history_deals_get(date_from, date_to) or []
            for d in deals:
                if d.order == ticket and d.entry == 0:  # DEAL_ENTRY_IN
                    result[ticket] = {"status": "filled", "position_ticket": d.position_id, "fill_price": d.price}
                    break
            else:
                result[ticket] = {"status": "filled", "position_ticket": None, "fill_price": float(order.price_current)}
        elif order.state in (2, 5, 6):  # CANCELLED, REJECTED, EXPIRED
            result[ticket] = {"status": "cancelled"}

    return result


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
