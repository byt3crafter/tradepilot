/**
 * WhatWorksPanel — Learning view for the Quant module.
 *
 * Shows the engine's paper-trade predictions vs. what actually resolved,
 * so the user can see where the system is right and where it's wrong.
 *
 * Sections:
 *   0. Paper Wallet Simulation card (top)
 *   1. Overall stat tiles (resolved, pending, win rate, avg ROI)
 *   2. Per-wallet DataTable sorted by avgRoi desc
 *   3. Predictions → Outcomes feed with All/Wins/Losses/Pending filter
 *
 * REAL DATA ONLY. Sparse or empty is expected and handled gracefully.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import type { QuantLearning, QuantLearningWallet, QuantDecision, QuantSimulation } from '../../types';
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

// ─── Risk segments ────────────────────────────────────────────────────────────

type RiskValue = '0.01' | '0.03' | '0.05' | '0.10';

const RISK_SEGMENTS: Segment<RiskValue>[] = [
  { value: '0.01', label: '1%',  title: '1% risk per trade' },
  { value: '0.03', label: '3%',  title: '3% risk per trade' },
  { value: '0.05', label: '5%',  title: '5% risk per trade' },
  { value: '0.10', label: '10%', title: '10% risk per trade' },
];

// ─── Sample mode segments ─────────────────────────────────────────────────────

type SampleMode = 'live' | 'historical';

const SAMPLE_SEGMENTS: Segment<SampleMode>[] = [
  {
    value: 'live',
    label: 'Live (out-of-sample)',
    title: 'Forward signals logged before resolution — the honest number',
  },
  {
    value: 'historical',
    label: 'Historical (hindsight)',
    title: "In-sample backfill from wallets' own already-won trades — optimistic, not achievable forward",
  },
];

// ─── Simulation chart tooltip ─────────────────────────────────────────────────

const SimTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const bal: number = payload[0]?.value;
  return (
    <div
      style={{ background: '#0d0f12', border: '1px solid #1b2026', borderRadius: 2 }}
      className="px-3 py-2"
    >
      <span className="font-mono text-jtp-xs text-jtp-text">
        ${bal !== undefined ? bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
      </span>
    </div>
  );
};

// ─── Paper Wallet Simulation card ─────────────────────────────────────────────

const PaperWalletSimCard: React.FC = () => {
  const { getToken } = useAuth();

  const [bankrollInput, setBankrollInput] = useState<string>('50');
  const [risk, setRisk] = useState<RiskValue>('0.05');
  const [sample, setSample] = useState<SampleMode>('live');
  const [sim, setSim] = useState<QuantSimulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce bankroll fetch: wait 600ms after last keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSim = useCallback(
    async (bankroll: number, riskFrac: number, sampleMode: SampleMode) => {
      if (bankroll <= 0 || isNaN(bankroll)) return;
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const data = await api.quantSimulation(bankroll, riskFrac, sampleMode, token);
        setSim(data);
      } catch (e: any) {
        setError(e?.message || 'Simulation unavailable.');
        setSim(null);
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  // Initial fetch — default to live (honest)
  useEffect(() => {
    fetchSim(50, 0.05, 'live');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch immediately when risk or sample changes
  useEffect(() => {
    const bankroll = parseFloat(bankrollInput);
    if (!isNaN(bankroll) && bankroll > 0) {
      fetchSim(bankroll, parseFloat(risk), sample);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risk, sample]);

  const handleBankrollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setBankrollInput(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) {
        fetchSim(val, parseFloat(risk), sample);
      }
    }, 600);
  };

  // Derived display values
  const isUp = sim ? sim.finalBalance >= sim.startBalance : true;
  const lineColor = isUp ? '#3ddc84' : '#ff5b52';
  const areaId = isUp ? 'simAreaUp' : 'simAreaDown';

  const fmtBalance = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const chartData =
    sim?.curve?.map((pt) => ({ t: pt.t, balance: pt.balance })) ?? [];

  const hasCurve = chartData.length >= 2;

  // Caption: use backend note if provided, otherwise fall back
  const caption = sim?.note
    ? sim.note
    : sample === 'live'
    ? 'Forward out-of-sample signals only — no hindsight. Fixed-fraction sizing, compounding. Not a guarantee of future results.'
    : 'In-sample historical backfill — not a guarantee of future results. Fixed-fraction sizing, compounding.';

  return (
    <Panel
      label="PAPER WALLET SIMULATION"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sample mode toggle */}
          <SegmentedControl<SampleMode>
            size="xs"
            segments={SAMPLE_SEGMENTS}
            value={sample}
            onChange={(v) => setSample(v)}
          />
          {/* Bankroll input */}
          <div className="flex items-center gap-0 border border-jtp-borderStrong rounded-jtp-sm overflow-hidden bg-jtp-control">
            <span className="px-2 font-mono text-jtp-xs text-jtp-textDim select-none border-r border-jtp-borderStrong h-full flex items-center">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step={10}
              value={bankrollInput}
              onChange={handleBankrollChange}
              aria-label="Bankroll amount in dollars"
              className="
                w-[68px] px-2 py-[4px]
                bg-transparent font-mono text-jtp-xs text-jtp-text
                outline-none
                [appearance:textfield]
                [&::-webkit-outer-spin-button]:appearance-none
                [&::-webkit-inner-spin-button]:appearance-none
              "
            />
          </div>
          {/* Risk per trade */}
          <SegmentedControl<RiskValue>
            size="xs"
            segments={RISK_SEGMENTS}
            value={risk}
            onChange={(v) => setRisk(v)}
          />
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          {/* Headline skeleton */}
          <div className="flex items-baseline gap-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          {/* Stat tiles skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="stat" />
            ))}
          </div>
          {/* Chart skeleton */}
          <Skeleton className="h-36 w-full" />
        </div>
      ) : error ? (
        <p role="alert" className="text-jtp-md text-jtp-loss py-4">
          {error}
        </p>
      ) : !sim || sim.nTrades === 0 ? (
        sample === 'live' ? (
          /* Honest empty state for live/out-of-sample — no fake data */
          <EmptyState
            title="Out-of-sample test is building"
            description="Forward copy signals resolve as their markets settle. This is the honest number; check back as data accumulates."
            className="py-8"
          />
        ) : (
          <EmptyState
            title="No historical data yet"
            description="Simulation builds as markets settle — check back once the engine has closed its first positions."
            className="py-8"
          />
        )
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Hindsight warning banner (historical mode only) ── */}
          {sample === 'historical' && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-jtp-sm border border-[#ff5b52]/40 bg-[rgba(255,91,82,0.08)] px-3 py-2.5"
            >
              <span className="text-[#ff5b52] text-jtp-sm leading-snug mt-px select-none" aria-hidden="true">
                &#9888;
              </span>
              <p className="text-jtp-sm text-[#ff5b52] leading-snug">
                <strong className="font-semibold">Hindsight backtest</strong> — copies wallets&apos; own
                already-won past trades. Optimistic and{' '}
                <strong className="font-semibold">NOT achievable forward.</strong>
              </p>
            </div>
          )}

          {/* ── Headline: $X → $Y + return badge ── */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <div
              className="font-mono font-bold text-jtp-5xl leading-none tracking-tight"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <span className="text-jtp-textMuted">{fmtBalance(sim.startBalance)}</span>
              <span className="text-jtp-textDim mx-3 font-normal">→</span>
              <span style={{ color: lineColor }}>{fmtBalance(sim.finalBalance)}</span>
            </div>

            {/* Return % badge — CVD: ▲▼ glyph alongside colour */}
            <span
              className="inline-flex items-center gap-1 font-mono text-jtp-sm font-semibold px-2 py-[3px] rounded-jtp-sm"
              style={{
                color: lineColor,
                background: isUp ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,82,0.12)',
              }}
              aria-label={`${isUp ? 'up' : 'down'} ${Math.abs(sim.returnPct).toFixed(1)}%`}
            >
              {isUp ? '▲' : '▼'} {Math.abs(sim.returnPct).toFixed(1)}%
            </span>
          </div>

          {/* ── StatTiles row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="TRADES"
              value={sim.nTrades.toLocaleString('en-US')}
              subValue="total resolved"
            />
            <StatTile
              label="WIN RATE"
              value={`${(sim.winRate * 100).toFixed(1)}%`}
              valueColor={sim.winRate >= 0.5 ? 'text-jtp-profit' : 'text-jtp-loss'}
              positive={sim.winRate >= 0.5}
            />
            <StatTile
              label="MAX DRAWDOWN"
              value={`${sim.maxDrawdownPct.toFixed(1)}%`}
              valueColor="text-jtp-loss"
            />
            <StatTile
              label="RISK/TRADE"
              value={`${(sim.riskFraction * 100).toFixed(0)}%`}
              valueColor="text-jtp-textMuted"
            />
          </div>

          {/* ── Equity curve ── */}
          {hasCurve ? (
            <div
              className="rounded-jtp-sm overflow-hidden"
              style={{ background: '#090b0d', height: 140 }}
              aria-label="Equity curve over time"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="t"
                    hide
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })
                    }
                    tick={{ fill: '#565d66', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <RechartsTooltip
                    content={<SimTooltip />}
                    cursor={{ stroke: '#1b2026', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={lineColor}
                    strokeWidth={1.5}
                    fill={`url(#${areaId})`}
                    dot={false}
                    activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="font-mono text-jtp-xs text-jtp-textFaint py-2">
              Building history… more data points accumulate as markets settle.
            </p>
          )}

          {/* ── Caption from backend note or fallback ── */}
          <p className="text-jtp-sm text-jtp-textFaint leading-relaxed">
            {caption}
          </p>
        </div>
      )}
    </Panel>
  );
};

// ─── In-sample disclaimer (reused in two places) ──────────────────────────────

const InSampleDisclaimer: React.FC = () => (
  <p className="text-jtp-xs text-jtp-textFaint leading-relaxed">
    These include in-sample historical backfill — verdicts are a historical record, not yet forward-proven.
  </p>
);

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

      {/* ── Paper Wallet Simulation ── */}
      <PaperWalletSimCard />

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
        <div className="flex flex-col gap-2">
          {/* In-sample disclaimer above the stats row */}
          <InSampleDisclaimer />
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
          <div className="flex flex-col">
            {/* In-sample disclaimer above the table */}
            <div className="px-4 pt-3 pb-1">
              <InSampleDisclaimer />
            </div>
            <DataTable
              columns={WALLET_COLS}
              data={wallets}
              keyFn={(w) => w.address}
              maxHeight="300px"
              emptyMessage="No wallets found."
            />
          </div>
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
