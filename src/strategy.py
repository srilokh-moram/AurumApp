from config import GRID_STEP


def should_buy(price, positions):
    if not positions:
        return True

    last_price = positions[-1]["price"]

    if price <= last_price - GRID_STEP:
        return True

    return False


def get_positions_to_sell(price, positions):
    to_sell = []

    for pos in positions:
        if price >= pos["price"] + GRID_STEP:
            to_sell.append(pos)

    return to_sell