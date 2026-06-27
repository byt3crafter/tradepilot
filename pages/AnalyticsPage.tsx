import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTrade } from '../context/TradeContext';
import { useAccount } from '../context/AccountContext';
import { usePlaybook } from '../context/PlaybookContext';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';
import { Trade, TradeResult, Direction, Playbook, AiJournalAnalysis } from '../types';
import api from '../services/api';
import DeeperReports from '../components/analytics/DeeperReports';
import {
  Panel,
  StatTile,
  EmptyState,
  Skeleton,
  Button,
} from '../components/ui';

// ─── Local types ──────────────────────────────────────────────────────────────

type DimKey = 'playbook' | 'session' | 'dow' | 'asset' | 'direction' | 'timeofday';

interface DimRow {
  label: string;
  trades: number;
  winRate: number; // 0–100
  avgR: number;
  netPL: number;
}

interface KpiStat {
  label: string;
  value: string;
  colorClass: string;
}

interface RBin {
  key: string;
  label: string;
  count: number;
  positive: boolean;
}

// ─── Chart axis tick style ────────────────────────────────────────────────────

const AXIS_TICK = {
  fill: '#69727c',
  fontSize: 9,
  fontFamily: '"JetBrains Mono"',
} as const;

// ─── Utility functions ────────────────────────────────────────────────────────

