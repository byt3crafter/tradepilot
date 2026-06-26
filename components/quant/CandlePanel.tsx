import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Candle } from '../../types';
import { LiveDot } from './primitives';

/** UTC "YYYY-MM-DD HH:MM:SS" — the format the market-data endpoint expects. */
const toApiDate = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};

const CandlePanel: React.FC<{
  symbol: string;
  interval: string;
  lookbackMs: number;
  height?: number;
  refreshMs?: number;
}> = ({ symbol, interval, lookbackMs, height = 200, refreshMs = 30000 }) => {
  const { getToken } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const [last, setLast] = useState<number | null>(null);
  const [chg, setChg] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'empty'>('loading');

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: '#6b7280',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;
    seriesRef.current = (chart as any).addCandlestickSeries({
      upColor: '#4cc38a',
      downColor: '#e5635f',
      borderUpColor: '#4cc38a',
      borderDownColor: '#e5635f',
      wickUpColor: '#3fb37f',
      wickDownColor: '#e5847f',
    });
    roRef.current = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && chartRef.current) chartRef.current.applyOptions({ width: Math.floor(r.width), height: Math.floor(r.height) });
    });
    roRef.current.observe(el);
    return () => {
      roRef.current?.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await getToken();
        const end = Date.now();
        const res = await api.getCandles(symbol, interval, toApiDate(end - lookbackMs), toApiDate(end), token);
        if (cancelled) return;
        const byTime = new Map<number, CandlestickData>();
        for (const c of res.candles as Candle[]) {
          if (Number.isFinite(c.time) && Number.isFinite(c.close)) {
            byTime.set(c.time, { time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close });
          }
        }
        const data = [...byTime.values()].sort((a, b) => (a.time as number) - (b.time as number));
        if (data.length === 0) {
          setStatus('empty');
          return;
        }
        seriesRef.current?.setData(data);
        chartRef.current?.timeScale().fitContent();
        const lastBar = data[data.length - 1];
        setLast(lastBar.close);
        setChg(lastBar.close !== 0 ? (lastBar.close - lastBar.open) / lastBar.open : 0);
        setStatus('ok');
      } catch {
        if (!cancelled) setStatus((s) => (s === 'ok' ? 'ok' : 'empty'));
      }
    };
    load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, interval, lookbackMs, refreshMs, getToken]);

  const tone = chg == null ? 'text-[var(--qt-dim)]' : chg >= 0 ? 'text-[var(--qt-green)]' : 'text-[var(--qt-red)]';

  return (
    <div className="qt-panel flex flex-col">
      <header className="flex items-center justify-between gap-2 px-3 h-7 border-b border-[var(--qt-border)]">
        <div className="flex items-center gap-1.5">
          <LiveDot />
          <span className="qt-panel-label">{symbol} · {interval}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] tabular-nums">
          {last != null && <span className="text-[var(--qt-text)]">{last >= 1000 ? last.toLocaleString('en-US', { maximumFractionDigits: 0 }) : last.toFixed(2)}</span>}
          {chg != null && <span className={tone}>{chg >= 0 ? '+' : ''}{(chg * 100).toFixed(2)}%</span>}
        </div>
      </header>
      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="absolute inset-0" />
        {status !== 'ok' && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--qt-faint)] pointer-events-none">
            {status === 'loading' ? 'Loading candles…' : 'No candle data available'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandlePanel;
