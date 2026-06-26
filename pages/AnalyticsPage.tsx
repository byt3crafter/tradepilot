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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { useTrade } from '../context/TradeContext';
import { useAccount } from '../context/AccountContext';
import { usePlaybook } from '../context/PlaybookContext';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';
import { Trade, TradeResult, Direction, Playbook, AiJournalAnalysis } from '../types';
import api from '../services/api';
import DeeperReports from '../components/analytics/DeeperReports';

// ─── Local types ─────────────────────────────────────────────────────────────

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

interface ScatterPoint {
  x: number; // MFE in R
  y: number; // |MAE| in R
  win: boolean;
}

// ─── Shared style constants ───────────────────────────────────────────────────

const PANEL = 'bg-jtp-panel border border-jtp-border rounded-jtp-panel';
const PANEL_PAD = 'px-[18px] py-[15px]';
const PANEL_TITLE = 'text-jtp-base-minus font-semibold text-jtp-text mb-[14px]';
const AXIS_TICK = {
  fill: '#5b6370',
  fontSize: 9,
  fontFamily: '"IBM Plex Mono"',
} as const;

// ─── Utility functions ────────────────────────────────────────────────────────

function tradePL(t: Trade): number {
  return (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
}

const DOW_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
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

  const durations = trades
    .filter(t => t.exitDate && t.entryDate)
    .map(t =>
      Math.max(
        0,
        (new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime()) /
          60000
      )
    );
  const avgDur =
    durations.length > 0
      ? durations.reduce((s, d) => s + d, 0) / durations.length
      : 0;
  const durH = Math.floor(avgDur / 60);
  const durM = Math.round(avgDur % 60);

  const fmtCurr = (v: number, forcePlus = false) => {
    const sign = v < 0 ? '-' : forcePlus ? '+' : '';
    return `${sign}$${Math.abs(v).toLocaleString(undefined, {
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
      label: 'Expectancy',
      value: trades.length > 0 ? fmtCurr(expectancy, true) : '—',
      colorClass: expectancy >= 0 ? 'text-jtp-profit' : 'text-jtp-loss',
    },
    {
      label: 'Avg Win',
      value: wins.length > 0 ? `+$${avgWin.toFixed(0)}` : '—',
      colorClass: 'text-jtp-profit',
    },
    {
      label: 'Avg Loss',
      value: losses.length > 0 ? `-$${avgLoss.toFixed(0)}` : '—',
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
    {
      label: 'Avg Duration',
      value: avgDur > 0 ? `${durH}h ${durM}m` : '—',
      colorClass: 'text-jtp-text',
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

// KPI strip — 8 compact stat cards
const KpiStrip: React.FC<{ stats: KpiStat[] }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
    {stats.map(s => (
      <div key={s.label} className={`${PANEL} px-4 py-[13px]`}>
        <div className="text-jtp-xs-plus uppercase tracking-[0.5px] text-jtp-textDim font-normal mb-[5px]">
          {s.label}
        </div>
        <div
          className={`font-mono font-semibold text-jtp-3xl leading-none ${s.colorClass}`}
        >
          {s.value}
        </div>
      </div>
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
      {/* left (negative) half */}
      <div className="flex-1 flex justify-end items-center h-4">
        {!positive && avgR !== 0 && (
          <div
            className="h-[5px] bg-jtp-loss rounded-l-[2px]"
            style={{ width: `${pct}%`, minWidth: '2px' }}
          />
        )}
      </div>
      {/* centre marker */}
      <div className="w-px h-3 bg-jtp-borderStrong shrink-0" />
      {/* right (positive) half */}
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

// Breakdown panel — left dim picker + right stats table
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
    <div className={`${PANEL} ${PANEL_PAD}`}>
      <div className={PANEL_TITLE} style={{ letterSpacing: '0.2px' }}>
        Breakdown
      </div>
      <div className="flex gap-4">
        {/* Dimension picker */}
        <div className="flex flex-col gap-[3px] shrink-0 w-[148px]">
          {DIM_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveDim(opt.key)}
              className={[
                'text-left text-jtp-sm px-3 py-[6px] rounded-[5px] border-l-2 transition-colors w-full',
                activeDim === opt.key
                  ? 'bg-[rgba(91,141,239,0.12)] border-jtp-blue text-jtp-blue font-medium'
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
            <div className="min-h-[120px] flex items-center justify-center text-jtp-textFaint text-jtp-sm">
              No data for this breakdown
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-jtp-xs uppercase tracking-[0.4px] text-jtp-textDim">
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
                        flagged ? 'bg-[rgba(229,99,95,0.05)]' : '',
                      ].join(' ')}
                    >
                      <td className="py-[6px] pr-3 text-jtp-sm text-jtp-text truncate max-w-[130px]">
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
    </div>
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
    <div className="bg-jtp-shell border border-jtp-borderStrong rounded-jtp-2xl px-3 py-2 text-jtp-xs shadow-jtp-drawer">
      <div className="text-jtp-textDim font-mono mb-[2px]">{d.label}</div>
      <div className="text-jtp-text font-mono font-semibold">
        {d.count} trade{d.count !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

// R-Multiple Distribution histogram
const RDistChart: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const data = useMemo(() => computeRDist(trades), [trades]);
  const hasData = data.some(d => d.count > 0);

  return (
    <div className={`${PANEL} ${PANEL_PAD} flex flex-col`}>
      <div className={PANEL_TITLE} style={{ letterSpacing: '0.2px' }}>
        R-Multiple Distribution
      </div>
      {!hasData ? (
        <div className="flex-1 min-h-[180px] flex items-center justify-center text-jtp-textFaint text-jtp-sm">
          No realised-R data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 16, right: 4, left: 0, bottom: 4 }}>
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
            <ReferenceLine y={0} stroke="#323942" strokeWidth={1} />
            <Tooltip
              content={<RDistTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
              label={{
                position: 'top' as const,
                fill: '#5b6370',
                fontSize: 9,
                fontFamily: '"IBM Plex Mono"',
                formatter: (v: number) => (v > 0 ? String(v) : ''),
              }}
            >
              {data.map(entry => (
                <Cell
                  key={entry.key}
                  fill={entry.positive ? '#4cc38a' : '#e5635f'}
                  fillOpacity={entry.count === 0 ? 0.15 : 0.82}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// Adherence panel — honest empty state until Trade.checklistFollowed is tracked
const AdherencePanel: React.FC = () => {
  // TODO: When a boolean `checklistFollowed` field is added to the Trade model and
  // returned by the API, compute real per-group stats here:
  //   followed = closedTrades.filter(t => t.checklistFollowed === true)
  //   broken   = closedTrades.filter(t => t.checklistFollowed === false)
  //   Each group: trades count, win%, avg realisedR, net P&L
  return (
    <div className={`${PANEL} ${PANEL_PAD}`}>
      <div className={PANEL_TITLE} style={{ letterSpacing: '0.2px' }}>
        Adherence Impact
      </div>
      <div className="flex gap-3">
        {(
          [
            { label: 'Checklist followed', accentClass: 'bg-jtp-profit' },
            { label: 'Checklist broken', accentClass: 'bg-jtp-loss' },
          ] as const
        ).map(({ label, accentClass }) => (
          <div
            key={label}
            className="flex-1 border border-jtp-borderSubtle rounded-jtp-xl px-4 py-6 flex flex-col items-center gap-[10px] opacity-40"
          >
            <div className={`w-[6px] h-[6px] rounded-full ${accentClass}`} />
            <div className="text-jtp-sm text-jtp-textMuted font-medium text-center">
              {label}
            </div>
            <div className="text-jtp-xs text-jtp-textFaint text-center leading-snug">
              No checklist-adherence data yet
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// MAE / MFE scatter tooltip
const MaeMfeTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-jtp-shell border border-jtp-borderStrong rounded-jtp-2xl px-3 py-2 text-jtp-xs shadow-jtp-drawer">
      <div
        className={`font-mono font-semibold mb-1 ${
          d.win ? 'text-jtp-profit' : 'text-jtp-loss'
        }`}
      >
        {d.win ? 'Win' : 'Loss'}
      </div>
      <div className="text-jtp-textDim font-mono">MFE {d.x.toFixed(2)}R</div>
      <div className="text-jtp-textDim font-mono">MAE {d.y.toFixed(2)}R</div>
    </div>
  );
};

// MAE / MFE scatter — honest empty state until mae/mfe are tracked on trades
const MaeMfePanel: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  // TODO: Once Trade.mae and Trade.mfe are added to the Prisma schema and returned
  // by the API, remove the `(t as any)` casts. The chart will populate automatically.
  const points = useMemo<ScatterPoint[]>(() => {
    return trades
      .filter(
        t => (t as any).mae != null && (t as any).mfe != null // eslint-disable-line @typescript-eslint/no-explicit-any
      )
      .map(t => ({
        x: (t as any).mfe as number, // eslint-disable-line @typescript-eslint/no-explicit-any
        y: Math.abs((t as any).mae as number), // eslint-disable-line @typescript-eslint/no-explicit-any
        win: t.result === TradeResult.Win,
      }));
  }, [trades]);

  const winsData = points.filter(p => p.win);
  const lossesData = points.filter(p => !p.win);

  return (
    <div className={`${PANEL} ${PANEL_PAD} flex flex-col`}>
      <div
        className="text-jtp-base-minus font-semibold text-jtp-text mb-[3px]"
        style={{ letterSpacing: '0.2px' }}
      >
        MAE / MFE
      </div>
      <div className="text-jtp-xs text-jtp-textDim mb-[12px]">
        Adverse vs favourable excursion (R)
      </div>

      {points.length === 0 ? (
        <div className="flex-1 min-h-[160px] flex items-center justify-center text-jtp-textFaint text-jtp-sm">
          No excursion data captured yet
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-[10px] text-jtp-xs-plus text-jtp-textDim">
            <span className="flex items-center gap-[5px]">
              <span className="inline-block w-2 h-2 rounded-full bg-jtp-profit" />
              Win
            </span>
            <span className="flex items-center gap-[5px]">
              <span className="inline-block w-2 h-2 rounded-full bg-jtp-loss" />
              Loss
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
              <XAxis
                dataKey="x"
                type="number"
                name="MFE"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                label={{
                  value: 'MFE (R)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#5b6370',
                  fontSize: 9,
                  fontFamily: '"IBM Plex Mono"',
                }}
              />
              <YAxis
                dataKey="y"
                type="number"
                name="MAE"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                width={30}
                label={{
                  value: 'MAE (R)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#5b6370',
                  fontSize: 9,
                  fontFamily: '"IBM Plex Mono"',
                }}
              />
              <ZAxis range={[28, 28]} />
              <Tooltip
                content={<MaeMfeTooltip />}
                cursor={{ strokeDasharray: '3 3', stroke: '#323942' }}
              />
              <Scatter
                data={winsData}
                fill="#4cc38a"
                fillOpacity={0.75}
                isAnimationActive={false}
              />
              <Scatter
                data={lossesData}
                fill="#e5635f"
                fillOpacity={0.75}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

// AI Insights — ChatGPT-grounded review of the user's closed trades
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
    <div className={`${PANEL} ${PANEL_PAD}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-[6px]">
        <div>
          <div
            className="text-jtp-base-minus font-semibold text-jtp-text"
            style={{ letterSpacing: '0.2px' }}
          >
            🧠 AI Insights
          </div>
          <div className="text-jtp-xs text-jtp-textDim mt-[3px]">
            AI insights — not financial advice.
          </div>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-[7px] px-[14px] py-[8px] bg-jtp-blue hover:bg-jtp-blueHover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-jtp-sm rounded-jtp-xl border-none cursor-pointer transition-colors"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              Analyzing…
            </>
          ) : (
            <>{result ? 'Re-analyze' : 'Analyze my trades'}</>
          )}
        </button>
      </div>

      {/* Not-connected state */}
      {needsConnect && (
        <div className="mt-3 border border-jtp-borderSubtle rounded-jtp-xl px-4 py-5 text-center">
          <p className="text-jtp-sm text-jtp-textMuted">
            Connect ChatGPT/Codex to generate AI insights.
          </p>
          <button
            onClick={() => navigateTo('settings', 'ai')}
            className="mt-3 text-jtp-sm font-medium px-3 py-2 rounded-jtp-xl bg-[rgba(91,141,239,0.12)] text-jtp-blue hover:bg-[rgba(91,141,239,0.2)] transition-colors"
          >
            Open Settings → AI
          </button>
        </div>
      )}

      {/* Generic error */}
      {error && !needsConnect && (
        <div className="mt-3 border border-jtp-borderSubtle rounded-jtp-xl px-4 py-4 text-center text-jtp-sm text-jtp-loss">
          {error}
        </div>
      )}

      {/* Empty state (no closed trades) */}
      {result?.note && (
        <div className="mt-3 border border-jtp-borderSubtle rounded-jtp-xl px-4 py-5 text-center text-jtp-sm text-jtp-textFaint">
          {result.note}
        </div>
      )}

      {/* Insights */}
      {hasInsights && (
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AI_COLUMNS.map(col => {
              const items = result?.[col.key] ?? [];
              return (
                <div
                  key={col.key}
                  className="border border-jtp-borderSubtle rounded-jtp-xl px-4 py-[14px]"
                >
                  <div className="flex items-center gap-2 mb-[10px]">
                    <span className={`w-[6px] h-[6px] rounded-full ${col.dotClass}`} />
                    <span className={`text-jtp-sm font-semibold ${col.textClass}`}>
                      {col.title}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-jtp-xs text-jtp-textFaint">None noted.</div>
                  ) : (
                    <ul className="space-y-[7px]">
                      {items.map((item, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-jtp-sm text-jtp-textMuted leading-snug"
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
            <div className="border border-jtp-borderSubtle rounded-jtp-xl px-4 py-[14px]">
              <div className="text-jtp-xs uppercase tracking-[0.4px] text-jtp-textDim mb-[6px]">
                Summary
              </div>
              <p className="text-jtp-sm text-jtp-textMuted leading-relaxed whitespace-pre-wrap">
                {result.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AnalyticsPage: React.FC = () => {
  const { closedTrades, isLoading, isTradesSynced } = useTrade();
  const { activeAccount } = useAccount();
  const { playbooks } = usePlaybook();

  const kpis = useMemo(() => computeKpis(closedTrades), [closedTrades]);

  if (isLoading || !isTradesSynced) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 flex justify-center">
        <div className="w-5 h-5 border-2 border-jtp-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 text-center text-jtp-textFaint text-jtp-sm">
        Select or create a broker account to view analytics.
      </div>
    );
  }

  const isEmpty = closedTrades.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-4 animate-fade-in-up">
      {/* Page header */}
      <div className="mb-1">
        <h1
          className="text-[18px] font-semibold text-jtp-text"
          style={{ letterSpacing: '0.2px' }}
        >
          Analytics
        </h1>
        <p className="text-jtp-xs-plus text-jtp-textDim mt-[3px]">
          What your edge is made of
        </p>
      </div>

      {/* AI Insights — ChatGPT-grounded review of closed trades */}
      <AiInsightsPanel />

      {isEmpty ? (
        <div className={`${PANEL} ${PANEL_PAD} py-14 text-center`}>
          <p className="text-jtp-textFaint text-jtp-sm">
            Log some closed trades to unlock your performance analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Row 1 — 8 KPI cards */}
          <KpiStrip stats={kpis} />

          {/* Row 2 — Breakdown (2/3) + R Distribution (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <DimBreakdown trades={closedTrades} playbooks={playbooks} />
            </div>
            <div className="lg:col-span-1">
              <RDistChart trades={closedTrades} />
            </div>
          </div>

          {/* Row 3 — Adherence + MAE/MFE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AdherencePanel />
            <MaeMfePanel trades={closedTrades} />
          </div>

          {/* Row 4 — Deeper Reports */}
          <DeeperReports trades={closedTrades} playbooks={playbooks} />
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
