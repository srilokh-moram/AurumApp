export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
}

export interface AccountSummary {
  name: string;
  email: string;
  allocated_limit: number;
  balance: number;
  floating_pl: number;
  equity: number;
  open_positions: number;
  today_profit: number;
}

export interface Position {
  id: number;
  mt5_ticket: number;
  symbol: string;
  direction?: "buy" | "sell";
  entry_price: number;
  volume: number;
  lot_size: number;
  grid_gap: number;
  status: "open" | "closed";
  entry_time: string;
  close_time?: string;
  close_price?: number;
  profit?: number;
  floating_pl?: number;
}

export interface Transaction {
  id: number;
  type: "buy" | "sell" | "deposit" | "withdrawal";
  amount: number;
  price?: number;
  volume?: number;
  lot_size?: number;
  mt5_ticket?: number;
  note?: string;
  created_at: string;
}

export interface BalancePoint {
  date: string;
  balance: number;
  floating_pl: number;
  equity: number;
}

export interface Tick {
  ask: number;
  bid: number;
  time: number;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  allocated_limit: number;
  balance: number;
  floating_pl: number;
  equity: number;
  open_positions: number;
}

export interface AdminPosition {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  mt5_ticket: number;
  symbol: string;
  entry_price: number;
  volume: number;
  lot_size: number;
  grid_gap: number;
  entry_time: string;
  floating_pl: number;
}
