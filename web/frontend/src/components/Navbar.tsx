import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { useMarket } from "../context/MarketContext";
import { LayoutDashboard, TrendingUp, List, History, ShieldCheck, LogOut, Menu, X, Wallet } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trade",     label: "Trade",     icon: TrendingUp },
  { to: "/positions", label: "Positions", icon: List },
  { to: "/history",   label: "History",   icon: History },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { balance, myTickets } = useAccount();
  const { livePositions } = useMarket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Equity = balance + live floating P&L — updates every 0.5s from the WS stream
  const liveFloating = myTickets.reduce((s, t) => s + (livePositions[t] ?? 0), 0);
  const liveEquity = balance !== null ? balance + liveFloating : null;

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive ? "bg-gold-400/10 text-gold-400" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
    }`;

  return (
    <nav className="bg-[#111827] border-b border-[#1f2937] sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center h-14 gap-4">
        {/* Brand */}
        <span className="text-gold-400 font-bold text-lg tracking-widest mr-2">CB Markets</span>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => linkClass(isActive)}>
              <ShieldCheck size={15} />
              Admin
            </NavLink>
          )}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
          {liveEquity !== null && (
            <div className="flex items-center gap-1.5 bg-gold-400/10 border border-gold-400/20 rounded-lg px-3 py-1.5">
              <Wallet size={13} className="text-gold-400" />
              <span className="text-xs text-gray-400">Balance</span>
              <span className="text-sm font-mono font-bold text-gold-400">{fmt(liveEquity)}</span>
            </div>
          )}
          <span className="text-sm text-gray-400">{user?.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm">
            <LogOut size={15} />
            Sign out
          </button>
        </div>

        {/* Mobile: balance + hamburger */}
        <div className="md:hidden ml-auto flex items-center gap-3">
          {liveEquity !== null && (
            <div className="flex items-center gap-1.5">
              <Wallet size={12} className="text-gold-400" />
              <span className="font-mono font-bold text-gold-400 text-sm">{fmt(liveEquity)}</span>
            </div>
          )}
          <button className="text-gray-400 hover:text-white p-1" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#111827] border-t border-[#1f2937] px-4 pb-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => linkClass(isActive)}
              onClick={() => setOpen(false)}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => linkClass(isActive)} onClick={() => setOpen(false)}>
              <ShieldCheck size={15} />
              Admin
            </NavLink>
          )}
          <div className="pt-2 border-t border-[#1f2937] space-y-2">
            {liveEquity !== null && (
              <div className="flex items-center gap-1.5 bg-gold-400/10 border border-gold-400/20 rounded-lg px-3 py-2">
                <Wallet size={13} className="text-gold-400" />
                <span className="text-xs text-gray-400">Balance</span>
                <span className="text-sm font-mono font-bold text-gold-400">{fmt(liveEquity)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{user?.name}</span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm">
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
