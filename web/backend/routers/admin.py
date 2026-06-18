from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from database import get_db
from deps import get_admin_user
from models.user import User
from models.account import Account
from models.deposit import Deposit
from models.transaction import Transaction, TransactionType
from models.position import Position, PositionStatus
from models.system_config import SystemConfig
from models.withdrawal_request import WithdrawalRequest, WithdrawalStatus
from schemas import DepositRequest, ConfigUpdateRequest
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


@router.get("/positions/all")
async def all_positions_detail(
    status: str = Query("open", pattern="^(open|closed|all)$"),
    user_id: Optional[int] = Query(None),
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(Position)
    if status == "open":
        query = query.filter(Position.status == PositionStatus.open)
    elif status == "closed":
        query = query.filter(Position.status == PositionStatus.closed)
    if user_id:
        query = query.filter(Position.user_id == user_id)

    positions = query.order_by(Position.entry_time.desc()).limit(500).all()

    has_open = any(p.status == PositionStatus.open for p in positions)
    live = await get_live_profits() if has_open else {}

    users = {u.id: u for u in db.query(User).all()}
    accounts = {a.user_id: a for a in db.query(Account).all()}

    result = []
    for p in positions:
        u = users.get(p.user_id)
        acc = accounts.get(p.user_id)
        entry: dict = {
            "id": p.id,
            "user_id": p.user_id,
            "user_name": u.name if u else "?",
            "user_email": u.email if u else "?",
            "user_balance": round(float(acc.balance), 2) if acc else 0.0,
            "mt5_ticket": p.mt5_ticket,
            "symbol": p.symbol,
            "direction": p.direction or "buy",
            "entry_price": float(p.entry_price),
            "volume": float(p.volume),
            "lot_size": float(p.lot_size),
            "grid_gap": float(p.grid_gap),
            "status": p.status,
            "entry_time": p.entry_time.isoformat(),
            "close_time": p.close_time.isoformat() if p.close_time else None,
            "close_price": float(p.close_price) if p.close_price else None,
            "profit": round(float(p.profit), 2) if p.profit is not None else None,
            "floating_pl": round(live.get(p.mt5_ticket, 0.0), 2) if p.status == PositionStatus.open else None,
        }
        result.append(entry)
    return result


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
    pos_user = db.query(User).filter(User.id == pos.user_id).first()
    result = await close_position(pos.mt5_ticket, float(pos.volume), close_price, pos.user_id, is_short, pos_user.name if pos_user else "")

    if not result or result.retcode != 10009:
        raise HTTPException(status_code=400, detail="Close failed")

    from services.mt5_service import get_deal_profit
    profit = await get_deal_profit(result.deal) if result.deal else 0.0

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
        price=close_price,
        volume=float(pos.volume),
        mt5_ticket=pos.mt5_ticket,
        note=f"Force closed by admin @ {close_price}",
    ))
    db.commit()
    return {"message": "Position closed", "profit": round(profit, 2)}


@router.get("/stats")
async def platform_stats(admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    from sqlalchemy import func

    total_users = db.query(User).filter(User.is_admin == False).count()
    verified_users = db.query(User).filter(User.is_admin == False, User.is_verified == True).count()
    open_pos = db.query(Position).filter(Position.status == PositionStatus.open).count()

    dep = db.query(func.count(Transaction.id), func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.type == TransactionType.deposit
    ).first()
    wdl = db.query(func.count(Transaction.id), func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.type == TransactionType.withdrawal
    ).first()

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "open_positions": open_pos,
        "total_deposits": float(dep[1]),
        "deposit_count": int(dep[0]),
        "total_withdrawals": float(wdl[1]),
        "withdrawal_count": int(wdl[0]),
    }


@router.get("/mt5-account")
async def mt5_account(admin=Depends(get_admin_user)):
    info = await get_account_info()
    if not info:
        return {"error": "MT5 not connected"}
    return info


