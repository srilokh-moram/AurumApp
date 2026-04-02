import MetaTrader5 as mt5

LOGIN = 187970
PASSWORD = "Arji&9491"
SERVER = "MEXGlobalFinancial-Real"


def find_gold_symbol():
    symbols = mt5.symbols_get()
    
    if symbols is None:
        print("❌ Failed to fetch symbols:", mt5.last_error())
        return None

    gold_candidates = []

    for s in symbols:
        name = s.name.upper()
        if "XAU" in name or "GOLD" in name:
            gold_candidates.append(s.name)

    if not gold_candidates:
        print("❌ No gold symbols found")
        return None

    print("\n🔍 Found gold symbols (FULL NAMES):")
    for sym in gold_candidates:
        print("   ", repr(sym))   # ✅ shows full symbol

    # Prefer exact XAUUSD if exists
    for sym in gold_candidates:
        if sym.upper() == "XAUUSD":
            return sym

    # Otherwise return first valid one
    return gold_candidates[0]


def main():
    print("🚀 Initializing MT5...\n")

    # Initialize MT5
    if not mt5.initialize(login=LOGIN, password=PASSWORD, server=SERVER):
        print("❌ MT5 initialize failed")
        print("Error:", mt5.last_error())
        return

    print("✅ MT5 Initialized")

    # Check account
    account = mt5.account_info()
    if account is None:
        print("❌ Login failed")
        print("Error:", mt5.last_error())
        mt5.shutdown()
        return

    print(f"✅ Connected to account: {account.login}")
    print(f"💰 Balance: {account.balance}")

    # Find correct symbol
    symbol = find_gold_symbol()
    if not symbol:
        mt5.shutdown()
        return

    print(f"\n🎯 Using symbol: {repr(symbol)}")

    # Select symbol
    if not mt5.symbol_select(symbol, True):
        print(f"❌ Failed to select symbol {repr(symbol)}")
        mt5.shutdown()
        return

    print(f"✅ Symbol {repr(symbol)} selected")

    # Get live tick data
    tick = mt5.symbol_info_tick(symbol)

    if tick is None:
        print("❌ No tick data (symbol inactive or market closed)")
    else:
        print("\n📊 LIVE PRICE:")
        print(f"Bid: {tick.bid}")
        print(f"Ask: {tick.ask}")

        if tick.bid > 0 and tick.ask > 0:
            print("✅ Market is OPEN")
        else:
            print("⚠️ Market might be CLOSED")

    mt5.shutdown()
    print("\n🔌 MT5 connection closed")


if __name__ == "__main__":
    main()