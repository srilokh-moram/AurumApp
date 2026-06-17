import { useEffect, useState } from "react";
import { AdminUser, AdminPosition } from "../types";
import api from "../api";
import { format } from "date-fns";
import { Users, DollarSign, BarChart3, TrendingUp } from "lucide-react";

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
  const [stats, setStats] = useState<any>(null);
  const [depositTarget, setDepositTarget] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      api.get("/admin/users"),
      api.get("/admin/positions"),
      api.get("/admin/stats"),
    ]).then(([u, p, s]) => {
      setUsers(u.data);
      setPositions(p.data);
      setStats(s.data);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

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

      {/* All open positions */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            All Open Positions
          </h2>
          <span className="bg-gold-400/10 text-gold-400 text-xs px-2 py-0.5 rounded-full">
            {positions.length} total
          </span>
        </div>

        {positions.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No open positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f2937]">
                  {["User", "Ticket", "Symbol", "Entry", "Lot", "Gap", "Floating P&L", "Opened", "Action"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {positions.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1f2937]/30 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-medium text-white text-xs">{p.user_name}</p>
                      <p className="text-xs text-gray-500">{p.user_email}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-400 text-xs">{p.mt5_ticket}</td>
                    <td className="py-3 px-3 text-gold-400 font-semibold text-xs">{p.symbol}</td>
                    <td className="py-3 px-3 font-mono text-xs">{p.entry_price.toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-xs">{p.lot_size}</td>
                    <td className="py-3 px-3 font-mono text-xs">${p.grid_gap}</td>
                    <td className={`py-3 px-3 font-mono font-semibold text-xs ${p.floating_pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {p.floating_pl >= 0 ? "+" : ""}${p.floating_pl.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {format(new Date(p.entry_time), "MMM d, HH:mm")}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        onClick={() => forceClose(p.id)}
                      >
                        Force Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
