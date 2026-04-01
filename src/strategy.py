from config import GRID_GAP


def should_buy(price, positions):
    """
    Decide if we should place a BUY.
    Logic unchanged.
    """

    if price is None:
        return False

    if not positions:
        return True

    try:
        last_price = positions[-1]["price"]
    except (KeyError, IndexError):
        return False

    if price <= last_price - GRID_GAP:
        return True

    return False


def get_positions_to_sell(price, positions):
    """
    Return list of positions to SELL.
    Logic unchanged: sell all positions with +$50 profit.
    """

    if price is None:
        return []

    to_sell = []

    for pos in positions:
        try:
            buy_price = pos["price"]
        except KeyError:
            continue

        if price >= buy_price + GRID_GAP:
            to_sell.append(pos)

    return to_sell