import { useState } from "react";
import { Tick } from "../types";
import api from "../api";

const LOT_SIZES = [0.01, 0.1, 0.5, 1.0, 2.0];

interface Props {
  tick: Tick | null;
  onOrderPlaced: () => void;
}

export default function TradePanel({ tick, onOrderPlaced }: Props) {
  const [lotSize, setLotSize] = useState(0.01);
  const [loading, setLoading] = useState<"buy" | "sell" | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function placeBuy() {
    setLoading("buy");
    setMsg(null);
    try {
      const res = await api.post("/trading/buy", { lot_size: lotSize });
      setMsg({ text: `BUY placed @ ${res.data.price}`, ok: true });
      onOrderPlaced();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "Order failed", ok: false });
    } finally {
      setLoading(null);
    }
  }

  async function placeSell() {
    setLoading("sell");
    setMsg(null);
    try {
      const res = await api.post("/trading/short", { lot_size: lotSize });
      setMsg({ text: `SELL placed @ ${res.data.price}`, ok: true });
      onOrderPlaced();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "Order failed", ok: false });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="card flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">New Order</h3>

      {/* Live Price */}
      <div className="bg-[#0a0a0f] rounded-lg p-4 text-center border border-[#1f2937]">
        <p className="text-xs text-gray-500 mb-1">XAU/USD</p>
        {tick ? (
          <div className="space-y-1">
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-xs text-emerald-400 mb-0.5">BID</p>
                <p className="text-xl font-bold font-mono text-white">{tick.bid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-red-400 mb-0.5">ASK</p>
                <p className="text-xl font-bold font-mono text-white">{tick.ask.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Spread: {(tick.ask - tick.bid).toFixed(2)}
            </p>
          </div>
        ) : (
          <p className="text-gray-600 text-sm">Connecting...</p>
        )}
      </div>

      {/* Lot size */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Lot Size</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {LOT_SIZES.map((l) => (
            <button
              key={l}
              onClick={() => setLotSize(l)}
              className={`py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                lotSize === l
                  ? "bg-gold-400 text-black"
                  : "bg-[#1f2937] text-gray-300 hover:bg-[#374151]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#1f2937] rounded-lg p-3 text-xs space-y-1.5">
        <div className="flex justify-between text-gray-400">
          <span>Lot size</span>
          <span className="font-mono text-white">{lotSize}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Entry price (est.)</span>
          <span className="font-mono text-white">{tick ? tick.ask.toFixed(2) : "—"}</span>
        </div>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`text-xs rounded-lg px-3 py-2 ${msg.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {msg.text}
        </div>
      )}

      {/* BUY / SELL buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="btn-green text-base py-3"
          onClick={placeBuy}
          disabled={!!loading || !tick}
        >
          {loading === "buy" ? "Placing..." : "BUY"}
        </button>
        <button
          className="btn-red text-base py-3"
          onClick={placeSell}
          disabled={!!loading || !tick}
        >
          {loading === "sell" ? "Placing..." : "SELL"}
        </button>
      </div>
    </div>
  );
}
