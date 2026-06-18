import { Fragment, useState } from "react";
import { Position, Tick } from "../types";
import { format } from "date-fns";
import api from "../api";

interface ModifyFormProps {
  posId: number;
  tick?: Tick | null;
  tpEnabled: boolean;
  slEnabled: boolean;
  tpPrice: string;
  slPrice: string;
  modifyLoading: boolean;
  modifyMsg: { text: string; ok: boolean } | null;
  setTpEnabled: (v: boolean) => void;
  setSlEnabled: (v: boolean) => void;
  setTpPrice: (v: string) => void;
  setSlPrice: (v: string) => void;
  onCancel: () => void;
  onSave: (posId: number) => void;
}

function adjust(setter: (v: string) => void, val: string, delta: number) {
  setter(((parseFloat(val) || 0) + delta).toFixed(2));
}

// Defined OUTSIDE PositionTable so React never remounts it due to reference change
function ModifyForm({
  posId, tick, tpEnabled, slEnabled, tpPrice, slPrice,
  modifyLoading, modifyMsg, setTpEnabled, setSlEnabled,
  setTpPrice, setSlPrice, onCancel, onSave,
}: ModifyFormProps) {
  return (
    <div className="space-y-3 p-4 bg-[#080810]">
      {tick && (
        <p className="text-xs text-gray-600">Bid {tick.bid.toFixed(2)} / Ask {tick.ask.toFixed(2)}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f1117] rounded-lg p-3 border border-[#1f2937]">
          <button onClick={() => setTpEnabled(!tpEnabled)} className={`flex items-center gap-2 text-xs font-semibold mb-2 ${tpEnabled ? "text-emerald-400" : "text-gray-500"}`}>
            <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${tpEnabled ? "bg-emerald-500 border-emerald-500 text-black" : "border-gray-600"}`}>{tpEnabled ? "✓" : ""}</span>
            Take Profit
          </button>
          {tpEnabled && (
            <div className="flex items-center gap-1">
              <button onClick={() => adjust(setTpPrice, tpPrice, -1)} className="w-9 h-9 rounded-lg bg-[#1f2937] text-white font-bold text-base flex items-center justify-center">−</button>
              <input type="number" step="0.01" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} className="flex-1 min-w-0 bg-[#1f2937] border border-[#374151] rounded-lg px-1 py-2 text-xs font-mono text-white text-center focus:outline-none" />
              <button onClick={() => adjust(setTpPrice, tpPrice, 1)} className="w-9 h-9 rounded-lg bg-[#1f2937] text-white font-bold text-base flex items-center justify-center">+</button>
            </div>
          )}
        </div>
        <div className="bg-[#0f1117] rounded-lg p-3 border border-[#1f2937]">
          <button onClick={() => setSlEnabled(!slEnabled)} className={`flex items-center gap-2 text-xs font-semibold mb-2 ${slEnabled ? "text-red-400" : "text-gray-500"}`}>
            <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${slEnabled ? "bg-red-500 border-red-500 text-white" : "border-gray-600"}`}>{slEnabled ? "✓" : ""}</span>
            Stop Loss
          </button>
          {slEnabled && (
            <div className="flex items-center gap-1">
              <button onClick={() => adjust(setSlPrice, slPrice, -1)} className="w-9 h-9 rounded-lg bg-[#1f2937] text-white font-bold text-base flex items-center justify-center">−</button>
              <input type="number" step="0.01" value={slPrice} onChange={(e) => setSlPrice(e.target.value)} className="flex-1 min-w-0 bg-[#1f2937] border border-[#374151] rounded-lg px-1 py-2 text-xs font-mono text-white text-center focus:outline-none" />
              <button onClick={() => adjust(setSlPrice, slPrice, 1)} className="w-9 h-9 rounded-lg bg-[#1f2937] text-white font-bold text-base flex items-center justify-center">+</button>
            </div>
          )}
        </div>
      </div>
      {modifyMsg && (
        <div className={`text-xs px-3 py-2 rounded-lg ${modifyMsg.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {modifyMsg.text}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 text-xs py-2.5 rounded-xl bg-[#1f2937] text-gray-400">Cancel</button>
        <button onClick={() => onSave(posId)} disabled={modifyLoading} className="flex-1 text-xs py-2.5 rounded-xl bg-amber-400 text-black font-semibold disabled:opacity-50">
          {modifyLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

interface Props {
  positions: Position[];
  onSell?: (id: number) => void;
  onModify?: () => void;
  loading?: boolean;
  tick?: Tick | null;
  silverTick?: Tick | null;
}

export default function PositionTable({ positions, onSell, onModify, loading, tick, silverTick }: Props) {
  const [modifyId, setModifyId] = useState<number | null>(null);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyMsg, setModifyMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function openModify(pos: Position) {
    if (modifyId === pos.id) { setModifyId(null); return; }
    setModifyId(pos.id);
    setModifyMsg(null);
    setTpEnabled(false);
    setSlEnabled(false);
    const posTick = pos.symbol === "XAGUSD" ? silverTick : tick;
    setTpPrice(posTick ? (posTick.ask + 10).toFixed(2) : "");
    setSlPrice(posTick ? (posTick.bid - 10).toFixed(2) : "");
    try {
      const res = await api.get(`/trading/positions/${pos.id}/tpsl`);
      if (res.data.tp > 0) { setTpEnabled(true); setTpPrice(res.data.tp.toFixed(2)); }
      if (res.data.sl > 0) { setSlEnabled(true); setSlPrice(res.data.sl.toFixed(2)); }
    } catch {}
  }

  async function submitModify(posId: number) {
    setModifyLoading(true); setModifyMsg(null);
    try {
      await api.put(`/trading/positions/${posId}/modify`, {
        take_profit: tpEnabled && tpPrice ? parseFloat(tpPrice) : null,
        stop_loss: slEnabled && slPrice ? parseFloat(slPrice) : null,
      });
      setModifyMsg({ text: "Modified successfully", ok: true });
      onModify?.();
      setTimeout(() => { setModifyId(null); setModifyMsg(null); }, 800);
    } catch (err: any) {
      setModifyMsg({ text: err.response?.data?.detail || "Modify failed", ok: false });
    } finally { setModifyLoading(false); }
  }

  function cancelModify() { setModifyId(null); setModifyMsg(null); }

  if (positions.length === 0) {
    return <div className="text-center py-12 text-gray-600 text-sm">No positions to show</div>;
  }

  const colCount = onSell ? 8 : 9;

  return (
    <>
      {/* ── MOBILE: card list ─────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {positions.map((p) => {
          const pl = p.floating_pl ?? p.profit ?? 0;
          const isPositive = pl >= 0;
          const isModifying = modifyId === p.id;
          return (
            <div key={p.id} className="bg-[#0f1117] rounded-xl border border-[#1f2937] overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.direction === "sell" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {(p.direction ?? "buy").toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f2937] text-gray-400">
                      {p.symbol}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">#{p.mt5_ticket}</span>
                  </div>
                  <span className="text-xs text-gray-500">{format(new Date(p.entry_time), "MMM d, HH:mm")}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Entry</p>
                    <p className="font-mono text-sm text-white">{Number(p.entry_price).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Lot</p>
                    <p className="font-mono text-sm text-gray-300">{p.lot_size}</p>
                  </div>
                  {!onSell && p.close_price && (
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Close</p>
                      <p className="font-mono text-sm text-white">{Number(p.close_price).toFixed(2)}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{onSell ? "Float P&L" : "Profit"}</p>
                    <p className={`font-mono font-bold text-lg ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {pl >= 0 ? "+" : ""}${Number(pl).toFixed(2)}
                    </p>
                  </div>
                </div>
                {onSell && (
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 text-sm py-2.5 rounded-xl font-medium transition-all active:scale-95 ${isModifying ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "bg-[#1f2937] text-gray-300"}`}
                      onClick={() => openModify(p)}
                    >
                      {isModifying ? "✕ Cancel" : "Modify"}
                    </button>
                    <button
                      className="flex-1 btn-red text-sm py-2.5 rounded-xl"
                      onClick={() => onSell(p.id)}
                      disabled={loading}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
              {isModifying && (
                <div className="border-t border-[#1f2937]">
                  <ModifyForm
                    posId={p.id} tick={p.symbol === "XAGUSD" ? silverTick : tick}
                    tpEnabled={tpEnabled} slEnabled={slEnabled}
                    tpPrice={tpPrice} slPrice={slPrice}
                    modifyLoading={modifyLoading} modifyMsg={modifyMsg}
                    setTpEnabled={setTpEnabled} setSlEnabled={setSlEnabled}
                    setTpPrice={setTpPrice} setSlPrice={setSlPrice}
                    onCancel={cancelModify} onSave={submitModify}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: table ───────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f2937]">
              {["Dir", "Symbol", "Ticket", "Entry Price", "Lot", "Time", "P&L", onSell ? "Action" : "Close Price", onSell ? "" : "Profit"].filter(Boolean).map((h) => (
                <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2937]">
            {positions.map((p) => {
              const pl = p.floating_pl ?? p.profit ?? 0;
              const isPositive = pl >= 0;
              const isModifying = modifyId === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className="hover:bg-[#1f2937]/30 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.direction === "sell" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {(p.direction ?? "buy").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f2937] text-gray-400">
                        {p.symbol}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-400 text-xs">{p.mt5_ticket}</td>
                    <td className="py-3 px-3 font-mono">{Number(p.entry_price).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-gray-300">{p.lot_size}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{format(new Date(p.entry_time), "MMM d, HH:mm")}</td>
                    <td className={`py-3 px-3 font-mono font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {pl >= 0 ? "+" : ""}${Number(pl).toFixed(2)}
                    </td>
                    {onSell ? (
                      <td className="py-3 px-3">
                        <div className="flex gap-1.5">
                          <button
                            className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${isModifying ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "bg-[#1f2937] text-gray-300 hover:bg-[#374151]"}`}
                            onClick={() => openModify(p)}
                          >
                            {isModifying ? "Cancel" : "Modify"}
                          </button>
                          <button className="btn-red text-xs py-1.5 px-3" onClick={() => onSell(p.id)} disabled={loading}>Close</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-3 px-3 font-mono text-gray-400 text-xs">{p.close_price ? Number(p.close_price).toFixed(2) : "—"}</td>
                        <td className={`py-3 px-3 font-mono font-semibold text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {pl >= 0 ? "+" : ""}${Number(pl).toFixed(2)}
                        </td>
                      </>
                    )}
                  </tr>
                  {isModifying && (
                    <tr className="border-b border-[#1f2937]">
                      <td colSpan={colCount}>
                        <ModifyForm
                          posId={p.id} tick={p.symbol === "XAGUSD" ? silverTick : tick}
                          tpEnabled={tpEnabled} slEnabled={slEnabled}
                          tpPrice={tpPrice} slPrice={slPrice}
                          modifyLoading={modifyLoading} modifyMsg={modifyMsg}
                          setTpEnabled={setTpEnabled} setSlEnabled={setSlEnabled}
                          setTpPrice={setTpPrice} setSlPrice={setSlPrice}
                          onCancel={cancelModify} onSave={submitModify}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
