import time
import MetaTrader5 as mt5

from mt5_connector import connect, get_price, is_market_open
from trader import place_buy, close_position
from strategy import should_buy, get_positions_to_sell
from state import load_state, save_state
from config import SLEEP_TIME


def get_mt5_positions():
    positions = mt5.positions_get()
    if positions is None:
        return []
    return list(positions)


def run():
    connect()

    state = load_state()
    buy_positions = state["positions"]

    print(f"🔁 Loaded state: {buy_positions}")

    while True:

        # ===== MARKET CHECK =====
        if not is_market_open():
            print("⛔ Market CLOSED")
            time.sleep(SLEEP_TIME)
            continue

        price = get_price()

        if price is None:
            print("⚠️ No price")
            time.sleep(SLEEP_TIME)
            continue

        print(f"\n📊 Price: {price}")
        print(f"📦 Holdings: {[p['price'] for p in buy_positions]}")

        # ===== BUY =====
        if should_buy(price, buy_positions):
            print("🟢 BUY")

            result = place_buy(price)
            print("Result:", result)

            if result.retcode == mt5.TRADE_RETCODE_DONE:
                print("✅ BUY SUCCESS")

                # get latest position
                mt5_positions = get_mt5_positions()
                latest = mt5_positions[-1]

                buy_positions.append({
                    "price": price,
                    "ticket": latest.ticket,
                    "volume": latest.volume
                })

                save_state({"positions": buy_positions})

            else:
                print("❌ BUY FAILED")

        # ===== SELL MULTIPLE POSITIONS =====
        to_sell = get_positions_to_sell(price, buy_positions)

        if to_sell:
            print(f"🔻 SELL {len(to_sell)} positions")

            for pos in to_sell:
                print(f"➡ Closing {pos['price']}")

                # find real MT5 position
                mt5_positions = get_mt5_positions()

                real_pos = next(
                    (p for p in mt5_positions if p.ticket == pos["ticket"]),
                    None
                )

                if not real_pos:
                    print("⚠️ Position not found in MT5")
                    continue

                result = close_position(real_pos)
                print("Result:", result)

                if result.retcode == mt5.TRADE_RETCODE_DONE:
                    profit = real_pos.profit
                    print(f"💰 Closed {pos['price']} → profit ${profit:.2f}")
                    buy_positions.remove(pos)
                else:
                    print("❌ SELL FAILED")

            save_state({"positions": buy_positions})

        else:
            print("⏳ HOLD")

        time.sleep(SLEEP_TIME)


if __name__ == "__main__":
    run()