from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta

from database import get_db
from deps import get_current_user
from models.account import Account
from models.user import User
from models.transaction import Transaction, TransactionType
from models.position import Position, PositionStatus
from models.balance_snapshot import BalanceSnapshot
from models.withdrawal_request import WithdrawalRequest, WithdrawalStatus
from schemas import WithdrawalRequestCreate
from services.mt5_service import get_live_profits, get_account_info

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/summary")
async def summary(user=Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.user_id == user.id).first()

    open_positions = (
        db.query(Position)
        .filter(Position.user_id == user.id, Position.status == PositionStatus.open)
        .all()
    )

    # Today's realized profit
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sells = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == "sell",
            Transaction.created_at >= today_start,
        )
        .all()
    )
    today_profit = sum(float(t.amount) for t in today_sells)

    # Admin: show real MT5 account balance/equity
    if user.is_admin:
        mt5_info = await get_account_info()
        if mt5_info:
            bal = mt5_info["balance"]
            equity = mt5_info["equity"]
            floating_pl = mt5_info["profit"]
            limit = bal  # admin limit = real MT5 balance

            # Keep DB in sync so admin panel shows correct values
            if account:
                account.balance = bal
                account.allocated_limit = bal
                account.floating_pl = floating_pl
                db.commit()

            return {
                "name": user.name,
                "email": user.email,
                "allocated_limit": round(limit, 2),
                "balance": round(bal, 2),
                "floating_pl": round(floating_pl, 2),
                "equity": round(equity, 2),
                "open_positions": len(open_positions),
                "today_profit": round(today_profit, 2),
                "mt5_info": mt5_info,
            }

    # Regular user: virtual balance tracked by platform
    live = await get_live_profits()
    floating_pl = sum(live.get(p.mt5_ticket, 0.0) for p in open_positions)

    if account:
        account.floating_pl = floating_pl
        db.commit()

    bal = float(account.balance) if account else 0
    limit = float(account.allocated_limit) if account else 0

    return {
        "name": user.name,
        "email": user.email,
        "allocated_limit": limit,
        "balance": round(bal, 2),
        "floating_pl": round(floating_pl, 2),
        "equity": round(bal + floating_pl, 2),
        "open_positions": len(open_positions),
        "today_profit": round(today_profit, 2),
    }


@router.get("/transactions")
def transactions(
    limit: int = 50,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "type": t.type,
            "amount": float(t.amount),
            "price": float(t.price) if t.price else None,
            "volume": float(t.volume) if t.volume else None,
            "lot_size": float(t.lot_size) if t.lot_size else None,
            "mt5_ticket": t.mt5_ticket,
            "note": t.note,
            "created_at": t.created_at.isoformat(),
        }
        for t in rows
    ]


@router.post("/withdraw")
def request_withdrawal(
    data: WithdrawalRequestCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.is_admin:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admins cannot request withdrawals")
    account = db.query(Account).filter(Account.user_id == user.id).first()
    if not account:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Account not found")
    if data.amount <= 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    if float(account.balance) < data.amount:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: ${float(account.balance):,.2f}")
    existing = db.query(WithdrawalRequest).filter(
        WithdrawalRequest.user_id == user.id,
        WithdrawalRequest.status == WithdrawalStatus.pending,
    ).first()
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="You already have a pending withdrawal request")
    wr = WithdrawalRequest(user_id=user.id, amount=data.amount, note=data.note)
    db.add(wr)
    db.commit()
    db.refresh(wr)
    return {
        "id": wr.id,
        "amount": float(wr.amount),
        "note": wr.note,
        "status": wr.status,
        "created_at": wr.created_at.isoformat(),
    }


@router.get("/withdrawals")
def list_user_withdrawals(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(WithdrawalRequest)
        .filter(WithdrawalRequest.user_id == user.id)
        .order_by(WithdrawalRequest.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "amount": float(r.amount),
            "note": r.note,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        }
        for r in rows
    ]


@router.get("/balance-history")
def balance_history(user=Depends(get_current_user), db: Session = Depends(get_db)):
    snaps = (
        db.query(BalanceSnapshot)
        .filter(BalanceSnapshot.user_id == user.id)
        .order_by(BalanceSnapshot.date.asc())
        .all()
    )
    return [
        {
            "date": s.date.isoformat(),
            "balance": float(s.balance),
            "floating_pl": float(s.floating_pl),
            "equity": float(s.balance) + float(s.floating_pl),
        }
        for s in snaps
    ]
