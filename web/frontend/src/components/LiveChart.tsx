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
  M15: 150,
  M30: 120,
  H1: 100,
  H4: 100,
  D1: 100,
  W1: 60,
};

interface Props {
  tick: Tick | null;
}

export default function LiveChart({ tick }: Props) {
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
      rightPriceScale: { borderColor: "#374151" },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
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
    // Clear immediately so stale data is gone; tick updates will be skipped
    // until lastCandleRef is repopulated by the fetch below
    lastCandleRef.current = null;
    try { seriesRef.current.setData([]); } catch { /* ignore */ }

    api.get(`/market/candles?timeframe=${tf}&count=${TF_COUNT[tf]}`).then((res) => {
      if (!seriesRef.current || tfRef.current !== tf) return;
      if (res.data.length > 0) {
        try {
          seriesRef.current.setData(res.data as CandlestickData[]);
          lastCandleRef.current = res.data[res.data.length - 1];
          chartRef.current?.timeScale().fitContent();
        } catch { /* ignore */ }
      }
    });
  }, [tf]);

  // Update last candle with live tick
  useEffect(() => {
    // Skip while loading new timeframe — prevents update() on empty series which crashes lightweight-charts
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
      // lightweight-charts can throw if data is out of order; ignore and wait for next tick
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

      {/* Chart canvas — fills remaining height */}
      <div ref={containerRef} className="flex-1 w-full min-h-0" />
    </div>
  );
}
