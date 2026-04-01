import MetaTrader5 as mt5
from mt5_connector import connect, get_price, is_market_open
from trader import place_buy, close_position
from logger import log, err


def test_trade():
    log("🚀 Starting test trade...")

    # CONNECT
    if not connect():
        err("❌ MT5 connection failed")
        return

    # MARKET CHECK
    if not is_market_open():
        err("⛔ Market is CLOSED")
        return

    # GET PRICE
    price = get_price()
    if price is None:
        err("⚠️ No price data")
        return

    log(f"📊 Current Price: {price}")

    # TEST BUY
    log("🟢 Testing BUY...")
    buy_result = place_buy(price)
    log(f"BUY RESULT: {buy_result}")

    if buy_result.retcode != mt5.TRADE_RETCODE_DONE:
        err("❌ BUY FAILED — check AutoTrading / permissions")
        return

    log("✅ BUY SUCCESS")

    # WAIT BEFORE SELL
    import time
    time.sleep(1)

    # GET OPEN POSITIONS
    positions = mt5.positions_get()

    if not positions:
        err("❌ No positions found after BUY")
        return

    position = positions[-1]

    # TEST SELL (close)
    log("🔻 Testing SELL...")
    sell_result = close_position(position.ticket, position.volume, price)

    log(f"SELL RESULT: {sell_result}")

    if sell_result.retcode == mt5.TRADE_RETCODE_DONE:
        log("✅ SELL SUCCESS — Test complete")
    else:
        err("❌ SELL FAILED")


if __name__ == "__main__":
    test_trade()