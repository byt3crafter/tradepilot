/**
 * CryptoPage — Multi-exchange crypto trading engine.
 *
 * Tabs:
 *   Funding Arb   — LIVE: delta-neutral funding rate scanner, polls every 30s
 *   What Works    — paper-trading learning loop: stats, equity curve, byBand table, positions
 *   Momentum      — described, coming
 *   Mean-Reversion— described, coming
 *   AI Signals    — described, coming
 *   Auto Bot      — described, coming
 *   Connection    — exchange API key status (read-only; keys set via Admin)
 *
 * Gated by quantEnabled (same gate as Quant).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Panel, Badge, Button, SegmentedControl, EmptyState, Skeleton, StatTile } from '../components/ui';
import { CryptoFundingOpp, CryptoFundingScan, ExchangeStatusMap, CryptoPerformance, CryptoPaperTrade, CryptoMomentum, CryptoVolatility, CryptoBotStatus, CryptoBotTrade } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CryptoTab =
  | 'funding_arb'
  | 'what_works'
  | 'momentum'
  | 'volatility'
  | 'mean_reversion'
  | 'ai_signals'
  | 'auto_bot'
  | 'connection';

// ─── Icons ────────────────────────────────────────────────────────────────────

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M2 8a6 6 0 0110.5-4" strokeLinecap="round" />
    <path d="M14 8a6 6 0 01-10.5 4" strokeLinecap="round" />
    <polyline points="12,2 12.5,4.5 10,4.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="4,13.5 3.5,11 6,11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TickerSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <polyline points="2,12 5,7 8,9 11,4 14,6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Funding Arb Row ─────────────────────────────────────────────────────────

const FundingRow: React.FC<{ opp: CryptoFundingOpp }> = ({ opp }) => {
  const isCarry = opp.side === 'cash-and-carry';
  const sideVariant = isCarry ? 'profit' : 'info' as const;
  const sideLabel = isCarry ? 'CASH-AND-CARRY' : 'REV-CARRY';

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 py-4 border-b border-jtp-border last:border-0">
      {/* Yield + symbol */}
      <div className="flex items-baseline gap-3 min-w-0 flex-1">
        <span
          className="font-mono font-bold tabular-nums flex-shrink-0"
          style={{ fontSize: '22px', color: '#3ddc84', lineHeight: 1 }}
        >
          +{opp.netAnnualPct.toFixed(1)}%/yr
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-jtp-text text-jtp-lg">
              {opp.symbol}
            </span>
            <Badge variant="neutral" size="xs">
              {opp.fundingPct8h.toFixed(4)}%/8h
            </Badge>
            <Badge variant={sideVariant} size="xs">
              {sideLabel}
            </Badge>
          </div>
          <div className="mt-[3px] flex items-center gap-2 flex-wrap">
            <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
              mark&nbsp;
              <span className="text-jtp-textMuted">
                ${opp.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </span>
            <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
              vol&nbsp;
              <span className="text-jtp-textMuted">
                ${(opp.volume24hUsd / 1_000_000).toFixed(0)}M
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0 max-w-xs">
        <p className="text-jtp-xs text-jtp-textDim leading-snug font-mono">
          {opp.action}
        </p>
      </div>
    </div>
  );
};

// ─── Tab: Funding Arb ────────────────────────────────────────────────────────

const FundingArbTab: React.FC<{ exchange: string; token: string | null }> = ({
  exchange,
  token,
}) => {
  const [scan, setScan] = useState<CryptoFundingScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.exchangesFunding(exchange, token);
      setScan(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load funding data');
    } finally {
      setLoading(false);
    }
  }, [exchange, token]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const headerActions = (
    <div className="flex items-center gap-2">
      {updatedStr && (
        <span className="font-mono text-jtp-xs text-jtp-textDim">
          <RefreshIcon className="inline w-3 h-3 mr-1 align-middle" />
          updated {updatedStr}
        </span>
      )}
      <button
        onClick={load}
        disabled={loading}
        className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted transition-colors disabled:opacity-40"
        aria-label="Refresh funding data"
      >
        {loading ? 'loading...' : 'refresh'}
      </button>
    </div>
  );

  if (error) {
    return (
      <Panel label="FUNDING OPPORTUNITIES" actions={headerActions}>
        <div className="py-6 text-center">
          <p className="text-jtp-loss text-jtp-md font-mono">{error}</p>
          <button
            onClick={load}
            className="mt-3 text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted font-mono"
          >
            retry
          </button>
        </div>
      </Panel>
    );
  }

  if (loading && !scan) {
    return (
      <Panel label="FUNDING OPPORTUNITIES" actions={headerActions}>
        <div className="space-y-3 py-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="panel" className="h-16" />
          ))}
        </div>
      </Panel>
    );
  }

  const opps = scan?.opportunities ?? [];

  return (
    <div className="space-y-4">
      <Panel
        label="FUNDING OPPORTUNITIES"
        actions={headerActions}
      >
        {opps.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            description="No funding rate opportunities detected for this exchange right now."
          />
        ) : (
          <div>
            {opps.map((opp, i) => (
              <FundingRow key={`${opp.symbol}-${i}`} opp={opp} />
            ))}
          </div>
        )}
      </Panel>

      {/* Disclaimer */}
      <Panel label="HOW THIS WORKS">
        <div className="space-y-2 text-jtp-sm text-jtp-textMuted leading-relaxed max-w-2xl">
          <p>
            <span className="text-jtp-amber font-semibold">Delta-neutral funding yield.</span>{' '}
            Crypto perpetual futures pay a funding rate every 8 hours — positive rates mean longs
            pay shorts. By holding equal and opposite spot + perp positions you collect the funding
            with near-zero directional exposure.
          </p>
          <p>
            <span className="text-jtp-amber font-semibold">Risk note:</span>{' '}
            Highest rates are on volatile alts (higher risk); BTC/ETH are lower but safer. Rates
            shown are gross — net yield assumes ~6%/yr in fees (exchange fees, spread, borrow).
            Rates can flip rapidly.
          </p>
          <p>
            <span className="text-jtp-textDim font-mono text-jtp-xs">
              READ-ONLY SCANNER. Execution coming — testnet first.
            </span>
          </p>
        </div>
      </Panel>
    </div>
  );
};

