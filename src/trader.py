import MetaTrader5 as mt5
from config import SYMBOL, LOT_SIZE
from logger import log, err


def place_buy(price):

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": LOT_SIZE,
        "type": mt5.ORDER_TYPE_BUY,
        "price": price,
        "deviation": 20,
        "magic": 10001,
        "comment": "grid buy",
        "type_time": mt5.ORDER_TIME_GTC,
    }

    result = mt5.order_send(request)
    return result


def close_position(ticket, volume, price):

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": volume,
        "type": mt5.ORDER_TYPE_SELL,
        "position": ticket,
        "price": price,
        "deviation": 20,
        "magic": 10001,
        "comment": "grid sell",
        "type_time": mt5.ORDER_TIME_GTC,
    }

    result = mt5.order_send(request)
    return result