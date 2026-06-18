import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Wallet, BarChart3, Activity, Clock } from "lucide-react";
import api from "../api";
import { AccountSummary, BalancePoint, Transaction, WithdrawalRequest } from "../types";
import StatCard from "../components/StatCard";
import BalanceChart from "../components/BalanceChart";
import { format } from "date-fns";
import { useMarket } from "../context/MarketContext";
import { useAccount } from "../context/AccountContext";

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { livePositions } = useMarket();
  const { balance: liveBalance, myTickets } = useAccount();
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [history, setHistory] = useState<BalancePoint[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/account/summary"),
      api.get("/account/balance-history"),
      api.get("/account/transactions?limit=10"),
      api.get("/account/withdrawals"),
    ]).then(([s, h, t, w]) => {
      setSummary(s.data);
      setHistory(h.data);
      setTxs(t.data);
      setPendingWithdrawal((w.data as WithdrawalRequest[]).some((r) => r.status === "pending"));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;
  }

  // Live floating P&L from WS stream (0.5s); balance from AccountContext (5s)
  const liveFloating = myTickets.reduce((s, t) => s + (livePositions[t] ?? 0), 0);
  const balance = liveBalance ?? summary?.balance ?? null;
  const liveEquity = balance !== null ? balance + liveFloating : null;
  const floatingColor = liveFloating >= 0 ? "green" : "red";
  const profitColor = !summary ? "default" : summary.today_profit >= 0 ? "green" : "red";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome, {summary?.name}</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Your trading overview</p>
        </div>
        <Link to="/trade" className="btn-gold text-sm shrink-0">Trade Now</Link>
      </div>

      {/* Pending withdrawal banner */}
      {pendingWithdrawal && (
        <div className="flex items-center gap-3 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
          <Clock size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            You have a withdrawal request under review. We'll notify you once it's processed.{" "}
            <Link to="/history" className="underline hover:text-amber-200">View details</Link>
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Balance"
          value={balance !== null ? fmt(balance) : "—"}
          sub={`Limit: ${summary ? fmt(summary.allocated_limit) : "—"}`}
          icon={<Wallet size={16} />}
          color="gold"
        />
        <StatCard
          label="Equity"
          value={liveEquity !== null ? fmt(liveEquity) : "—"}
          sub="Balance + Floating P&L"
          icon={<BarChart3 size={16} />}
          color={liveEquity !== null && summary && liveEquity >= summary.allocated_limit * 0.9 ? "green" : "red"}
        />
        <StatCard
          label="Floating P&L"
          value={`${liveFloating >= 0 ? "+" : ""}${fmt(liveFloating)}`}
          sub={`${myTickets.length} open position${myTickets.length !== 1 ? "s" : ""}`}
          icon={<Activity size={16} />}
          color={floatingColor}
        />
        <StatCard
          label="Today's Profit"
          value={summary ? `${summary.today_profit >= 0 ? "+" : ""}${fmt(summary.today_profit)}` : "—"}
          sub="Realized today"
          icon={summary && summary.today_profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          color={profitColor}
        />
      </div>

      {/* Balance chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Balance History</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-gold-400 inline-block rounded" /> Balance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Equity
            </span>
          </div>
        </div>
        <BalanceChart data={history} />
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Recent Transactions</h2>
          <Link to="/history" className="text-xs text-gold-400 hover:underline">View all</Link>
        </div>

        {txs.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="divide-y divide-[#1f2937]">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 ${
                    t.type === "buy" ? "badge-buy" :
                    t.type === "sell" ? "badge-sell" : "badge-deposit"
                  }`}>
                    {t.type.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-400 truncate">{t.note}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono font-semibold ${
                    t.type === "sell" || t.type === "deposit"
                      ? t.amount >= 0 ? "text-emerald-400" : "text-red-400"
                      : "text-gray-400"
                  }`}>
                    {t.type === "buy" ? "" : t.amount >= 0 ? "+" : ""}
                    {t.type !== "buy" ? fmt(t.amount) : fmt(t.price ?? 0)}
                  </span>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {format(new Date(t.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
