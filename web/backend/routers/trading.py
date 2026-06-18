from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date
import MetaTrader5 as mt5

from database import get_db
from deps import get_current_user
from models.position import Position, PositionStatus
from models.pending_order import PendingOrder
from models.transaction import Transaction, TransactionType
from models.account import Account
from models.balance_snapshot import BalanceSnapshot
from schemas import BuyRequest, SellOrderRequest, ModifyPositionRequest, PendingOrderRequest, ModifyPendingRequest, PendingOrderOut
from services import mt5_service
from services.mt5_service import get_deal_profit
from config import SYMBOL

router = APIRouter(prefix="/trading", tags=["trading"])


def _snapshot_balance(user_id: int, db: Session):
    """Save or update today's balance snapshot."""
    today = date.today()
    account = db.query(Account).filter(Account.user_id == user_id).first()
    if not account:
        return
    snap = db.query(BalanceSnapshot).filter(
        BalanceSnapshot.user_id == user_id,
        BalanceSnapshot.date == today,
    ).first()
    if snap:
        snap.balance = account.balance
        snap.floating_pl = account.floating_pl
    else:
        db.add(BalanceSnapshot(
            user_id=user_id,
            date=today,
            balance=account.balance,
            floating_pl=account.floating_pl,
        ))
    db.commit()


@router.post("/buy")
async def buy(
    data: BuyRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=400, detail="Account not found")

    equity = float(account.balance) + float(account.floating_pl)
    if equity <= 0:
        raise HTTPException(status_code=400, detail="Insufficient equity to place a trade")

    tick = await mt5_service.get_tick()
    if not tick:
        raise HTTPException(status_code=503, detail="Market price unavailable")

    ask = tick["ask"]
    result = await mt5_service.place_buy(
        ask, data.lot_size, user.id, 0, user.name,
        tp=data.take_profit or 0.0,
        sl=data.stop_loss or 0.0,
    )

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        code = result.retcode if result else "N/A"
        raise HTTPException(status_code=400, detail=f"Order rejected by broker (code {code})")

    db.add(Position(
        user_id=user.id,
        mt5_ticket=result.order,
        symbol=SYMBOL,
        entry_price=ask,
        volume=data.lot_size,
        lot_size=data.lot_size,
        grid_gap=0,
    ))
    db.add(Transaction(
        user_id=user.id,
        type=TransactionType.buy,
        amount=0,
        price=ask,
        volume=data.lot_size,
        lot_size=data.lot_size,
        mt5_ticket=result.order,
        note=f"BUY {data.lot_size} lot @ {ask}",
    ))
    db.commit()

    return {"message": "Buy order placed", "ticket": result.order, "price": ask}


@router.post("/short")
async def short(
    data: SellOrderRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.user_id == user.id).first()
    if not account:
        raise HTTPException(status_code=400, detail="Account not found")

    equity = float(account.balance) + float(account.floating_pl)
    if equity <= 0:
        raise HTTPException(status_code=400, detail="Insufficient equity to place a trade")

    tick = await mt5_service.get_tick()
    if not tick:
        raise HTTPException(status_code=503, detail="Market price unavailable")

    bid = tick["bid"]
    result = await mt5_service.place_sell(
        bid, data.lot_size, user.id, 0, user.name,
        tp=data.take_profit or 0.0,
        sl=data.stop_loss or 0.0,
    )

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        code = result.retcode if result else "N/A"
        raise HTTPException(status_code=400, detail=f"Order rejected by broker (code {code})")

    db.add(Position(
        user_id=user.id,
        mt5_ticket=result.order,
        symbol=SYMBOL,
        entry_price=bid,
        volume=data.lot_size,
        lot_size=data.lot_size,
        grid_gap=0,
        direction="sell",
    ))
    db.add(Transaction(
        user_id=user.id,
        type=TransactionType.sell,
        amount=0,
        price=bid,
        volume=data.lot_size,
        lot_size=data.lot_size,
        mt5_ticket=result.order,
        note=f"SELL (short) {data.lot_size} lot @ {bid}",
    ))
    db.commit()

    return {"message": "Sell order placed", "ticket": result.order, "price": bid}