function tradePL(t: Trade): number {
  return (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
}

const DOW_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function sessionLabel(utcHour: number): string {
  if (utcHour < 8) return 'Asian (00–08)';
  if (utcHour < 13) return 'London (08–13)';
  if (utcHour < 17) return 'New York (13–17)';
  return 'Late (17–24)';
}

function timeOfDayLabel(utcHour: number): string {
  if (utcHour < 8) return 'Pre-London (00–08)';
  if (utcHour < 13) return 'London (08–13)';
  if (utcHour < 17) return 'New York (13–17)';
  return 'Late (17–24)';
}

function buildDimKey(
  t: Trade,
  dim: DimKey,
  playbookMap: Map<string, string>
): string {
  switch (dim) {
    case 'playbook':
      return playbookMap.get(t.playbookId) ?? 'Unknown Playbook';
    case 'session':
      return sessionLabel(new Date(t.entryDate).getUTCHours());
    case 'dow':
      return DOW_NAMES[new Date(t.entryDate).getDay()];
    case 'asset':
      return t.asset || 'Unknown';
    case 'direction':
      return t.direction === Direction.Buy ? 'Long (Buy)' : 'Short (Sell)';
    case 'timeofday':
      return timeOfDayLabel(new Date(t.entryDate).getUTCHours());
  }
}

function computeDimRows(
  trades: Trade[],
  dim: DimKey,
  playbookMap: Map<string, string>
): DimRow[] {
  const groups: Record<string, Trade[]> = {};
  for (const t of trades) {
    const k = buildDimKey(t, dim, playbookMap);
    if (!groups[k]) groups[k] = [];
    groups[k].push(t);
  }
  return Object.entries(groups)
    .map(([label, ts]) => {
      const wins = ts.filter(t => t.result === TradeResult.Win);
      const losses = ts.filter(t => t.result === TradeResult.Loss);
      const ratable = wins.length + losses.length;
      const winRate = ratable > 0 ? (wins.length / ratable) * 100 : 0;
      const avgR =
        ts.reduce((s, t) => s + (t.realisedR ?? 0), 0) / (ts.length || 1);
      const net = ts.reduce((s, t) => s + tradePL(t), 0);
      return { label, trades: ts.length, winRate, avgR, netPL: net };
    })
    .sort((a, b) => b.trades - a.trades);
}

function computeCurrentStreak(trades: Trade[]): number {
  const sorted = [...trades]
    .filter(t => t.result && t.exitDate)
    .sort(
      (a, b) =>
        new Date(b.exitDate!).getTime() - new Date(a.exitDate!).getTime()
    );
  if (!sorted.length) return 0;
  const first = sorted[0].result;
  let streak = 0;
  for (const t of sorted) {
    if (t.result === first) streak++;
    else break;
  }
  return first === TradeResult.Win ? streak : -streak;
}

function computeKpis(trades: Trade[]): KpiStat[] {
  const wins = trades.filter(t => t.result === TradeResult.Win);
  const losses = trades.filter(t => t.result === TradeResult.Loss);
  const ratable = wins.length + losses.length;
  const winRate = ratable > 0 ? (wins.length / ratable) * 100 : 0;

  const totalNet = trades.reduce((s, t) => s + tradePL(t), 0);
  const grossWin = wins.reduce((s, t) => s + tradePL(t), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + tradePL(t), 0));
  const profitFactor =
    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const expectancy = trades.length > 0 ? totalNet / trades.length : 0;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const streak = computeCurrentStreak(trades);
  const totalR = trades.reduce((s, t) => s + (t.realisedR ?? 0), 0);
  const avgR = trades.length > 0 ? totalR / trades.length : 0;

  // CVD-safe money formatter: includes directional glyph + sign
  const fmtCurr = (v: number, forcePlus = false) => {
    const glyph = v >= 0 ? '▲' : '▼';
    const sign = v < 0 ? '-' : forcePlus ? '+' : '';
    return `${glyph} ${sign}$${Math.abs(v).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;
  };

  return [
    {
      label: 'Net Profit',
      value: fmtCurr(totalNet, true),
      colorClass: totalNet >= 0 ? 'text-jtp-profit' : 'text-jtp-loss',
    },
    {
      label: 'Win Rate',
      value: ratable > 0 ? `${winRate.toFixed(0)}%` : '—',
      colorClass: winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss',
    },
    {
      label: 'Profit Factor',
      value:
        grossLoss > 0
          ? profitFactor.toFixed(2)
          : grossWin > 0
          ? '∞'
          : '—',
      colorClass: profitFactor >= 1 ? 'text-jtp-profit' : 'text-jtp-loss',
    },
    {
      label: 'Avg R',
      value: trades.length > 0 ? `${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R` : '—',
      colorClass: avgR >= 0 ? 'text-jtp-profit' : 'text-jtp-loss',
    },
    {
      label: 'Expectancy',
      value: trades.length > 0 ? fmtCurr(expectancy, true) : '—',
      colorClass: expectancy >= 0 ? 'text-jtp-profit' : 'text-jtp-loss',
    },
    {
      label: 'Avg Win',
      value: wins.length > 0 ? `▲ +$${avgWin.toFixed(0)}` : '—',
      colorClass: 'text-jtp-profit',
    },
    {
      label: 'Avg Loss',
      value: losses.length > 0 ? `▼ -$${avgLoss.toFixed(0)}` : '—',
      colorClass: 'text-jtp-loss',
    },
    {
      label: 'Streak',
      value:
        streak > 0
          ? `${streak}W`
          : streak < 0
          ? `${Math.abs(streak)}L`
          : '—',
      colorClass:
        streak > 0
          ? 'text-jtp-profit'
          : streak < 0
          ? 'text-jtp-loss'
          : 'text-jtp-textMuted',
    },
  ];
}

function computeRDist(trades: Trade[]): RBin[] {
  const BIN_MIN = -2.0;
  const BIN_MAX = 3.5;
  const STEP = 0.5;

  const bins = new Map<string, number>();
  const keys: string[] = [];
  for (let v = BIN_MIN; v <= BIN_MAX + 0.001; v += STEP) {
    const key = (Math.round(v * 10) / 10).toFixed(1);
    if (!bins.has(key)) {
      bins.set(key, 0);
      keys.push(key);
    }
  }

  for (const t of trades) {
    if (t.realisedR == null) continue;
    const binVal = Math.floor(t.realisedR / STEP) * STEP;
    const clamped = Math.max(BIN_MIN, Math.min(BIN_MAX, binVal));
    const key = (Math.round(clamped * 10) / 10).toFixed(1);
    if (bins.has(key)) {
      bins.set(key, (bins.get(key) ?? 0) + 1);
    }
  }

  return keys.map(key => ({
    key,
    label: `${parseFloat(key) >= 0 ? '+' : ''}${key}R`,
    count: bins.get(key) ?? 0,
    positive: parseFloat(key) >= 0,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// KPI strip — 8 StatTile hero metrics in a 4-column grid
const KpiStrip: React.FC<{ stats: KpiStat[] }> = ({ stats }) => (
  <div className="grid grid-cols-4 gap-3">
    {stats.map(s => (
      <StatTile
        key={s.label}
        label={s.label.toUpperCase()}
        value={s.value}
        valueColor={s.colorClass}
      />
    ))}
  </div>
);

// Avg-R centred bar — green to the right, red to the left
const AvgRBar: React.FC<{ avgR: number }> = ({ avgR }) => {
  const MAX_R = 3;
  const pct = (Math.min(Math.abs(avgR), MAX_R) / MAX_R) * 44;
  const positive = avgR >= 0;

  return (
    <div className="flex items-center w-full gap-px">
      <div className="flex-1 flex justify-end items-center h-4">
        {!positive && avgR !== 0 && (
          <div
            className="h-[5px] bg-jtp-loss rounded-l-[2px]"
            style={{ width: `${pct}%`, minWidth: '2px' }}
          />
        )}
      </div>
      <div className="w-px h-3 bg-jtp-borderStrong shrink-0" />
      <div className="flex-1 flex justify-start items-center h-4">
        {positive && avgR !== 0 && (
          <div
            className="h-[5px] bg-jtp-profit rounded-r-[2px]"
            style={{ width: `${pct}%`, minWidth: '2px' }}
          />
        )}
      </div>
    </div>
  );
};

const DIM_OPTIONS: { key: DimKey; label: string }[] = [
  { key: 'playbook', label: 'By Playbook' },
  { key: 'session', label: 'By Session' },
  { key: 'dow', label: 'By Day of Week' },
  { key: 'asset', label: 'By Asset' },
  { key: 'direction', label: 'By Direction' },
  { key: 'timeofday', label: 'By Time of Day' },
];

// Dimension pivot breakdown — left dim picker + right stats table
const DimBreakdown: React.FC<{ trades: Trade[]; playbooks: Playbook[] }> = ({
  trades,
  playbooks,
}) => {
  const [activeDim, setActiveDim] = useState<DimKey>('playbook');

  const playbookMap = useMemo(
    () => new Map(playbooks.map(p => [p.id, p.name])),
    [playbooks]
  );

  const rows = useMemo(
    () => computeDimRows(trades, activeDim, playbookMap),
    [trades, activeDim, playbookMap]
  );

  return (
    <Panel label="BREAKDOWN">
      <div className="flex gap-4">
        {/* Dimension picker */}
        <div className="flex flex-col gap-[3px] shrink-0 w-[148px]">
          {DIM_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveDim(opt.key)}
              className={[
                'text-left font-mono text-jtp-xs-plus px-3 py-[6px] rounded-[2px] border-l-2 transition-colors w-full',
                activeDim === opt.key
                  ? 'bg-[rgba(232,162,61,0.12)] border-jtp-blue text-jtp-blue'
                  : 'border-transparent text-jtp-textMuted hover:text-jtp-text hover:bg-jtp-hover',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Stats table */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState
              title="No data"
              description="No trades for this breakdown."
              className="py-6"
            />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="font-mono text-jtp-xs uppercase tracking-[0.4px] text-jtp-textDim">
                  <th className="text-left pb-2 font-normal pr-3">Segment</th>
                  <th className="text-right pb-2 font-normal pr-3 w-14">
                    Trades
                  </th>
                  <th className="text-right pb-2 font-normal pr-3 w-14">
                    Win%
                  </th>
                  <th className="text-center pb-2 font-normal pr-2 w-44">
                    Avg R
                  </th>
                  <th className="text-right pb-2 font-normal w-20">
                    Net P&amp;L
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const flagged = row.avgR < 0 && row.trades >= 2;
                  return (
                    <tr
                      key={row.label}
                      className={[
                        'border-t border-jtp-borderSubtle',
                        flagged ? 'bg-[rgba(255,91,82,0.05)]' : '',
                      ].join(' ')}
                    >
                      <td className="py-[6px] pr-3 font-mono text-jtp-xs-plus text-jtp-text truncate max-w-[130px]">
                        {row.label}
                      </td>
                      <td className="py-[6px] pr-3 text-right font-mono text-jtp-xs-plus text-jtp-textSoft">
                        {row.trades}
                      </td>
                      <td
                        className={`py-[6px] pr-3 text-right font-mono text-jtp-xs-plus ${
                          row.winRate >= 50
                            ? 'text-jtp-profit'
                            : 'text-jtp-loss'
                        }`}
                      >
                        {row.winRate.toFixed(0)}%
                      </td>
                      <td className="py-[6px] pr-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <AvgRBar avgR={row.avgR} />
                          </div>
                          <span
                            className={`font-mono text-jtp-xs shrink-0 w-12 text-right ${
                              row.avgR >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'
                            }`}
                          >
                            {row.avgR >= 0 ? '+' : ''}
                            {row.avgR.toFixed(2)}R
                          </span>
                        </div>
                      </td>
                      <td
                        className={`py-[6px] text-right font-mono text-jtp-xs-plus ${
                          row.netPL >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'
                        }`}
                      >
                        {row.netPL >= 0 ? '+' : '-'}$
                        {Math.abs(row.netPL).toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Panel>
  );
};

// R-Distribution custom tooltip
const RDistTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: RBin }>;
}> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-jtp-shell border border-jtp-borderStrong rounded-[2px] px-3 py-2 text-jtp-xs shadow-jtp-drawer">
      <div className="text-jtp-textDim font-mono mb-[2px]">{d.label}</div>
      <div className="text-jtp-text font-mono font-semibold">
        {d.count} trade{d.count !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

// R-Multiple Distribution — primary chart, full-width with gradient fills
const RDistChart: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const data = useMemo(() => computeRDist(trades), [trades]);
  const hasData = data.some(d => d.count > 0);

  return (
    <Panel label="R-MULTIPLE DISTRIBUTION">
      {!hasData ? (
        <EmptyState
          title="No R data yet"
          description="No realised-R data to display."
          className="py-6"
        />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 4, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="rDistPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ddc84" stopOpacity={0.92} />
                <stop offset="100%" stopColor="#3ddc84" stopOpacity={0.28} />
              </linearGradient>
              <linearGradient id="rDistNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5b52" stopOpacity={0.92} />
                <stop offset="100%" stopColor="#ff5b52" stopOpacity={0.28} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={36}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
              allowDecimals={false}
              width={24}
            />
            <ReferenceLine y={0} stroke="#1a2028" strokeWidth={1} />
            <Tooltip
              content={<RDistTooltip />}
              cursor={{ fill: 'rgba(232,162,61,0.05)' }}
            />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
              label={{
                position: 'top' as const,
                fill: '#69727c',
                fontSize: 9,
                fontFamily: '"JetBrains Mono"',
                formatter: (v: number) => (v > 0 ? String(v) : ''),
              }}
            >
              {data.map(entry => (
                <Cell
                  key={entry.key}
                  fill={
                    entry.count === 0
                      ? entry.positive
                        ? 'rgba(61,220,132,0.10)'
                        : 'rgba(255,91,82,0.10)'
                      : entry.positive
                      ? 'url(#rDistPos)'
                      : 'url(#rDistNeg)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
};

// AI Insights
const AI_COLUMNS: {
  key: 'strengths' | 'mistakes' | 'lessons';
  title: string;
  dotClass: string;
  textClass: string;
}[] = [
  { key: 'strengths', title: 'Strengths', dotClass: 'bg-jtp-profit', textClass: 'text-jtp-profit' },
  { key: 'mistakes', title: 'Mistakes', dotClass: 'bg-jtp-loss', textClass: 'text-jtp-loss' },
  { key: 'lessons', title: 'Lessons', dotClass: 'bg-jtp-blue', textClass: 'text-jtp-blue' },
];

const AiInsightsPanel: React.FC = () => {
  const { getToken } = useAuth();
  const { navigateTo } = useView();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiJournalAnalysis | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setNeedsConnect(false);
    setResult(null);
    try {
      const token = await getToken();
      const data = await api.aiJournalAnalysis(token!);
      setResult(data);
    } catch (err: any) {
      const msg: string = err?.message || 'Something went wrong.';
      if (/settings\s*→?\s*ai/i.test(msg) || /connect/i.test(msg)) {
        setNeedsConnect(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasInsights =
    !!result &&
    !result.note &&
    ((result.strengths?.length ?? 0) > 0 ||
      (result.mistakes?.length ?? 0) > 0 ||
      (result.lessons?.length ?? 0) > 0 ||
      !!result.summary);

  return (
    <Panel
      label="AI INSIGHTS"
      actions={
        <Button onClick={analyze} disabled={loading} isLoading={loading}>
          {loading ? 'Analyzing…' : result ? 'Re-analyze' : 'Analyze my trades'}
        </Button>
      }
    >
      <p className="text-jtp-md text-jtp-textFaint mb-3">
        AI-generated insights — not financial advice.
      </p>

      {/* Not-connected state */}
      {needsConnect && (
        <div className="border border-jtp-borderSubtle rounded-[2px] px-4 py-5 text-center">
          <p className="text-jtp-lg text-jtp-textMuted">
            Connect ChatGPT/Codex to generate AI insights.
          </p>
          <button
            onClick={() => navigateTo('settings', 'ai')}
            className="mt-3 font-mono text-jtp-xs-plus px-3 py-2 rounded-[2px] bg-[rgba(232,162,61,0.12)] text-jtp-blue hover:bg-[rgba(232,162,61,0.20)] transition-colors"
          >
            Open Settings → AI
          </button>
        </div>
      )}

      {/* Generic error */}
      {error && !needsConnect && (
        <div className="border border-jtp-borderSubtle rounded-[2px] px-4 py-4 text-center font-mono text-jtp-xs-plus text-jtp-loss">
          {error}
        </div>
      )}

      {/* Empty state (no closed trades) */}
      {result?.note && (
        <div className="border border-jtp-borderSubtle rounded-[2px] px-4 py-5 text-center text-jtp-lg text-jtp-textFaint">
          {result.note}
        </div>
      )}

      {/* Insights */}
      {hasInsights && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AI_COLUMNS.map(col => {
              const items = result?.[col.key] ?? [];
              return (
                <div
                  key={col.key}
                  className="border border-jtp-borderSubtle rounded-[2px] px-4 py-[14px]"
                >
                  <div className="flex items-center gap-2 mb-[10px]">
                    <span className={`w-[6px] h-[6px] rounded-full ${col.dotClass}`} />
                    <span className={`font-mono text-jtp-xs-plus font-semibold ${col.textClass}`}>
                      {col.title}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-jtp-md text-jtp-textFaint">None noted.</div>
                  ) : (
                    <ul className="space-y-[7px]">
                      {items.map((item, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-jtp-lg text-jtp-textMuted leading-snug"
                        >
                          <span className={`shrink-0 mt-[7px] w-[4px] h-[4px] rounded-full ${col.dotClass}`} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {result?.summary && (
            <div className="border border-jtp-borderSubtle rounded-[2px] px-4 py-[14px]">
              <div className="jtp-label mb-[6px]">SUMMARY</div>
              <p className="text-jtp-lg text-jtp-textMuted leading-relaxed whitespace-pre-wrap">
                {result.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AnalyticsPage: React.FC = () => {
  const { closedTrades, isLoading, isTradesSynced } = useTrade();
  const { activeAccount } = useAccount();
  const { playbooks } = usePlaybook();

  // Global $/R toggle — controls all breakdown sections
  const [isR, setIsR] = useState(false);

  const kpis = useMemo(() => computeKpis(closedTrades), [closedTrades]);

  if (isLoading || !isTradesSynced) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* KPI skeleton */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="stat" />
          ))}
        </div>
        {/* Primary chart skeleton */}
        <Skeleton variant="panel" className="h-72" />
        {/* Breakdown skeleton */}
        <Skeleton variant="panel" className="h-48" />
        {/* 2×2 skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton variant="panel" className="h-64" />
          <Skeleton variant="panel" className="h-64" />
        </div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5">
        <EmptyState
          title="No account selected"
          description="Select or create a broker account to view analytics."
        />
      </div>
    );
  }

  const isEmpty = closedTrades.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-4 animate-fade-in-up">
      {isEmpty ? (
        <Panel label="PERFORMANCE">
          <EmptyState
            title="No closed trades yet"
            description="Log some closed trades to unlock your performance analytics."
          />
        </Panel>
      ) : (
        <>
          {/* ── Row 1: KPI StatTile grid — 8 tiles, 2 rows of 4 ── */}
          <KpiStrip stats={kpis} />

          {/* ── Row 2: Primary chart — R-Multiple Distribution ── */}
          <RDistChart trades={closedTrades} />

          {/* ── Row 3: Dimension pivot breakdown ── */}
          <DimBreakdown trades={closedTrades} playbooks={playbooks} />

          {/* ── Rows 4-7: 2×N breakdown grid (DOW, Session, Symbol, Setup, ─
               Direction, Drawdown, MAE/MFE, Adherence) with $/R toggle ── */}
          <DeeperReports
            trades={closedTrades}
            playbooks={playbooks}
            isR={isR}
            onIsRChange={setIsR}
          />
        </>
      )}

      {/* ── AI Insights — always visible, bottom of page ── */}
      <AiInsightsPanel />
    </div>
  );
};

export default AnalyticsPage;
