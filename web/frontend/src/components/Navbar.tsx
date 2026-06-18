import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { useMarket } from "../context/MarketContext";
import {
  LayoutDashboard, TrendingUp, List, History, ShieldCheck, LogOut,
  Menu, X, Wallet, Bell, DollarSign, CheckCircle, XCircle,
  AlertTriangle, TrendingDown, User,
} from "lucide-react";
import api from "../api";
import { Notification } from "../types";
import { format } from "date-fns";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trade",     label: "Trade",     icon: TrendingUp },
  { to: "/positions", label: "Positions", icon: List },
  { to: "/history",   label: "History",   icon: History },
];

const NOTIF_ICON: Record<string, React.ReactNode> = {
  deposit:              <DollarSign   size={14} className="text-emerald-400" />,
  withdrawal_approved:  <CheckCircle  size={14} className="text-emerald-400" />,
  withdrawal_rejected:  <XCircle      size={14} className="text-red-400"     />,
  margin_call:          <AlertTriangle size={14} className="text-red-400"    />,
  order_filled:         <TrendingDown  size={14} className="text-blue-400"   />,
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { balance, myTickets } = useAccount();
  const { livePositions } = useMarket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Notification bell
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  function loadNotifications() {
    if (!user || user.is_admin) return;
    api.get("/account/notifications").then((r) => setNotifications(r.data)).catch(() => {});
  }

  function markAllRead() {
    api.post("/account/notifications/read-all").then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }).catch(() => {});
  }

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const liveFloating = myTickets.reduce((s, t) => s + (livePositions[t] ?? 0), 0);
  const liveEquity   = balance !== null ? balance + liveFloating : null;

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function handleLogout() { logout(); navigate("/login"); }

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive ? "bg-gold-400/10 text-gold-400" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
    }`;

  return (
    <nav className="bg-[#111827] border-b border-[#1f2937] sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center h-14 gap-4">
        {/* Brand */}
        <img src="/logo.svg" alt="CB Markets" className="h-10 w-auto mr-1 shrink-0" />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
              <Icon size={15} />{label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => linkClass(isActive)}>
              <ShieldCheck size={15} />Admin
            </NavLink>
          )}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {liveEquity !== null && (
            <div className="flex items-center gap-1.5 bg-gold-400/10 border border-gold-400/20 rounded-lg px-3 py-1.5">
              <Wallet size={13} className="text-gold-400" />
              <span className="text-xs text-gray-400">Equity</span>
              <span className="text-sm font-mono font-bold text-gold-400">{fmt(liveEquity)}</span>
            </div>
          )}

          {/* Notification bell */}
          {!user?.is_admin && (
            <div className="relative" ref={notifRef}>
              <button
                className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                onClick={() => { setShowNotifs((v) => !v); if (!showNotifs && unread > 0) markAllRead(); }}
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#111827] border border-[#1f2937] rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937]">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <button onClick={markAllRead} className="text-xs text-gold-400 hover:underline">Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-600 text-sm py-8">No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-[#1f2937] last:border-0 ${n.read ? "" : "bg-gold-400/5"}`}>
                          <div className="mt-0.5 shrink-0">{NOTIF_ICON[n.type] ?? <Bell size={14} className="text-gray-400" />}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">{n.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-gray-600 mt-1">{format(new Date(n.created_at), "MMM d, HH:mm")}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 bg-gold-400 rounded-full mt-1.5 shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile + name */}
          <NavLink to="/profile" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <User size={15} />
            {user?.name}
          </NavLink>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm">
            <LogOut size={15} />Sign out
          </button>
        </div>

        {/* Mobile: balance + bell + hamburger */}
        <div className="md:hidden ml-auto flex items-center gap-2">
          {liveEquity !== null && (
            <div className="flex items-center gap-1.5">
              <Wallet size={12} className="text-gold-400" />
              <span className="font-mono font-bold text-gold-400 text-sm">{fmt(liveEquity)}</span>
            </div>
          )}
          {!user?.is_admin && (
            <button
              className="relative p-1 text-gray-400"
              onClick={() => { setShowNotifs((v) => !v); if (!showNotifs && unread > 0) markAllRead(); }}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          )}
          <button className="text-gray-400 hover:text-white p-1" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile notification dropdown */}
      {showNotifs && !open && (
        <div className="md:hidden bg-[#111827] border-t border-[#1f2937] max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1f2937]">
            <p className="text-xs font-semibold text-white">Notifications</p>
            <button onClick={markAllRead} className="text-xs text-gold-400">Mark all read</button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-center text-gray-600 text-xs py-6">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-[#1f2937] last:border-0 ${n.read ? "" : "bg-gold-400/5"}`}>
                <div className="mt-0.5 shrink-0">{NOTIF_ICON[n.type] ?? <Bell size={13} className="text-gray-400" />}</div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{format(new Date(n.created_at), "MMM d, HH:mm")}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#111827] border-t border-[#1f2937] px-4 pb-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)} onClick={() => setOpen(false)}>
              <Icon size={15} />{label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => linkClass(isActive)} onClick={() => setOpen(false)}>
              <ShieldCheck size={15} />Admin
            </NavLink>
          )}
          <NavLink to="/profile" className={({ isActive }) => linkClass(isActive)} onClick={() => setOpen(false)}>
            <User size={15} />Profile
          </NavLink>
          <div className="pt-2 border-t border-[#1f2937] space-y-2">
            {liveEquity !== null && (
              <div className="flex items-center gap-1.5 bg-gold-400/10 border border-gold-400/20 rounded-lg px-3 py-2">
                <Wallet size={13} className="text-gold-400" />
                <span className="text-xs text-gray-400">Equity</span>
                <span className="text-sm font-mono font-bold text-gold-400">{fmt(liveEquity)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{user?.name}</span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm">
                <LogOut size={15} />Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
