import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { Trade, TradeResult, Direction, Playbook } from '../../types';
import { Panel, SegmentedControl, EmptyState } from '../../components/ui';

// ─── Chart style constants ────────────────────────────────────────────────────
const AXIS_TICK = {
  fill: '#69727c',
  fontSize: 9,
  fontFamily: '"JetBrains Mono"',
} as const;
const PROFIT_CLR = '#3ddc84';
const LOSS_CLR   = '#ff5b52';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey = 'trades' | 'winRate' | 'netPL' | 'netR' | 'avgR';

interface Metrics {
  label: string;
  trades: number;
  winRate: number;
  netPL: number;
  netR: number;
  avgR: number;
  profitFactor: number;
  profitFactorR: number;
  expectancy: number;
  expectancyR: number;
}

interface BarDatum extends Metrics {
  shortLabel: string;
  value: number;
}

interface DdPoint {
  idx: number;
  dateLabel: string;
  dd: number;
  ddR: number;
}

interface ScatterPoint {
  x: number;
  y: number;
  win: boolean;
}

// ─── Utility functions ────────────────────────────────────────────────────────
function netOf(t: Trade): number {
  return (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
}

function metricsFor(label: string, ts: Trade[]): Metrics {
  const wins = ts.filter(t => t.result === TradeResult.Win);
  const losses = ts.filter(t => t.result === TradeResult.Loss);
  const ratable = wins.length + losses.length;
  const winRate = ratable > 0 ? (wins.length / ratable) * 100 : 0;
  const totalPL = ts.reduce((s, t) => s + netOf(t), 0);
  const totalR = ts.reduce((s, t) => s + (t.realisedR ?? 0), 0);
  const avgR = ts.length > 0 ? totalR / ts.length : 0;
  const grossWin = wins.reduce((s, t) => s + netOf(t), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + netOf(t), 0));
  const grossWinR = wins.reduce((s, t) => s + (t.realisedR ?? 0), 0);
  const grossLossR = Math.abs(losses.reduce((s, t) => s + (t.realisedR ?? 0), 0));
  return {
    label,
    trades: ts.length,
    winRate,
    netPL: totalPL,
    netR: totalR,
    avgR,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    profitFactorR: grossLossR > 0 ? grossWinR / grossLossR : grossWinR > 0 ? Infinity : 0,
    expectancy: ts.length > 0 ? totalPL / ts.length : 0,
    expectancyR: ts.length > 0 ? totalR / ts.length : 0,
  };
}

function groupByKey(trades: Trade[], keyFn: (t: Trade) => string): Map<string, Trade[]> {
  const m = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = keyFn(t);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(t);
  }
  return m;
}

