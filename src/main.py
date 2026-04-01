import time
import MetaTrader5 as mt5

from mt5_connector import connect, ensure_connection, get_price, is_market_open
from trader import place_buy, close_position
from state import load_state, save_state
from config import SLEEP_TIME, GRID_GAP
from logger import log, err


def run():
    connect()

    state = load_state()
    positions = state.get("positions", [])

    last_failed_price = None

    while True:
        ensure_connection()

        if not is_market_open():
            log("⛔ Market CLOSED → waiting")
            time.sleep(SLEEP_TIME)
            continue

        price = get_price()

        if price is None:
            err("⚠️ No price data")
            time.sleep(SLEEP_TIME)
            continue

        log(f"📊 Price: {price}")
        log(f"📦 Holdings: {[p['price'] for p in positions]}")

        # ================= FIRST BUY =================
        if not positions:
            log("🟢 BUY")

            result = place_buy(price)

            if result and result.retcode == mt5.TRADE_RETCODE_DONE:
                positions.append({
                    "price": price,
                    "ticket": result.order,
                    "volume": result.volume
                })
                save_state({"positions": positions})
                log("✅ BUY SUCCESS")

            elif result.retcode in (10027, 10018):
                err("⏸ Waiting (AutoTrading OFF / Market Closed)")
                time.sleep(30)

            else:
                err(f"❌ BUY FAILED {result}")

        else:
            last_price = positions[-1]["price"]

            # ================= BUY CONDITION =================
            if price <= last_price - GRID_GAP:
                if price == last_failed_price:
                    log("⏸ Skipping BUY (same failed price)")
                else:
                    log("🟢 BUY")

                    result = place_buy(price)

                    if result and result.retcode == mt5.TRADE_RETCODE_DONE:
                        positions.append({
                            "price": price,
                            "ticket": result.order,
                            "volume": result.volume
                        })
                        save_state({"positions": positions})
                        log("✅ BUY SUCCESS")
                        last_failed_price = None

                    elif result.retcode in (10027, 10018):
                        err("⏸ Waiting (AutoTrading OFF / Market Closed)")
                        time.sleep(30)

                    else:
                        err(f"❌ BUY FAILED {result}")
                        last_failed_price = price

            # ================= SELL CONDITION =================
            else:
                sold_any = False

                for p in positions[:]:
                    if price >= p["price"] + GRID_GAP:
                        log(f"🔻 SELL {p['price']}")

                        result = close_position(p["ticket"], p["volume"], price)

                        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
                            profit = price - p["price"]
                            log(f"💰 Profit: {profit}")

                            positions.remove(p)
                            save_state({"positions": positions})
                            sold_any = True

                        elif result.retcode in (10027, 10018):
                            err("⏸ Waiting (AutoTrading OFF / Market Closed)")
                            time.sleep(30)

                        else:
                            err(f"❌ SELL FAILED {result}")

                if not sold_any:
                    log("⏳ HOLD")

        time.sleep(SLEEP_TIME)


if __name__ == "__main__":
    run()