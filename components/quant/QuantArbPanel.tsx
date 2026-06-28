import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArbScan, CrossMarketArb, SettlementLagArb } from '../../types';
import { TradePrefill } from '../trade/PolymarketTradePanel';
import { Panel, Button, EmptyState } from '../ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a time as HH:MM:SS */
function fmtTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Relative time until a future ISO datetime, e.g. "3d 4h" or "22m" */
function relTimeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (isNaN(diff) || diff <= 0) return 'ended';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '<1m';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const d = Math.floor(hr / 24);
  return `${d}d ${hr % 24}h`;
}

// ─── Settlement-lag row ───────────────────────────────────────────────────────

const LagRow: React.FC<{
  item: SettlementLagArb;
  onTrade: (prefill: TradePrefill) => void;
}> = ({ item, onTrade }) => {
  const priceCents = Math.round(item.price * 100);

  const handleTrade = () => {
    onTrade({
      tokenId: item.tokenId,
      price: item.price,
      side: 'BUY',
      title: item.title,
      outcome: item.outcome,
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-active transition-colors">
      {/* Edge badge */}
      <div className="flex-shrink-0 w-16 text-right">
        <span className="font-mono text-jtp-lg font-bold text-jtp-profit leading-none">
          +{item.edgePct.toFixed(1)}%
        </span>
      </div>

      {/* Market info */}
      <div className="flex-1 min-w-0">
        <div className="text-jtp-base-minus text-jtp-text font-medium leading-snug truncate" title={item.title}>
          {item.title}
        </div>
        <div className="font-mono text-jtp-xs text-jtp-textDim mt-0.5 flex items-center gap-2 flex-wrap">
          <span>
            <span className="text-jtp-textMuted">{item.outcome}</span>
            {' @ '}
            <span className="text-jtp-text">{priceCents}¢</span>
          </span>
          <span className="text-jtp-borderStrong">·</span>
          <span>ends in <span className="text-jtp-amber">{relTimeUntil(item.endsAt)}</span></span>
        </div>
      </div>

      {/* Trade button */}
      <Button
        variant="primary"
        className="flex-shrink-0 !px-3 !py-1.5 !text-jtp-xs"
        onClick={handleTrade}
      >
        Trade
      </Button>
    </div>
  );
};

// ─── Cross-market leg row (expanded) ─────────────────────────────────────────

const CrossLegRow: React.FC<{
  leg: CrossMarketArb['legs'][number];
  onTrade: (prefill: TradePrefill) => void;
  event: string;
}> = ({ leg, onTrade, event }) => {
  const priceCents = Math.round(leg.yesPrice * 100);

  const handleTrade = () => {
    onTrade({
      tokenId: leg.tokenId,
      price: leg.yesPrice,
      side: 'BUY',
      title: `${event} — ${leg.title}`,
      outcome: 'Yes',
    });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-jtp-borderSubtle last:border-b-0 bg-jtp-bg">
      <div className="flex-1 min-w-0">
        <span className="text-jtp-xs text-jtp-textMuted truncate">{leg.title}</span>
        <span className="font-mono text-jtp-xs text-jtp-textDim ml-2">· {priceCents}¢</span>
      </div>
      <button
        type="button"
        onClick={handleTrade}
        className="flex-shrink-0 font-mono text-jtp-xs text-jtp-blue hover:text-jtp-text transition-colors border border-jtp-borderSubtle rounded-[2px] px-2 py-0.5"
      >
        Trade
      </button>
    </div>
  );
};

// ─── Cross-market row ─────────────────────────────────────────────────────────

const CrossRow: React.FC<{
  item: CrossMarketArb;
  onTrade: (prefill: TradePrefill) => void;
}> = ({ item, onTrade }) => {
  const [expanded, setExpanded] = useState(false);
  const sumYesCents = Math.round(item.sumYes * 100);

  return (
    <div className="border-b border-jtp-borderSubtle last:border-b-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-jtp-active transition-colors">
        {/* Edge badge */}
        <div className="flex-shrink-0 w-16 text-right">
          <span className="font-mono text-jtp-lg font-bold text-jtp-profit leading-none">
            +{item.edgePct.toFixed(1)}%
          </span>
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="text-jtp-base-minus text-jtp-text font-medium leading-snug truncate" title={item.event}>
            {item.event}
          </div>
          <div className="font-mono text-jtp-xs text-jtp-textDim mt-0.5 flex items-center gap-2 flex-wrap">
            <span>sum Yes = <span className="text-jtp-text">{sumYesCents}¢</span></span>
            <span className="text-jtp-borderStrong">·</span>
            <span><span className="text-jtp-text">{item.nOutcomes}</span> legs</span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-shrink-0 font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors border border-jtp-borderSubtle rounded-[2px] px-2.5 py-1"
        >
          {expanded ? 'Hide' : 'Legs ▾'}
        </button>
      </div>

      {/* Expanded legs */}
      {expanded && (
        <div className="border-t border-jtp-borderSubtle">
          {item.legs.map((leg, i) => (
            <CrossLegRow key={`${leg.tokenId}-${i}`} leg={leg} onTrade={onTrade} event={item.event} />
          ))}
          <div className="px-4 py-2 text-jtp-xs text-jtp-textDim italic bg-jtp-bg">
            Buy <span className="text-jtp-text font-medium">every</span> leg's Yes to lock the edge — watch liquidity and slippage on each.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin text-jtp-textDim ${className ?? 'w-4 h-4'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ─── QuantArbPanel ────────────────────────────────────────────────────────────

interface Props {
  onTrade: (prefill: TradePrefill) => void;
}

const QuantArbPanel: React.FC<Props> = ({ onTrade }) => {
  const { getToken } = useAuth();

  const [data, setData] = useState<ArbScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const token = await getToken();
      const result = await api.quantArbs(token);
      setData(result);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load arbitrage scan.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, 60_000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  // Sort by edgePct descending
  const lagItems = data
    ? [...data.settlementLag].sort((a, b) => b.edgePct - a.edgePct)
    : [];
  const crossItems = data
    ? [...data.crossMarket].sort((a, b) => b.edgePct - a.edgePct)
    : [];

  const hasAnyArbs = lagItems.length > 0 || crossItems.length > 0;

  const updatedLabel = updatedAt
    ? `↻ updated ${fmtTime(updatedAt)}`
    : undefined;

  return (
    <div className="flex flex-col gap-4 animate-jtp-fade-in">

      {/* ── Honest disclaimer ── */}
      <div className="px-4 py-3 bg-jtp-panel border border-jtp-borderSubtle rounded-[2px] text-jtp-xs text-jtp-textMuted leading-relaxed">
        <span className="text-jtp-text font-medium">After-fee edges.</span>{' '}
        Settlement-lag = high-probability, NOT guaranteed (favourite can still lose).
        Cross-market = locked only if you fill ALL legs.
        Manual execution for now — autonomous later.
      </div>

      {/* ── Settlement-lag section ── */}
      <Panel
        label="⚡ SETTLEMENT-LAG"
        noPadding
        actions={
          <span className="font-mono text-jtp-2xs text-jtp-textDim">
            {loading ? 'scanning…' : updatedLabel}
          </span>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-8 text-jtp-textDim">
            <Spinner className="w-3 h-3" />
            <span className="text-jtp-xs">Scanning markets…</span>
          </div>
        ) : error ? (
          <div className="px-4 py-6">
            <p role="alert" className="text-jtp-xs text-jtp-loss">{error}</p>
          </div>
        ) : lagItems.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              title="No settlement-lag arbs right now"
              description="They're rare and close in seconds — check back soon."
            />
          </div>
        ) : (
          <div>
            {lagItems.map((item, i) => (
              <LagRow key={`${item.tokenId}-${i}`} item={item} onTrade={onTrade} />
            ))}
          </div>
        )}
      </Panel>

      {/* ── Cross-market (NegRisk) section ── */}
      <Panel
        label="⚡ CROSS-MARKET (NEGRISK)"
        noPadding
        actions={
          <span className="font-mono text-jtp-2xs text-jtp-textDim">
            {loading ? 'scanning…' : updatedLabel}
          </span>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-8 text-jtp-textDim">
            <Spinner className="w-3 h-3" />
            <span className="text-jtp-xs">Scanning markets…</span>
          </div>
        ) : error ? (
          <div className="px-4 py-6">
            <p role="alert" className="text-jtp-xs text-jtp-loss">{error}</p>
          </div>
        ) : crossItems.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              title="No cross-market arbs right now"
              description="No arbs above the fee threshold right now — they're rare and close in seconds."
            />
          </div>
        ) : (
          <div>
            {crossItems.map((item, i) => (
              <CrossRow key={`${item.slug}-${i}`} item={item} onTrade={onTrade} />
            ))}
          </div>
        )}
      </Panel>

      {/* Global empty state (no arbs at all, post-load) */}
      {!loading && !error && !hasAnyArbs && (
        <p className="text-center text-jtp-xs text-jtp-textDim py-2">
          No arbs above the fee threshold right now — they're rare and close in seconds.
        </p>
      )}

    </div>
  );
};

export default QuantArbPanel;
