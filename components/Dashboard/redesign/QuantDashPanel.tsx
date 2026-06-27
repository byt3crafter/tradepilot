/**
 * QuantDashPanel — At-a-glance Quant summary for the main Dashboard.
 *
 * Shown only when the user has quantEnabled === true.
 * Data sources:
 *   GET /api/quant/learning   → overall stats + wallet list
 *   GET /api/quant/simulation?bankroll=50&risk=0.05  → paper equity growth
 *
 * Contents:
 *   - Stat tiles: out-of-sample win rate, avg ROI, $50→$X paper balance,
 *     max drawdown, resolved / pending counts
 *   - Top 5 wallets by avgRoi (compact list)
 *   - Honest disclaimer caption
 *   - "View full analysis →" deep link to Quant tab
 *
 * REAL DATA ONLY — sparse/empty is shown honestly, never padded with fakes.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useView } from '../../../context/ViewContext';
import api from '../../../services/api';
import type { QuantLearning, QuantLearningWallet, QuantSimulation } from '../../../types';
import Panel from '../../ui/Panel';
import StatTile from '../../ui/StatTile';
import Badge from '../../ui/Badge';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtWinRate = (n: number) => `${(n * 100).toFixed(1)}%`;

const fmtRoi = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  if (n === 0) return '0.0%';
  const g = n > 0 ? '▲' : '▼';
  return `${g} ${Math.abs(n).toFixed(1)}%`;
};

const roiColor = (n: number | null | undefined): string => {
  if (n === null || n === undefined || n === 0) return 'text-jtp-textDim';
  return n > 0 ? 'text-jtp-profit' : 'text-jtp-loss';
};

const truncateAddr = (addr: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

const fmtBalance = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VERDICT_VARIANT: Record<string, 'profit' | 'loss' | 'warning' | 'neutral'> = {
  validated: 'profit',
  disabled: 'loss',
  watch: 'warning',
  learning: 'neutral',
};

// ─── Top wallet row ───────────────────────────────────────────────────────────

const WalletRow: React.FC<{ w: QuantLearningWallet; rank: number }> = ({ w, rank }) => {
  const isPositive = w.avgRoi > 0;
  const isNegative = w.avgRoi < 0;

  return (
    <div className="flex items-center gap-3 py-[7px] border-b border-jtp-borderSubtle last:border-0">
      {/* Rank */}
      <span className="font-mono text-jtp-2xs text-jtp-textFaint w-4 text-right flex-shrink-0">
        {rank}
      </span>

      {/* Address */}
      <span className="font-mono text-jtp-xs text-jtp-textMuted flex-1 min-w-0 truncate">
        {truncateAddr(w.address)}
      </span>

      {/* Win% */}
      <span
        className="font-mono text-jtp-xs flex-shrink-0"
        style={{ color: '#3ddc84' }}
        title="Win rate"
      >
        {fmtWinRate(w.winRate)}
      </span>

      {/* Avg ROI */}
      <span
        className={`font-mono text-jtp-xs flex-shrink-0 ${roiColor(w.avgRoi)}`}
        title="Average ROI per resolved decision"
      >
        {isPositive ? '▲' : isNegative ? '▼' : ''}{' '}
        {Math.abs(w.avgRoi).toFixed(1)}%
      </span>

      {/* Verdict */}
      <Badge variant={VERDICT_VARIANT[w.verdict] ?? 'neutral'} size="xs">
        {w.verdict}
      </Badge>
    </div>
  );
};

// ─── ChevronRight icon ────────────────────────────────────────────────────────

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

// ─── Main panel ───────────────────────────────────────────────────────────────

