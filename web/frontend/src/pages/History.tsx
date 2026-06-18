import { useEffect, useState } from "react";
import { Transaction, WithdrawalRequest } from "../types";
import api from "../api";
import { format } from "date-fns";
import { ArrowUpCircle, X } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  buy: "badge-buy",
  sell: "badge-sell",
  deposit: "badge-deposit",
  withdrawal: "badge-sell",
};

const WD_STATUS_STYLE: Record<string, string> = {
  pending:  "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function WithdrawModal({ balance, onClose, onSuccess }: { balance: number; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (amt > balance) { setError(`Cannot exceed your balance of ${fmt(balance)}`); return; }
    setLoading(true);
    try {
      await api.post("/account/withdraw", { amount: amt, note: note || undefined });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Request Withdrawal</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Available balance: <span className="text-gold-400 font-mono font-semibold">{fmt(balance)}</span>
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                className="input pl-7"
                type="number"
                min="1"
                step="0.01"
                max={balance}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Note (optional)</label>
            <input
              className="input"
              type="text"
              placeholder="Bank account, reason, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-600">Your request will be reviewed by an admin before funds are released.</p>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-gold flex-1" disabled={loading || !amount}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
            <button type="button" className="btn-ghost flex-1" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function History() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [balance, setBalance] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  function loadAll() {
    return Promise.all([
      api.get("/account/transactions?limit=200"),
      api.get("/account/withdrawals"),
      api.get("/account/summary"),
    ]).then(([t, w, s]) => {
      setTxs(t.data);
      setWithdrawals(w.data);
      setBalance(s.data.balance);
    });
  }

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, []);

  const shown = filter === "all" ? txs : txs.filter((t) => t.type === filter);
  const totalDeposited = txs.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalProfit    = txs.filter((t) => t.type === "sell").reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = txs.filter((t) => t.type === "withdrawal").reduce((s, t) => s + Math.abs(t.amount), 0);
  const hasPendingWd   = withdrawals.some((w) => w.status === "pending");

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        <button
          className="flex items-center gap-2 btn-gold text-sm py-2 px-4 disabled:opacity-50"
          onClick={() => setShowWithdrawModal(true)}
          disabled={hasPendingWd}
          title={hasPendingWd ? "You already have a pending withdrawal request" : ""}
        >
          <ArrowUpCircle size={15} />
          {hasPendingWd ? "Withdrawal Pending" : "Request Withdrawal"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="card text-center p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Deposited</p>
          <p className="text-base sm:text-xl font-bold text-gold-400 font-mono truncate">{fmt(totalDeposited)}</p>
        </div>
        <div className="card text-center p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Withdrawn</p>
          <p className="text-base sm:text-xl font-bold text-red-400 font-mono truncate">{fmt(totalWithdrawn)}</p>
        </div>
        <div className="card text-center p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Realized P&L</p>
          <p className={`text-base sm:text-xl font-bold font-mono truncate ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)}
          </p>
        </div>
        <div className="card text-center p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Trades</p>
          <p className="text-base sm:text-xl font-bold text-white">{txs.filter((t) => t.type === "buy" || t.type === "sell").length}</p>
        </div>
      </div>

      {/* Withdrawal requests */}
      {withdrawals.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Withdrawal Requests</h2>
            {hasPendingWd && (
              <span className="bg-amber-400/10 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">Pending</span>
            )}
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {withdrawals.map((w) => (
              <div key={w.id} className="bg-[#0f1117] rounded-xl border border-[#1f2937] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${WD_STATUS_STYLE[w.status]}`}>
                    {w.status}
                  </span>
                  <span className="text-xs text-gray-500">{format(new Date(w.created_at), "MMM d, HH:mm")}</span>
                </div>
                <p className="font-mono font-bold text-lg text-white">{fmt(w.amount)}</p>
                {w.note && <p className="text-xs text-gray-500 mt-1">{w.note}</p>}
                {w.status === "rejected" && w.reject_reason && (
                  <p className="text-xs text-red-400 mt-1 bg-red-500/10 px-2 py-1 rounded">
                    Reason: {w.reject_reason}
                  </p>
                )}
                {w.reviewed_at && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    Reviewed {format(new Date(w.reviewed_at), "MMM d, HH:mm")}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f2937]">
                  {["Status", "Amount", "Note", "Requested", "Reviewed"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-[#1f2937]/30 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${WD_STATUS_STYLE[w.status]}`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-white">{fmt(w.amount)}</td>
                    <td className="py-3 px-3 text-xs text-gray-400 max-w-[200px] truncate">{w.note || "—"}</td>
                    <td className="py-3 px-3 text-xs text-gray-500">{format(new Date(w.created_at), "MMM d yyyy, HH:mm")}</td>
                    <td className="py-3 px-3 text-xs text-gray-500">
                      {w.reviewed_at ? format(new Date(w.reviewed_at), "MMM d yyyy, HH:mm") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="card">
        <div className="flex gap-1 mb-5 bg-[#0a0a0f] p-1 rounded-lg w-fit">
          {["all", "buy", "sell", "deposit", "withdrawal"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                filter === f ? "bg-[#1f2937] text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">No transactions</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-[#1f2937]">
              {shown.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-3.5">
                  <span className={TYPE_COLORS[t.type] || "badge-deposit"}>
                    {t.type.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 truncate">{t.note || "—"}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {t.price ? `@ ${t.price.toFixed(2)}` : ""}{t.lot_size ? ` · ${t.lot_size} lot` : ""}
                      {" · "}{format(new Date(t.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                  <span className={`text-sm font-mono font-semibold shrink-0 ${
                    t.type === "buy" ? "text-gray-500" :
                    t.amount >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {t.type === "buy" ? "—" : `${t.amount >= 0 ? "+" : ""}${fmt(t.amount)}`}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f2937]">
                    {["Type", "Details", "Price", "Volume", "Amount", "Date"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2937]">
                  {shown.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1f2937]/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className={TYPE_COLORS[t.type] || "badge-deposit"}>
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs max-w-[200px] truncate">{t.note || "—"}</td>
                      <td className="py-3 px-3 font-mono text-gray-300 text-xs">{t.price ? t.price.toFixed(2) : "—"}</td>
                      <td className="py-3 px-3 font-mono text-gray-300 text-xs">{t.lot_size ?? "—"}</td>
                      <td className={`py-3 px-3 font-mono font-semibold text-xs ${
                        t.type === "buy" ? "text-gray-400" :
                        t.amount >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {t.type === "buy" ? "—" : `${t.amount >= 0 ? "+" : ""}${fmt(t.amount)}`}
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs">
                        {format(new Date(t.created_at), "MMM d yyyy, HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showWithdrawModal && (
        <WithdrawModal
          balance={balance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={loadAll}
        />
      )}
    </div>
  );
}
