/**
 * WhatWorksPanel — Learning view for the Quant module.
 *
 * Shows the engine's paper-trade predictions vs. what actually resolved,
 * so the user can see where the system is right and where it's wrong.
 *
 * Sections:
 *   1. Overall stat tiles (resolved, pending, win rate, avg ROI)
 *   2. Per-wallet DataTable sorted by avgRoi desc
 *   3. Predictions → Outcomes feed with All/Wins/Losses/Pending filter
 *
 * REAL DATA ONLY. Sparse or empty is expected and handled gracefully.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import type { QuantLearning, QuantLearningWallet, QuantDecision } from '../../types';
import Panel from '../ui/Panel';
import StatTile from '../ui/StatTile';
import Badge from '../ui/Badge';
import SegmentedControl from '../ui/SegmentedControl';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import type { TableColumn } from '../ui/DataTable';
import type { Segment } from '../ui/SegmentedControl';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncateAddr = (addr: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

const fmtNum = (n: number) => n.toLocaleString('en-US');

const fmtWinRate = (n: number) => `${(n * 100).toFixed(1)}%`;

const fmtRoi = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  if (n === 0) return '0.0%';
  const glyph = n > 0 ? '▲' : '▼';
  return `${glyph} ${Math.abs(n).toFixed(1)}%`;
};

const roiColor = (n: number | null | undefined): string => {
  if (n === null || n === undefined || n === 0) return 'text-jtp-textDim';
  return n > 0 ? 'text-jtp-profit' : 'text-jtp-loss';
};

const fmtRelTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '—';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
};

const VERDICT_VARIANT: Record<string, 'profit' | 'loss' | 'warning' | 'neutral'> = {
  validated: 'profit',
  disabled: 'loss',
  watch: 'warning',
  learning: 'neutral',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type DecisionFilter = 'all' | 'win' | 'loss' | 'pending';

const FILTER_SEGMENTS: Segment<DecisionFilter>[] = [
  { value: 'all',     label: 'All' },
  { value: 'win',     label: 'Wins' },
  { value: 'loss',    label: 'Losses' },
  { value: 'pending', label: 'Pending' },
];

// ─── Per-wallet DataTable columns ─────────────────────────────────────────────

const WALLET_COLS: TableColumn<QuantLearningWallet>[] = [
  {
    key: 'address',
    header: 'WALLET',
    render: (v: string) => (
      <span className="font-mono text-jtp-xs text-jtp-textMuted">
        {truncateAddr(v)}
      </span>
    ),
  },
  {
    key: 'n',
    header: 'SIGNALS',
    align: 'right',
    mono: true,
    render: (v: number) => fmtNum(v),
  },
  {
    key: 'winRate',
    header: 'WIN%',
    align: 'right',
    mono: true,
    render: (v: number) => fmtWinRate(v),
  },
  {
    key: 'avgRoi',
    header: 'AVG ROI',
    align: 'right',
    mono: true,
    render: (v: number) => (
      <span className={roiColor(v)}>{fmtRoi(v)}</span>
    ),
  },
  {
    key: 'verdict',
    header: 'VERDICT',
    render: (v: string) => (
      <Badge variant={VERDICT_VARIANT[v] ?? 'neutral'} size="xs">
        {v}
      </Badge>
    ),
  },
];

// ─── Decision status badge ─────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'profit' | 'loss' | 'warning'> = {
  win: 'profit',
  loss: 'loss',
  pending: 'warning',
};

// ─── Main component ───────────────────────────────────────────────────────────

const WhatWorksPanel: React.FC = () => {
  const { getToken } = useAuth();

  const [learning, setLearning] = useState<QuantLearning | null>(null);
  const [decisions, setDecisions] = useState<QuantDecision[]>([]);
  const [loadingLearning, setLoadingLearning] = useState(true);
  const [loadingDecisions, setLoadingDecisions] = useState(true);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DecisionFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLearning = useCallback(async () => {
    setLearningError(null);
    try {
      const token = await getToken();
      const data = await api.quantLearning(token);
      setLearning(data);
    } catch (e: any) {
      setLearningError(e?.message || 'Could not load learning data.');
    } finally {
      setLoadingLearning(false);
    }
  }, [getToken]);

  const fetchDecisions = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.quantLearningDecisions(60, token);
      setDecisions(Array.isArray(data) ? data : []);
    } catch {
      // leave prior state; empty is fine
    } finally {
      setLoadingDecisions(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchLearning();
    fetchDecisions();
  }, [fetchLearning, fetchDecisions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingDecisions(true);
    await Promise.all([fetchLearning(), fetchDecisions()]);
    setRefreshing(false);
  }, [fetchLearning, fetchDecisions]);

  // Sort wallets by avgRoi desc
  const wallets: QuantLearningWallet[] = [...(learning?.wallets ?? [])].sort(
    (a, b) => b.avgRoi - a.avgRoi,
  );

  const overall = learning?.overall;

  const filteredDecisions = decisions.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  return (
    <div className="flex flex-col gap-4 animate-jtp-fade-in">

      {/* ── Header + disclaimer ── */}
      <div>
        <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
          What Works
        </h1>
        <p className="text-jtp-lg text-jtp-textMuted mt-1.5 max-w-2xl">
          Paper simulation — no real money. What the engine predicted vs what actually happened.
        </p>
      </div>

      {/* ── Overall StatTiles ── */}
      {loadingLearning ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="stat" />
          ))}
        </div>
      ) : learningError ? (
        <p role="alert" className="text-jtp-md text-jtp-loss">{learningError}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="RESOLVED"
            value={overall ? fmtNum(overall.resolved) : '—'}
            subValue="decisions"
          />
          <StatTile
            label="PENDING"
            value={overall ? fmtNum(overall.pending) : '—'}
            valueColor="text-jtp-textMuted"
            subValue="open markets"
          />
          <StatTile
            label="WIN RATE"
            value={overall && overall.resolved > 0 ? `${(overall.winRate * 100).toFixed(1)}%` : '—'}
            valueColor={
              overall && overall.resolved > 0
                ? overall.winRate >= 0.5
                  ? 'text-jtp-profit'
                  : 'text-jtp-loss'
                : undefined
            }
            positive={
              overall && overall.resolved > 0
                ? overall.winRate >= 0.5
                : undefined
            }
            subValue={overall && overall.resolved > 0 ? 'of resolved' : 'no resolved yet'}
          />
          <StatTile
            label="AVG PAPER ROI"
            value={overall && overall.resolved > 0 ? fmtRoi(overall.avgRoi) : '—'}
            valueColor={
              overall && overall.resolved > 0 ? roiColor(overall.avgRoi) : undefined
            }
            positive={
              overall && overall.resolved > 0 && overall.avgRoi !== 0
                ? overall.avgRoi > 0
                : undefined
            }
            subValue="per resolved decision"
          />
        </div>
      )}

      {/* ── Per-wallet table ── */}
      <Panel label="PER-WALLET — WHAT WORKS" noPadding>
        {loadingLearning ? (
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <EmptyState
            title="No wallet data yet"
            description="Wallet-level signals accumulate as the engine tracks and resolves market predictions."
            className="py-10"
          />
        ) : (
          <DataTable
            columns={WALLET_COLS}
            data={wallets}
            keyFn={(w) => w.address}
            maxHeight="300px"
            emptyMessage="No wallets found."
          />
        )}
      </Panel>

      {/* ── Predictions → Outcomes feed ── */}
      <Panel
        label="PREDICTIONS → OUTCOMES"
        noPadding
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <SegmentedControl
              size="xs"
              segments={FILTER_SEGMENTS}
              value={filter}
              onChange={setFilter}
            />
            <Button
              variant="secondary"
              className="!px-2.5 !py-[3px] !text-jtp-xs"
              onClick={handleRefresh}
              isLoading={refreshing}
              aria-label="Refresh predictions"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        }
      >
        {loadingDecisions ? (
          <div className="flex flex-col divide-y divide-jtp-borderSubtle">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-[13px] w-3/4" />
                  <Skeleton className="h-[11px] w-1/2" />
                </div>
                <Skeleton className="h-[18px] w-14 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredDecisions.length === 0 ? (
          <EmptyState
            title="Learning in progress"
            description="Predictions resolve as their markets settle. Check back as data accumulates."
            className="py-12"
          />
        ) : (
          <div className="divide-y divide-jtp-borderSubtle">
            {filteredDecisions.map((d) => (
              <div
                key={d.id}
                className={[
                  'flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-jtp-hover',
                  d.status === 'loss'
                    ? 'border-l-2 border-[#ff5b52] bg-[rgba(255,91,82,0.03)]'
                    : 'border-l-2 border-transparent',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* LEFT: prediction text + market title + time */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-jtp-xs text-jtp-text leading-snug">
                    {d.prediction}
                  </div>
                  {d.title && (
                    <div className="text-jtp-textDim text-jtp-xs truncate mt-[3px]">
                      {d.title}
                    </div>
                  )}
                  <div className="font-mono text-jtp-2xs text-jtp-textFaint mt-1">
                    {fmtRelTime(d.createdAt)}
                    {d.resolvedAt && (
                      <span className="ml-2 text-jtp-textFaint/70">
                        resolved {fmtRelTime(d.resolvedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* RIGHT: status badge + ROI */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge
                    variant={STATUS_VARIANT[d.status] ?? 'neutral'}
                    size="xs"
                  >
                    {d.status.toUpperCase()}
                  </Badge>
                  {d.roiPct !== null && d.roiPct !== undefined && (
                    <span
                      className={`font-mono text-jtp-xs font-semibold ${roiColor(d.roiPct)}`}
                      aria-label={`ROI: ${fmtRoi(d.roiPct)}`}
                    >
                      {fmtRoi(d.roiPct)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default WhatWorksPanel;
