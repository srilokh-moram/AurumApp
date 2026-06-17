import asyncio
import threading
import time
from datetime import date, datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
import models  # registers all models with Base

from routers import auth, trading, admin, market, account
from services.price_feed import broadcast_loop
from services.mt5_service import (
    _get_tick, _close_position, _get_live_profits, _get_closed_profit,
)
from models.position import Position, PositionStatus
from models.account import Account
from models.balance_snapshot import BalanceSnapshot
from models.transaction import Transaction, TransactionType
from models.user import User
from config import ADMIN_EMAIL, ADMIN_NAME
import MetaTrader5 as mt5


# ── Bootstrap: create tables & admin user ─────────────────────────────────────

def _bootstrap():
    Base.metadata.create_all(bind=engine)

    # Add direction column to existing positions tables (safe no-op if already exists)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE positions ADD COLUMN direction VARCHAR DEFAULT 'buy'"))
            conn.commit()
        except Exception:
            pass

    if not ADMIN_EMAIL:
        return

    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not existing:
            admin_user = User(
                email=ADMIN_EMAIL, name=ADMIN_NAME,
                is_admin=True, is_verified=True,
            )
            db.add(admin_user)
            db.flush()
            db.add(Account(user_id=admin_user.id))
            db.commit()
            print(f"Admin user created: {ADMIN_EMAIL}")
        else:
            # Ensure admin always has an Account record
            if not db.query(Account).filter(Account.user_id == existing.id).first():
                db.add(Account(user_id=existing.id))
                db.commit()
    finally:
        db.close()


# ── Background: auto-sell profitable positions (sync thread) ──────────────────

def _sync_auto_sell_loop():
    while True:
        try:
            tick = _get_tick()
            if tick:
                bid = tick["bid"]
                ask = tick["ask"]
                db: Session = SessionLocal()
                try:
                    open_pos = db.query(Position).filter(
                        Position.status == PositionStatus.open
                    ).all()
                    for pos in open_pos:
                        is_short = (pos.direction == "sell")
                        if is_short:
                            # Short: auto-close when ask drops by grid_gap below entry
                            triggered = ask <= float(pos.entry_price) - float(pos.grid_gap)
                            close_price = ask
                        else:
                            # Long: auto-close when bid rises by grid_gap above entry
                            triggered = bid >= float(pos.entry_price) + float(pos.grid_gap)
                            close_price = bid
                        if triggered:
                            result = _close_position(
                                pos.mt5_ticket, float(pos.volume), close_price, pos.user_id, is_short
                            )
                            if result and result.retcode == mt5.TRADE_RETCODE_DONE:
                                profit = _get_closed_profit(pos.mt5_ticket)
                                pos.status = PositionStatus.closed
                                pos.close_time = datetime.utcnow()
                                pos.close_price = close_price
                                pos.profit = profit

                                acc = db.query(Account).filter(
                                    Account.user_id == pos.user_id
                                ).first()
                                if acc:
                                    acc.balance = float(acc.balance) + profit

                                db.add(Transaction(
                                    user_id=pos.user_id,
                                    type=TransactionType.sell,
                                    amount=profit,
                                    price=bid,
                                    volume=float(pos.volume),
                                    mt5_ticket=pos.mt5_ticket,
                                    note=f"Auto-sell (grid) @ {bid} | P&L: ${round(profit, 2)}",
                                ))
                                db.commit()
                finally:
                    db.close()
        except Exception:
            pass
        time.sleep(2)


# ── Background: update floating P&L (sync thread) ────────────────────────────

def _sync_floating_pl_loop():
    while True:
        try:
            live = _get_live_profits()
            if live:
                db: Session = SessionLocal()
                try:
                    open_pos = db.query(Position).filter(
                        Position.status == PositionStatus.open
                    ).all()
                    user_floating: dict[int, float] = {}
                    for p in open_pos:
                        user_floating.setdefault(p.user_id, 0.0)
                        user_floating[p.user_id] += live.get(p.mt5_ticket, 0.0)

                    for uid, fpl in user_floating.items():
                        acc = db.query(Account).filter(Account.user_id == uid).first()
                        if acc:
                            acc.floating_pl = fpl
                    db.commit()
                finally:
                    db.close()
        except Exception:
            pass
        time.sleep(5)


# ── Background: daily balance snapshot (sync thread) ─────────────────────────

def _sync_daily_snapshot_loop():
    last_snap_date = None
    while True:
        today = date.today()
        if last_snap_date != today:
            db: Session = SessionLocal()
            try:
                for acc in db.query(Account).all():
                    if not db.query(BalanceSnapshot).filter(
                        BalanceSnapshot.user_id == acc.user_id,
                        BalanceSnapshot.date == today,
                    ).first():
                        db.add(BalanceSnapshot(
                            user_id=acc.user_id,
                            date=today,
                            balance=acc.balance,
                            floating_pl=acc.floating_pl,
                        ))
                db.commit()
                last_snap_date = today
            finally:
                db.close()
        time.sleep(300)


# ── App lifespan ──────────────────────────────────────────────────────────────

def _launch_bg_threads():
    """Launched as a safe dummy thread; waits then starts MT5-dependent threads."""
    time.sleep(3)
    for fn in (_sync_auto_sell_loop, _sync_floating_pl_loop, _sync_daily_snapshot_loop):
        threading.Thread(target=fn, daemon=True).start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _bootstrap()

    # Launcher thread: starts instantly (no MT5), then spawns real bg threads after 3s
    threading.Thread(target=_launch_bg_threads, daemon=True).start()

    # broadcast_loop runs on the main event loop; tiny sleep lets lifespan complete first
    async def _deferred_broadcast():
        await asyncio.sleep(3)
        await broadcast_loop()

    asyncio.create_task(_deferred_broadcast())

    yield


app = FastAPI(title="Aurum Trading API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trading.router)
app.include_router(admin.router)
app.include_router(market.router)
app.include_router(account.router)


@app.get("/")
def root():
    return {"status": "Aurum API v2 running"}
