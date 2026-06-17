from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool = False
    name: str = ""


# ── Account ───────────────────────────────────────────────────────────────────

class AccountSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    allocated_limit: Decimal
    balance: Decimal
    floating_pl: Decimal


class DashboardSummary(BaseModel):
    name: str
    email: str
    allocated_limit: float
    balance: float
    floating_pl: float
    equity: float
    open_positions: int
    today_profit: float


# ── Positions ─────────────────────────────────────────────────────────────────

class PositionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    mt5_ticket: int
    symbol: str
    entry_price: Decimal
    volume: Decimal
    lot_size: Decimal
    grid_gap: Decimal
    status: str
    entry_time: datetime
    close_time: Optional[datetime] = None
    close_price: Optional[Decimal] = None
    profit: Optional[Decimal] = None
    floating_pl: Optional[float] = None


# ── Transactions ──────────────────────────────────────────────────────────────

class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    amount: Decimal
    price: Optional[Decimal] = None
    volume: Optional[Decimal] = None
    lot_size: Optional[Decimal] = None
    mt5_ticket: Optional[int] = None
    note: Optional[str] = None
    created_at: datetime


# ── Trading ───────────────────────────────────────────────────────────────────

class BuyRequest(BaseModel):
    lot_size: float

class SellOrderRequest(BaseModel):
    lot_size: float


# ── Admin ─────────────────────────────────────────────────────────────────────

class DepositRequest(BaseModel):
    user_id: int
    amount: float
    note: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    key: str
    value: float


class UserAdminView(BaseModel):
    id: int
    email: str
    name: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    allocated_limit: float
    balance: float
    floating_pl: float
    open_positions: int


# ── Balance history ───────────────────────────────────────────────────────────

class BalancePoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date: date
    balance: Decimal
    floating_pl: Decimal
