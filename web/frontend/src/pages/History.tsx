import { useEffect, useState } from "react";
import { Transaction } from "../types";
import api from "../api";
import { format } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  buy: "badge-buy",
  sell: "badge-sell",
  deposit: "badge-deposit",
  withdrawal: "badge-sell",
};

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function History() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/account/transactions?limit=200").then((r) => setTxs(r.data)).finally(() => setLoading(false));
  }, []);

  const shown = filter === "all" ? txs : txs.filter((t) => t.type === filter);

  const totalDeposited = txs.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalProfit    = txs.filter((t) => t.type === "sell").reduce((s, t) => s + t.amount, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Transaction History</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Deposited</p>
          <p className="text-xl font-bold text-gold-400 font-mono">${totalDeposited.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Realized P&L</p>
          <p className={`text-xl font-bold font-mono ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Trades</p>
          <p className="text-xl font-bold text-white">{txs.filter((t) => t.type === "buy" || t.type === "sell").length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 bg-[#0a0a0f] p-1 rounded-lg w-fit">
          {["all", "buy", "sell", "deposit"].map((f) => (
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
          <div className="overflow-x-auto">
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
                    <td className="py-3 px-3 font-mono text-gray-300 text-xs">
                      {t.price ? t.price.toFixed(2) : "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-300 text-xs">
                      {t.lot_size ?? "—"}
                    </td>
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
        )}
      </div>
    </div>
  );
}