// ─── Formatting ───────────────────────────────────────────────────────────────
function fmtMoney(v: number, forceSign = true): string {
  const sign = v < 0 ? '-' : forceSign ? '+' : '';
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtR(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}

function fmtPF(v: number): string {
  if (v === Infinity) return '∞';
  if (!isFinite(v)) return '—';
  return v.toFixed(2);
}

// ─── Sortable column header ───────────────────────────────────────────────────
const SortTh: React.FC<{
  label: string;
  k: SortKey;
  current: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}> = ({ label, k, current, dir, onSort }) => (
  <th
    className="pb-2 font-normal text-right pr-3 cursor-pointer select-none hover:text-jtp-textMuted transition-colors whitespace-nowrap"
    onClick={() => onSort(k)}
  >
    {label}
    {current === k ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
  </th>
);

// ─── Shared stats mini-table ──────────────────────────────────────────────────
const StatsTable: React.FC<{ rows: Metrics[]; isR: boolean }> = ({ rows, isR }) => (
  <div className="overflow-x-auto mt-[10px]">
    <table className="w-full border-collapse">
      <thead>
        <tr className="font-mono text-jtp-xs uppercase tracking-[0.4px] text-jtp-textDim">
          <th className="text-left pb-2 font-normal pr-2 w-28">Segment</th>
          <th className="text-right pb-2 font-normal pr-2 w-12">Trades</th>
          <th className="text-right pb-2 font-normal pr-2 w-14">Win%</th>
          <th className="text-right pb-2 font-normal pr-2 w-20">
            {isR ? 'Net R' : 'Net P&L'}
          </th>
          <th className="text-right pb-2 font-normal pr-2 w-14">Avg R</th>
          <th className="text-right pb-2 font-normal pr-2 w-14">P.F.</th>
          <th className="text-right pb-2 font-normal w-20">Expct.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const empty = row.trades === 0;
          const netVal = isR ? row.netR : row.netPL;
          const pfVal = isR ? row.profitFactorR : row.profitFactor;
          const exVal = isR ? row.expectancyR : row.expectancy;
          return (
            <tr key={row.label} className="border-t border-jtp-borderSubtle">
              <td className={`py-[5px] pr-2 font-mono text-jtp-xs-plus truncate ${empty ? 'text-jtp-textFaint' : 'text-jtp-text'}`}>
                {row.label}
              </td>
              <td className="py-[5px] pr-2 text-right font-mono text-jtp-xs text-jtp-textSoft">
                {empty ? '—' : row.trades}
              </td>
              <td className={`py-[5px] pr-2 text-right font-mono text-jtp-xs ${empty ? 'text-jtp-textFaint' : row.winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                {empty ? '—' : `${row.winRate.toFixed(0)}%`}
              </td>
              <td className={`py-[5px] pr-2 text-right font-mono text-jtp-xs ${empty ? 'text-jtp-textFaint' : netVal >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                {empty ? '—' : isR ? fmtR(netVal) : fmtMoney(netVal)}
              </td>
              <td className={`py-[5px] pr-2 text-right font-mono text-jtp-xs ${empty ? 'text-jtp-textFaint' : row.avgR >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                {empty ? '—' : fmtR(row.avgR)}
              </td>
              <td className={`py-[5px] pr-2 text-right font-mono text-jtp-xs ${empty ? 'text-jtp-textFaint' : pfVal >= 1 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                {empty ? '—' : fmtPF(pfVal)}
              </td>
              <td className={`py-[5px] text-right font-mono text-jtp-xs ${empty ? 'text-jtp-textFaint' : exVal >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                {empty ? '—' : isR ? fmtR(exVal) : fmtMoney(exVal, false)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ─── Custom bar-chart tooltip ─────────────────────────────────────────────────
const BarTip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: BarDatum }>;
  isR: boolean;
}> = ({ active, payload, isR }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const val = isR ? d.netR : d.netPL;
  return (
    <div className="bg-jtp-shell border border-jtp-borderStrong rounded-[2px] px-3 py-2 text-jtp-xs shadow-jtp-drawer">
      <div className="text-jtp-textDim font-mono mb-[3px]">{d.label}</div>
      <div className={`font-mono font-semibold ${val >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
        {isR ? fmtR(val) : fmtMoney(val)}
      </div>
      <div className="text-jtp-textFaint font-mono mt-[2px]">
        {d.trades} trade{d.trades !== 1 ? 's' : ''} · {d.winRate.toFixed(0)}% win
      </div>
    </div>
  );
};

// ─── Section 1 · By Day of Week ───────────────────────────────────────────────
const DOW_JS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOW_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const DowSection: React.FC<{ trades: Trade[]; isR: boolean }> = ({ trades, isR }) => {
  const rows = useMemo(() => {
    const grouped = groupByKey(trades, t => DOW_JS[new Date(t.entryDate).getDay()]);
    return DOW_ORDER.map(dow => metricsFor(dow, grouped.get(dow) ?? []));
  }, [trades]);

  const chartData: BarDatum[] = rows.map(r => ({
    ...r,
    shortLabel: DOW_SHORT[r.label] ?? r.label,
    value: isR ? r.netR : r.netPL,
  }));

  return (
    <Panel label="BY DAY OF WEEK">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            tickFormatter={v => isR ? `${v}R` : `$${v}`}
            width={isR ? 24 : 34}
          />
          <ReferenceLine y={0} stroke="#1a2028" strokeWidth={1} />
          <Tooltip content={<BarTip isR={isR} />} cursor={{ fill: 'rgba(232,162,61,0.04)' }} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.value >= 0 ? PROFIT_CLR : LOSS_CLR}
                fillOpacity={entry.trades === 0 ? 0.15 : 0.82}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <StatsTable rows={rows} isR={isR} />
    </Panel>
  );
};

// ─── Section 2 · By Session ───────────────────────────────────────────────────
const SESSION_ORDER = ['Asian (00–08)', 'London (08–13)', 'New York (13–17)', 'Late (17–24)'];
const SESSION_SHORT: Record<string, string> = {
  'Asian (00–08)': 'Asian',
  'London (08–13)': 'London',
  'New York (13–17)': 'NY',
  'Late (17–24)': 'Late',
};

function sessionOf(t: Trade): string {
  const h = new Date(t.entryDate).getUTCHours();
  if (h < 8) return 'Asian (00–08)';
  if (h < 13) return 'London (08–13)';
  if (h < 17) return 'New York (13–17)';
  return 'Late (17–24)';
}

const SessionSection: React.FC<{ trades: Trade[]; isR: boolean }> = ({ trades, isR }) => {
  const rows = useMemo(() => {
    const grouped = groupByKey(trades, sessionOf);
    return SESSION_ORDER.map(s => metricsFor(s, grouped.get(s) ?? []));
  }, [trades]);

  const chartData: BarDatum[] = rows.map(r => ({
    ...r,
    shortLabel: SESSION_SHORT[r.label] ?? r.label,
    value: isR ? r.netR : r.netPL,
  }));

  return (
    <Panel label="BY SESSION">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            tickFormatter={v => isR ? `${v}R` : `$${v}`}
            width={isR ? 24 : 34}
          />
          <ReferenceLine y={0} stroke="#1a2028" strokeWidth={1} />
          <Tooltip content={<BarTip isR={isR} />} cursor={{ fill: 'rgba(232,162,61,0.04)' }} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.value >= 0 ? PROFIT_CLR : LOSS_CLR}
                fillOpacity={entry.trades === 0 ? 0.15 : 0.82}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <StatsTable rows={rows} isR={isR} />
    </Panel>
  );
};

// ─── Section 3 · By Symbol ────────────────────────────────────────────────────
const SymbolSection: React.FC<{ trades: Trade[]; isR: boolean }> = ({ trades, isR }) => {
  const [sortKey, setSortKey] = useState<SortKey>('trades');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    const grouped = groupByKey(trades, t => t.asset || 'Unknown');
    return Array.from(grouped.entries()).map(([label, ts]) => metricsFor(label, ts));
  }, [trades]);

  const sorted = useMemo(() => {
    const factor = sortDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av: number = a[sortKey] as number;
      const bv: number = b[sortKey] as number;
      return (av - bv) * factor;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(k); setSortDir('desc'); }
  }

  const netSortKey: SortKey = isR ? 'netR' : 'netPL';

  return (
    <Panel label="BY SYMBOL">
      {rows.length === 0 ? (
        <EmptyState title="No symbol data" description="No trades to display." className="py-6" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="font-mono text-jtp-xs uppercase tracking-[0.4px] text-jtp-textDim">
                <th className="text-left pb-2 font-normal pr-3">Symbol</th>
                <SortTh label="Trades" k="trades" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Win%" k="winRate" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label={isR ? 'Net R' : 'Net P&L'} k={netSortKey} current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Avg R" k="avgR" current={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const netVal = isR ? row.netR : row.netPL;
                return (
                  <tr key={row.label} className="border-t border-jtp-borderSubtle hover:bg-jtp-hover/30 transition-colors">
                    <td className="py-[6px] pr-3 font-mono text-jtp-xs-plus font-medium text-jtp-text">{row.label}</td>
                    <td className="py-[6px] pr-3 text-right font-mono text-jtp-xs-plus text-jtp-textSoft">{row.trades}</td>
                    <td className={`py-[6px] pr-3 text-right font-mono text-jtp-xs-plus ${row.winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                      {row.winRate.toFixed(0)}%
                    </td>
                    <td className={`py-[6px] pr-3 text-right font-mono text-jtp-xs-plus ${netVal >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                      {isR ? fmtR(netVal) : fmtMoney(netVal)}
                    </td>
                    <td className={`py-[6px] text-right font-mono text-jtp-xs-plus ${row.avgR >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                      {fmtR(row.avgR)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

// ─── Section 4 · By Setup / Playbook ─────────────────────────────────────────
const SetupSection: React.FC<{
  trades: Trade[];
  playbooks: Playbook[];
  isR: boolean;
}> = ({ trades, playbooks, isR }) => {
  const [view, setView] = useState<'playbook' | 'setup'>('playbook');
  const [sortKey, setSortKey] = useState<SortKey>('trades');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const playbookNames = useMemo(
    () => new Map(playbooks.map(p => [p.id, p.name])),
    [playbooks],
  );

  const setupMap = useMemo(() => {
    const m = new Map<string, { setupName: string; playbookName: string }>();
    for (const p of playbooks) {
      for (const s of p.setups) {
        m.set(s.id, { setupName: s.name, playbookName: p.name });
      }
    }
    return m;
  }, [playbooks]);

  const rows = useMemo(() => {
    if (view === 'playbook') {
      const grouped = groupByKey(
        trades,
        t => playbookNames.get(t.playbookId) ?? 'Unknown Playbook',
      );
      return Array.from(grouped.entries()).map(([label, ts]) => metricsFor(label, ts));
    }
    const grouped = groupByKey(trades, t => {
      if (t.playbookSetupId) {
        const info = setupMap.get(t.playbookSetupId);
        if (info) return `${info.setupName} · ${info.playbookName}`;
        return `Setup …${t.playbookSetupId.slice(-6)}`;
      }
      return 'No Setup';
    });
    return Array.from(grouped.entries()).map(([label, ts]) => metricsFor(label, ts));
  }, [trades, view, playbookNames, setupMap]);

  const sorted = useMemo(() => {
    const factor = sortDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av: number = a[sortKey] as number;
      const bv: number = b[sortKey] as number;
      return (av - bv) * factor;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(k); setSortDir('desc'); }
  }

  const netSortKey: SortKey = isR ? 'netR' : 'netPL';

  return (
    <Panel
      label="BY SETUP / PLAYBOOK"
      actions={
        <SegmentedControl
          segments={[
            { value: 'playbook' as const, label: 'Playbook' },
            { value: 'setup' as const, label: 'Setup' },
          ]}
          value={view}
          onChange={(v) => setView(v as 'playbook' | 'setup')}
          size="xs"
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="No setup data" description="No trades to display." className="py-6" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="font-mono text-jtp-xs uppercase tracking-[0.4px] text-jtp-textDim">
                <th className="text-left pb-2 font-normal pr-3 capitalize">
                  {view === 'playbook' ? 'Playbook' : 'Setup'}
                </th>
                <SortTh label="Trades" k="trades" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh label="Win%" k="winRate" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortTh
                  label={isR ? 'Net R' : 'Net P&L'}
                  k={netSortKey}
                  current={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh label="Avg R" k="avgR" current={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const netVal = isR ? row.netR : row.netPL;
                return (
                  <tr
                    key={row.label}
                    className="border-t border-jtp-borderSubtle hover:bg-jtp-hover/30 transition-colors"
                  >
                    <td className="py-[6px] pr-3 font-mono text-jtp-xs-plus text-jtp-text truncate max-w-[200px]">
                      {row.label}
                    </td>
                    <td className="py-[6px] pr-3 text-right font-mono text-jtp-xs-plus text-jtp-textSoft">
                      {row.trades}
                    </td>
                    <td className={`py-[6px] pr-3 text-right font-mono text-jtp-xs-plus ${row.winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                      {row.winRate.toFixed(0)}%
                    </td>
                    <td className={`py-[6px] pr-3 text-right font-mono text-jtp-xs-plus ${netVal >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                      {isR ? fmtR(netVal) : fmtMoney(netVal)}
                    </td>
                    <td className={`py-[6px] text-right font-mono text-jtp-xs-plus ${row.avgR >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
                      {fmtR(row.avgR)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

// ─── Section 5 · Long vs Short ────────────────────────────────────────────────
const DirStatRow: React.FC<{ label: string; value: string; positive: boolean }> = ({
  label,
  value,
  positive,
}) => (
  <div className="flex items-center justify-between">
    <span className="font-mono text-jtp-xs text-jtp-textDim">{label}</span>
    <span
      className={`font-mono text-jtp-xs font-semibold ${
        value === '—' ? 'text-jtp-textFaint' : positive ? 'text-jtp-profit' : 'text-jtp-loss'
      }`}
    >
      {value}
    </span>
  </div>
);

const DirectionSection: React.FC<{ trades: Trade[]; isR: boolean }> = ({ trades, isR }) => {
  const long = useMemo(
    () => metricsFor('Long', trades.filter(t => t.direction === Direction.Buy)),
    [trades],
  );
  const short = useMemo(
    () => metricsFor('Short', trades.filter(t => t.direction === Direction.Sell)),
    [trades],
  );

  return (
    <Panel label="LONG VS SHORT">
      <div className="grid grid-cols-2 gap-3">
        {[long, short].map(m => {
          const isLong = m.label === 'Long';
          const netVal = isR ? m.netR : m.netPL;
          const exVal = isR ? m.expectancyR : m.expectancy;
          const pfVal = isR ? m.profitFactorR : m.profitFactor;
          const hasData = m.trades > 0;

          return (
            <div
              key={m.label}
              className={`border rounded-[2px] px-4 py-[14px] flex flex-col gap-[8px] ${
                isLong
                  ? 'border-jtp-profit/20 bg-[rgba(61,220,132,0.04)]'
                  : 'border-jtp-loss/20 bg-[rgba(255,91,82,0.04)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-[2px]">
                <div
                  className={`w-[6px] h-[6px] rounded-full shrink-0 ${
                    isLong ? 'bg-jtp-profit' : 'bg-jtp-loss'
                  }`}
                />
                <span className="font-mono text-jtp-xs-plus font-semibold text-jtp-text">{m.label}</span>
                <span className="font-mono text-jtp-xs text-jtp-textFaint ml-auto">
                  {m.trades} trade{m.trades !== 1 ? 's' : ''}
                </span>
              </div>
              <DirStatRow
                label="Win Rate"
                value={hasData ? `${m.winRate.toFixed(0)}%` : '—'}
                positive={m.winRate >= 50}
              />
              <DirStatRow
                label={isR ? 'Net R' : 'Net P&L'}
                value={hasData ? (isR ? fmtR(netVal) : fmtMoney(netVal)) : '—'}
                positive={netVal >= 0}
              />
              <DirStatRow
                label="Avg R"
                value={hasData ? fmtR(m.avgR) : '—'}
                positive={m.avgR >= 0}
              />
              <DirStatRow
                label="Expectancy"
                value={hasData ? (isR ? fmtR(exVal) : fmtMoney(exVal, false)) : '—'}
                positive={exVal >= 0}
              />
              <DirStatRow
                label="Profit Factor"
                value={hasData ? fmtPF(pfVal) : '—'}
                positive={pfVal >= 1}
              />
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

// ─── Section 6 · Drawdown ─────────────────────────────────────────────────────
const DdTip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: DdPoint }>;
  isR: boolean;
}> = ({ active, payload, isR }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const val = isR ? d.ddR : d.dd;
  return (
    <div className="bg-jtp-shell border border-jtp-borderStrong rounded-[2px] px-3 py-2 text-jtp-xs shadow-jtp-drawer">
      <div className="text-jtp-textDim font-mono mb-[2px]">
        Trade #{d.idx} · {d.dateLabel}
      </div>
      <div className={`font-mono font-semibold ${val < 0 ? 'text-jtp-loss' : 'text-jtp-textSoft'}`}>
        {isR ? fmtR(val) : fmtMoney(val, false)}
      </div>
    </div>
  );
};

const DrawdownSection: React.FC<{ trades: Trade[]; isR: boolean }> = ({ trades, isR }) => {
  const result = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) =>
        new Date(a.exitDate ?? a.entryDate).getTime() -
        new Date(b.exitDate ?? b.entryDate).getTime(),
    );

    let eq = 0, r = 0, peak = 0, peakR = 0, minDd = 0, minDdR = 0;
    const pts: DdPoint[] = sorted.map((t, i) => {
      eq += netOf(t);
      r += t.realisedR ?? 0;
      if (eq > peak) peak = eq;
      if (r > peakR) peakR = r;
      const dd = eq - peak;
      const ddR = r - peakR;
      if (dd < minDd) minDd = dd;
      if (ddR < minDdR) minDdR = ddR;
      return {
        idx: i + 1,
        dateLabel: new Date(t.exitDate ?? t.entryDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        }),
        dd,
        ddR,
      };
    });

    return { points: pts, maxDd: minDd, maxDdR: minDdR };
  }, [trades]);

  const { points, maxDd, maxDdR } = result;
  const ddVal = isR ? maxDdR : maxDd;
  const dataKey = isR ? 'ddR' : 'dd';
  const hasDrawdown = ddVal < 0;

  return (
    <Panel
      label="DRAWDOWN"
      actions={
        hasDrawdown ? (
          <div className="flex items-center gap-2">
            <span className="jtp-label">MAX DD</span>
            <span className="font-mono font-bold text-jtp-xs-plus text-jtp-loss">
              {isR ? fmtR(ddVal) : fmtMoney(ddVal, false)}
            </span>
          </div>
        ) : undefined
      }
    >
      <p className="text-jtp-md text-jtp-textFaint mb-3">
        Running equity vs running peak
      </p>

      {points.length === 0 ? (
        <EmptyState
          title="No drawdown data"
          description="Close some trades to see drawdown."
          className="py-6"
        />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LOSS_CLR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={LOSS_CLR} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="idx"
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
              tickFormatter={v => `#${v}`}
              minTickGap={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
              tickFormatter={v => (isR ? `${v}R` : `$${v}`)}
              width={isR ? 24 : 34}
            />
            <ReferenceLine y={0} stroke="#1a2028" strokeWidth={1} />
            <Tooltip
              content={<DdTip isR={isR} />}
              cursor={{ stroke: LOSS_CLR, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={LOSS_CLR}
              strokeWidth={1.5}
              fill="url(#ddFill)"
              dot={false}
              activeDot={{ r: 3, fill: LOSS_CLR, stroke: '#0f1216', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
};

// ─── Section 7 · MAE / MFE ────────────────────────────────────────────────────
const MaeMfeTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-jtp-shell border border-jtp-borderStrong rounded-[2px] px-3 py-2 text-jtp-xs shadow-jtp-drawer">
      <div className={`font-mono font-semibold mb-1 ${d.win ? 'text-jtp-profit' : 'text-jtp-loss'}`}>
        {d.win ? 'Win' : 'Loss'}
      </div>
      <div className="text-jtp-textDim font-mono">MFE {d.x.toFixed(2)}R</div>
      <div className="text-jtp-textDim font-mono">MAE {d.y.toFixed(2)}R</div>
    </div>
  );
};

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
    <Panel label="MAE / MFE">
      <p className="text-jtp-md text-jtp-textFaint mb-3">
        Adverse vs favourable excursion (R)
      </p>

      {points.length === 0 ? (
        <EmptyState
          title="No excursion data"
          description="No MAE/MFE data captured yet."
          className="py-6"
        />
      ) : (
        <>
          <div className="flex gap-4 mb-[10px] text-jtp-xs-plus text-jtp-textDim">
            <span className="flex items-center gap-[5px]">
              <span className="inline-block w-2 h-2 rounded-full bg-jtp-profit" />
              <span className="font-mono">Win</span>
            </span>
            <span className="flex items-center gap-[5px]">
              <span className="inline-block w-2 h-2 rounded-full bg-jtp-loss" />
              <span className="font-mono">Loss</span>
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
                  fill: '#69727c',
                  fontSize: 9,
                  fontFamily: '"JetBrains Mono"',
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
                  fill: '#69727c',
                  fontSize: 9,
                  fontFamily: '"JetBrains Mono"',
                }}
              />
              <ZAxis range={[28, 28]} />
              <Tooltip
                content={<MaeMfeTooltip />}
                cursor={{ strokeDasharray: '3 3', stroke: '#323942' }}
              />
              <Scatter
                data={winsData}
                fill={PROFIT_CLR}
                fillOpacity={0.75}
                isAnimationActive={false}
              />
              <Scatter
                data={lossesData}
                fill={LOSS_CLR}
                fillOpacity={0.75}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </>
      )}
    </Panel>
  );
};

// ─── Section 8 · Adherence Impact ────────────────────────────────────────────
const AdherencePanel: React.FC = () => {
  // TODO: When a boolean `checklistFollowed` field is added to the Trade model and
  // returned by the API, compute real per-group stats here:
  //   followed = closedTrades.filter(t => t.checklistFollowed === true)
  //   broken   = closedTrades.filter(t => t.checklistFollowed === false)
  return (
    <Panel label="ADHERENCE IMPACT">
      <div className="flex gap-3">
        {(
          [
            { label: 'Checklist followed', accentClass: 'bg-jtp-profit' },
            { label: 'Checklist broken', accentClass: 'bg-jtp-loss' },
          ] as const
        ).map(({ label, accentClass }) => (
          <div
            key={label}
            className="flex-1 border border-jtp-borderSubtle rounded-[2px] px-4 py-6 flex flex-col items-center gap-[10px] opacity-40"
          >
            <div className={`w-[6px] h-[6px] rounded-full ${accentClass}`} />
            <div className="font-mono text-jtp-xs-plus text-jtp-textMuted text-center">
              {label}
            </div>
            <div className="text-jtp-md text-jtp-textFaint text-center leading-snug">
              No checklist-adherence data yet
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

// ─── Root export ──────────────────────────────────────────────────────────────
interface DeeperReportsProps {
  trades: Trade[];
  playbooks: Playbook[];
  isR: boolean;
  onIsRChange: (v: boolean) => void;
}

const DeeperReports: React.FC<DeeperReportsProps> = ({ trades, playbooks, isR, onIsRChange }) => {
  return (
    <section className="space-y-4">
      {/* Section header + global $/R toggle */}
      <div className="flex items-center justify-between">
        <span className="jtp-label tracking-[0.12em]">
          <span style={{ color: '#e8a23d', marginRight: '6px' }}>▸</span>
          BREAKDOWN ANALYTICS
        </span>
        <SegmentedControl
          segments={[
            { value: '$' as const, label: '$' },
            { value: 'R' as const, label: 'R' },
          ]}
          value={isR ? 'R' : '$'}
          onChange={v => onIsRChange(v === 'R')}
        />
      </div>

      {/* Row 1: Day of Week + Session */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DowSection trades={trades} isR={isR} />
        <SessionSection trades={trades} isR={isR} />
      </div>

      {/* Row 2: Symbol + Setup / Playbook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SymbolSection trades={trades} isR={isR} />
        <SetupSection trades={trades} playbooks={playbooks} isR={isR} />
      </div>

      {/* Row 3: Long vs Short + Drawdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DirectionSection trades={trades} isR={isR} />
        <DrawdownSection trades={trades} isR={isR} />
      </div>

      {/* Row 4: MAE/MFE + Adherence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MaeMfePanel trades={trades} />
        <AdherencePanel />
      </div>
    </section>
  );
};

export default DeeperReports;
