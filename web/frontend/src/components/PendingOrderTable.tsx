import { Fragment, useState } from "react";
import { PendingOrder, Tick } from "../types";
import { format } from "date-fns";
import api from "../api";

const TYPE_COLORS: Record<string, string> = {
  buy_stop:   "bg-emerald-500/20 text-emerald-400",
  buy_limit:  "bg-emerald-500/10 text-emerald-300",
  sell_limit: "bg-red-500/10 text-red-300",
  sell_stop:  "bg-red-500/20 text-red-400",
};
const TYPE_LABELS: Record<string, string> = {
  buy_stop: "Buy Stop", buy_limit: "Buy Limit",
  sell_limit: "Sell Limit", sell_stop: "Sell Stop",
};

function adjP(setter: (v: string) => void, val: string, delta: number) {
  setter(((parseFloat(val) || 0) + delta).toFixed(2));
}

interface ModifyPanelProps {
  po: PendingOrder;
  tick: Tick | null;
  targetPrice: string;
  tpEnabled: boolean;
  slEnabled: boolean;
  tpPrice: string;
  slPrice: string;
  modifyLoading: boolean;
  modifyMsg: { text: string; ok: boolean } | null;
  setTargetPrice: (v: string) => void;
  setTpEnabled: (v: boolean) => void;
  setSlEnabled: (v: boolean) => void;
  setTpPrice: (v: string) => void;
  setSlPrice: (v: string) => void;
  onCancel: () => void;
  onSave: (id: number) => void;
}

