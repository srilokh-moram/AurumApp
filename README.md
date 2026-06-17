# Aurum — Gold Grid Trading Platform

A full-stack web application for managing XAU/USD (gold) grid trading via MetaTrader 5. Users can open long and short positions with automatic take-profit closes based on a configurable grid gap. Admins manage users, deposits, and positions from a dedicated panel.

---

## Features

- **Live price feed** — Real-time XAU/USD bid/ask streamed from MT5 via WebSocket
- **Grid trading** — BUY (long) and SELL (short) orders with configurable lot size and grid gap; positions auto-close when target is hit
- **User auth** — Email registration and login with OTP verification (Gmail SMTP)
- **Admin login** — Separate email + password login for admin, no OTP required
- **Admin panel** — View all users, balances, floating P&L, open positions; add deposits; force-close positions
- **Dashboard** — Balance history chart, equity, floating P&L, today's profit, recent transactions
- **Mobile-friendly** — Responsive dark UI with hamburger nav, touch-friendly buttons
- **MT5 account sync** — Admin dashboard reflects real MT5 account balance and equity

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lightweight Charts |
| Backend | FastAPI, SQLAlchemy, SQLite (dev) / PostgreSQL (prod) |
| Trading | MetaTrader 5 Python API |
| Auth | JWT tokens, OTP via Gmail SMTP |
| Real-time | WebSocket (FastAPI + Vite proxy) |

---

## Project Structure

```
AurumApp/
├── web/
│   ├── backend/
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routers/         # FastAPI route handlers
│   │   │   ├── auth.py      # Register, login, OTP, admin login
│   │   │   ├── trading.py   # Buy, short, close positions
│   │   │   ├── account.py   # Balance, history, transactions
│   │   │   ├── admin.py     # User management, deposits, stats
│   │   │   └── market.py    # WebSocket price feed
│   │   ├── services/
│   │   │   ├── mt5_service.py   # MT5 order execution and price data
│   │   │   ├── email_service.py # OTP email via SMTP
│   │   │   └── price_feed.py    # WebSocket broadcast loop
│   │   ├── main.py          # App lifespan, bootstrap, background threads
│   │   ├── config.py        # Environment variable loading
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── database.py      # SQLAlchemy engine and session
│   │   ├── deps.py          # Auth dependency (get_current_user)
│   │   ├── requirements.txt
│   │   └── .env.example
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── pages/       # Login, AdminLogin, Register, Dashboard, Trade, Positions, History, Admin
│   │   │   ├── components/  # Navbar, TradePanel, PositionTable, LiveChart, BalanceChart, StatCard
│   │   │   ├── context/     # AuthContext (JWT storage)
│   │   │   ├── api.ts       # Axios instance with auth interceptor
│   │   │   └── types.ts     # TypeScript interfaces
│   │   ├── vite.config.ts   # Dev server with /api and /ws proxy
│   │   └── package.json
│   ├── start_backend.bat
│   ├── start_frontend.bat
│   └── start_all.bat
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MetaTrader 5 terminal installed and running on the same machine
- A Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled (for OTP emails)

### 1. Clone the repo

```bash
git clone https://github.com/srilokh-moram/AurumApp.git
cd AurumApp
```

### 2. Backend setup

```bash
cd web/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
copy .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#environment-variables) below).

```bash
# Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend setup

```bash
cd web/frontend

npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### 4. Quick start (Windows)

Double-click `web\start_all.bat` to launch both backend and frontend together.

---

## Environment Variables

Copy `web/backend/.env.example` to `web/backend/.env` and fill in the values:

```env
# Database
DATABASE_URL=sqlite:///./aurum.db          # SQLite for dev
# DATABASE_URL=postgresql://user:pass@localhost/aurum  # PostgreSQL for prod

# JWT
SECRET_KEY=your-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=10080          # 7 days

# MetaTrader 5
MT5_LOGIN=your_mt5_account_number
MT5_PASSWORD=your_mt5_password
MT5_SERVER=MetaQuotes-Demo                 # or your broker's server name
SYMBOL=XAUUSD

# Gmail SMTP (use an App Password, not your regular password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_16char_app_password
SMTP_FROM=your@gmail.com

# Admin account (auto-created on first startup)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_NAME=Admin
ADMIN_PASSWORD=your-secure-admin-password
```

---

## Usage

### User flow
1. Go to `/register` — enter name and email, receive OTP, verify to activate account
2. Log in at `/login` — enter email, receive OTP, verify to sign in
3. Trade on `/trade` — select lot size and grid gap, click BUY or SELL
4. View open positions, P&L, and history on `/positions` and `/history`

### Admin flow
1. Go to `/admin-login` — enter admin email and password (no OTP)
2. View all users, balances, and platform stats
3. Add deposits, enable/disable users, force-close positions

### Grid trading logic
- **BUY**: Opens a long position. Auto-closes when price rises by the grid gap above entry price.
- **SELL**: Opens a short position. Auto-closes when price drops by the grid gap below entry price.

---

## Public access with ngrok

To share the app publicly without deploying:

```bash
ngrok http 3000
```

The Vite dev server proxies all `/api` and `/ws` requests to the backend, so the ngrok URL works end-to-end. Requires ngrok v3.20+.

---

## License

MIT
