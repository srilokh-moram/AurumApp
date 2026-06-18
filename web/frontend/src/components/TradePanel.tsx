import { useEffect, useState } from "react";
import { Tick } from "../types";
import api from "../api";

const GOLD_LOT_PRESETS = [
  { label: "$5",   lot: 0.05 },
  { label: "$10",  lot: 0.10 },
  { label: "$25",  lot: 0.25 },
  { label: "$50",  lot: 0.50 },
  { label: "$75",  lot: 0.75 },
  { label: "$100", lot: 1.00 },
];

const SILVER_LOT_PRESETS = [
  { label: "0.05", lot: 0.05 },
  { label: "0.10", lot: 0.10 },
  { label: "0.25", lot: 0.25 },
  { label: "0.50", lot: 0.50 },
  { label: "0.75", lot: 0.75 },
  { label: "1.00", lot: 1.00 },
];

const ORDER_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  buy_stop:   { label: "Buy Stop",   color: "text-emerald-400" },
  buy_limit:  { label: "Buy Limit",  color: "text-emerald-300" },
  sell_limit: { label: "Sell Limit", color: "text-red-300" },
  sell_stop:  { label: "Sell Stop",  color: "text-red-400" },
};

interface Props {
  tick: Tick | null;
  symbol?: string;
  onOrderPlaced: () => void;
}

