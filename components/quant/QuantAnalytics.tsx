/**
 * QuantAnalytics — "ANALYTICS — what's actually working"
 *
 * Renders price-band heatmap, by-type/focus/strategy tables, recommendations
 * card with Apply window action, and AI Tune Advice trigger.
 *
 * Mounted as the Analytics tab inside QuantAutoBotPanel.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import type { AutobotAnalytics, AutobotAnalyticsBucket } from '../../services/api';
import { Panel, Badge, Button, Skeleton } from '../ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUsd = (n: number, forceSign = false): string => {
  const sign = n < 0 ? '-' : forceSign ? '+' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
};

const fmtPct = (n: number): string => `${(n * 100).toFixed(0)}%`;

const pnlClass = (v: number): string => {
  if (v > 0) return 'text-[#3ddc84]';
  if (v < 0) return 'text-[#ff5b52]';
  return 'text-jtp-textMuted';
};

/** Row background based on avgPnl intensity vs the strongest band in the set. */
const bandRowStyle = (
  avgPnl: number,
  maxAbsAvg: number,
): React.CSSProperties => {
  if (maxAbsAvg === 0) return {};
  const intensity = Math.min(1, Math.abs(avgPnl) / maxAbsAvg) * 0.28;
  if (avgPnl > 0) return { background: `rgba(61,220,132,${intensity.toFixed(3)})` };
  if (avgPnl < 0) return { background: `rgba(255,91,82,${intensity.toFixed(3)})` };
  return {};
};

const CONFIDENCE_LABEL: Record<string, string> = {
  'very-low': 'VERY LOW',
  'low': 'LOW',
  'medium': 'MEDIUM',
};

const CONFIDENCE_VARIANT: Record<string, 'neutral' | 'warning' | 'profit'> = {
  'very-low': 'neutral',
  'low': 'warning',
  'medium': 'profit',
};

// ─── Small inline spinner ──────────────────────────────────────────────────────

