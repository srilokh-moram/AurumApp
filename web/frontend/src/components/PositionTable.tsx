import { Position } from "../types";
import { format } from "date-fns";

interface Props {
  positions: Position[];
  onSell?: (id: number) => void;
  loading?: boolean;
}

export default function PositionTable({ positions, onSell, loading }: Props) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600 text-sm">
        No positions to show
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1f2937]">
            {["Dir", "Ticket", "Symbol", "Entry Price", "Lot", "Grid Gap", "Time", "P&L", onSell ? "Action" : "Close Price", onSell ? "" : "Profit"].filter(Boolean).map((h) => (
              <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1f2937]">
          {positions.map((p) => {
            const pl = p.floating_pl ?? p.profit ?? 0;
            const isPositive = pl >= 0;
            return (
              <tr key={p.id} className="hover:bg-[#1f2937]/30 transition-colors">
                <td className="py-3 px-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.direction === "sell" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {(p.direction ?? "buy").toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-gray-400 text-xs">{p.mt5_ticket}</td>
                <td className="py-3 px-3 font-semibold text-gold-400">{p.symbol}</td>
                <td className="py-3 px-3 font-mono">{p.entry_price.toFixed(2)}</td>
                <td className="py-3 px-3 font-mono text-gray-300">{p.lot_size}</td>
                <td className="py-3 px-3 font-mono text-gray-300">${p.grid_gap}</td>
                <td className="py-3 px-3 text-gray-400 text-xs">
                  {format(new Date(p.entry_time), "MMM d, HH:mm")}
                </td>
                <td className={`py-3 px-3 font-mono font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                </td>
                {onSell ? (
                  <td className="py-3 px-3">
                    <button
                      className="btn-red text-xs py-1.5 px-3"
                      onClick={() => onSell(p.id)}
                      disabled={loading}
                    >
                      Close
                    </button>
                  </td>
                ) : (
                  <td className="py-3 px-3 font-mono text-gray-400 text-xs">
                    {p.close_price ? p.close_price.toFixed(2) : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
