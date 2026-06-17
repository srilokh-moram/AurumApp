from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from deps import get_admin_user
from models.user import User
from models.account import Account
from models.deposit import Deposit
from models.transaction import Transaction, TransactionType
from models.position import Position, PositionStatus
from schemas import DepositRequest
from services.mt5_service import get_live_profits, close_position, get_tick, get_account_info

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_users(admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_admin == False).order_by(User.created_at.desc()).all()
    live = await get_live_profits()

    result = []
    for u in users:
        account = db.query(Account).filter(Account.user_id == u.id).first()
        open_pos = (
            db.query(Position)
            .filter(Position.user_id == u.id, Position.status == PositionStatus.open)
            .all()
        )
        floating = sum(live.get(p.mt5_ticket, 0.0) for p in open_pos)

        result.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "is_verified": u.is_verified,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
            "allocated_limit": float(account.allocated_limit) if account else 0,
            "balance": float(account.balance) if account else 0,
            "floating_pl": round(floating, 2),
            "equity": round(float(account.balance if account else 0) + floating, 2),
            "open_positions": len(open_pos),
        })
    return result


@router.post("/deposit")
def add_deposit(data: DepositRequest, admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    account = db.query(Account).filter(Account.user_id == data.user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account.allocated_limit = float(account.allocated_limit) + data.amount
    account.balance = float(account.balance) + data.amount
    account.updated_at = datetime.utcnow()

    db.add(Deposit(user_id=data.user_id, admin_id=admin.id, amount=data.amount, note=data.note))
    db.add(Transaction(
        user_id=data.user_id,
        type=TransactionType.deposit,
        amount=data.amount,
        note=data.note or "Admin deposit",
    ))
    db.commit()

    return {
        "message": "Deposit recorded",
        "new_limit": float(account.allocated_limit),
        "new_balance": float(account.balance),
    }


@router.put("/users/{user_id}/toggle")
def toggle_user(user_id: int, admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"active": user.is_active}


@router.get("/positions")
async def all_positions(admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    positions = (
        db.query(Position)
        .filter(Position.status == PositionStatus.open)
        .order_by(Position.entry_time.desc())
        .all()
    )
    live = await get_live_profits()
    users = {u.id: u for u in db.query(User).all()}

    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "user_name": users[p.user_id].name if p.user_id in users else "?",
            "user_email": users[p.user_id].email if p.user_id in users else "?",
            "mt5_ticket": p.mt5_ticket,
            "symbol": p.symbol,
            "entry_price": float(p.entry_price),
            "volume": float(p.volume),
            "lot_size": float(p.lot_size),
            "grid_gap": float(p.grid_gap),
            "entry_time": p.entry_time.isoformat(),
            "floating_pl": round(live.get(p.mt5_ticket, 0.0), 2),
        }
        for p in positions
    ]


@router.post("/positions/{position_id}/close")
async def force_close(position_id: int, admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    pos = db.query(Position).filter(Position.id == position_id, Position.status == PositionStatus.open).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")

    tick = await get_tick()
    if not tick:
        raise HTTPException(status_code=503, detail="Market price unavailable")

    is_short = (pos.direction == "sell")
    close_price = tick["ask"] if is_short else tick["bid"]
    result = await close_position(pos.mt5_ticket, float(pos.volume), close_price, pos.user_id, is_short)

    if not result or result.retcode != 10009:
        raise HTTPException(status_code=400, detail="Close failed")

    from services.mt5_service import get_closed_profit
    profit = await get_closed_profit(pos.mt5_ticket)

    pos.status = PositionStatus.closed
    pos.close_time = datetime.utcnow()
    pos.close_price = close_price
    pos.profit = profit

    account = db.query(Account).filter(Account.user_id == pos.user_id).first()
    if account:
        account.balance = float(account.balance) + profit

    db.add(Transaction(
        user_id=pos.user_id,
        type=TransactionType.sell,
        amount=profit,
        price=bid,
        volume=float(pos.volume),
        mt5_ticket=pos.mt5_ticket,
        note=f"Force closed by admin @ {bid}",
    ))
    db.commit()
    return {"message": "Position closed", "profit": round(profit, 2)}


@router.get("/stats")
async def platform_stats(admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    total_users = db.query(User).filter(User.is_admin == False).count()
    verified_users = db.query(User).filter(User.is_admin == False, User.is_verified == True).count()
    open_pos = db.query(Position).filter(Position.status == PositionStatus.open).count()
    total_deposits = db.query(Deposit).count()

    from sqlalchemy import func
    deposit_sum = db.query(func.sum(Deposit.amount)).scalar() or 0

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "open_positions": open_pos,
        "total_deposits": float(deposit_sum),
    }


@router.get("/mt5-account")
async def mt5_account(admin=Depends(get_admin_user)):
    info = await get_account_info()
    if not info:
        return {"error": "MT5 not connected"}
    return info