@router.get("/transactions")
def all_transactions(limit: int = 200, admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Transaction, User)
        .join(User, User.id == Transaction.user_id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "user_id": t.user_id,
            "user_name": u.name,
            "user_email": u.email,
            "type": t.type,
            "amount": float(t.amount),
            "price": float(t.price) if t.price else None,
            "volume": float(t.volume) if t.volume else None,
            "lot_size": float(t.lot_size) if t.lot_size else None,
            "mt5_ticket": t.mt5_ticket,
            "note": t.note,
            "created_at": t.created_at.isoformat(),
        }
        for t, u in rows
    ]


@router.get("/withdrawals")
def list_withdrawal_requests(
    status: str = Query("all", pattern="^(pending|approved|rejected|all)$"),
    admin=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(WithdrawalRequest, User).join(User, User.id == WithdrawalRequest.user_id)
    if status != "all":
        query = query.filter(WithdrawalRequest.status == status)
    rows = query.order_by(WithdrawalRequest.created_at.desc()).all()
    return [
        {
            "id": wr.id,
            "user_id": wr.user_id,
            "user_name": u.name,
            "user_email": u.email,
            "amount": float(wr.amount),
            "note": wr.note,
            "status": wr.status,
            "created_at": wr.created_at.isoformat(),
            "reviewed_at": wr.reviewed_at.isoformat() if wr.reviewed_at else None,
        }
        for wr, u in rows
    ]


@router.post("/withdrawals/{wr_id}/approve")
def approve_withdrawal(wr_id: int, admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    wr = db.query(WithdrawalRequest).filter(WithdrawalRequest.id == wr_id).first()
    if not wr:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    if wr.status != WithdrawalStatus.pending:
        raise HTTPException(status_code=400, detail="Request is no longer pending")

    account = db.query(Account).filter(Account.user_id == wr.user_id).first()
    if not account:
        raise HTTPException(status_code=400, detail="User account not found")
    if float(account.balance) < float(wr.amount):
        raise HTTPException(status_code=400, detail="User has insufficient balance to complete withdrawal")

    account.balance = round(float(account.balance) - float(wr.amount), 2)
    account.allocated_limit = round(float(account.allocated_limit) - float(wr.amount), 2)
    account.updated_at = datetime.utcnow()

    db.add(Transaction(
        user_id=wr.user_id,
        type=TransactionType.withdrawal,
        amount=-float(wr.amount),
        note=wr.note or "Withdrawal approved by admin",
    ))

    wr.status = WithdrawalStatus.approved
    wr.reviewed_at = datetime.utcnow()
    wr.reviewed_by = admin.id
    db.commit()
    return {"message": "Withdrawal approved", "new_balance": round(float(account.balance), 2)}


@router.post("/withdrawals/{wr_id}/reject")
def reject_withdrawal(wr_id: int, admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    wr = db.query(WithdrawalRequest).filter(WithdrawalRequest.id == wr_id).first()
    if not wr:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    if wr.status != WithdrawalStatus.pending:
        raise HTTPException(status_code=400, detail="Request is no longer pending")

    wr.status = WithdrawalStatus.rejected
    wr.reviewed_at = datetime.utcnow()
    wr.reviewed_by = admin.id
    db.commit()
    return {"message": "Withdrawal rejected"}


@router.get("/config")
def get_config(admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    rows = db.query(SystemConfig).all()
    return {r.key: float(r.value) for r in rows}


@router.put("/config")
def update_config(data: ConfigUpdateRequest, admin=Depends(get_admin_user), db: Session = Depends(get_db)):
    row = db.query(SystemConfig).filter(SystemConfig.key == data.key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Config key '{data.key}' not found")
    if data.value < 0:
        raise HTTPException(status_code=400, detail="Value must be non-negative")
    row.value = data.value
    db.commit()
    return {"key": data.key, "value": float(row.value)}
