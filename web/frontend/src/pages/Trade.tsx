import { useEffect, useRef, useState } from "react";
import { Tick, Position } from "../types";
import LiveChart from "../components/LiveChart";
import TradePanel from "../components/TradePanel";
import PositionTable from "../components/PositionTable";
import api from "../api";

export default function Trade() {
  const [tick, setTick] = useState<Tick | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [closing, setClosing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  function loadPositions() {
    api.get("/trading/positions/open").then((r) => setPositions(r.data));
  }

  useEffect(() => {
    loadPositions();

    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/prices`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        setTick(JSON.parse(e.data));
      } catch {}
    };

    ws.onerror = () => ws.close();

    // Keep-alive ping every 20s
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 20000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, []);

  // Refresh positions every 5s to update floating P&L
  useEffect(() => {
    const t = setInterval(loadPositions, 5000);
    return () => clearInterval(t);
  }, []);

  async function handleSell(positionId: number) {
    setClosing(true);
    try {
      await api.post(`/trading/sell/${positionId}`);
      loadPositions();
    } finally {
      setClosing(false);
    }
  }

  const totalFloating = positions.reduce((s, p) => s + (p.floating_pl ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Main trading area */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Chart — responsive height */}
        <div className="card p-0 overflow-hidden relative h-[300px] sm:h-[400px] xl:h-[520px]">
          <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
            <span className="text-gold-400 font-bold text-sm">XAU/USD</span>
            {tick && (
              <span className="text-white font-mono font-bold text-base">{tick.ask.toFixed(2)}</span>
            )}
          </div>
          <LiveChart tick={tick} />
        </div>

        {/* Trade panel — auto height, no overflow */}
        <TradePanel tick={tick} onOrderPlaced={loadPositions} />
      </div>

      {/* Open positions */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Open Positions
            </h2>
            <span className="bg-gold-400/10 text-gold-400 text-xs px-2 py-0.5 rounded-full font-medium">
              {positions.length}
            </span>
          </div>
          {positions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total floating P&L:</span>
              <span className={`text-sm font-mono font-semibold ${totalFloating >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalFloating >= 0 ? "+" : ""}${totalFloating.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <PositionTable positions={positions} onSell={handleSell} loading={closing} />
      </div>
    </div>
  );
}
