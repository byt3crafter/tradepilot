/**
 * QuantDashPanel — Real Auto Bot summary for the main Dashboard.
 *
 * Shows REAL Polymarket bot analytics (not paper simulation).
 * Data sources:
 *   GET /api/autobot/status      → address, mode, killSwitch, balance, exposureUsd, stats
 *   GET /api/autobot/performance → detailed stats + equity curve [{t, pnl}]
 *
 * Contents:
 *   - Mode badge (AUTO / Manual)
 *   - Headline: wallet USDC.e balance + realized P&L
 *   - Stat tiles: P&L · RIGHT · WRONG · WIN RATE · EXPOSURE · OPEN/RESOLVED
 *   - Equity curve (Recharts area, cumulative real P&L)
 *   - Honest caption + "Open Auto Bot →" CTA
 *
 * REAL DATA ONLY — sparse/empty is shown honestly, never padded with fakes.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { useView } from '../../../context/ViewContext';
import api from '../../../services/api';
import type { AutobotStatus, AutobotPerformance } from '../../../types';
import Panel from '../../ui/Panel';
import StatTile from '../../ui/StatTile';
import Badge from '../../ui/Badge';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUsd = (n: number) =>
  '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPnl = (n: number): string => {
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${fmtUsd(n)}`;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const pnlColor = (n: number) =>
  n > 0 ? 'text-jtp-profit' : n < 0 ? 'text-jtp-loss' : 'text-jtp-textMuted';

const formatCurveDate = (t: number) => {
  const d = new Date(t);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

// ─── Custom tooltip for equity curve ─────────────────────────────────────────

const CurveTooltip: React.FC<{
  active?: boolean;
  payload?: { value: number }[];
  label?: string | number;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const pnl = payload[0].value;
  const color = pnl >= 0 ? '#3ddc84' : '#ff5b52';
  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-sm px-3 py-2 shadow-md">
      <p className="font-mono text-[10px] text-jtp-textFaint mb-[3px]">
        {typeof label === 'number' ? formatCurveDate(label) : label}
      </p>
      <p className="font-mono text-jtp-xs font-semibold" style={{ color }}>
        {fmtPnl(pnl)}
      </p>
    </div>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const QuantDashPanel: React.FC = () => {
  const { getToken } = useAuth();
  const { navigateTo } = useView();

  const [status, setStatus] = useState<AutobotStatus | null>(null);
  const [perf, setPerf] = useState<AutobotPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [statusRes, perfRes] = await Promise.allSettled([
        api.autobotStatus(token),
        api.autobotPerformance(token),
      ]);

      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      if (perfRes.status === 'fulfilled') setPerf(perfRes.value);

      if (statusRes.status === 'rejected' && perfRes.status === 'rejected') {
        setError('Could not load Auto Bot data.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load Auto Bot data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = perf?.stats ?? status?.stats ?? null;
  const curve = perf?.curve ?? [];
  const hasCurve = curve.length > 0;

  // Derive losses — performance stats has it, status.stats can be inferred
  const losses =
    perf?.stats.losses !== undefined
      ? perf.stats.losses
      : stats
        ? (stats as AutobotStatus['stats']).resolved - (stats as AutobotStatus['stats']).wins
        : 0;

  const realizedPnl = stats?.realizedPnlUsd ?? 0;
  const walletBalance = status?.balance.usdce ?? perf?.stats.walletUsdce ?? null;
  const exposure = status?.exposureUsd ?? perf?.stats.openExposureUsd ?? 0;
  const isAuto = status?.mode === 'auto';

  // Resolved count: prefer perf.stats (has open too)
  const resolved = perf?.stats.resolved ?? (stats as AutobotStatus['stats'] | null)?.resolved ?? 0;
  const open = perf?.stats.open ?? 0;

  const hasAnyData = stats !== null || walletBalance !== null;

  // Curve color — green if net positive, red otherwise
  const curveColor = realizedPnl >= 0 ? '#3ddc84' : '#ff5b52';
  const curveFill = realizedPnl >= 0 ? 'rgba(61,220,132,0.12)' : 'rgba(255,91,82,0.10)';

  return (
    <Panel
      label="QUANT — AUTO BOT (real)"
      actions={
        <div className="flex items-center gap-3">
          {/* Mode badge */}
          {status && (
            <span
              className="font-mono text-jtp-2xs flex items-center gap-[5px]"
              aria-label={`Bot mode: ${isAuto ? 'automatic' : 'manual'}`}
            >
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{ backgroundColor: isAuto ? '#3ddc84' : '#e8a23d' }}
                aria-hidden="true"
              />
              <span style={{ color: isAuto ? '#3ddc84' : '#e8a23d' }}>
                {isAuto ? 'AUTO' : 'MANUAL'}
              </span>
            </span>
          )}
          <button
            onClick={() => navigateTo('quant')}
            className="flex items-center gap-1 font-mono text-jtp-xs text-jtp-textMuted hover:text-jtp-text transition-colors"
            aria-label="Open Auto Bot page"
          >
            Open Auto Bot
            <ChevronRight />
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          {/* Headline skeleton */}
          <Skeleton className="h-10 w-48" />
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="stat" />
            ))}
          </div>
          {/* Curve skeleton */}
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <p role="alert" className="text-jtp-md text-jtp-loss py-4">
          {error}
        </p>
      ) : !hasAnyData ? (
        <EmptyState
          title="Auto Bot not yet initialised"
          description="Deploy a bot wallet first — stats will appear here once it is live."
          className="py-8"
        />
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Headline: wallet balance + P&L ── */}
          <div className="flex items-baseline gap-4 flex-wrap">
            {walletBalance !== null && (
              <div className="flex items-baseline gap-2">
                <span
                  className="font-mono font-bold text-jtp-text"
                  style={{ fontSize: '1.75rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtUsd(walletBalance)}
                </span>
                <span className="font-mono text-jtp-xs text-jtp-textFaint">USDC.e</span>
              </div>
            )}
            {stats !== null && (
              <span
                className={`font-mono font-semibold text-jtp-lg ${pnlColor(realizedPnl)}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
                aria-label={`Realized P&L: ${fmtPnl(realizedPnl)}`}
              >
                {fmtPnl(realizedPnl)} realized
              </span>
            )}
          </div>

          {/* ── Stat tiles ── */}
          {stats !== null && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatTile
                label="REALIZED P&L"
                value={fmtPnl(realizedPnl)}
                valueColor={pnlColor(realizedPnl)}
                positive={realizedPnl !== 0 ? realizedPnl > 0 : undefined}
                subValue="all time"
              />
              <StatTile
                label="RIGHT"
                value={String(stats.wins)}
                valueColor="text-jtp-profit"
                subValue="winning trades"
              />
              <StatTile
                label="WRONG"
                value={String(losses)}
                valueColor={losses > 0 ? 'text-jtp-loss' : 'text-jtp-textMuted'}
                subValue="losing trades"
              />
              <StatTile
                label="WIN RATE"
                value={stats.winRate > 0 || resolved > 0 ? fmtPct(stats.winRate) : '—'}
                valueColor={
                  stats.winRate >= 0.5 && resolved > 0
                    ? 'text-jtp-profit'
                    : resolved > 0
                      ? 'text-jtp-loss'
                      : 'text-jtp-textMuted'
                }
                positive={resolved > 0 ? stats.winRate >= 0.5 : undefined}
                subValue={resolved > 0 ? `${resolved} resolved` : 'no resolved yet'}
              />
              <StatTile
                label="EXPOSURE"
                value={exposure > 0 ? fmtUsd(exposure) : '$0.00'}
                valueColor={exposure > 0 ? 'text-jtp-warning' : 'text-jtp-textMuted'}
                subValue="open positions"
              />
              <StatTile
                label="OPEN / RESOLVED"
                value={`${open} / ${resolved}`}
                valueColor="text-jtp-textMuted"
                subValue="positions"
              />
            </div>
          )}

          {/* ── Equity curve ── */}
          <div>
            <div className="font-mono text-jtp-2xs text-jtp-textFaint tracking-[0.12em] uppercase mb-2">
              Realized P&L curve
            </div>
            {hasCurve ? (
              <div className="h-32" aria-label="Equity curve chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={curve}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="botCurveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={curveColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={curveColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="rgba(255,255,255,0.04)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={formatCurveDate}
                      tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `$${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(0)}`}
                      tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip content={<CurveTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke={curveColor}
                      strokeWidth={1.5}
                      fill="url(#botCurveGradient)"
                      dot={false}
                      activeDot={{ r: 3, fill: curveColor, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center rounded-sm border border-jtp-borderSubtle">
                <p className="font-mono text-jtp-xs text-jtp-textFaint text-center px-4">
                  No resolved trades yet — markets settle over hours/days
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-jtp-borderSubtle">
            <p className="text-jtp-xs text-jtp-textFaint">
              Real money — your Polymarket bot.{' '}
              Paper-proven first; this is the live result.
            </p>
            <button
              onClick={() => navigateTo('quant')}
              className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors flex items-center gap-1"
              aria-label="Open Auto Bot page"
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

export default QuantDashPanel;
