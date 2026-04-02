# Gold Trading Bot

A Python-based automated trading bot for gold (XAUUSD) using MetaTrader 5.

## Requirements

- **Platform**: Windows (MT5 is Windows-only)
- Python 3.7+
- MetaTrader 5 terminal installed and running
- Valid MT5 trading account

## Features

- Connects to MetaTrader 5 platform
- Implements a simple moving average crossover strategy
- Executes trades automatically
- Basic risk management

## Setup

## create virtual env

1. `python -m venv venv`
2. `.\venv\Scripts\activate`

1. Install MetaTrader 5 platform
2. Ensure Python 3.7+ is installed
3. Install dependencies: `pip install -r requirements.txt`
4. Configure your MT5 credentials in the code or use environment variables

## Usage

Run the bot:
```bash
python src/main.py
```

## Configuration

Edit the MT5Connector class in `mt5_connector.py` to include your login credentials:
- `login`: Your MT5 account number
- `password`: Your MT5 password
- `server`: Your broker's server name

## Strategy

The bot uses a simple moving average crossover strategy:
- 20-period SMA vs 50-period SMA
- Buys when short MA crosses above long MA
- Sells when short MA crosses below long MA

## Risk Management

- Uses 1% risk per trade
- Assumes 10 pip stop loss (configurable)

## Disclaimer

This is a basic example for educational purposes. Trading forex/gold carries significant risk. Use at your own risk and test thoroughly in a demo account before live trading.

## Troubleshooting

- Ensure MT5 is running and logged in
- Check that the symbol XAUUSD is available in your MT5
- Verify internet connection
- Check logs for error messages