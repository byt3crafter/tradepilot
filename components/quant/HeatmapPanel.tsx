import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Candle } from '../../types';
import { Panel } from './primitives';

const toApiDate = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};

const SYMBOLS = ['BTCUSD', 'ETHUSD', 'SOLUSD'];

type Cell = { symbol: string; chg: number | null };

/** Map a % change to a green/red cell background with intensity. */
const cellStyle = (chg: number | null): React.CSSProperties => {
  if (chg == null) return { background: 'rgba(255,255,255,0.02)' };
  const mag = Math.min(1, Math.abs(chg) / 0.08); // saturate at ±8%
  const a = 0.08 + mag * 0.32;
  return chg >= 0
    ? { background: `rgba(76,195,138,${a.toFixed(3)})`, borderColor: 'rgba(76,195,138,0.35)' }
    : { background: `rgba(229,99,95,${a.toFixed(3)})`, borderColor: 'rgba(229,99,95,0.35)' };
};

const HeatmapPanel: React.FC<{ refreshMs?: number }> = ({ refreshMs = 60000 }) => {
  const { getToken } = useAuth();
  const [cells, setCells] = useState<Cell[]>(SYMBOLS.map((s) => ({ symbol: s, chg: null })));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const token = await getToken();
      const end = Date.now();
      const start = end - 7 * 86400 * 1000;
      const results = await Promise.all(
        SYMBOLS.map(async (symbol): Promise<Cell> => {
          try {
            const res = await api.getCandles(symbol, '1day', toApiDate(start), toApiDate(end), token);
            const candles = (res.candles as Candle[]).filter((c) => Number.isFinite(c.close));
            if (candles.length === 0) return { symbol, chg: null };
            const lastBar = candles[candles.length - 1];
            const chg = lastBar.open !== 0 ? (lastBar.close - lastBar.open) / lastBar.open : 0;
            return { symbol, chg };
          } catch {
            return { symbol, chg: null };
          }
        }),
      );
      if (!cancelled) {
        setCells(results);
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshMs, getToken]);

  return (
    <Panel label="Asset Heatmap" right={<span>24h move · where avail.</span>}>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <div
            key={c.symbol}
            className="flex flex-col items-center justify-center gap-1 py-4 border rounded-[3px] transition-colors"
            style={cellStyle(c.chg)}
          >
            <span className="text-[10px] uppercase tracking-wider text-[var(--qt-text)]">{c.symbol.replace('USD', '')}</span>
            <span className="text-[15px] font-semibold tabular-nums text-[var(--qt-text)]">
              {c.chg == null ? (loading ? '…' : 'n/a') : `${c.chg >= 0 ? '+' : ''}${(c.chg * 100).toFixed(2)}%`}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export default HeatmapPanel;
