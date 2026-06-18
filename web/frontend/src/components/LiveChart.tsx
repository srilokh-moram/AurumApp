import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { Tick } from "../types";
import api from "../api";

interface Props {
  tick: Tick | null;
}

export default function LiveChart({ tick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastCandleRef = useRef<CandlestickData | null>(null);

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

    // Load historical candles
    api.get("/market/candles?count=300").then((res) => {
      if (res.data.length > 0) {
        series.setData(res.data as CandlestickData[]);
        lastCandleRef.current = res.data[res.data.length - 1];
        chart.timeScale().fitContent();
      }
    });

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
    };
  }, []);

  // Update chart with live tick
  useEffect(() => {
    if (!tick || !seriesRef.current) return;
    const price = tick.ask;
    const time = Math.floor(tick.time / 60) * 60 as Time; // round to minute

    const last = lastCandleRef.current;
    if (!last) {
      const candle: CandlestickData = { time, open: price, high: price, low: price, close: price };
      seriesRef.current.update(candle);
      lastCandleRef.current = candle;
      return;
    }

    if (last.time === time) {
      const updated: CandlestickData = {
        time,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      };
      seriesRef.current.update(updated);
      lastCandleRef.current = updated;
    } else {
      const candle: CandlestickData = { time, open: price, high: price, low: price, close: price };
      seriesRef.current.update(candle);
      lastCandleRef.current = candle;
    }
  }, [tick]);

  return <div ref={containerRef} className="w-full h-full" />;
}