@router.post("/sell/{position_id}")
async def sell(
    position_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pos = db.query(Position).filter(
        Position.id == position_id,
        Position.user_id == user.id,
        Position.status == PositionStatus.open,
    ).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Open position not found")

    tick = await mt5_service.get_tick()
    if not tick:
        raise HTTPException(status_code=503, detail="Market price unavailable")

    is_short = (pos.direction == "sell")
    close_price = tick["ask"] if is_short else tick["bid"]
    result = await mt5_service.close_position(pos.mt5_ticket, float(pos.volume), close_price, user.id, is_short, user.name)

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        code = result.retcode if result else "N/A"
        raise HTTPException(status_code=400, detail=f"Close order rejected (code {code})")

    # Look up profit by the specific deal ticket — fast single-record lookup
    profit = await get_deal_profit(result.deal) if result.deal else 0.0

    pos.status = PositionStatus.closed
    pos.close_time = datetime.utcnow()
    pos.close_price = close_price
    pos.profit = profit

    account = db.query(Account).filter(Account.user_id == user.id).first()
    account.balance = float(account.balance) + profit
    account.updated_at = datetime.utcnow()

    db.add(Transaction(
        user_id=user.id,
        type=TransactionType.sell,
        amount=profit,
        price=close_price,
        volume=float(pos.volume),
        lot_size=float(pos.lot_size),
        mt5_ticket=pos.mt5_ticket,
        note=f"SELL @ {close_price} | P&L: ${round(profit, 2)}",
    ))
    db.commit()
    _snapshot_balance(user.id, db)

    return {"message": "Position closed", "profit": round(profit, 2), "close_price": close_price}


@router.get("/positions/open")
async def open_positions(user=Depends(get_current_user), db: Session = Depends(get_db)):
    positions = (
        db.query(Position)
        .filter(Position.user_id == user.id, Position.status == PositionStatus.open)
        .order_by(Position.entry_time.desc())
        .all()
    )
    live = await mt5_service.get_live_profits()
    result = []
    for p in positions:
        result.append({
            "id": p.id,
            "mt5_ticket": p.mt5_ticket,
            "symbol": p.symbol,
            "direction": p.direction or "buy",
            "entry_price": float(p.entry_price),
            "volume": float(p.volume),
            "lot_size": float(p.lot_size),
            "grid_gap": float(p.grid_gap),
            "status": p.status,
            "entry_time": p.entry_time.isoformat(),
            "floating_pl": round(live.get(p.mt5_ticket, 0.0), 2),
        })
    return result


@router.get("/positions/{position_id}/tpsl")
async def get_position_tpsl(
    position_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pos = db.query(Position).filter(
        Position.id == position_id,
        Position.user_id == user.id,
        Position.status == PositionStatus.open,
    ).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    return await mt5_service.get_position_tpsl(pos.mt5_ticket)


@router.put("/positions/{position_id}/modify")
async def modify_position(
    position_id: int,
    data: ModifyPositionRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pos = db.query(Position).filter(
        Position.id == position_id,
        Position.user_id == user.id,
        Position.status == PositionStatus.open,
    ).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")

    result = await mt5_service.modify_position(
        pos.mt5_ticket,
        tp=data.take_profit or 0.0,
        sl=data.stop_loss or 0.0,
    )
    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        code = result.retcode if result else "N/A"
        raise HTTPException(status_code=400, detail=f"Modify rejected by broker (code {code})")

    return {"message": "Position modified", "tp": data.take_profit, "sl": data.stop_loss}


@router.post("/pending")
async def place_pending(
    data: PendingOrderRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.direction not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="direction must be 'buy' or 'sell'")

    tick = await mt5_service.get_tick()
    if not tick:
        raise HTTPException(status_code=503, detail="Market price unavailable")

    # Auto-detect MT5 order type from direction + price vs current
    if data.direction == "buy":
        order_type = "buy_stop" if data.target_price > tick["ask"] else "buy_limit"
    else:
        order_type = "sell_limit" if data.target_price > tick["bid"] else "sell_stop"

    result = await mt5_service.place_pending_order(
        order_type_str=order_type,
        price=data.target_price,
        volume=data.lot_size,
        user_id=user.id,
        user_name=user.name,
        tp=data.take_profit or 0.0,
        sl=data.stop_loss or 0.0,
    )

    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        code = result.retcode if result else "N/A"
        raise HTTPException(status_code=400, detail=f"Pending order rejected (code {code})")

    po = PendingOrder(
        user_id=user.id,
        mt5_ticket=result.order,
        symbol=SYMBOL,
        direction=data.direction,
        order_type=order_type,
        target_price=data.target_price,
        volume=data.lot_size,
        lot_size=data.lot_size,
        take_profit=data.take_profit,
        stop_loss=data.stop_loss,
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    return {"message": "Pending order placed", "ticket": result.order, "order_type": order_type}


@router.get("/pending", response_model=List[PendingOrderOut])
def list_pending(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(PendingOrder)
        .filter(PendingOrder.user_id == user.id, PendingOrder.status == "pending")
        .order_by(PendingOrder.created_at.desc())
        .all()
    )


@router.put("/pending/{pending_id}")
async def modify_pending(
    pending_id: int,
    data: ModifyPendingRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    po = db.query(PendingOrder).filter(
        PendingOrder.id == pending_id,
        PendingOrder.user_id == user.id,
        PendingOrder.status == "pending",
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Pending order not found")

    result = await mt5_service.modify_pending_order(
        po.mt5_ticket,
        price=data.target_price,
        tp=data.take_profit or 0.0,
        sl=data.stop_loss or 0.0,
    )
    if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
        code = result.retcode if result else "N/A"
        raise HTTPException(status_code=400, detail=f"Modify rejected by broker (code {code})")

    # Re-detect order type in case price crossed the market
    tick = await mt5_service.get_tick()
    if tick:
        if po.direction == "buy":
            po.order_type = "buy_stop" if data.target_price > tick["ask"] else "buy_limit"
        else:
            po.order_type = "sell_limit" if data.target_price > tick["bid"] else "sell_stop"

    po.target_price = data.target_price
    po.take_profit = data.take_profit
    po.stop_loss = data.stop_loss
    db.commit()

    return {"ok": True, "order_type": po.order_type}


@router.delete("/pending/{pending_id}")
async def cancel_pending(
    pending_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    po = db.query(PendingOrder).filter(
        PendingOrder.id == pending_id,
        PendingOrder.user_id == user.id,
        PendingOrder.status == "pending",
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Pending order not found")

    result = await mt5_service.cancel_pending_order(po.mt5_ticket)
    if result and result.retcode != mt5.TRADE_RETCODE_DONE:
        code = result.retcode
        raise HTTPException(status_code=400, detail=f"Cancel rejected by broker (code {code})")

    po.status = "cancelled"
    db.commit()
    return {"message": "Pending order cancelled"}


@router.get("/positions/history")
def position_history(user=Depends(get_current_user), db: Session = Depends(get_db)):
    positions = (
        db.query(Position)
        .filter(Position.user_id == user.id)
        .order_by(Position.entry_time.desc())
        .all()
    )
    return [
        {
            "id": p.id,
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
            "profit": float(p.profit) if p.profit is not None else None,
        }
        for p in positions
    ]
