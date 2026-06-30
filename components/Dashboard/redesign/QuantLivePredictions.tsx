/**
 * QuantLivePredictions — "Bot Trades (live)" strip for the Quant dashboard view.
 *
 * Fetches GET /api/autobot/trades?limit=8 (real money, real bot trades).
 * Polls every 45 s.
 *
 * Each row:  relative-time · signal badge · BUY {outcome} @ {price}¢
 *            · status chip · P&L / ROI
 *
 * Authentication fix: token is now correctly passed as the second positional
 * argument to autobotTrades(limit, token) — never dropped on the floor.
 *
 * REAL DATA ONLY — graceful empty / loading states; no fake data.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useView } from '../../../context/ViewContext';
import api from '../../../services/api';
import type { AutobotTrade, AutobotTradeStatus } from '../../../types';
import Panel from '../../ui/Panel';
import Badge from '../../ui/Badge';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtPrice(price: number): string {
  // Polymarket prices are 0–1 (probability). Display as cents.
  const cents = price <= 1 ? price * 100 : price;
  return `${cents.toFixed(0)}¢`;
}

function statusBadge(status: AutobotTradeStatus): {
  variant: 'profit' | 'loss' | 'warning' | 'neutral';
  label: string;
} {
  switch (status) {
    case 'resolved': return { variant: 'profit', label: 'RESOLVED' };
    case 'filled':   return { variant: 'neutral', label: 'FILLED' };
    case 'placed':   return { variant: 'neutral', label: 'PLACED' };
    case 'failed':   return { variant: 'loss', label: 'FAILED' };
    default:         return { variant: 'warning', label: 'PENDING' };
  }
}

const POLL_MS = 45_000;

// ─── ChevronRight ─────────────────────────────────────────────────────────────

const ChevronRight: React.FC = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3 h-3"
    aria-hidden="true"
  >
    <polyline points="6 4 10 8 6 12" />
  </svg>
);

// ─── Trade row ────────────────────────────────────────────────────────────────

const TradeRow: React.FC<{ t: AutobotTrade }> = ({ t }) => {
  const side = (t.side ?? 'BUY').toUpperCase();
  const sideColor = side === 'SELL' ? '#ff5b52' : '#3ddc84';
  const price = fmtPrice(t.price);
  const { variant: badgeVariant, label: badgeLabel } = statusBadge(t.status);

  // P&L display
  const hasPnl = typeof t.pnlUsd === 'number';
  const pnlPositive = hasPnl && (t.pnlUsd as number) >= 0;
  const pnlColor = pnlPositive ? '#3ddc84' : '#ff5b52';
  const pnlStr = hasPnl
    ? `${pnlPositive ? '+' : ''}$${Math.abs(t.pnlUsd as number).toFixed(2)}`
    : typeof t.roiPct === 'number'
      ? `${t.roiPct >= 0 ? '+' : ''}${t.roiPct.toFixed(1)}%`
      : null;

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-[7px] border-b border-jtp-borderSubtle last:border-0 min-w-0">
      {/* Relative time */}
      <span className="font-mono text-[10px] text-jtp-textFaint flex-shrink-0 w-14 sm:w-16 tabular-nums">
        {relTime(t.createdAt)}
      </span>

      {/* Signal type badge */}
      <Badge variant="neutral" size="xs" className="flex-shrink-0 hidden sm:inline-flex">
        {(t.signalType ?? 'SIGNAL').toUpperCase()}
      </Badge>

      {/* Direction + outcome + price */}
      <span className="font-mono text-jtp-xs flex-shrink-0 min-w-0">
        <span style={{ color: sideColor }}>{side}</span>
        {' '}
        <span className="text-jtp-text truncate">{t.outcome}</span>
        {' '}
        <span className="text-jtp-textFaint">@</span>
        {' '}
        <span className="text-jtp-textMuted">{price}</span>
      </span>

      {/* Size */}
      <span className="font-mono text-[10px] text-jtp-textFaint flex-shrink-0 hidden lg:inline">
        ${t.sizeUsd.toFixed(0)}
      </span>

      {/* Market title — grows, truncates */}
      <span
        className="flex-1 min-w-0 truncate text-jtp-xs text-jtp-textDim"
        title={t.title}
      >
        {t.title}
      </span>

      {/* P&L */}
      {pnlStr && (
        <span
          className="font-mono text-jtp-xs flex-shrink-0 tabular-nums"
          style={{ color: pnlColor }}
        >
          {pnlStr}
        </span>
      )}

      {/* Status badge */}
      <Badge
        variant={badgeVariant}
        size="xs"
        className="flex-shrink-0"
      >
        {badgeLabel}
      </Badge>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const QuantLivePredictions: React.FC = () => {
  const { getToken } = useAuth();
  const { navigateTo } = useView();

  const [trades, setTrades] = useState<AutobotTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTrades = useCallback(async () => {
    try {
      const token = await getToken();
      // Auth fix: token passed as 2nd arg (not 3rd like the old quant call).
      const data = await api.autobotTrades(8, token);
      setTrades(data);
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load bot trades.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTrades();
    timerRef.current = setInterval(fetchTrades, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchTrades]);

  const openFullQuant = () => navigateTo('quant');

  return (
    <Panel
      label="BOT TRADES (live)"
      actions={
        <button
          onClick={openFullQuant}
          className="flex items-center gap-1 font-mono text-jtp-xs text-jtp-textMuted hover:text-jtp-text transition-colors"
          aria-label="Open full Auto Bot page"
        >
          Open Auto Bot
          <ChevronRight />
        </button>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="text-jtp-xs text-jtp-loss py-3">
          {error}
        </p>
      ) : trades.length === 0 ? (
        <EmptyState
          title="No bot trades yet"
          description="The Auto Bot will appear here once it places its first real trade."
          className="py-6"
        />
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-2 sm:gap-3 pb-[5px] border-b border-jtp-borderStrong mb-[2px]">
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase w-14 sm:w-16 flex-shrink-0">
              TIME
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-shrink-0 hidden sm:inline w-16">
              TYPE
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-shrink-0">
              SIGNAL
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-1 min-w-0">
              MARKET
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-shrink-0">
              P&amp;L
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-shrink-0">
              STATUS
            </span>
          </div>

          {trades.map((t) => (
            <TradeRow key={t.id} t={t} />
          ))}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-jtp-borderSubtle">
            <p className="text-[10px] text-jtp-textFaint">
              Real money · polls every 45 s · not financial advice
            </p>
            <button
              onClick={openFullQuant}
              className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors flex items-center gap-1"
              aria-label="Open full Auto Bot page"
            >
              Open Auto Bot
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
};

export default QuantLivePredictions;
