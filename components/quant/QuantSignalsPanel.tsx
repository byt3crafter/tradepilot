import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { QuantSignal } from '../../types';
import { TradePrefill } from '../trade/PolymarketTradePanel';
import { Panel, Badge, Button, EmptyState, Skeleton } from '../ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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

// ─── Single signal row/card ───────────────────────────────────────────────────

const SignalRow: React.FC<{
  signal: QuantSignal;
  onTrade: (prefill: TradePrefill) => void;
}> = ({ signal, onTrade }) => {
  const canTrade = signal.tokenId !== null;

  const handleTrade = () => {
    if (!canTrade) return;
    onTrade({
      tokenId: signal.tokenId!,
      price: signal.price,
      side: 'BUY',
      title: signal.title,
      outcome: signal.outcome,
    });
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-active transition-colors">

      {/* LEFT — edge + type badge */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1 w-[68px] pt-0.5">
        <span className="font-mono text-jtp-xl font-bold text-jtp-profit leading-none">
          +{signal.edgePct.toFixed(1)}%
        </span>
        <Badge
          variant={signal.type === 'ai' ? 'warning' : 'info'}
          size="xs"
        >
          {signal.type === 'ai' ? 'AI' : 'ARB'}
        </Badge>
      </div>

      {/* MIDDLE — market info */}
      <div className="flex-1 min-w-0">
        {/* Primary line: BUY outcome @ price */}
        <div className="font-mono text-jtp-base-minus font-semibold text-jtp-text leading-snug">
          BUY{' '}
          <span className="text-jtp-profit">{signal.outcome}</span>
          {' @ '}
          <span className="text-jtp-text">{signal.priceCents}¢</span>
        </div>

        {/* Market title */}
        <div
          className="text-jtp-xs text-jtp-textMuted mt-0.5 leading-snug line-clamp-2"
          title={signal.title}
        >
          {signal.title}
        </div>

        {/* Detail chip + confidence */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] bg-jtp-active border border-jtp-borderSubtle font-mono text-jtp-2xs text-jtp-textDim leading-none whitespace-nowrap">
            {signal.detail}
          </span>
          {typeof signal.confidence === 'number' && (
            <span className="font-mono text-jtp-2xs text-jtp-textDim">
              conf{' '}
              <span className="text-jtp-textMuted font-medium">
                {Math.round(signal.confidence * 100)}%
              </span>
            </span>
          )}
        </div>

        {/* Reason */}
        <p className="text-jtp-xs text-jtp-textDim mt-1.5 leading-snug line-clamp-2">
          {signal.reason}
        </p>
      </div>

      {/* RIGHT — TRADE button */}
      <div className="flex-shrink-0 flex items-start pt-0.5 sm:items-center sm:pt-0">
        {canTrade ? (
          <Button
            variant="primary"
            className="!px-3 !py-1.5 !text-jtp-xs w-full sm:w-auto"
            onClick={handleTrade}
          >
            TRADE
          </Button>
        ) : (
          <button
            type="button"
            disabled
            title="Open in Trade tab"
            className="px-3 py-1.5 rounded-[2px] border border-jtp-borderSubtle text-jtp-2xs font-mono text-jtp-textDim cursor-not-allowed w-full sm:w-auto whitespace-nowrap"
          >
            TRADE
          </button>
        )}
      </div>

    </div>
  );
};

// ─── Loading skeletons ────────────────────────────────────────────────────────

const SignalSkeletons: React.FC = () => (
  <div className="divide-y divide-jtp-borderSubtle">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-start gap-3 px-4 py-3.5">
        <div className="flex-shrink-0 w-[68px] flex flex-col gap-1.5 pt-0.5">
          <Skeleton className="h-5 w-14 rounded-[2px]" />
          <Skeleton className="h-4 w-8 rounded-[2px]" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-40 rounded-[2px]" />
          <Skeleton variant="text" lines={2} />
          <Skeleton className="h-4 w-28 rounded-[2px]" />
        </div>
        <div className="flex-shrink-0 w-16">
          <Skeleton className="h-7 w-16 rounded-[2px]" />
        </div>
      </div>
    ))}
  </div>
);

// ─── QuantSignalsPanel ────────────────────────────────────────────────────────

interface Props {
  onTrade: (prefill: TradePrefill) => void;
}

const QuantSignalsPanel: React.FC<Props> = ({ onTrade }) => {
  const { getToken } = useAuth();

  const [signals, setSignals] = useState<QuantSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const token = await getToken();
      const result = await api.quantSignals(token);
      setSignals(Array.isArray(result.signals) ? result.signals : []);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load signals.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchSignals();
    intervalRef.current = setInterval(fetchSignals, 60_000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [fetchSignals]);

  const updatedLabel = updatedAt ? `↻ updated ${fmtTime(updatedAt)}` : undefined;

  return (
    <div className="flex flex-col gap-4 animate-jtp-fade-in">

      {/* ── Intro ── */}
      <div className="px-4 py-3 bg-jtp-panel border border-jtp-borderSubtle rounded-[2px] text-jtp-xs text-jtp-textMuted leading-relaxed">
        <span className="text-jtp-text font-medium">What to buy now</span>
        {' — the engine finds the edges, you execute. It keeps learning in the background '}
        <span className="text-jtp-text">(see What Works for the track record).</span>
      </div>

      {/* ── Signal list ── */}
      <Panel
        label="LIVE SIGNALS"
        noPadding
        actions={
          <span className="font-mono text-jtp-2xs text-jtp-textDim">
            {loading && signals.length === 0 ? (
              <span className="flex items-center gap-1">
                <Spinner className="w-3 h-3" />
                scanning…
              </span>
            ) : updatedLabel}
          </span>
        }
      >
        {loading && signals.length === 0 ? (
          <SignalSkeletons />
        ) : error ? (
          <div className="px-4 py-6">
            <p role="alert" className="text-jtp-xs text-jtp-loss">{error}</p>
          </div>
        ) : signals.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              title="No live edges right now"
              description="The engine scans continuously. Check back, or hit 'Run AI scan now' in What Works."
            />
          </div>
        ) : (
          <div>
            {signals.map((signal, i) => (
              <SignalRow
                key={`${signal.tokenId ?? signal.title}-${i}`}
                signal={signal}
                onTrade={onTrade}
              />
            ))}
          </div>
        )}
      </Panel>

      {/* ── Footer disclaimer ── */}
      <p className="text-jtp-2xs text-jtp-textDim leading-relaxed px-1">
        <span className="text-jtp-textMuted font-medium">AI calls</span>
        {' = where the AI thinks the crowd is wrong (politics/geopolitics). '}
        <span className="text-jtp-textMuted font-medium">ARB</span>
        {' = near-certain settlement-lag. Both are paper-proven in What Works before you risk real money — size small.'}
      </p>

    </div>
  );
};

export default QuantSignalsPanel;
