import MetaTrader5 as mt5
from mt5_connector import connect, get_price, is_market_open

connect()

if not is_market_open():
    print("⛔ Market is CLOSED")
else:
    price = get_price()
    print("Price:", price)

mt5.shutdown()