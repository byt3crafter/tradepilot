import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type Time,
  type UTCTimestamp,
  LineStyle,
  type SeriesMarker,
  IPriceLine,
} from "lightweight-charts";
import { Candle, TradeResult, Direction } from "../../types";

type TradeMarkerInfo = {
  time: number;              // UNIX seconds
  price: number;
  side: "Buy" | "Sell";
  type: "Entry" | "Exit";
};

type Props = {
  candles: Candle[];
  trades: TradeMarkerInfo[];
  result?: TradeResult | null;
  direction: Direction;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export default function TradeChart({
  candles,
  trades,
  result,
  direction,
  entryPrice,
  stopLoss,
  takeProfit,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const roRef = useRef<ResizeObserver | null>(null);

  // Create chart once
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(232,162,61,0.5)", labelBackgroundColor: "#e8a23d" },
        horzLine: { color: "rgba(232,162,61,0.5)", labelBackgroundColor: "#e8a23d" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // TradingView's default candle palette — clean teal/red, not neon.
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    candleSeriesRef.current = candleSeries;

    const lineSeries = (chart as any).addLineSeries({
      color: "rgba(148, 163, 184, 0.6)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    lineSeriesRef.current = lineSeries;

    // Auto-size with parent
    roRef.current = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && chartRef.current) chartRef.current.applyOptions({ width: Math.floor(r.width), height: Math.floor(r.height) });
    });
    roRef.current.observe(el);

    return () => {
      roRef.current?.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  // Candle data
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;
    // Dedupe by timestamp (last wins) + sort ascending — lightweight-charts
    // asserts strictly ascending time and throws (blanking the app) otherwise.
    const byTime = new Map<number, CandlestickData>();
    for (const c of candles) {
      if (Number.isFinite(c.time) && Number.isFinite(c.close)) {
        byTime.set(c.time as number, {
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        });
      }
    }
    const data: CandlestickData[] = [...byTime.values()].sort(
      (a, b) => (a.time as number) - (b.time as number),
    );
    if (data.length === 0) return;
    candleSeriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Markers + connecting line
  useEffect(() => {
    if (candleSeriesRef.current) {
      // Markers must be sorted ascending by time, else lightweight-charts throws.
      const markers: SeriesMarker<Time>[] = trades
        .slice()
        .sort((a, b) => a.time - b.time)
        .map((t) => {
          const isBuy = t.side === "Buy";
          return {
            time: t.time as UTCTimestamp,
            position: isBuy ? "belowBar" : "aboveBar",
            shape: isBuy ? "arrowUp" : "arrowDown",
            color: isBuy ? "#26a69a" : "#ef5350",
            text: `${t.side} ${t.type} @ ${t.price.toFixed(2)}`,
          };
        });
      (candleSeriesRef.current as any).setMarkers(markers);
    }

    if (lineSeriesRef.current) {
      const entry = trades.find((t) => t.type === "Entry");
      const exit = trades.find((t) => t.type === "Exit");
      // Only draw the connecting line when exit is strictly after entry —
      // equal timestamps (e.g. imports with a single date) would violate the
      // strict-ascending assertion and crash the chart.
      if (entry && exit && exit.time > entry.time) {
        const line: LineData[] = [
          { time: entry.time as UTCTimestamp, value: entry.price },
          { time: exit.time as UTCTimestamp, value: exit.price },
        ];
        lineSeriesRef.current.setData(line);
      } else {
        lineSeriesRef.current.setData([]);
      }
    }
  }, [trades]);

  // Color of the connecting line based on result
  useEffect(() => {
    if (!lineSeriesRef.current) return;
    const color =
      result === TradeResult.Win
        ? "rgba(38, 166, 154, 0.8)"
        : result === TradeResult.Loss
        ? "rgba(239, 83, 80, 0.8)"
        : "rgba(180, 180, 180, 0.7)";
    lineSeriesRef.current.applyOptions({ color });
  }, [result]);

  // Entry / SL / TP price lines
  useEffect(() => {
    const s = candleSeriesRef.current;
    if (!s) return;

    // remove any previous lines
    for (const l of priceLinesRef.current) s.removePriceLine(l);
    priceLinesRef.current = [];

    const entryColor = direction === "Buy" ? "#26a69a" : "#ef5350";
    priceLinesRef.current.push(
      s.createPriceLine({
        price: entryPrice,
        color: entryColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Entry",
        axisLabelColor: entryColor,
        axisLabelTextColor: "#FFFFFF",
      }),
    );

    if (stopLoss != null) {
      priceLinesRef.current.push(
        s.createPriceLine({
          price: stopLoss,
          color: "#8899A6",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "SL",
          axisLabelColor: "#555555",
          axisLabelTextColor: "#DDDDDD",
        }),
      );
    }

    if (takeProfit != null) {
      priceLinesRef.current.push(
        s.createPriceLine({
          price: takeProfit,
          color: "#8899A6",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "TP",
          axisLabelColor: "#555555",
          axisLabelTextColor: "#DDDDDD",
        }),
      );
    }
  }, [direction, entryPrice, stopLoss, takeProfit]);

  return <div ref={containerRef} className="w-full h-full" />;
}