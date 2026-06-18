import MetaTrader5 as mt5
from config import SYMBOL, LOT_SIZE, GRID_GAP
from logger import log, err


def place_buy(price):
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": LOT_SIZE,
        "type": mt5.ORDER_TYPE_BUY,
        "price": price,
        "deviation": 50,
        "magic": 10001,
        "comment": "grid buy",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }

    result = mt5.order_send(request)

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        err(f"BUY FAILED: {result}")
        return result

    log(f"BUY FILLED @ {price}")
    return result


def sell_profitable(positions, bid):
    sold_any = False

    for pos in positions:
        profit_gap = bid - pos["price"]

        if profit_gap >= GRID_GAP:
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": SYMBOL,
                "volume": pos["volume"],
                "type": mt5.ORDER_TYPE_SELL,
                "position": pos["ticket"],
                "price": bid,
                "deviation": 50,
                "magic": 10001,
                "comment": "grid sell",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }

            result = mt5.order_send(request)

            if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
                err(f"SELL FAILED: ticket {pos['ticket']} | {result}")
            else:
                log(f"SELL FILLED: ticket {pos['ticket']} | bought @ {pos['price']} | sold @ {bid} | profit gap: +{round(profit_gap, 3)}")
                sold_any = True

    return sold_any