// ─── Tab: What Works ──────────────────────────────────────────────────────────

const fmtUsd = (v: number) =>
  '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (v: number) =>
  (v * 100).toFixed(1) + '%';

const pnlColor = (v: number) =>
  v > 0 ? 'text-[#3ddc84]' : v < 0 ? 'text-[#ff5b52]' : 'text-jtp-textMuted';

const WhatWorksTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const pnl: number = payload[0]?.value ?? 0;
  const sign = pnl >= 0 ? '+' : '';
  const color = pnl >= 0 ? '#3ddc84' : '#ff5b52';
  return (
    <div
      style={{ background: '#0d0f12', border: '1px solid #1b2026', borderRadius: 2 }}
      className="px-3 py-2"
    >
      <span className="font-mono text-jtp-xs" style={{ color }}>
        {sign}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

type WhatWorksStrategy = 'funding' | 'momentum';

const WhatWorksTab: React.FC<{ token: string | null }> = ({ token }) => {
  const [strategy, setStrategy] = useState<WhatWorksStrategy>('funding');
  const [perf, setPerf] = useState<CryptoPerformance | null>(null);
  const [trades, setTrades] = useState<CryptoPaperTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset stale data when strategy switches
  useEffect(() => {
    setPerf(null);
    setTrades([]);
    setError('');
    setLastUpdated(null);
  }, [strategy]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [perfData, tradesData] = await Promise.all([
        api.exchangesPerformance(strategy, token),
        api.exchangesPaperTrades(strategy, 60, token),
      ]);
      setPerf(perfData);
      setTrades(tradesData);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [token, strategy]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 15_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const refreshBadge = updatedStr ? (
    <span className="font-mono text-jtp-xs text-jtp-textDim flex items-center gap-1">
      <RefreshIcon className="w-3 h-3 flex-shrink-0" />
      updated {updatedStr}
    </span>
  ) : null;

  const panelLabel = strategy === 'funding' ? 'WHAT WORKS — FUNDING ARB' : 'WHAT WORKS — MOMENTUM';

  const strategyControl = (
    <SegmentedControl
      segments={[
        { value: 'funding', label: 'Funding' },
        { value: 'momentum', label: 'Momentum' },
      ]}
      value={strategy}
      onChange={(v) => setStrategy(v as WhatWorksStrategy)}
      size="sm"
    />
  );

  if (error) {
    return (
      <div className="space-y-4">
        <div>{strategyControl}</div>
        <Panel label={panelLabel} actions={refreshBadge}>
        <div className="py-6 text-center">
          <p className="text-jtp-loss text-jtp-md font-mono">{error}</p>
          <button
            onClick={load}
            className="mt-3 text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted font-mono"
          >
            retry
          </button>
        </div>
      </Panel>
      </div>
    );
  }

  if (loading && !perf) {
    return (
      <div className="space-y-4">
        <div>{strategyControl}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton className="h-36 w-full" />
        <Skeleton variant="panel" className="h-32" />
      </div>
    );
  }

  const st = perf?.stats;
  const resolved = st?.resolved ?? 0;
  const open = st?.open ?? 0;
  const isEmpty = resolved === 0 && open === 0;

  // Equity curve
  const curve = perf?.curve ?? [];
  const chartData = curve.map(pt => ({ t: pt.t, pnl: pt.pnl }));
  const hasCurve = chartData.length >= 2;
  const finalPnl = curve.length > 0 ? curve[curve.length - 1].pnl : 0;
  const isUp = finalPnl >= 0;
  const lineColor = isUp ? '#3ddc84' : '#ff5b52';
  const areaId = isUp ? 'cryptoPerfAreaUp' : 'cryptoPerfAreaDown';

  const yAxisFormatter = (v: number) => {
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      {/* ── Strategy toggle ── */}
      <div>{strategyControl}</div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="OPEN" value={st ? String(st.open) : '—'} valueColor="text-[#e8a23d]" />
        <StatTile label="RESOLVED" value={st ? String(st.resolved) : '—'} />
        <StatTile
          label="RIGHT"
          value={st ? String(st.wins) : '—'}
          valueColor="text-[#3ddc84]"
          subValue="trades won"
        />
        <StatTile
          label="WRONG"
          value={st ? String(st.losses) : '—'}
          valueColor="text-[#ff5b52]"
          subValue="trades lost"
        />
        <StatTile
          label="WIN RATE"
          value={st && resolved > 0 ? fmtPct(st.winRate) : '—'}
          subValue={resolved > 0 ? `${resolved} resolved` : 'no resolved yet'}
        />
        <StatTile
          label="REALIZED P&amp;L"
          value={
            st
              ? st.realizedPnlUsd === 0
                ? '$0.00'
                : `${st.realizedPnlUsd >= 0 ? '+' : ''}${fmtUsd(st.realizedPnlUsd)}`
              : '—'
          }
          valueColor={st ? pnlColor(st.realizedPnlUsd) : undefined}
        />
        <StatTile
          label="OPEN P&amp;L"
          value={
            st
              ? st.openPnlUsd === 0
                ? '$0.00'
                : `${st.openPnlUsd >= 0 ? '+' : ''}${fmtUsd(st.openPnlUsd)}`
              : '—'
          }
          valueColor={st ? pnlColor(st.openPnlUsd) : undefined}
        />
        <StatTile
          label="AVG YIELD"
          value={st && resolved > 0 ? `${st.avgRealizedYieldPct.toFixed(2)}%` : '—'}
          subValue="realized/position"
        />
      </div>

      {/* ── Equity curve ── */}
      {isEmpty ? (
        <EmptyState
          title="Learning loop is warming up"
          description="It opens paper funding positions every 30 min and accrues real funding hourly. Win/loss fills in as positions close after 72h."
        />
      ) : resolved === 0 ? (
        <div
          className="rounded-jtp-sm border border-jtp-borderSubtle flex items-center justify-center"
          style={{ background: '#090b0d', minHeight: 140 }}
        >
          <p className="font-mono text-jtp-xs text-jtp-textFaint text-center max-w-xs px-4">
            No resolved trades yet — funding accrues over hours; positions close after 72h. Curve builds as they settle.
          </p>
        </div>
      ) : hasCurve ? (
        <div
          className="rounded-jtp-sm overflow-hidden"
          style={{ background: '#090b0d', height: 140 }}
          aria-label="Cumulative realized P&L over time"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis
                tickFormatter={yAxisFormatter}
                tick={{ fill: '#565d66', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <RechartsTooltip
                content={<WhatWorksTooltip />}
                cursor={{ stroke: '#1b2026', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
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
      ) : null}

      {/* ── byBand learning table ── */}
      {(perf?.byBand?.length ?? 0) > 0 && (
        <Panel label={strategy === 'funding' ? 'LEARNING — DOES THE HEADLINE FUNDING ACTUALLY PAY?' : 'LEARNING — MOMENTUM BANDS'}>
          <div className="overflow-x-auto">
            <table className="w-full text-jtp-xs font-mono" role="table">
              <thead>
                <tr className="border-b border-jtp-border">
                  <th
                    scope="col"
                    className="text-left py-2 pr-6 text-jtp-textDim font-normal tracking-wide uppercase"
                  >
                    Entry-Funding Band
                  </th>
                  <th
                    scope="col"
                    className="text-right py-2 pr-6 text-jtp-textDim font-normal tracking-wide uppercase"
                  >
                    N
                  </th>
                  <th
                    scope="col"
                    className="text-right py-2 text-jtp-textDim font-normal tracking-wide uppercase"
                  >
                    Realized Yield %
                  </th>
                </tr>
              </thead>
              <tbody>
                {perf!.byBand.map((row, i) => {
                  const yieldCls =
                    row.realizedYieldPct > 0
                      ? 'text-[#3ddc84]'
                      : row.realizedYieldPct < 0
                      ? 'text-[#ff5b52]'
                      : 'text-jtp-textMuted';
                  return (
                    <tr
                      key={i}
                      className="border-b border-jtp-border/50 last:border-0 hover:bg-jtp-raised/50 transition-colors"
                    >
                      <td className="py-2 pr-6 text-jtp-textMuted tabular-nums">{row.band}</td>
                      <td className="py-2 pr-6 text-right tabular-nums text-jtp-textMuted">{row.n}</td>
                      <td className={`py-2 text-right tabular-nums font-semibold ${yieldCls}`}>
                        {row.realizedYieldPct >= 0 ? '+' : ''}{row.realizedYieldPct.toFixed(3)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-jtp-xs text-jtp-textDim font-mono leading-relaxed">
            High headline rates often decay as funding resets, fees drag, and liquidation risk climbs.
            This table shows actual realized yield across completed positions, grouped by the rate at entry.
          </p>
        </Panel>
      )}

      {/* ── Paper positions ── */}
      <Panel label="PAPER POSITIONS" actions={refreshBadge} noPadding>
        {trades.length === 0 ? (
          <div className="px-4 py-4">
            <EmptyState
              title="No paper positions yet"
              description={
                strategy === 'funding'
                  ? 'Positions open every 30 minutes when the scanner finds qualifying funding opportunities.'
                  : 'Positions open when momentum signals fire. Market may be ranging right now.'
              }
            />
          </div>
        ) : (
          <div>
            {trades.map(t => {
              const isOpen = t.status === 'open';
              const pnlCls = t.pnlUsd > 0 ? 'text-[#3ddc84]' : t.pnlUsd < 0 ? 'text-[#ff5b52]' : 'text-jtp-textMuted';
              const badgeVariant = isOpen ? 'warning' : t.pnlUsd >= 0 ? 'profit' : 'loss';
              const badgeLabel = isOpen ? 'OPEN' : 'CLOSED';
              const meta = t.meta as { entryPrice?: number; exitReason?: string } | null | undefined;
              return (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-b border-jtp-border last:border-0 hover:bg-jtp-raised/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-jtp-text text-jtp-sm">{t.symbol}</span>
                      <Badge variant="neutral" size="xs">{t.base}</Badge>
                      {strategy === 'funding' ? (
                        <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
                          entry {t.entryFundingPct.toFixed(4)}%/8h
                        </span>
                      ) : meta?.entryPrice != null ? (
                        <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
                          entry ${meta.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-[3px] flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
                        size{' '}
                        <span className="text-jtp-textMuted">
                          ${t.sizeUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </span>
                      {strategy === 'momentum' && meta?.exitReason && (
                        <span className="font-mono text-jtp-xs text-jtp-textDim">
                          exit: <span className="text-jtp-textMuted">{meta.exitReason}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-mono font-semibold tabular-nums text-jtp-sm ${pnlCls}`}>
                      {t.pnlUsd >= 0 ? '+' : ''}
                      ${Math.abs(t.pnlUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <Badge variant={badgeVariant} size="xs">{badgeLabel}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Honest caption ── */}
      <Panel label="HOW THIS WORKS">
        <div className="space-y-2 text-jtp-sm text-jtp-textMuted leading-relaxed max-w-2xl">
          <p>
            <span className="text-jtp-amber font-semibold">
              Paper, public-data — forward-proving the funding-arb edge before any real money.
            </span>{' '}
            Funding accrues over hours; positions close after 72h. Win/loss fills in as they settle.
          </p>
          <p>
            This learning loop opens a simulated delta-neutral funding position every 30 minutes when conditions
            are met, then tracks the real funding payments it would have collected. The band table above is the
            honest answer: does a higher headline rate actually pay more after fees and decay?
          </p>
          <p className="font-mono text-jtp-xs text-jtp-textDim">
            No real capital at risk. Once forward-proven, the Auto Bot tab will replicate these positions live.
          </p>
        </div>
      </Panel>
    </div>
  );
};

// ─── Tab: Momentum ────────────────────────────────────────────────────────────

const MomentumTab: React.FC<{ exchange: string; token: string | null }> = ({ exchange, token }) => {
  const [scan, setScan] = useState<CryptoMomentum | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.exchangesMomentum(exchange, token);
      setScan(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load momentum data');
    } finally {
      setLoading(false);
    }
  }, [exchange, token]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const headerActions = (
    <div className="flex items-center gap-2">
      {updatedStr && (
        <span className="font-mono text-jtp-xs text-jtp-textDim">
          <RefreshIcon className="inline w-3 h-3 mr-1 align-middle" />
          updated {updatedStr}
        </span>
      )}
      <button
        onClick={load}
        disabled={loading}
        className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted transition-colors disabled:opacity-40"
        aria-label="Refresh momentum data"
      >
        {loading ? 'loading...' : 'refresh'}
      </button>
    </div>
  );

  if (error) {
    return (
      <Panel label="MOMENTUM SIGNALS" actions={headerActions}>
        <div className="py-6 text-center">
          <p className="text-jtp-loss text-jtp-md font-mono">{error}</p>
          <button onClick={load} className="mt-3 text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted font-mono">retry</button>
        </div>
      </Panel>
    );
  }

  if (loading && !scan) {
    return (
      <Panel label="MOMENTUM SIGNALS" actions={headerActions}>
        <div className="space-y-3 py-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} variant="panel" className="h-14" />)}
        </div>
      </Panel>
    );
  }

  const candidates = scan?.candidates ?? [];

  return (
    <div className="space-y-4">
      <Panel label="MOMENTUM SIGNALS" actions={headerActions}>
        <p className="text-jtp-xs text-jtp-textDim font-mono leading-relaxed mb-4">
          Buy-the-trend signals: liquid uptrends, volatility-filtered (parabolic blow-offs excluded).
          Paper-traded + learning — see What Works.
        </p>
        {candidates.length === 0 ? (
          <EmptyState
            title="No clean momentum setups right now"
            description="Market may be ranging or too parabolic. Check back in a few minutes."
          />
        ) : (
          <div>
            {candidates.map((c, i) => {
              const changeColor = c.changePct >= 0 ? '#3ddc84' : '#ff5b52';
              return (
                <div
                  key={`${c.symbol}-${i}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-jtp-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono font-bold text-jtp-text text-jtp-md">{c.base}</span>
                      <span className="font-mono text-jtp-xs text-jtp-textDim">{c.symbol}</span>
                      <span
                        className="font-mono font-semibold tabular-nums text-jtp-sm"
                        style={{ color: changeColor }}
                      >
                        {c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 font-mono text-jtp-xs tabular-nums text-jtp-textDim">
                    <span>range <span className="text-jtp-textMuted">{c.rangePct.toFixed(2)}%</span></span>
                    <span>vol <span className="text-jtp-textMuted">${(c.volUsd / 1_000_000).toFixed(0)}M</span></span>
                    <span>last <span className="text-jtp-textMuted">${c.last.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

// ─── Tab: Volatility ──────────────────────────────────────────────────────────

const VolatilityTab: React.FC<{ exchange: string; token: string | null }> = ({ exchange, token }) => {
  const [scan, setScan] = useState<CryptoVolatility | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.exchangesVolatility(exchange, token);
      setScan(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load volatility data');
    } finally {
      setLoading(false);
    }
  }, [exchange, token]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const headerActions = (
    <div className="flex items-center gap-2">
      {updatedStr && (
        <span className="font-mono text-jtp-xs text-jtp-textDim">
          <RefreshIcon className="inline w-3 h-3 mr-1 align-middle" />
          updated {updatedStr}
        </span>
      )}
      <button
        onClick={load}
        disabled={loading}
        className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted transition-colors disabled:opacity-40"
        aria-label="Refresh volatility data"
      >
        {loading ? 'loading...' : 'refresh'}
      </button>
    </div>
  );

  if (error) {
    return (
      <Panel label="VOLATILITY" actions={headerActions}>
        <div className="py-6 text-center">
          <p className="text-jtp-loss text-jtp-md font-mono">{error}</p>
          <button onClick={load} className="mt-3 text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted font-mono">retry</button>
        </div>
      </Panel>
    );
  }

  if (loading && !scan) {
    return (
      <Panel label="VOLATILITY" actions={headerActions}>
        <div className="space-y-3 py-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} variant="panel" className="h-10" />)}
        </div>
      </Panel>
    );
  }

  const movers = scan?.movers ?? [];
  const isHigh = scan?.highVolMarket ?? false;
  const regimeBannerColor = isHigh ? '#e8a23d' : '#3ddc84';
  const regimeBg = isHigh ? 'rgba(232,162,61,0.08)' : 'rgba(61,220,132,0.06)';

  const volRegimeBadgeVariant = (regime: 'high' | 'normal' | 'low') => {
    if (regime === 'high') return 'warning' as const;
    if (regime === 'low') return 'info' as const;
    return 'neutral' as const;
  };

  return (
    <div className="space-y-4">
      <Panel label="VOLATILITY" actions={headerActions}>
        {/* Market regime banner */}
        {scan && (
          <div
            className="mb-4 rounded-[2px] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2"
            style={{ background: regimeBg, border: `1px solid ${regimeBannerColor}30` }}
            aria-label={`Market volatility regime: ${isHigh ? 'high' : 'normal'}`}
          >
            <span
              className="font-mono font-bold tracking-widest uppercase"
              style={{ fontSize: '13px', color: regimeBannerColor, letterSpacing: '0.12em' }}
            >
              VOLATILITY: {isHigh ? 'HIGH' : 'NORMAL'}
            </span>
            <span className="font-mono text-jtp-xs text-jtp-textDim sm:ml-4">
              market median 24h range{' '}
              <span className="text-jtp-textMuted tabular-nums">
                {scan.marketMedianRangePct.toFixed(2)}%
              </span>
            </span>
          </div>
        )}

        {/* Movers table */}
        {movers.length === 0 ? (
          <EmptyState title="No volatility data" description="No movers returned for this exchange." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-jtp-xs font-mono" role="table">
                <thead>
                  <tr className="border-b border-jtp-border">
                    <th scope="col" className="text-left py-2 pr-4 text-jtp-textDim font-normal tracking-wide uppercase">Asset</th>
                    <th scope="col" className="text-right py-2 pr-4 text-jtp-textDim font-normal tracking-wide uppercase">24h %</th>
                    <th scope="col" className="text-right py-2 pr-4 text-jtp-textDim font-normal tracking-wide uppercase">Range %</th>
                    <th scope="col" className="text-left py-2 pr-4 text-jtp-textDim font-normal tracking-wide uppercase">Regime</th>
                    <th scope="col" className="text-right py-2 text-jtp-textDim font-normal tracking-wide uppercase">Vol</th>
                  </tr>
                </thead>
                <tbody>
                  {movers.map((m, i) => {
                    const changeCls = m.changePct >= 0 ? 'text-[#3ddc84]' : 'text-[#ff5b52]';
                    return (
                      <tr
                        key={`${m.symbol}-${i}`}
                        className="border-b border-jtp-border/50 last:border-0 hover:bg-jtp-raised/50 transition-colors"
                      >
                        <td className="py-2 pr-4">
                          <span className="font-semibold text-jtp-text">{m.base}</span>
                          <span className="ml-2 text-jtp-textDim text-[10px]">{m.symbol}</span>
                        </td>
                        <td className={`py-2 pr-4 text-right tabular-nums font-semibold ${changeCls}`}>
                          {m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(2)}%
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-jtp-textMuted">
                          {m.rangePct.toFixed(2)}%
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={volRegimeBadgeVariant(m.volRegime)} size="xs">
                            {m.volRegime.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2 text-right tabular-nums text-jtp-textMuted">
                          ${(m.volUsd / 1_000_000).toFixed(0)}M
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-jtp-xs text-jtp-textDim font-mono leading-relaxed">
              High volatility = bigger moves = more momentum opportunity AND more risk (the bot sizes down in high vol).
            </p>
          </>
        )}
      </Panel>
    </div>
  );
};

// ─── Tab: Auto Bot ───────────────────────────────────────────────────────────

const BOT_MODE_SEGS: { value: 'off' | 'auto'; label: string }[] = [
  { value: 'off',  label: 'Manual (off)' },
  { value: 'auto', label: 'AUTO — bot trades' },
];

const BotPerfTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const pnl: number = payload[0]?.value ?? 0;
  const sign = pnl >= 0 ? '+' : '';
  const color = pnl >= 0 ? '#3ddc84' : '#ff5b52';
  return (
    <div
      style={{ background: '#0d0f12', border: '1px solid #1b2026', borderRadius: 2 }}
      className="px-3 py-2"
    >
      <span className="font-mono text-jtp-xs" style={{ color }}>
        {sign}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

const AutoBotTab: React.FC<{ exchange: string; token: string | null }> = ({
  exchange,
  token,
}) => {
  const [status, setStatus] = useState<CryptoBotStatus | null>(null);
  const [trades, setTrades] = useState<CryptoBotTrade[]>([]);
  const [curve, setCurve] = useState<{ t: number; pnl: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [modeBusy, setModeBusy] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [killBusy, setKillBusy] = useState(false);
  const [killErr, setKillErr] = useState<string | null>(null);

  const [maxPerTrade, setMaxPerTrade] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [limitsErr, setLimitsErr] = useState<string | null>(null);
  const [limitsSaved, setLimitsSaved] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitsInitRef = useRef(false);

  // Reset stale data when exchange switches
  useEffect(() => {
    setStatus(null);
    setTrades([]);
    setCurve([]);
    setLoadErr(null);
    setLastUpdated(null);
    setModeError(null);
    setKillErr(null);
    setLimitsErr(null);
    limitsInitRef.current = false;
  }, [exchange]);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setTradesLoading(!silent);
    setLoadErr(null);
    try {
      const [st, tr, pf] = await Promise.allSettled([
        api.exchangesBotStatus(exchange, token),
        api.exchangesBotTrades(exchange, 60, token),
        api.exchangesBotPerformance(exchange, token),
      ]);

      if (st.status === 'fulfilled') {
        setStatus(st.value);
        if (!limitsInitRef.current) {
          setMaxPerTrade(String(st.value.limits.maxPerTradeUsd));
          setMaxTotal(String(st.value.limits.maxTotalUsd));
          limitsInitRef.current = true;
        }
      } else if (!silent) {
        setLoadErr((st as PromiseRejectedResult).reason?.message || 'Failed to load bot status.');
      }

      if (tr.status === 'fulfilled') setTrades(Array.isArray(tr.value) ? tr.value : []);
      if (pf.status === 'fulfilled') setCurve(pf.value.curve ?? []);

      setLastUpdated(new Date());
    } catch (e: any) {
      if (!silent) setLoadErr(e?.message || 'Failed to load bot status.');
    } finally {
      setLoading(false);
      setTradesLoading(false);
    }
  }, [exchange, token]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const handleModeChange = async (newMode: 'off' | 'auto') => {
    if (!status || !token || newMode === status.mode) return;
    setModeBusy(true);
    setModeError(null);
    try {
      const updated = await api.exchangesBotSetMode({ exchange, mode: newMode }, token);
      setStatus(updated);
    } catch (e: any) {
      setModeError(e?.message || 'Failed to change mode.');
    } finally {
      setModeBusy(false);
    }
  };

  const handleKill = async () => {
    if (!token) return;
    setKillBusy(true);
    setKillErr(null);
    try {
      const updated = await api.exchangesBotKill(exchange, token);
      setStatus(updated);
    } catch (e: any) {
      setKillErr(e?.message || 'Kill switch failed.');
    } finally {
      setKillBusy(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!token) return;
    const maxPerTradeUsd = parseFloat(maxPerTrade);
    const maxTotalUsd = parseFloat(maxTotal);
    if (isNaN(maxPerTradeUsd) || isNaN(maxTotalUsd)) {
      setLimitsErr('Enter valid numbers for both limits.');
      return;
    }
    setLimitsSaving(true);
    setLimitsErr(null);
    try {
      const updated = await api.exchangesBotSetLimits({ exchange, maxPerTradeUsd, maxTotalUsd }, token);
      setStatus(updated);
      setLimitsSaved(true);
      setTimeout(() => setLimitsSaved(false), 2000);
    } catch (e: any) {
      setLimitsErr(e?.message || 'Failed to save limits.');
    } finally {
      setLimitsSaving(false);
    }
  };

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Equity curve derived values
  const chartData = curve.map(pt => ({ t: pt.t, pnl: pt.pnl }));
  const hasCurve = chartData.length >= 2;
  const finalPnl = curve.length > 0 ? curve[curve.length - 1].pnl : 0;
  const isUp = finalPnl >= 0;
  const lineColor = isUp ? '#3ddc84' : '#ff5b52';
  const areaId = isUp ? 'cryptoBotAreaUp' : 'cryptoBotAreaDown';

  const yAxisFormatter = (v: number) => {
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  // Loading skeleton
  if (loading && !status) {
    if (loadErr) {
      return (
        <Panel label="AUTO BOT">
          <p role="alert" className="text-[#ff5b52] font-mono text-jtp-md">{loadErr}</p>
          <button
            onClick={() => load()}
            className="mt-3 font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted"
          >
            retry
          </button>
        </Panel>
      );
    }
    return (
      <div className="space-y-4">
        <Skeleton variant="panel" className="h-12" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton className="h-36 w-full" />
        <Skeleton variant="panel" className="h-32" />
      </div>
    );
  }

  const st = status;
  const isAuto = st?.mode === 'auto';
  const resolved = st?.stats.resolved ?? 0;

  return (
    <div className="space-y-4">

      {/* Honest banner */}
      <div
        className="rounded-[2px] border border-[rgba(232,162,61,0.4)] bg-[rgba(232,162,61,0.06)] px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2"
        role="note"
      >
        <span className="font-mono text-[#e8a23d] text-jtp-xs font-semibold mt-0.5 flex-shrink-0 uppercase tracking-wider">
          Testnet — read this
        </span>
        <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
          Autonomous momentum execution on the TESTNET account (real orders, fake money).
          Limits + kill switch enforced. Strategy: vol-filtered spot momentum, proven on paper in What Works.
        </p>
      </div>

      {/* Mode toggle */}
      <Panel label="BOT MODE">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex-1">
            <SegmentedControl
              segments={BOT_MODE_SEGS}
              value={st?.mode ?? 'off'}
              onChange={(v) => handleModeChange(v as 'off' | 'auto')}
            />
          </div>
          <div className="flex items-center gap-3">
            {modeBusy && (
              <span className="font-mono text-jtp-xs text-jtp-textDim">updating…</span>
            )}
            {isAuto && (
              <span
                className="flex items-center gap-1.5 font-mono text-jtp-xs font-semibold text-[#3ddc84]"
                aria-live="polite"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse"
                  aria-hidden="true"
                />
                BOT LIVE
              </span>
            )}
            {st?.killSwitch && (
              <Badge variant="loss" size="sm">KILL SWITCH ON</Badge>
            )}
          </div>
        </div>
        {modeError && (
          <p role="alert" className="mt-2 text-jtp-xs text-[#ff5b52] font-mono">{modeError}</p>
        )}
      </Panel>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile
          label="REALIZED P&amp;L"
          value={
            st
              ? st.stats.realizedPnlUsd === 0
                ? '$0.00'
                : `${st.stats.realizedPnlUsd >= 0 ? '+' : ''}${fmtUsd(st.stats.realizedPnlUsd)}`
              : '—'
          }
          valueColor={st ? pnlColor(st.stats.realizedPnlUsd) : undefined}
        />
        <StatTile
          label="RIGHT"
          value={st ? String(st.stats.wins) : '—'}
          valueColor="text-[#3ddc84]"
          subValue="trades won"
        />
        <StatTile
          label="WRONG"
          value={st ? String(st.stats.losses) : '—'}
          valueColor="text-[#ff5b52]"
          subValue="trades lost"
        />
        <StatTile
          label="WIN RATE"
          value={st && resolved > 0 ? fmtPct(st.stats.winRate) : '—'}
          subValue={st && resolved > 0 ? `${resolved} resolved` : 'no resolved yet'}
        />
        <StatTile
          label="EXPOSURE"
          value={st ? fmtUsd(st.exposureUsd) : '—'}
          valueColor="text-jtp-textMuted"
        />
        <StatTile
          label="OPEN"
          value={st ? String(st.stats.open) : '—'}
          valueColor="text-[#e8a23d]"
          subValue="positions"
        />
      </div>

      {/* Testnet wallet balances */}
      {st?.balances && st.balances.length > 0 && (
        <Panel label="TESTNET WALLET">
          <div className="flex flex-wrap gap-3">
            {st.balances.map(b => (
              <div
                key={b.asset}
                className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-2 min-w-[100px]"
              >
                <div className="jtp-label text-jtp-2xs mb-0.5">{b.asset}</div>
                <div
                  className="font-mono font-bold text-jtp-lg text-jtp-text"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {b.free.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Equity curve */}
      {st && resolved === 0 ? (
        <div
          className="rounded-jtp-sm border border-jtp-borderSubtle flex items-center justify-center"
          style={{ background: '#090b0d', minHeight: 140 }}
        >
          <p className="font-mono text-jtp-xs text-jtp-textFaint text-center max-w-xs px-4">
            No closed trades yet — equity curve builds as positions close.
          </p>
        </div>
      ) : hasCurve ? (
        <div
          className="rounded-jtp-sm overflow-hidden"
          style={{ background: '#090b0d', height: 140 }}
          aria-label="Cumulative realized P&L over time"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis
                tickFormatter={yAxisFormatter}
                tick={{ fill: '#565d66', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <RechartsTooltip
                content={<BotPerfTooltip />}
                cursor={{ stroke: '#1b2026', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
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
      ) : null}

      {/* Limits + kill switch */}
      <Panel label="LIMITS &amp; KILL SWITCH">
        <div className="space-y-4">
          {/* Kill switch */}
          <div>
            <Button
              variant="danger"
              onClick={handleKill}
              isLoading={killBusy}
              disabled={killBusy}
              className="w-full !py-3 text-jtp-sm font-bold tracking-widest"
              aria-label="Emergency kill switch — stop all bot activity"
            >
              KILL SWITCH — STOP EVERYTHING NOW
            </Button>
            {st?.killSwitch && (
              <p className="mt-1.5 font-mono text-jtp-xs text-[#ff5b52]">
                Kill switch is active. Bot is halted. Change mode to re-enable.
              </p>
            )}
            {killErr && (
              <p role="alert" className="mt-1.5 font-mono text-jtp-xs text-[#ff5b52]">{killErr}</p>
            )}
          </div>

          {/* Limit inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="jtp-label" htmlFor="bot-max-per-trade">MAX PER TRADE</label>
              <div className="flex items-center gap-1">
                <span className="font-mono text-jtp-textDim text-jtp-xs">$</span>
                <input
                  id="bot-max-per-trade"
                  type="number"
                  min="0"
                  step="any"
                  value={maxPerTrade}
                  onChange={(e) => setMaxPerTrade(e.target.value)}
                  className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-2.5 py-1.5 text-jtp-xs font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
                  aria-describedby="bot-max-per-trade-help"
                />
              </div>
              <span id="bot-max-per-trade-help" className="text-jtp-2xs text-jtp-textFaint font-mono">
                Max USD per single trade
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="jtp-label" htmlFor="bot-max-total">MAX TOTAL EXPOSURE</label>
              <div className="flex items-center gap-1">
                <span className="font-mono text-jtp-textDim text-jtp-xs">$</span>
                <input
                  id="bot-max-total"
                  type="number"
                  min="0"
                  step="any"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-2.5 py-1.5 text-jtp-xs font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
                  aria-describedby="bot-max-total-help"
                />
              </div>
              <span id="bot-max-total-help" className="text-jtp-2xs text-jtp-textFaint font-mono">
                Total open exposure cap
              </span>
            </div>
          </div>

          {limitsErr && (
            <p role="alert" className="text-jtp-xs text-[#ff5b52] font-mono">{limitsErr}</p>
          )}

          <Button
            variant="secondary"
            onClick={handleSaveLimits}
            isLoading={limitsSaving}
            className="w-full"
          >
            {limitsSaved ? 'Saved' : limitsSaving ? 'Saving…' : 'Save Limits'}
          </Button>
        </div>
      </Panel>

      {/* Live trades */}
      <Panel
        label="LIVE TRADES"
        noPadding
        actions={
          <span
            className="font-mono text-jtp-xs text-jtp-textMuted flex items-center gap-2"
            aria-live="polite"
          >
            {tradesLoading ? (
              <span className="text-jtp-textDim">updating…</span>
            ) : updatedStr ? (
              <>
                <span
                  className="inline-block w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse"
                  aria-hidden="true"
                />
                <span>updated {updatedStr}</span>
              </>
            ) : null}
          </span>
        }
      >
        {trades.length === 0 ? (
          <div className="px-4 py-4">
            <EmptyState
              title="No trades yet"
              description="Switch to AUTO mode to start. Testnet positions will appear here."
            />
          </div>
        ) : (
          <div>
            {trades.map(t => {
              const isOpen = t.status === 'open';
              const isFailed = t.status === 'failed';
              const pnl = t.pnlUsd ?? 0;
              const pnlCls = pnl > 0 ? 'text-[#3ddc84]' : pnl < 0 ? 'text-[#ff5b52]' : 'text-jtp-textMuted';

              let badgeVariant: 'warning' | 'profit' | 'loss' | 'neutral' = 'warning';
              let badgeLabel = 'OPEN';
              if (isFailed) {
                badgeVariant = 'loss';
                badgeLabel = 'FAILED';
              } else if (!isOpen) {
                badgeVariant = pnl >= 0 ? 'profit' : 'loss';
                badgeLabel = 'CLOSED';
              }

              return (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-b border-jtp-border last:border-0 hover:bg-jtp-raised/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-jtp-text text-jtp-sm">
                        {t.symbol}
                      </span>
                      <Badge variant="neutral" size="xs">{t.base}</Badge>
                      <Badge
                        variant={t.side.toLowerCase() === 'buy' ? 'profit' : 'loss'}
                        size="xs"
                      >
                        {t.side.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
                        @ ${t.entryPrice.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    </div>
                    <div className="mt-[3px] flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
                        size{' '}
                        <span className="text-jtp-textMuted">
                          ${t.sizeUsd.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </span>
                      {t.exitReason && (
                        <span className="font-mono text-jtp-xs text-jtp-textDim">
                          exit: <span className="text-jtp-textMuted">{t.exitReason}</span>
                        </span>
                      )}
                      {isFailed && t.error && (
                        <span className="font-mono text-jtp-xs text-[#ff5b52]">{t.error}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!isOpen && (
                      <span
                        className={`font-mono font-semibold tabular-nums text-jtp-sm ${pnlCls}`}
                      >
                        {pnl >= 0 ? '+' : ''}
                        ${Math.abs(pnl).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    <Badge variant={badgeVariant} size="xs">{badgeLabel}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

// ─── "Coming" tab content ─────────────────────────────────────────────────────

interface ComingTabProps {
  title: string;
  description: string;
  detail?: string;
}

const ComingTab: React.FC<ComingTabProps> = ({ title, description, detail }) => (
  <Panel label={title.toUpperCase()}>
    <div className="py-6 space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <Badge variant="warning" size="md">COMING</Badge>
        <span className="font-mono text-jtp-xs text-jtp-textDim">
          Forward-proven on testnet before live activation
        </span>
      </div>
      <p className="text-jtp-md text-jtp-textMuted leading-relaxed">{description}</p>
      {detail && (
        <p className="text-jtp-sm text-jtp-textDim leading-relaxed font-mono">{detail}</p>
      )}
    </div>
  </Panel>
);

// ─── Tab: Connection ──────────────────────────────────────────────────────────

const ConnectionTab: React.FC<{ token: string | null }> = ({ token }) => {
  const [status, setStatus] = useState<ExchangeStatusMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    api.exchangesStatus(token)
      .then(setStatus)
      .catch((e: any) => setError(e.message || 'Failed to load status'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <Panel label="EXCHANGE CONNECTION STATUS">
      {loading && (
        <div className="space-y-3">
          <Skeleton variant="panel" className="h-20" />
          <Skeleton variant="panel" className="h-20" />
        </div>
      )}

      {error && (
        <p className="text-jtp-loss text-jtp-md font-mono py-4">{error}</p>
      )}

      {!loading && !error && status && (
        <div className="space-y-3">
          {Object.entries(status).map(([exchange, info]) => (
            <div
              key={exchange}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-jtp-raised border border-jtp-border rounded-[2px]"
            >
              {/* Exchange name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-jtp-text uppercase tracking-wider text-jtp-md">
                    {exchange}
                  </span>
                  <Badge
                    variant={info.configured ? 'profit' : 'neutral'}
                    size="xs"
                  >
                    {info.configured ? 'CONFIGURED' : 'NOT SET'}
                  </Badge>
                  <Badge
                    variant={info.testnet ? 'warning' : 'info'}
                    size="xs"
                  >
                    {info.testnet ? 'TESTNET' : 'LIVE'}
                  </Badge>
                </div>
                {info.keyMask && (
                  <p className="font-mono text-jtp-xs text-jtp-textDim mt-1">
                    key: {info.keyMask}
                  </p>
                )}
              </div>

              {/* Status dot */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    info.configured ? 'bg-[#3ddc84]' : 'bg-jtp-textDim/40'
                  }`}
                />
                <span className={`font-mono text-jtp-xs ${info.configured ? 'text-[#3ddc84]' : 'text-jtp-textDim'}`}>
                  {info.configured ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          ))}

          {Object.keys(status).length === 0 && (
            <EmptyState
              title="No exchanges configured"
              description="Ask an admin to set up exchange API keys."
            />
          )}
        </div>
      )}

      {!loading && !error && !status && (
        <EmptyState
          title="No status data"
          description="Could not load exchange status."
        />
      )}

      <div className="mt-4 pt-4 border-t border-jtp-border">
        <p className="font-mono text-jtp-xs text-jtp-textDim">
          API keys are set by an admin in Admin &rarr; Exchange Keys.
          Keys are write-only once saved — only the masked preview is shown here.
        </p>
      </div>
    </Panel>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TAB_LABELS: { value: CryptoTab; label: string }[] = [
  { value: 'funding_arb',    label: 'Funding Arb' },
  { value: 'what_works',     label: 'What Works' },
  { value: 'momentum',       label: 'Momentum' },
  { value: 'volatility',     label: 'Volatility' },
  { value: 'mean_reversion', label: 'Mean-Rev' },
  { value: 'ai_signals',     label: 'AI Signals' },
  { value: 'auto_bot',       label: 'Auto Bot' },
  { value: 'connection',     label: 'Connection' },
];

const CryptoPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [exchanges, setExchanges] = useState<string[]>(['binance']);
  const [activeExchange, setActiveExchange] = useState('binance');
  const [activeTab, setActiveTab] = useState<CryptoTab>('funding_arb');

  // Load exchange list
  useEffect(() => {
    if (!accessToken) return;
    api.exchangesList(accessToken)
      .then(r => {
        if (r.exchanges?.length) {
          setExchanges(r.exchanges);
          setActiveExchange(r.exchanges[0]);
        }
      })
      .catch(() => {/* default to binance */});
  }, [accessToken]);

  const exchangeSegments = exchanges.map(e => ({
    value: e,
    label: e.charAt(0).toUpperCase() + e.slice(1),
  }));

  return (
    <div className="space-y-4">
      {/* Page controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Exchange picker */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-jtp-xs text-jtp-textDim uppercase tracking-[0.1em] flex-shrink-0">
            Exchange
          </span>
          <SegmentedControl
            segments={exchangeSegments}
            value={activeExchange}
            onChange={setActiveExchange}
            size="sm"
          />
        </div>

        <div className="flex-1" />

        {/* Sub-tab selector */}
        <div className="overflow-x-auto pb-1 sm:pb-0">
          <SegmentedControl
            segments={TAB_LABELS}
            value={activeTab}
            onChange={setActiveTab}
            size="xs"
          />
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'funding_arb' && (
        <FundingArbTab exchange={activeExchange} token={accessToken} />
      )}

      {activeTab === 'what_works' && (
        <WhatWorksTab token={accessToken} />
      )}

      {activeTab === 'momentum' && (
        <MomentumTab exchange={activeExchange} token={accessToken} />
      )}

      {activeTab === 'volatility' && (
        <VolatilityTab exchange={activeExchange} token={accessToken} />
      )}

      {activeTab === 'mean_reversion' && (
        <ComingTab
          title="Mean-Reversion"
          description="Buy dips and sell rips within established ranges, augmented by an automated grid for passive accumulation/distribution. Best suited to sideways, high-volume markets."
          detail="Grid parameters will be set per-asset based on average true range. Live only after testnet validation."
        />
      )}

      {activeTab === 'ai_signals' && (
        <ComingTab
          title="AI Signals"
          description="AI reads price action, funding rate history, open interest, and news/sentiment to generate directional calls with a stated confidence and risk level. Signals are explanatory — you decide whether to act."
          detail="Signals will be logged and tracked for accuracy. The model will be evaluated on out-of-sample forward predictions before integration."
        />
      )}

      {activeTab === 'auto_bot' && (
        <AutoBotTab exchange={activeExchange} token={accessToken} />
      )}

      {activeTab === 'connection' && (
        <ConnectionTab token={accessToken} />
      )}
    </div>
  );
};

export default CryptoPage;
