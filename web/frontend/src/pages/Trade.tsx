import { useEffect, useState } from "react";
import { Position, PendingOrder } from "../types";
import LiveChart from "../components/LiveChart";
import TradePanel from "../components/TradePanel";
import PositionTable from "../components/PositionTable";
import PendingOrderTable from "../components/PendingOrderTable";
import api from "../api";
import { useMarket } from "../context/MarketContext";

type Symbol = "XAUUSD" | "XAGUSD";

export default function Trade() {
  const { tick: goldTick, silverTick, livePositions } = useMarket();
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const activeTick = symbol === "XAUUSD" ? goldTick : silverTick;

  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function loadPositions() {
    return api.get("/trading/positions/open").then((r) => setPositions(r.data));
  }

  function loadPending() {
    return api.get("/trading/pending").then((r) => setPendingOrders(r.data));
  }

  async function handleCancelPending(id: number) {
    setCancellingId(id);
    setCancelError(null);
    try {
      await api.delete(`/trading/pending/${id}`);
      await loadPending();
    } catch (err: any) {
      setCancelError(err.response?.data?.detail || "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  }

  useEffect(() => {
    loadPositions();
    loadPending();
    const interval = setInterval(loadPending, 10000);
    return () => clearInterval(interval);
  }, []);

  // Merge live P&L from WS into positions — updates every 0.5s without any API call
  const positionsWithLivePL = positions.map((p) => ({
    ...p,
    floating_pl: livePositions[p.mt5_ticket] ?? p.floating_pl ?? 0,
  }));

  async function handleSell(positionId: number) {
    setClosing(true);
    setCloseError(null);
    try {
      await api.post(`/trading/sell/${positionId}`);
      await loadPositions();
    } catch (err: any) {
      setCloseError(err.response?.data?.detail || "Failed to close position");
    } finally {
      setClosing(false);
    }
  }

  const totalFloating = positionsWithLivePL.reduce((s, p) => s + (p.floating_pl ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Symbol toggle */}
      <div className="flex items-center gap-2">
        {(["XAUUSD", "XAGUSD"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              symbol === s
                ? "bg-gold-400 text-black"
                : "bg-[#1f2937] text-gray-400 hover:text-white"
            }`}
          >
            {s === "XAUUSD" ? "Gold (XAUUSD)" : "Silver (XAGUSD)"}
          </button>
        ))}
      </div>

      {/* Main trading area */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Chart — responsive height */}
        <div className="card p-0 overflow-hidden h-[320px] sm:h-[420px] xl:h-[540px]">
          <LiveChart tick={activeTick} symbol={symbol} />
        </div>

        {/* Trade panel — auto height */}
        <TradePanel tick={activeTick} symbol={symbol} onOrderPlaced={() => { loadPositions(); loadPending(); }} />
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Pending Orders</h2>
            <span className="bg-amber-400/10 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">{pendingOrders.length}</span>
          </div>
          {cancelError && (
            <div className="mb-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2">
              {cancelError}
            </div>
          )}
          <PendingOrderTable
            orders={pendingOrders}
            tick={activeTick}
            onCancel={handleCancelPending}
            cancellingId={cancellingId}
            onModified={loadPending}
          />
        </div>
      )}

      {/* Open positions */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Open Positions
            </h2>
            <span className="bg-gold-400/10 text-gold-400 text-xs px-2 py-0.5 rounded-full font-medium">
              {positionsWithLivePL.length}
            </span>
          </div>
          {positionsWithLivePL.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total floating P&L:</span>
              <span className={`text-sm font-mono font-semibold ${totalFloating >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalFloating >= 0 ? "+" : ""}${totalFloating.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        {closeError && (
          <div className="mb-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2">
            {closeError}
          </div>
        )}
        <PositionTable positions={positionsWithLivePL} onSell={handleSell} onModify={loadPositions} loading={closing} tick={goldTick} silverTick={silverTick} />
      </div>
    </div>
  );
}
