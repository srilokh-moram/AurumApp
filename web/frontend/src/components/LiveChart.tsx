import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { Tick } from "../types";
import api from "../api";

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"] as const;
type TF = typeof TIMEFRAMES[number];

const BAR_SECONDS: Record<TF, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  M30: 1800,
  H1: 3600,
  H4: 14400,
  D1: 86400,
  W1: 604800,
};

const TF_COUNT: Record<TF, number> = {
  M1: 200,
  M5: 200,
  M15: 200,
  M30: 200,
  H1: 200,
  H4: 200,
  D1: 200,
  W1: 100,
};

// How many bars to show in the visible window by default
const VISIBLE_BARS: Record<TF, number> = {
  M1: 80,
  M5: 60,
  M15: 48,
  M30: 36,
  H1: 48,
  H4: 30,
  D1: 30,
  W1: 26,
};

interface Props {
  tick: Tick | null;
  symbol?: string;
}

export default function LiveChart({ tick, symbol = "XAUUSD" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastCandleRef = useRef<CandlestickData | null>(null);
  const [tf, setTf] = useState<TF>("M1");
  const tfRef = useRef<TF>("M1");

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#111827" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: "#374151",
        autoScale: true,
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Load candles when timeframe changes
  useEffect(() => {
    tfRef.current = tf;
    if (!seriesRef.current) return;
    lastCandleRef.current = null;
    try { seriesRef.current.setData([]); } catch { /* ignore */ }

    api.get(`/market/candles?timeframe=${tf}&count=${TF_COUNT[tf]}&symbol=${symbol}`).then((res) => {
      if (!seriesRef.current || !chartRef.current || tfRef.current !== tf) return;
      const data = res.data as CandlestickData[];
      if (data.length === 0) return;
      try {
        seriesRef.current.setData(data);
        lastCandleRef.current = data[data.length - 1];
        // Zoom to recent bars — avoids weekend/session gaps dominating the view
        const visible = VISIBLE_BARS[tf];
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: data.length - visible,
          to: data.length + 5,
        });
      } catch { /* ignore */ }
    });
  }, [tf, symbol]);

  // Update last candle with live tick
  useEffect(() => {
    // Skip while loading new timeframe — prevents update() on empty series
    if (!tick || !seriesRef.current || !lastCandleRef.current) return;
    const price = tick.ask;
    const barDuration = BAR_SECONDS[tfRef.current];
    const time = (Math.floor(tick.time / barDuration) * barDuration) as Time;
    const last = lastCandleRef.current;

    try {
      if (last.time === time) {
        const updated: CandlestickData = {
          time,
          open: last.open,
          high: Math.max(last.high as number, price),
          low: Math.min(last.low as number, price),
          close: price,
        };
        seriesRef.current.update(updated);
        lastCandleRef.current = updated;
      } else {
        const candle: CandlestickData = { time, open: price, high: price, low: price, close: price };
        seriesRef.current.update(candle);
        lastCandleRef.current = candle;
      }
    } catch {
      // ignore out-of-order ticks
    }
  }, [tick]);

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header: live price + timeframe buttons */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#1f2937] shrink-0">
        <span className="text-white font-mono font-bold text-sm sm:text-base">
          {tick ? tick.ask.toFixed(2) : "—"}
        </span>
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold rounded transition-all ${
                t === tf
                  ? "bg-gold-400 text-black"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#1f2937]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart canvas */}
      <div ref={containerRef} className="flex-1 w-full min-h-0" />
    </div>
  );
}
