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
        background: { color: "#14161C" },
        textColor: "#EAEAEA",
      },
      grid: {
        vertLines: { color: "rgba(0, 191, 255, 0.05)" },
        horzLines: { color: "rgba(0, 191, 255, 0.05)" },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time) => {
          const ts = time as number; // we feed unix seconds
          const d = new Date(ts * 1000);
          const hh = String(d.getUTCHours()).padStart(2, "0");
          const mm = String(d.getUTCMinutes()).padStart(2, "0");
          return `${hh}:${mm}`;
        },
      },
    });

    chartRef.current = chart;

    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: "#39FF14",
      downColor: "#FF003C",
      borderDownColor: "#FF003C",
      borderUpColor: "#39FF14",
      wickDownColor: "#FF003C",
      wickUpColor: "#39FF14",
    });
    candleSeriesRef.current = candleSeries;

    const lineSeries = (chart as any).addLineSeries({
      color: "rgba(180, 180, 180, 0.7)",
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
    const data: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Markers + connecting line
  useEffect(() => {
    if (candleSeriesRef.current) {
      const markers: SeriesMarker<Time>[] = trades.map((t) => {
        const isBuy = t.side === "Buy";
        return {
          time: t.time as UTCTimestamp,
          position: isBuy ? "belowBar" : "aboveBar",
          shape: isBuy ? "arrowUp" : "arrowDown",
          color: isBuy ? "#39FF14" : "#FF003C",
          text: `${t.side} ${t.type} @ ${t.price.toFixed(2)}`,
        };
      });
      (candleSeriesRef.current as any).setMarkers(markers);
    }

    if (lineSeriesRef.current) {
      const entry = trades.find((t) => t.type === "Entry");
      const exit = trades.find((t) => t.type === "Exit");
      if (entry && exit) {
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
        ? "rgba(57, 255, 20, 0.7)"
        : result === TradeResult.Loss
        ? "rgba(255, 0, 60, 0.7)"
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

    const entryColor = direction === "Buy" ? "#39FF14" : "#FF003C";
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