const QuantDashPanel: React.FC = () => {
  const { getToken } = useAuth();
  const { navigateTo } = useView();

  const [learning, setLearning] = useState<QuantLearning | null>(null);
  const [sim, setSim] = useState<QuantSimulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [learningData, simData] = await Promise.allSettled([
        api.quantLearning(token),
        api.quantSimulation(50, 0.05, 'live', token),
      ]);

      if (learningData.status === 'fulfilled') setLearning(learningData.value);
      if (simData.status === 'fulfilled') setSim(simData.value);

      // If both failed that's an error
      if (learningData.status === 'rejected' && simData.status === 'rejected') {
        setError('Could not load Quant data.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load Quant data.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overall = learning?.overall;
  const topWallets: QuantLearningWallet[] = [...(learning?.wallets ?? [])]
    .sort((a, b) => b.avgRoi - a.avgRoi)
    .slice(0, 5);

  // Paper equity display
  const simStart = sim?.startBalance ?? 50;
  const simFinal = sim?.finalBalance;
  const simIsUp = simFinal !== undefined ? simFinal >= simStart : true;
  const simColor = simIsUp ? 'text-jtp-profit' : 'text-jtp-loss';

  const balanceValue = simFinal !== undefined
    ? fmtBalance(simFinal)
    : '—';

  const hasResolved = overall && overall.resolved > 0;
  const hasData = hasResolved || (sim && sim.nTrades > 0);

  return (
    <Panel
      label="QUANT — PAPER ENGINE"
      actions={
        <button
          onClick={() => navigateTo('quant')}
          className="flex items-center gap-1 font-mono text-jtp-xs text-jtp-textMuted hover:text-jtp-text transition-colors"
          aria-label="View full Quant analysis"
        >
          View full analysis
          <ChevronRight />
        </button>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="stat" />
            ))}
          </div>
          <div className="flex flex-col gap-2 mt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      ) : error ? (
        <p role="alert" className="text-jtp-md text-jtp-loss py-4">
          {error}
        </p>
      ) : !hasData ? (
        <EmptyState
          title="Building forward data"
          description="The engine is tracking wallets out-of-sample. Stats appear as predictions resolve."
          className="py-8"
        />
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Stat tiles ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatTile
              label="OS WIN RATE"
              value={hasResolved ? fmtWinRate(overall!.winRate) : '—'}
              valueColor={
                hasResolved
                  ? overall!.winRate >= 0.5
                    ? 'text-jtp-profit'
                    : 'text-jtp-loss'
                  : undefined
              }
              positive={hasResolved ? overall!.winRate >= 0.5 : undefined}
              subValue="out-of-sample"
            />
            <StatTile
              label="AVG ROI"
              value={hasResolved ? fmtRoi(overall!.avgRoi) : '—'}
              valueColor={hasResolved ? roiColor(overall!.avgRoi) : undefined}
              positive={hasResolved && overall!.avgRoi !== 0 ? overall!.avgRoi > 0 : undefined}
              subValue="per decision"
            />
            <StatTile
              label="PAPER $50 →"
              value={balanceValue}
              valueColor={simFinal !== undefined ? simColor : undefined}
              positive={simFinal !== undefined ? simIsUp : undefined}
              subValue={sim && sim.nTrades > 0 ? `${sim.nTrades} trades` : 'no trades yet'}
            />
            <StatTile
              label="MAX DRAWDOWN"
              value={sim && sim.nTrades > 0 ? `${sim.maxDrawdownPct.toFixed(1)}%` : '—'}
              valueColor="text-jtp-loss"
              subValue="paper simulation"
            />
            <StatTile
              label="RESOLVED / PENDING"
              value={overall ? `${overall.resolved} / ${overall.pending}` : '— / —'}
              valueColor="text-jtp-textMuted"
              subValue="decisions"
            />
          </div>

          {/* ── Top wallets ── */}
          {topWallets.length > 0 && (
            <div>
              <div className="font-mono text-jtp-2xs text-jtp-textFaint tracking-[0.12em] uppercase mb-2">
                Top working wallets
              </div>
              <div className="divide-y divide-jtp-borderSubtle">
                {topWallets.map((w, i) => (
                  <WalletRow key={w.address} w={w} rank={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* ── Disclaimer + link ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-jtp-borderSubtle">
            <p className="text-jtp-xs text-jtp-textFaint">
              Paper, out-of-sample — not financial advice.
            </p>
            <button
              onClick={() => navigateTo('quant')}
              className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors flex items-center gap-1"
              aria-label="Open Quant full analysis page"
            >
              View full analysis
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
};

export default QuantDashPanel;
