import { useEffect, useState, useMemo } from "react";
import { AdminUser, AdminPosition, AdminPositionDetail, AdminTransaction } from "../types";
import api from "../api";
import { format } from "date-fns";
import { Users, DollarSign, BarChart3, TrendingUp, Settings, History, Layers } from "lucide-react";

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DepositModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/admin/deposit", { user_id: user.id, amount: parseFloat(amount), note });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Deposit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm">
        <h3 className="text-lg font-semibold text-white mb-1">Add Deposit</h3>
        <p className="text-sm text-gray-400 mb-5">
          For <span className="text-white">{user.name}</span> ({user.email})
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Amount (USD)</label>
            <input
              className="input"
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Note (optional)</label>
            <input
              className="input"
              type="text"
              placeholder="Wire transfer ref #..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-gold flex-1" disabled={loading || !amount}>
              {loading ? "Processing..." : "Confirm Deposit"}
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

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [positions, setPositions] = useState<AdminPosition[]>([]);
  const [allPositions, setAllPositions] = useState<AdminPositionDetail[]>([]);
  const [txs, setTxs] = useState<AdminTransaction[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<Record<string, number>>({});
  const [threshold, setThreshold] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [depositTarget, setDepositTarget] = useState<AdminUser | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "buy" | "sell" | "deposit">("all");
  const [posTab, setPosTab] = useState<"open" | "closed">("open");
  const [posUserFilter, setPosUserFilter] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  function loadAllPositions(tab: "open" | "closed", uid: number | "all") {
    const params = new URLSearchParams({ status: tab });
    if (uid !== "all") params.set("user_id", String(uid));
    api.get(`/admin/positions/all?${params}`).then((r) => setAllPositions(r.data));
  }

  function load() {
    Promise.all([
      api.get("/admin/users"),
      api.get("/admin/positions"),
      api.get("/admin/stats"),
      api.get("/admin/config"),
      api.get("/admin/transactions?limit=300"),
    ]).then(([u, p, s, c, t]) => {
      setUsers(u.data);
      setPositions(p.data);
      setStats(s.data);
      setConfig(c.data);
      setThreshold(String(c.data.margin_call_threshold ?? 200));
      setTxs(t.data);
    }).finally(() => setLoading(false));
  }

  async function saveThreshold() {
    const val = parseFloat(threshold);
    if (isNaN(val) || val < 0) return;
    setSavingConfig(true);
    setConfigMsg(null);
    try {
      await api.put("/admin/config", { key: "margin_call_threshold", value: val });
      setConfig((c) => ({ ...c, margin_call_threshold: val }));
      setConfigMsg({ text: "Saved successfully", ok: true });
    } catch {
      setConfigMsg({ text: "Failed to save", ok: false });
    } finally {
      setSavingConfig(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // Positions get their own interval so the filter is never stale.
  // Every time posTab or posUserFilter changes, the old interval is
  // cleared and a new one starts with the correct current values.
  useEffect(() => {
    loadAllPositions(posTab, posUserFilter);
    const t = setInterval(() => loadAllPositions(posTab, posUserFilter), 15000);
    return () => clearInterval(t);
  }, [posTab, posUserFilter]);

  async function toggleUser(user: AdminUser) {
    await api.put(`/admin/users/${user.id}/toggle`);
    load();
  }

  async function forceClose(posId: number) {
    if (!confirm("Force close this position?")) return;
    try {
      await api.post(`/admin/positions/${posId}/close`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to close position");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;
  }

  const totalFloating = positions.reduce((s, p) => s + p.floating_pl, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin Panel</h1>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-2 bg-gold-400/10 rounded-lg">
              <Users size={18} className="text-gold-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Users</p>
              <p className="text-xl font-bold text-white">{stats.total_users}</p>
              <p className="text-xs text-gray-600">{stats.verified_users} verified</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Deposited</p>
              <p className="text-xl font-bold text-white">{fmt(stats.total_deposits)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BarChart3 size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Open Positions</p>
              <p className="text-xl font-bold text-white">{stats.open_positions}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className={`p-2 rounded-lg ${totalFloating >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              <TrendingUp size={18} className={totalFloating >= 0 ? "text-emerald-400" : "text-red-400"} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Platform Floating P&L</p>
              <p className={`text-xl font-bold font-mono ${totalFloating >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalFloating >= 0 ? "+" : ""}{fmt(totalFloating)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User management */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">Users</h2>

        {users.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No users registered yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f2937]">
                  {["User", "Status", "Limit", "Balance", "Equity", "Floating P&L", "Open Pos.", "Actions"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1f2937]/30 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Joined {format(new Date(u.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className={`badge-${u.is_verified ? "buy" : "sell"}`}>
                          {u.is_verified ? "Verified" : "Pending"}
                        </span>
                        <br />
                        <span className={`badge-${u.is_active ? "deposit" : "sell"} mt-1`}>
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-gold-400 font-semibold">
                      {fmt(u.allocated_limit)}
                    </td>
                    <td className="py-3 px-3 font-mono text-white">
                      {fmt(u.balance)}
                    </td>
                    <td className={`py-3 px-3 font-mono font-semibold ${u.equity >= u.allocated_limit * 0.5 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmt(u.equity)}
                    </td>
                    <td className={`py-3 px-3 font-mono font-semibold ${u.floating_pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {u.floating_pl >= 0 ? "+" : ""}{fmt(u.floating_pl)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-gold-400/10 text-gold-400 text-xs px-2 py-0.5 rounded-full font-medium">
                        {u.open_positions}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button
                          className="btn-gold text-xs py-1.5 px-3"
                          onClick={() => setDepositTarget(u)}
                        >
                          Deposit
                        </button>
                        <button
                          className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${
                            u.is_active
                              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                          onClick={() => toggleUser(u)}
                        >
                          {u.is_active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Positions — open & closed with user filter */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Positions</h2>
            <span className="bg-gold-400/10 text-gold-400 text-xs px-2 py-0.5 rounded-full">{allPositions.length}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* User filter */}
            <select
              className="bg-[#0a0a0f] border border-[#1f2937] text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold-400"
              value={posUserFilter === "all" ? "all" : String(posUserFilter)}
              onChange={(e) => setPosUserFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>

            {/* Status tabs */}
            <div className="flex gap-1 bg-[#0a0a0f] p-1 rounded-lg">
              {(["open", "closed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPosTab(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                    posTab === tab ? "bg-[#1f2937] text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {allPositions.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No positions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f2937]">
                  {(posTab === "open"
                    ? ["User", "Balance", "Ticket", "Dir", "Entry", "Lot", "Floating P&L", "Opened", "Action"]
                    : ["User", "Balance", "Ticket", "Dir", "Entry", "Close", "Lot", "P&L", "Opened", "Closed"]
                  ).map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {allPositions.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1f2937]/30 transition-colors">
                    {/* User */}
                    <td className="py-3 px-3">
                      <p className="font-medium text-white text-xs">{p.user_name}</p>
                      <p className="text-xs text-gray-500">{p.user_email}</p>
                    </td>
                    {/* Balance */}
                    <td className="py-3 px-3 font-mono text-xs text-gold-400 font-semibold whitespace-nowrap">
                      {fmt(p.user_balance)}
                    </td>
                    {/* Ticket */}
                    <td className="py-3 px-3 font-mono text-gray-400 text-xs">{p.mt5_ticket}</td>
                    {/* Direction */}
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        p.direction === "sell" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {p.direction.toUpperCase()}
                      </span>
                    </td>
                    {/* Entry price */}
                    <td className="py-3 px-3 font-mono text-xs text-gray-300">{p.entry_price.toFixed(2)}</td>
                    {posTab === "open" ? (
                      <>
                        {/* Lot */}
                        <td className="py-3 px-3 font-mono text-xs text-gray-300">{p.lot_size}</td>
                        {/* Floating P&L */}
                        <td className={`py-3 px-3 font-mono font-semibold text-xs ${(p.floating_pl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {(p.floating_pl ?? 0) >= 0 ? "+" : ""}${(p.floating_pl ?? 0).toFixed(2)}
                        </td>
                        {/* Opened */}
                        <td className="py-3 px-3 text-gray-400 text-xs whitespace-nowrap">
                          {format(new Date(p.entry_time), "MMM d, HH:mm")}
                        </td>
                        {/* Force close */}
                        <td className="py-3 px-3">
                          <button
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all whitespace-nowrap"
                            onClick={() => forceClose(p.id)}
                          >
                            Force Close
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Close price */}
                        <td className="py-3 px-3 font-mono text-xs text-gray-300">
                          {p.close_price != null ? p.close_price.toFixed(2) : "—"}
                        </td>
                        {/* Lot */}
                        <td className="py-3 px-3 font-mono text-xs text-gray-300">{p.lot_size}</td>
                        {/* Realized P&L */}
                        <td className={`py-3 px-3 font-mono font-semibold text-xs ${(p.profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {p.profit != null
                            ? `${p.profit >= 0 ? "+" : ""}${fmt(p.profit)}`
                            : "—"}
                        </td>
                        {/* Opened */}
                        <td className="py-3 px-3 text-gray-400 text-xs whitespace-nowrap">
                          {format(new Date(p.entry_time), "MMM d, HH:mm")}
                        </td>
                        {/* Closed */}
                        <td className="py-3 px-3 text-gray-400 text-xs whitespace-nowrap">
                          {p.close_time ? format(new Date(p.close_time), "MMM d, HH:mm") : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade history */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <History size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Trade History</h2>
            <span className="bg-gold-400/10 text-gold-400 text-xs px-2 py-0.5 rounded-full">{txs.length}</span>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 bg-[#0a0a0f] p-1 rounded-lg">
            {(["all", "buy", "sell", "deposit"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTxFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                  txFilter === f ? "bg-[#1f2937] text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const filtered = txFilter === "all" ? txs : txs.filter((t) => t.type === txFilter);
          if (filtered.length === 0) {
            return <p className="text-gray-600 text-sm text-center py-8">No transactions found</p>;
          }
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f2937]">
                    {["User", "Type", "Ticket", "Price", "Lot", "P&L / Amount", "Note", "Time"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2937]">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1f2937]/30 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-medium text-white text-xs">{t.user_name}</p>
                        <p className="text-xs text-gray-500">{t.user_email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          t.type === "buy"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : t.type === "sell"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gold-400/20 text-gold-400"
                        }`}>
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-400 text-xs">
                        {t.mt5_ticket ?? "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-gray-300">
                        {t.price != null ? t.price.toFixed(2) : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-gray-300">
                        {t.lot_size != null ? t.lot_size : "—"}
                      </td>
                      <td className={`py-3 px-3 font-mono font-semibold text-xs ${
                        t.type === "buy" ? "text-gray-400" :
                        t.amount >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {t.type === "buy"
                          ? "—"
                          : `${t.amount >= 0 ? "+" : ""}${fmt(t.amount)}`}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-400 max-w-[200px] truncate" title={t.note ?? ""}>
                        {t.note ?? "—"}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(t.created_at), "MMM d, HH:mm:ss")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Platform settings */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={16} className="text-gold-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Platform Settings</h2>
        </div>

        <div className="max-w-sm space-y-3">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
              Margin Call Threshold (USD)
            </label>
            <p className="text-xs text-gray-600 mb-2">
              If a user's equity (balance + floating P&L) drops below this amount, all their open positions are automatically force-closed.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  className="input pl-7"
                  type="number"
                  min="0"
                  step="10"
                  value={threshold}
                  onChange={(e) => { setThreshold(e.target.value); setConfigMsg(null); }}
                />
              </div>
              <button
                className="btn-gold px-5"
                onClick={saveThreshold}
                disabled={savingConfig}
              >
                {savingConfig ? "Saving..." : "Save"}
              </button>
            </div>
            {configMsg && (
              <p className={`text-xs mt-2 ${configMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                {configMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Deposit modal */}
      {depositTarget && (
        <DepositModal
          user={depositTarget}
          onClose={() => setDepositTarget(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
