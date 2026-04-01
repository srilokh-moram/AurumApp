import MetaTrader5 as mt5
from config import SYMBOL, LOT


def place_buy(price):
    result = mt5.order_send({
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": LOT,
        "type": mt5.ORDER_TYPE_BUY,
        "price": price,
        "deviation": 20,
        "magic": 10001,
        "comment": "grid buy",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    })
    return result


def close_position(position):
    """
    Close a specific BUY position using ticket
    """
    result = mt5.order_send({
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": position.volume,
        "type": mt5.ORDER_TYPE_SELL,
        "position": position.ticket,  # 🔥 CRITICAL
        "price": mt5.symbol_info_tick(SYMBOL).bid,
        "deviation": 20,
        "magic": 10001,
        "comment": "grid close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    })
    return result