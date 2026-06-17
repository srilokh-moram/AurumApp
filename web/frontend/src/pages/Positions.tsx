import { useEffect, useState } from "react";
import { Position } from "../types";
import api from "../api";
import PositionTable from "../components/PositionTable";

export default function Positions() {
  const [all, setAll] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "closed">("open");

  useEffect(() => {
    api.get("/trading/positions/history").then((r) => setAll(r.data)).finally(() => setLoading(false));
  }, []);

  const open   = all.filter((p) => p.status === "open");
  const closed = all.filter((p) => p.status === "closed");
  const shown  = tab === "open" ? open : closed;

  const totalProfit = closed.reduce((s, p) => s + (p.profit ?? 0), 0);
  const wins  = closed.filter((p) => (p.profit ?? 0) > 0).length;
  const losses = closed.filter((p) => (p.profit ?? 0) < 0).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Positions</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Open</p>
          <p className="text-2xl font-bold text-gold-400">{open.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Closed</p>
          <p className="text-2xl font-bold text-white">{closed.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Win / Loss</p>
          <p className="text-xl font-bold">
            <span className="text-emerald-400">{wins}</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-red-400">{losses}</span>
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Realized P&L</p>
          <p className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex gap-1 mb-5 bg-[#0a0a0f] p-1 rounded-lg w-fit">
          {(["open", "closed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                tab === t ? "bg-[#1f2937] text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t} ({t === "open" ? open.length : closed.length})
            </button>
          ))}
        </div>

        <PositionTable positions={shown} />
      </div>
    </div>
  );
}