// Defined OUTSIDE PendingOrderTable so React never remounts it on re-render
function ModifyPanel({
  po, tick, targetPrice, tpEnabled, slEnabled, tpPrice, slPrice,
  modifyLoading, modifyMsg, setTargetPrice, setTpEnabled, setSlEnabled,
  setTpPrice, setSlPrice, onCancel, onSave,
}: ModifyPanelProps) {
  function detectedType() {
    if (!tick || !targetPrice) return TYPE_LABELS[po.order_type];
    const p = parseFloat(targetPrice);
    if (po.direction === "buy") return p > tick.ask ? "Buy Stop" : "Buy Limit";
    return p > tick.bid ? "Sell Limit" : "Sell Stop";
  }

  return (
    <div className="p-4 bg-[#080810] space-y-3">
      {tick && (
        <p className="text-xs text-gray-600">Bid {tick.bid.toFixed(2)} / Ask {tick.ask.toFixed(2)}</p>
      )}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Target Price</label>
        <div className="flex items-center gap-2">
          <button onClick={() => adjP(setTargetPrice, targetPrice, -1)} className="w-10 h-10 rounded-xl bg-[#1f2937] text-white font-bold text-lg flex items-center justify-center">−</button>
          <input
            type="number" step="0.01" value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="flex-1 bg-[#0a0a0f] border border-[#1f2937] rounded-xl px-3 py-2.5 text-sm font-mono text-white text-center focus:outline-none focus:border-gold-400/50"
          />
          <button onClick={() => adjP(setTargetPrice, targetPrice, 1)} className="w-10 h-10 rounded-xl bg-[#1f2937] text-white font-bold text-lg flex items-center justify-center">+</button>
        </div>
        {tick && targetPrice && (
          <p className="text-xs text-gray-500 mt-1 text-center">Will become: <span className="text-gold-400">{detectedType()}</span></p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f1117] rounded-lg p-3 border border-[#1f2937]">
          <button onClick={() => setTpEnabled(!tpEnabled)} className={`flex items-center gap-2 text-xs font-semibold mb-2 ${tpEnabled ? "text-emerald-400" : "text-gray-500"}`}>
            <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${tpEnabled ? "bg-emerald-500 border-emerald-500 text-black" : "border-gray-600"}`}>{tpEnabled ? "✓" : ""}</span>
            Take Profit
          </button>
          {tpEnabled && (
            <div className="flex items-center gap-1">
              <button onClick={() => adjP(setTpPrice, tpPrice, -1)} className="w-8 h-8 rounded-lg bg-[#1f2937] text-white font-bold flex items-center justify-center">−</button>
              <input type="number" step="0.01" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} className="flex-1 min-w-0 bg-[#1f2937] border border-[#374151] rounded-lg px-1 py-1.5 text-xs font-mono text-white text-center focus:outline-none" />
              <button onClick={() => adjP(setTpPrice, tpPrice, 1)} className="w-8 h-8 rounded-lg bg-[#1f2937] text-white font-bold flex items-center justify-center">+</button>
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
              <button onClick={() => adjP(setSlPrice, slPrice, -1)} className="w-8 h-8 rounded-lg bg-[#1f2937] text-white font-bold flex items-center justify-center">−</button>
              <input type="number" step="0.01" value={slPrice} onChange={(e) => setSlPrice(e.target.value)} className="flex-1 min-w-0 bg-[#1f2937] border border-[#374151] rounded-lg px-1 py-1.5 text-xs font-mono text-white text-center focus:outline-none" />
              <button onClick={() => adjP(setSlPrice, slPrice, 1)} className="w-8 h-8 rounded-lg bg-[#1f2937] text-white font-bold flex items-center justify-center">+</button>
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
        <button onClick={() => onSave(po.id)} disabled={modifyLoading} className="flex-1 text-xs py-2.5 rounded-xl bg-amber-400 text-black font-semibold disabled:opacity-50">
          {modifyLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

interface Props {
  orders: PendingOrder[];
  tick: Tick | null;
  onCancel: (id: number) => void;
  cancellingId: number | null;
  onModified: () => void;
}

export default function PendingOrderTable({ orders, tick, onCancel, cancellingId, onModified }: Props) {
  const [modifyId, setModifyId] = useState<number | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyMsg, setModifyMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function openModify(po: PendingOrder) {
    if (modifyId === po.id) { setModifyId(null); return; }
    setModifyId(po.id);
    setModifyMsg(null);
    setTargetPrice(Number(po.target_price).toFixed(2));
    if (po.take_profit) { setTpEnabled(true); setTpPrice(Number(po.take_profit).toFixed(2)); }
    else { setTpEnabled(false); setTpPrice(tick ? (tick.ask + 10).toFixed(2) : ""); }
    if (po.stop_loss) { setSlEnabled(true); setSlPrice(Number(po.stop_loss).toFixed(2)); }
    else { setSlEnabled(false); setSlPrice(tick ? (tick.bid - 10).toFixed(2) : ""); }
  }

  async function submitModify(id: number) {
    setModifyLoading(true); setModifyMsg(null);
    try {
      await api.put(`/trading/pending/${id}`, {
        target_price: parseFloat(targetPrice),
        take_profit: tpEnabled && tpPrice ? parseFloat(tpPrice) : null,
        stop_loss: slEnabled && slPrice ? parseFloat(slPrice) : null,
      });
      setModifyMsg({ text: "Order modified", ok: true });
      onModified();
      setTimeout(() => { setModifyId(null); setModifyMsg(null); }, 800);
    } catch (err: any) {
      setModifyMsg({ text: err.response?.data?.detail || "Modify failed", ok: false });
    } finally { setModifyLoading(false); }
  }

  function cancelModify() { setModifyId(null); setModifyMsg(null); }

  const modifyPanelProps = {
    tick, targetPrice, tpEnabled, slEnabled, tpPrice, slPrice,
    modifyLoading, modifyMsg, setTargetPrice, setTpEnabled, setSlEnabled,
    setTpPrice, setSlPrice, onCancel: cancelModify, onSave: submitModify,
  };

  return (
    <>
      {/* ── MOBILE cards ─────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {orders.map((po) => {
          const isModifying = modifyId === po.id;
          return (
            <div key={po.id} className="bg-[#0f1117] rounded-xl border border-[#1f2937] overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${TYPE_COLORS[po.order_type]}`}>
                    {TYPE_LABELS[po.order_type]}
                  </span>
                  <span className="text-xs text-gray-500">{format(new Date(po.created_at), "MMM d, HH:mm")}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Target</p>
                    <p className="font-mono font-semibold text-white">{Number(po.target_price).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Amount</p>
                    <p className="font-mono text-gray-300 text-sm">{Number(po.lot_size)} lot</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-0.5">T/P</p>
                    <p className="font-mono text-emerald-400 text-sm">{po.take_profit ? Number(po.take_profit).toFixed(2) : "—"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-red-500 uppercase tracking-wider mb-0.5">S/L</p>
                    <p className="font-mono text-red-400 text-sm">{po.stop_loss ? Number(po.stop_loss).toFixed(2) : "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 text-sm py-2.5 rounded-xl font-medium transition-all active:scale-95 ${isModifying ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "bg-[#1f2937] text-gray-300"}`}
                    onClick={() => openModify(po)}
                  >
                    {isModifying ? "✕ Close" : "Modify"}
                  </button>
                  {!isModifying && (
                    <button
                      className="flex-1 text-sm py-2.5 rounded-xl bg-red-500/10 text-red-400 font-medium active:scale-95 disabled:opacity-50"
                      onClick={() => onCancel(po.id)}
                      disabled={cancellingId === po.id}
                    >
                      {cancellingId === po.id ? "..." : "Cancel Order"}
                    </button>
                  )}
                </div>
              </div>
              {isModifying && (
                <div className="border-t border-[#1f2937]">
                  <ModifyPanel po={po} {...modifyPanelProps} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP table ────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f2937]">
              {["Type", "Target Price", "Amount", "T/P", "S/L", "Placed", "Actions"].map((h) => (
                <th key={h} className="text-left py-3 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2937]">
            {orders.map((po) => {
              const isModifying = modifyId === po.id;
              return (
                <Fragment key={po.id}>
                  <tr className="hover:bg-[#1f2937]/30 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${TYPE_COLORS[po.order_type]}`}>
                        {TYPE_LABELS[po.order_type]}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">{Number(po.target_price).toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono text-gray-300">{Number(po.lot_size)} lot</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 text-xs">{po.take_profit ? Number(po.take_profit).toFixed(2) : "—"}</td>
                    <td className="py-3 px-3 font-mono text-red-400 text-xs">{po.stop_loss ? Number(po.stop_loss).toFixed(2) : "—"}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{format(new Date(po.created_at), "MMM d, HH:mm")}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1.5">
                        <button
                          className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-all ${isModifying ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "bg-[#1f2937] text-gray-300 hover:bg-[#374151]"}`}
                          onClick={() => openModify(po)}
                        >
                          {isModifying ? "✕ Close" : "Modify"}
                        </button>
                        {!isModifying && (
                          <button
                            className="text-xs py-1.5 px-3 rounded-lg bg-[#1f2937] text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            onClick={() => onCancel(po.id)}
                            disabled={cancellingId === po.id}
                          >
                            {cancellingId === po.id ? "..." : "Cancel"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isModifying && (
                    <tr className="border-b border-[#1f2937]">
                      <td colSpan={7}>
                        <ModifyPanel po={po} {...modifyPanelProps} />
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