const Spin: React.FC = () => (
  <svg
    className="animate-spin w-3.5 h-3.5 inline"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ─── Band heatmap table ────────────────────────────────────────────────────────

const BandHeatmap: React.FC<{ buckets: AutobotAnalyticsBucket[] }> = ({ buckets }) => {
  if (buckets.length === 0) {
    return (
      <p className="font-mono text-jtp-xs text-jtp-textFaint py-2">
        No price-band data yet — need resolved trades across different entry prices.
      </p>
    );
  }

  const maxAbsAvg = Math.max(...buckets.map((b) => Math.abs(b.avgPnl)), 0.01);

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[340px] border-collapse"
        aria-label="Price band performance heatmap"
      >
        <thead>
          <tr className="border-b border-jtp-borderStrong">
            <th className="jtp-label text-left py-1.5 pr-3 font-mono text-jtp-2xs text-jtp-textFaint w-[80px]">
              BAND
            </th>
            <th className="jtp-label text-right py-1.5 px-2 font-mono text-jtp-2xs text-jtp-textFaint w-10">
              N
            </th>
            <th className="jtp-label text-right py-1.5 px-2 font-mono text-jtp-2xs text-jtp-textFaint w-14">
              WIN%
            </th>
            <th className="jtp-label text-right py-1.5 px-2 font-mono text-jtp-2xs text-jtp-textFaint w-20">
              P&amp;L
            </th>
            <th className="jtp-label text-right py-1.5 pl-2 font-mono text-jtp-2xs text-jtp-textFaint w-20">
              AVG/TRADE
            </th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => {
            const style = bandRowStyle(b.avgPnl, maxAbsAvg);
            return (
              <tr
                key={b.key}
                style={style}
                className="border-b border-jtp-borderSubtle last:border-b-0 transition-colors"
              >
                <td
                  className="py-2 pr-3 font-mono text-jtp-xs font-semibold text-jtp-text whitespace-nowrap"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {b.key}¢
                </td>
                <td
                  className="py-2 px-2 font-mono text-jtp-xs text-jtp-textMuted text-right"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {b.n}
                </td>
                <td
                  className={`py-2 px-2 font-mono text-jtp-xs text-right font-semibold ${
                    b.winRate >= 0.55
                      ? 'text-[#3ddc84]'
                      : b.winRate <= 0.4
                        ? 'text-[#ff5b52]'
                        : 'text-jtp-textMuted'
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtPct(b.winRate)}
                </td>
                <td
                  className={`py-2 px-2 font-mono text-jtp-xs text-right font-semibold ${pnlClass(b.pnlUsd)}`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtUsd(b.pnlUsd, true)}
                </td>
                <td
                  className={`py-2 pl-2 font-mono text-jtp-xs text-right font-semibold ${pnlClass(b.avgPnl)}`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtUsd(b.avgPnl, true)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Compact breakdown table ───────────────────────────────────────────────────

const BreakdownTable: React.FC<{
  label: string;
  buckets: AutobotAnalyticsBucket[];
}> = ({ label, buckets }) => {
  if (buckets.length === 0) {
    return (
      <div>
        <div className="jtp-label mb-2">{label}</div>
        <p className="font-mono text-jtp-xs text-jtp-textFaint">No data yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="jtp-label mb-2">{label}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[220px] border-collapse" aria-label={label}>
          <thead>
            <tr className="border-b border-jtp-borderStrong">
              <th className="jtp-label text-left py-1 pr-2 font-mono text-jtp-2xs text-jtp-textFaint">
                TYPE
              </th>
              <th className="jtp-label text-right py-1 px-1.5 font-mono text-jtp-2xs text-jtp-textFaint">
                N
              </th>
              <th className="jtp-label text-right py-1 px-1.5 font-mono text-jtp-2xs text-jtp-textFaint">
                WIN%
              </th>
              <th className="jtp-label text-right py-1 pl-1.5 font-mono text-jtp-2xs text-jtp-textFaint">
                P&amp;L
              </th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr
                key={b.key}
                className="border-b border-jtp-borderSubtle last:border-b-0"
              >
                <td className="py-1.5 pr-2 font-mono text-jtp-xs text-jtp-text truncate max-w-[120px]">
                  {b.key}
                </td>
                <td
                  className="py-1.5 px-1.5 font-mono text-jtp-xs text-jtp-textMuted text-right"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {b.n}
                </td>
                <td
                  className={`py-1.5 px-1.5 font-mono text-jtp-xs text-right font-semibold ${
                    b.winRate >= 0.55
                      ? 'text-[#3ddc84]'
                      : b.winRate <= 0.4
                        ? 'text-[#ff5b52]'
                        : 'text-jtp-textMuted'
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtPct(b.winRate)}
                </td>
                <td
                  className={`py-1.5 pl-1.5 font-mono text-jtp-xs text-right font-semibold ${pnlClass(b.pnlUsd)}`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtUsd(b.pnlUsd, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Chip list ─────────────────────────────────────────────────────────────────

const ChipList: React.FC<{
  label: string;
  items: string[];
  color: 'green' | 'red';
}> = ({ label, items, color }) => {
  if (items.length === 0) return null;
  const chipClass =
    color === 'green'
      ? 'bg-[rgba(61,220,132,0.12)] text-[#3ddc84] border border-[rgba(61,220,132,0.35)]'
      : 'bg-[rgba(255,91,82,0.12)] text-[#ff5b52] border border-[rgba(255,91,82,0.35)]';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-jtp-2xs text-jtp-textDim uppercase tracking-wide flex-shrink-0">
        {label}
      </span>
      {items.map((item) => (
        <span
          key={item}
          className={`font-mono text-jtp-2xs font-semibold px-2 py-0.5 rounded-[2px] ${chipClass}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
};

// ─── Recommendations card ──────────────────────────────────────────────────────

interface RecommendationsCardProps {
  analytics: AutobotAnalytics;
  onApply: (minEntryPrice: number, maxEntryPrice: number) => Promise<void>;
}

const RecommendationsCard: React.FC<RecommendationsCardProps> = ({
  analytics,
  onApply,
}) => {
  const rec = analytics.recommendations;
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleApply = async () => {
    if (!rec.entryWindow) return;
    setApplyBusy(true);
    setApplyMsg(null);
    try {
      await onApply(rec.entryWindow.minEntryPrice, rec.entryWindow.maxEntryPrice);
      const minC = Math.round(rec.entryWindow.minEntryPrice * 100);
      const maxC = Math.round(rec.entryWindow.maxEntryPrice * 100);
      setApplyMsg({ text: `Applied ${minC}-${maxC}¢ entry window`, ok: true });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setApplyMsg(null), 4000);
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : 'Apply failed.';
      setApplyMsg({ text: msg, ok: false });
    } finally {
      setApplyBusy(false);
    }
  };

  const confLabel = CONFIDENCE_LABEL[rec.confidence] ?? rec.confidence.toUpperCase();
  const confVariant = CONFIDENCE_VARIANT[rec.confidence] ?? 'neutral';

  const hasRecommendations =
    rec.entryWindow !== null ||
    rec.keepMarketTypes.length > 0 ||
    rec.cutMarketTypes.length > 0 ||
    rec.keepFocus.length > 0 ||
    rec.cutFocus.length > 0;

  if (!hasRecommendations) {
    return (
      <div
        className="rounded-[2px] border border-[rgba(232,162,61,0.35)] bg-[rgba(232,162,61,0.05)] px-4 py-3"
        role="note"
      >
        <p className="font-mono text-jtp-xs text-jtp-textMuted">
          Not enough data for recommendations yet — keep trading and revisit once more markets resolve.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[2px] border border-[rgba(232,162,61,0.45)] bg-[rgba(232,162,61,0.06)] px-4 py-4 space-y-3"
      role="region"
      aria-label="Strategy recommendations"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="jtp-label text-[#e8a23d]">RECOMMENDATIONS</span>
          <Badge variant={confVariant} size="xs">CONFIDENCE: {confLabel}</Badge>
        </div>
        {rec.entryWindow && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              onClick={handleApply}
              isLoading={applyBusy}
              disabled={applyBusy}
              className="!px-3 !py-1.5 !text-[11px] font-mono border-[rgba(232,162,61,0.45)] text-[#e8a23d] hover:border-[rgba(232,162,61,0.8)] bg-[rgba(232,162,61,0.10)] hover:bg-[rgba(232,162,61,0.18)]"
              aria-label="Apply recommended entry window to bot limits"
            >
              Apply window
            </Button>
          </div>
        )}
      </div>

      {/* Entry window */}
      {rec.entryWindow && (
        <div>
          <p className="font-mono text-jtp-xs text-jtp-text leading-relaxed">
            <span className="text-[#e8a23d] font-semibold">Profitable entry window:</span>{' '}
            <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(rec.entryWindow.minEntryPrice * 100)}&ndash;
              {Math.round(rec.entryWindow.maxEntryPrice * 100)}¢
            </span>
            {rec.entryWindow.reason ? ` — ${rec.entryWindow.reason}` : ''}
          </p>
        </div>
      )}

      {/* Keep / cut chips */}
      <div className="space-y-2">
        <ChipList label="Keep market types:" items={rec.keepMarketTypes} color="green" />
        <ChipList label="Cut market types:" items={rec.cutMarketTypes} color="red" />
        <ChipList label="Keep focus:" items={rec.keepFocus} color="green" />
        <ChipList label="Cut focus:" items={rec.cutFocus} color="red" />
      </div>

      {/* Apply feedback toast */}
      {applyMsg && (
        <p
          role="alert"
          className={`font-mono text-jtp-xs font-semibold ${
            applyMsg.ok ? 'text-[#3ddc84]' : 'text-[#ff5b52]'
          }`}
        >
          {applyMsg.ok ? '✓' : '✕'} {applyMsg.text}
        </p>
      )}
    </div>
  );
};

// ─── AI Tune Advice ────────────────────────────────────────────────────────────

interface TuneAdvicePanelProps {
  onFetch: () => Promise<string>;
}

const TuneAdvicePanel: React.FC<TuneAdvicePanelProps> = ({ onFetch }) => {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [advice, setAdvice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleAsk = async () => {
    setPhase('loading');
    setErr(null);
    try {
      const text = await onFetch();
      setAdvice(text);
      setPhase('done');
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'AI advice failed.');
      setPhase('error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="secondary"
          onClick={handleAsk}
          disabled={phase === 'loading'}
          className="!px-3 !py-1.5 !text-[11px]"
          aria-label="Ask AI to analyse your bot performance and give tuning advice"
        >
          {phase === 'loading' ? (
            <>
              <Spin />
              <span className="ml-2">Asking AI…</span>
            </>
          ) : (
            'Ask AI to tune'
          )}
        </Button>
        {phase === 'loading' && (
          <span className="font-mono text-jtp-xs text-jtp-textFaint">
            Analysing your trades — may take 5-10 s…
          </span>
        )}
      </div>

      {phase === 'error' && err && (
        <p role="alert" className="font-mono text-jtp-xs text-[#ff5b52]">
          {err}
        </p>
      )}

      {phase === 'done' && advice && (
        <div
          className="rounded-[2px] border border-jtp-borderStrong bg-jtp-bg px-4 py-4"
          role="region"
          aria-label="AI tuning advice"
        >
          <div className="jtp-label mb-2 text-[#e8a23d]">AI TUNE ADVICE</div>
          <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed whitespace-pre-wrap">
            {advice}
          </p>
          <button
            type="button"
            onClick={handleAsk}
            className="mt-3 font-mono text-jtp-2xs text-jtp-textDim hover:text-jtp-text transition-colors underline underline-offset-2"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const MIN_RESOLVED_FOR_ANALYTICS = 20;

const QuantAnalytics: React.FC = () => {
  const { getToken } = useAuth();

  const [analytics, setAnalytics] = useState<AutobotAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = await getToken();
      const data = await api.autobotAnalytics(token);
      setAnalytics(data);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleApplyWindow = useCallback(
    async (minEntryPrice: number, maxEntryPrice: number) => {
      const token = await getToken();
      await api.autobotSetLimits({ minEntryPrice, maxEntryPrice }, token);
    },
    [getToken],
  );

  const handleTuneAdvice = useCallback(async (): Promise<string> => {
    const token = await getToken();
    const result = await api.autobotTuneAdvice(token);
    return result.advice;
  }, [getToken]);

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading && !analytics) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (err && !analytics) {
    return (
      <Panel label="ANALYTICS — WHAT'S ACTUALLY WORKING">
        <p role="alert" className="font-mono text-jtp-xs text-[#ff5b52]">
          {err}
        </p>
        <Button variant="secondary" onClick={fetchAnalytics} className="mt-3">
          Retry
        </Button>
      </Panel>
    );
  }

  if (!analytics) return null;

  const { resolved, totalPnl, byBand, byType, byFocus, byStrat, recommendations } =
    analytics;
  const confVariant = CONFIDENCE_VARIANT[recommendations.confidence] ?? 'neutral';
  const confLabel =
    CONFIDENCE_LABEL[recommendations.confidence] ?? recommendations.confidence.toUpperCase();

  // ── Low-sample state ──────────────────────────────────────────────────────

  if (resolved < MIN_RESOLVED_FOR_ANALYTICS) {
    return (
      <Panel label="ANALYTICS — WHAT'S ACTUALLY WORKING">
        <div className="space-y-3">
          <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
            Still learning — need more resolved trades for reliable analytics.
          </p>
          <div
            className="rounded-[2px] border border-[rgba(232,162,61,0.35)] bg-[rgba(232,162,61,0.06)] px-4 py-3 flex items-center gap-3"
            role="status"
          >
            <span
              className="font-mono font-bold text-jtp-2xl text-[#e8a23d]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {resolved}
            </span>
            <div>
              <p className="font-mono text-jtp-xs font-semibold text-[#e8a23d]">
                of {MIN_RESOLVED_FOR_ANALYTICS} resolved trades needed
              </p>
              <p className="font-mono text-jtp-2xs text-jtp-textFaint">
                Keep trading — analytics unlock automatically once enough markets settle.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  // ── Full analytics view ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 animate-jtp-fade-in">

      {/* ── Header panel ── */}
      <Panel
        label="ANALYTICS — WHAT'S ACTUALLY WORKING"
        actions={
          <Button
            variant="secondary"
            onClick={fetchAnalytics}
            isLoading={loading}
            className="!px-2.5 !py-1 !text-[10px]"
            aria-label="Refresh analytics data"
          >
            Refresh
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Resolved count */}
          <div>
            <div className="jtp-label mb-0.5">RESOLVED TRADES</div>
            <div
              className="font-mono font-bold text-jtp-2xl text-jtp-text"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {resolved}
            </div>
          </div>

          {/* Total P&L */}
          <div>
            <div className="jtp-label mb-0.5">TOTAL P&amp;L</div>
            <div
              className={`font-mono font-bold text-jtp-2xl ${pnlClass(totalPnl)}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {fmtUsd(totalPnl, true)}
            </div>
          </div>

          {/* Confidence chip */}
          <div className="flex flex-col gap-1">
            <div className="jtp-label mb-0.5">CONFIDENCE</div>
            <Badge variant={confVariant} size="sm">{confLabel}</Badge>
          </div>

          <p className="w-full font-mono text-jtp-2xs text-jtp-textFaint leading-relaxed mt-1">
            Learned from your real resolved trades — buy in those price bands, market types, and focus areas
            where you actually make money.
          </p>
        </div>
      </Panel>

      {/* ── Price band heatmap ── */}
      <Panel label="BY PRICE BAND (¢)">
        <p className="font-mono text-jtp-2xs text-jtp-textFaint mb-3 leading-relaxed">
          Green = profits made in that price range. Red = losses. The star signal:{' '}
          <span className="text-jtp-text">stick to green bands, avoid red ones.</span>
        </p>
        <BandHeatmap buckets={byBand} />
      </Panel>

      {/* ── Breakdown tables — 3-column on desktop ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Panel label="BY MARKET TYPE" noPadding>
          <div className="p-4 overflow-x-auto">
            <BreakdownTable label="" buckets={byType} />
          </div>
        </Panel>
        <Panel label="BY FOCUS" noPadding>
          <div className="p-4 overflow-x-auto">
            <BreakdownTable label="" buckets={byFocus} />
          </div>
        </Panel>
        <Panel label="BY STRATEGY" noPadding>
          <div className="p-4 overflow-x-auto">
            <BreakdownTable label="" buckets={byStrat} />
          </div>
        </Panel>
      </div>

      {/* ── Recommendations ── */}
      <Panel label="RECOMMENDATIONS">
        <RecommendationsCard
          analytics={analytics}
          onApply={handleApplyWindow}
        />
      </Panel>

      {/* ── AI tune advice ── */}
      <Panel label="AI TUNE ADVICE">
        <p className="font-mono text-jtp-2xs text-jtp-textFaint mb-3 leading-relaxed">
          Ask the AI to read your analytics and give plain-English tuning advice — which bands to stick
          to, what to cut, and why.
        </p>
        <TuneAdvicePanel onFetch={handleTuneAdvice} />
      </Panel>
    </div>
  );
};

export default QuantAnalytics;