export default function TradePanel({ tick, symbol = "XAUUSD", onOrderPlaced }: Props) {
  const isSilver = symbol === "XAGUSD";
  const LOT_PRESETS = isSilver ? SILVER_LOT_PRESETS : GOLD_LOT_PRESETS;

  const [mode, setMode] = useState<"market" | "pending">("market");

  // ── Shared state ──
  const [preset, setPreset] = useState(LOT_PRESETS[0]);
  const [showTpSl, setShowTpSl] = useState(false);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");

  // ── Market order state ──
  const [marketLoading, setMarketLoading] = useState<"buy" | "sell" | null>(null);
  const [marketMsg, setMarketMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Pending order state ──
  const [pendingPrice, setPendingPrice] = useState("");
  const [pendingLoading, setPendingLoading] = useState<"buy" | "sell" | null>(null);
  const [pendingMsg, setPendingMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Reset preset when symbol changes
  useEffect(() => {
    setPreset(isSilver ? SILVER_LOT_PRESETS[0] : GOLD_LOT_PRESETS[0]);
    setMarketMsg(null);
    setPendingMsg(null);
  }, [symbol]);

  // ── Helpers ──
  function adjustPrice(setter: React.Dispatch<React.SetStateAction<string>>, val: string, delta: number) {
    setter(((parseFloat(val) || 0) + delta).toFixed(2));
  }

  function toggleTp() {
    if (!tpEnabled && tick) setTpPrice((tick.ask + 10).toFixed(2));
    setTpEnabled((v) => !v);
  }

  function toggleSl() {
    if (!slEnabled && tick) setSlPrice((tick.bid - 10).toFixed(2));
    setSlEnabled((v) => !v);
  }

  function getTpSl() {
    return {
      take_profit: tpEnabled && tpPrice ? parseFloat(tpPrice) : null,
      stop_loss: slEnabled && slPrice ? parseFloat(slPrice) : null,
    };
  }

  function detectedOrderType(direction: "buy" | "sell"): string {
    if (!tick || !pendingPrice) return "";
    const price = parseFloat(pendingPrice);
    if (direction === "buy") return price > tick.ask ? "buy_stop" : "buy_limit";
    return price > tick.bid ? "sell_limit" : "sell_stop";
  }

  // ── Market order actions ──
  async function placeBuy() {
    setMarketLoading("buy"); setMarketMsg(null);
    try {
      const res = await api.post("/trading/buy", { lot_size: preset.lot, symbol, ...getTpSl() });
      setMarketMsg({ text: `BUY placed @ ${res.data.price}`, ok: true });
      onOrderPlaced();
    } catch (err: any) {
      setMarketMsg({ text: err.response?.data?.detail || "Order failed", ok: false });
    } finally { setMarketLoading(null); }
  }

  async function placeSell() {
    setMarketLoading("sell"); setMarketMsg(null);
    try {
      const res = await api.post("/trading/short", { lot_size: preset.lot, symbol, ...getTpSl() });
      setMarketMsg({ text: `SELL placed @ ${res.data.price}`, ok: true });
      onOrderPlaced();
    } catch (err: any) {
      setMarketMsg({ text: err.response?.data?.detail || "Order failed", ok: false });
    } finally { setMarketLoading(null); }
  }

  // ── Pending order actions ──
  async function placePending(direction: "buy" | "sell") {
    if (!pendingPrice) {
      setPendingMsg({ text: "Enter a target price", ok: false });
      return;
    }
    setPendingLoading(direction); setPendingMsg(null);
    try {
      const res = await api.post("/trading/pending", {
        direction,
        target_price: parseFloat(pendingPrice),
        lot_size: preset.lot,
        symbol,
        ...getTpSl(),
      });
      const typeInfo = ORDER_TYPE_LABELS[res.data.order_type];
      setPendingMsg({ text: `${typeInfo?.label ?? "Pending"} placed @ ${parseFloat(pendingPrice).toFixed(2)}`, ok: true });
      onOrderPlaced();
    } catch (err: any) {
      setPendingMsg({ text: err.response?.data?.detail || "Order failed", ok: false });
    } finally { setPendingLoading(null); }
  }

  // ── Shared UI sections ──
  const TpSlSection = (
    <div>
      <button
        onClick={() => setShowTpSl((v) => !v)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors w-full"
      >
        <span className="font-semibold uppercase tracking-wider">T/P & S/L</span>
        <span className="text-gray-600">(optional)</span>
        <span className="ml-auto text-gray-500">{showTpSl ? "▲" : "▼"}</span>
      </button>
      {showTpSl && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {/* Take Profit */}
          <div className="bg-[#0a0a0f] rounded-lg p-3 border border-[#1f2937]">
            <button onClick={toggleTp} className={`flex items-center gap-2 text-xs font-semibold mb-2 transition-colors ${tpEnabled ? "text-emerald-400" : "text-gray-500"}`}>
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${tpEnabled ? "bg-emerald-500 border-emerald-500 text-black" : "border-gray-600"}`}>{tpEnabled ? "✓" : ""}</span>
              Take Profit
            </button>
            {tpEnabled && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => adjustPrice(setTpPrice, tpPrice, -1)} className="w-9 h-9 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white font-bold text-lg flex items-center justify-center">−</button>
                <input type="number" step="0.01" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} className="flex-1 bg-[#1f2937] border border-[#374151] rounded-lg px-2 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-emerald-500/50" />
                <button onClick={() => adjustPrice(setTpPrice, tpPrice, 1)} className="w-9 h-9 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white font-bold text-lg flex items-center justify-center">+</button>
              </div>
            )}
          </div>
          {/* Stop Loss */}
          <div className="bg-[#0a0a0f] rounded-lg p-3 border border-[#1f2937]">
            <button onClick={toggleSl} className={`flex items-center gap-2 text-xs font-semibold mb-2 transition-colors ${slEnabled ? "text-red-400" : "text-gray-500"}`}>
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${slEnabled ? "bg-red-500 border-red-500 text-white" : "border-gray-600"}`}>{slEnabled ? "✓" : ""}</span>
              Stop Loss
            </button>
            {slEnabled && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => adjustPrice(setSlPrice, slPrice, -1)} className="w-9 h-9 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white font-bold text-lg flex items-center justify-center">−</button>
                <input type="number" step="0.01" value={slPrice} onChange={(e) => setSlPrice(e.target.value)} className="flex-1 bg-[#1f2937] border border-[#374151] rounded-lg px-2 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-red-500/50" />
                <button onClick={() => adjustPrice(setSlPrice, slPrice, 1)} className="w-9 h-9 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white font-bold text-lg flex items-center justify-center">+</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const LotSection = (
    <div>
      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
        {isSilver ? "Lot Size" : "Amount"}
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {LOT_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p)}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${preset.label === p.label ? "bg-gold-400 text-black" : "bg-[#1f2937] text-gray-300 hover:bg-[#374151]"}`}
          >{p.label}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">New Order</h3>
        <div className="flex bg-[#0a0a0f] rounded-lg p-0.5 border border-[#1f2937]">
          {(["market", "pending"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMarketMsg(null); setPendingMsg(null); }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${mode === m ? "bg-[#1f2937] text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {m === "market" ? "Market" : "Pending"}
            </button>
          ))}
        </div>
      </div>

      {/* Live Price */}
      <div className="bg-[#0a0a0f] rounded-lg p-4 text-center border border-[#1f2937]">
        {tick ? (
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
        ) : (
          <p className="text-gray-600 text-sm">Connecting...</p>
        )}
      </div>

      {/* ── MARKET ORDER ── */}
      {mode === "market" && (
        <>
          {LotSection}
          {TpSlSection}

          <div className="bg-[#1f2937] rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-gray-400">
              <span>{isSilver ? "Lot Size" : "Amount"}</span>
              <span className="font-mono text-white">{preset.label} ({preset.lot} lot)</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Entry price (est.)</span>
              <span className="font-mono text-white">{tick ? tick.ask.toFixed(2) : "—"}</span>
            </div>
            {tpEnabled && tpPrice && <div className="flex justify-between text-gray-400"><span>Take Profit</span><span className="font-mono text-emerald-400">{tpPrice}</span></div>}
            {slEnabled && slPrice && <div className="flex justify-between text-gray-400"><span>Stop Loss</span><span className="font-mono text-red-400">{slPrice}</span></div>}
          </div>

          {marketMsg && (
            <div className={`text-xs rounded-lg px-3 py-2 ${marketMsg.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {marketMsg.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button className="btn-green text-base py-3" onClick={placeBuy} disabled={!!marketLoading || !tick}>
              {marketLoading === "buy" ? "Placing..." : "BUY"}
            </button>
            <button className="btn-red text-base py-3" onClick={placeSell} disabled={!!marketLoading || !tick}>
              {marketLoading === "sell" ? "Placing..." : "SELL"}
            </button>
          </div>
        </>
      )}

      {/* ── PENDING ORDER ── */}
      {mode === "pending" && (
        <>
          {/* Target Price */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Target Price</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustPrice(setPendingPrice, pendingPrice || (tick?.ask.toFixed(2) ?? "0"), -1)}
                className="w-11 h-11 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white font-bold text-xl flex items-center justify-center transition-colors"
              >−</button>
              <input
                type="number"
                step="0.01"
                value={pendingPrice}
                onChange={(e) => setPendingPrice(e.target.value)}
                placeholder={tick ? tick.ask.toFixed(2) : "0.00"}
                className="flex-1 bg-[#0a0a0f] border border-[#1f2937] rounded-lg px-3 py-3 text-base font-mono text-white text-center focus:outline-none focus:border-gold-400/50"
              />
              <button
                onClick={() => adjustPrice(setPendingPrice, pendingPrice || (tick?.ask.toFixed(2) ?? "0"), 1)}
                className="w-11 h-11 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white font-bold text-xl flex items-center justify-center transition-colors"
              >+</button>
            </div>
            {pendingPrice && tick && (
              <div className="mt-1.5 flex gap-3 justify-center">
                {(["buy", "sell"] as const).map((dir) => {
                  const ot = detectedOrderType(dir);
                  const info = ORDER_TYPE_LABELS[ot];
                  return info ? (
                    <span key={dir} className={`text-xs font-mono ${info.color}`}>
                      {dir.toUpperCase()} → {info.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {LotSection}
          {TpSlSection}

          <div className="bg-[#1f2937] rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-gray-400">
              <span>Target Price</span>
              <span className="font-mono text-white">{pendingPrice || "—"}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{isSilver ? "Lot Size" : "Amount"}</span>
              <span className="font-mono text-white">{preset.label} ({preset.lot} lot)</span>
            </div>
            {tpEnabled && tpPrice && <div className="flex justify-between text-gray-400"><span>Take Profit</span><span className="font-mono text-emerald-400">{tpPrice}</span></div>}
            {slEnabled && slPrice && <div className="flex justify-between text-gray-400"><span>Stop Loss</span><span className="font-mono text-red-400">{slPrice}</span></div>}
          </div>

          {pendingMsg && (
            <div className={`text-xs rounded-lg px-3 py-2 ${pendingMsg.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {pendingMsg.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button className="btn-green text-base py-3" onClick={() => placePending("buy")} disabled={!!pendingLoading || !tick}>
              {pendingLoading === "buy" ? "Placing..." : "BUY"}
            </button>
            <button className="btn-red text-base py-3" onClick={() => placePending("sell")} disabled={!!pendingLoading || !tick}>
              {pendingLoading === "sell" ? "Placing..." : "SELL"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
