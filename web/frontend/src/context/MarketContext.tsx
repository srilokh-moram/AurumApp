import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Tick } from "../types";

interface MarketContextValue {
  tick: Tick | null;
  livePositions: Record<number, number>;
}

const MarketContext = createContext<MarketContextValue>({ tick: null, livePositions: {} });

export function MarketProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState<Tick | null>(null);
  const [livePositions, setLivePositions] = useState<Record<number, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/prices`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const { positions, ...tickData } = JSON.parse(e.data);
          setTick(tickData as Tick);
          if (positions) setLivePositions(positions);
        } catch {}
      };

      ws.onclose = () => {
        if (!cancelled) setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    }

    connect();

    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send("ping");
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(ping);
      wsRef.current?.close();
    };
  }, []);

  return (
    <MarketContext.Provider value={{ tick, livePositions }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  return useContext(MarketContext);
}
