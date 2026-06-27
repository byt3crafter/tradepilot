/**
 * QuantLivePredictions — compact "Live predictions" strip for the Quant dashboard view.
 *
 * Fetches GET /api/quant/learning/decisions?sample=live&limit=8
 * Polls every 45 s.
 *
 * Each row:  relative-time · wallet (pseudonym / short addr) · BUY/SELL outcomeLabel @ Xc
 *            · market title (truncated) · result badge (WON +x% / LOST x% / PENDING)
 *
 * REAL DATA ONLY — graceful empty / loading states; no fake data.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useView } from '../../../context/ViewContext';
import api from '../../../services/api';
import type { QuantDecision } from '../../../types';
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

function truncateAddr(addr: string): string {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function walletLabel(d: QuantDecision): string {
  return d.pseudonym?.trim() ? d.pseudonym : truncateAddr(d.wallet);
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

// ─── Decision row ─────────────────────────────────────────────────────────────

const DecisionRow: React.FC<{ d: QuantDecision }> = ({ d }) => {
  const side = (d.side ?? 'BUY').toUpperCase();
  const price = typeof d.entryPrice === 'number' ? `${d.entryPrice.toFixed(0)}¢` : '—';

  // Result badge
  let badgeVariant: 'profit' | 'loss' | 'neutral' = 'neutral';
  let badgeLabel = 'PENDING';
  if (d.status === 'win') {
    badgeVariant = 'profit';
    badgeLabel = d.roiPct !== null ? `WON +${d.roiPct.toFixed(1)}%` : 'WON';
  } else if (d.status === 'loss') {
    badgeVariant = 'loss';
    badgeLabel = d.roiPct !== null ? `LOST ${Math.abs(d.roiPct).toFixed(1)}%` : 'LOST';
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-[7px] border-b border-jtp-borderSubtle last:border-0 min-w-0">
      {/* Relative time */}
      <span className="font-mono text-[10px] text-jtp-textFaint flex-shrink-0 w-14 sm:w-16 tabular-nums">
        {relTime(d.createdAt)}
      </span>

      {/* Wallet label */}
      <span
        className="font-mono text-jtp-xs text-jtp-textMuted flex-shrink-0 w-16 sm:w-20 truncate"
        title={d.wallet}
      >
        {walletLabel(d)}
      </span>

      {/* Direction + outcome + price */}
      <span className="font-mono text-jtp-xs flex-shrink-0 text-jtp-textDim hidden xs:inline sm:inline">
        <span
          style={{ color: side === 'SELL' ? '#ff5b52' : '#3ddc84' }}
        >
          {side}
        </span>{' '}
        <span className="text-jtp-text">{d.outcomeLabel}</span>
        {' '}
        <span className="text-jtp-textFaint">@</span>
        {' '}
        <span className="text-jtp-textMuted">{price}</span>
      </span>

      {/* Market title — grows and truncates */}
      <span
        className="flex-1 min-w-0 truncate text-jtp-xs text-jtp-textDim"
        title={d.title}
      >
        {d.title}
      </span>

      {/* Result badge */}
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

  const [decisions, setDecisions] = useState<QuantDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDecisions = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.quantLearningDecisions(8, 'live', token);
      setDecisions(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load predictions.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchDecisions();
    timerRef.current = setInterval(fetchDecisions, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchDecisions]);

  const openFullQuant = () => navigateTo('quant');

  return (
    <Panel
      label="LIVE PREDICTIONS"
      actions={
        <button
          onClick={openFullQuant}
          className="flex items-center gap-1 font-mono text-jtp-xs text-jtp-textMuted hover:text-jtp-text transition-colors"
          aria-label="Open full Quant page"
        >
          Open full Quant
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
      ) : decisions.length === 0 ? (
        <EmptyState
          title="No live predictions yet"
          description="The engine emits signals as qualified wallets take positions. Check back soon."
          className="py-6"
        />
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-2 sm:gap-3 pb-[5px] border-b border-jtp-borderStrong mb-[2px]">
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase w-14 sm:w-16 flex-shrink-0">
              TIME
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase w-16 sm:w-20 flex-shrink-0">
              WALLET
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-shrink-0 hidden xs:inline sm:inline w-[8rem]">
              SIGNAL
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-1 min-w-0">
              MARKET
            </span>
            <span className="font-mono text-[9px] text-jtp-textFaint tracking-[0.12em] uppercase flex-shrink-0">
              RESULT
            </span>
          </div>

          {decisions.map((d) => (
            <DecisionRow key={d.id} d={d} />
          ))}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-jtp-borderSubtle">
            <p className="text-[10px] text-jtp-textFaint">
              Out-of-sample · polls every 45 s · not financial advice
            </p>
            <button
              onClick={openFullQuant}
              className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors flex items-center gap-1"
              aria-label="Open full Quant page"
            >
              Open full Quant
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
};

export default QuantLivePredictions;
