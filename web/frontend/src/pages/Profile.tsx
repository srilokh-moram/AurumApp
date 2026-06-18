import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccount } from "../context/AccountContext";
import { useMarket } from "../context/MarketContext";
import { Link } from "react-router-dom";
import { User, Mail, Wallet, ArrowUpCircle, Edit2, Check, X } from "lucide-react";
import api from "../api";

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Profile() {
  const { user } = useAuth();
  const { balance, myTickets, refresh } = useAccount();
  const { livePositions } = useMarket();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    api.get("/account/summary").then((r) => setSummary(r.data));
  }, []);

  const liveFloating = myTickets.reduce((s, t) => s + (livePositions[t] ?? 0), 0);
  const liveEquity   = balance !== null ? balance + liveFloating : null;

  async function saveName() {
    const name = nameInput.trim();
    if (!name) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      await api.put("/account/profile", { name });
      setNameMsg({ text: "Name updated", ok: true });
      setEditingName(false);
      refresh();
      setTimeout(() => setNameMsg(null), 3000);
    } catch (err: any) {
      setNameMsg({ text: err.response?.data?.detail || "Failed to save", ok: false });
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      {/* Identity card */}
      <div className="card space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gold-400/10 border border-gold-400/20 flex items-center justify-center shrink-0">
            <User size={24} className="text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="input text-sm py-1.5 flex-1"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  autoFocus
                />
                <button onClick={saveName} disabled={savingName} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                  <Check size={16} />
                </button>
                <button onClick={() => { setEditingName(false); setNameInput(user?.name ?? ""); }} className="p-1.5 rounded-lg bg-[#1f2937] text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-white truncate">{user?.name}</p>
                <button onClick={() => { setEditingName(true); setNameInput(user?.name ?? ""); }} className="p-1 text-gray-600 hover:text-gold-400 transition-colors">
                  <Edit2 size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Mail size={12} className="text-gray-500" />
              <p className="text-sm text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {nameMsg && (
          <div className={`text-xs px-3 py-2 rounded-lg ${nameMsg.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {nameMsg.text}
          </div>
        )}
      </div>

      {/* Account stats */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Account Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0f1117] rounded-xl p-4 border border-[#1f2937]">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={13} className="text-gold-400" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Balance</p>
            </div>
            <p className="font-mono font-bold text-gold-400 text-xl">
              {balance !== null ? fmt(balance) : "—"}
            </p>
          </div>
          <div className="bg-[#0f1117] rounded-xl p-4 border border-[#1f2937]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Live Equity</p>
            <p className={`font-mono font-bold text-xl ${liveEquity !== null && liveEquity >= (balance ?? 0) ? "text-emerald-400" : "text-red-400"}`}>
              {liveEquity !== null ? fmt(liveEquity) : "—"}
            </p>
          </div>
          <div className="bg-[#0f1117] rounded-xl p-4 border border-[#1f2937]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Allocated Limit</p>
            <p className="font-mono font-bold text-white text-xl">
              {summary ? fmt(summary.allocated_limit) : "—"}
            </p>
          </div>
          <div className="bg-[#0f1117] rounded-xl p-4 border border-[#1f2937]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Open Positions</p>
            <p className="font-bold text-white text-xl">{myTickets.length}</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="card space-y-2">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Quick Links</h2>
        <Link to="/history" className="flex items-center gap-3 p-3 rounded-xl bg-[#0f1117] border border-[#1f2937] hover:border-gold-400/30 transition-colors">
          <ArrowUpCircle size={16} className="text-amber-400" />
          <div>
            <p className="text-sm font-medium text-white">Withdrawal Requests</p>
            <p className="text-xs text-gray-500">View and manage your withdrawal requests</p>
          </div>
        </Link>
        <Link to="/history" className="flex items-center gap-3 p-3 rounded-xl bg-[#0f1117] border border-[#1f2937] hover:border-gold-400/30 transition-colors">
          <Wallet size={16} className="text-gold-400" />
          <div>
            <p className="text-sm font-medium text-white">Transaction History</p>
            <p className="text-xs text-gray-500">View all deposits, trades, and withdrawals</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
