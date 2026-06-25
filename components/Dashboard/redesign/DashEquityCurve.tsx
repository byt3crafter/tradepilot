import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Trade, BrokerAccount } from '../../../types';

interface DashEquityCurveProps {
  closedTrades: Trade[];
  account: BrokerAccount | null;
}

interface ChartPoint {
  date: string;
  equity: number;
  runningR: number;
  drawdown: number;
  drawdownR: number;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, isRMode }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint | undefined;
  if (!d) return null;
  return (
    <div className="bg-jtp-shell border border-jtp-borderStrong rounded-jtp-2xl px-3 py-2 text-jtp-xs shadow-jtp-drawer">
      <div className="text-jtp-textDim font-mono mb-1">{label}</div>
      {isRMode ? (
        <div className="text-jtp-text font-mono font-semibold">
          {d.runningR >= 0 ? '+' : ''}{d.runningR.toFixed(2)}R
        </div>
      ) : (
        <div className="text-jtp-text font-mono font-semibold">
          {d.equity >= 0 ? '+' : ''}${Math.abs(d.equity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
};

const DashEquityCurve: React.FC<DashEquityCurveProps> = ({ closedTrades, account }) => {
  const [isRMode, setIsRMode] = useState(false);

  const data = useMemo<ChartPoint[]>(() => {
    const sorted = [...closedTrades]
      .filter(t => t.result && t.exitDate)
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());

    let equity = 0;
    let runningR = 0;
    let maxEquity = 0;
    let maxR = 0;

    return sorted.map(t => {
      const pl = (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
      // Use server-computed realisedR so the R curve matches the Net-R stat card
      const r = t.realisedR ?? 0;

      equity += pl;
      runningR += r;
      maxEquity = Math.max(maxEquity, equity);
      maxR = Math.max(maxR, runningR);

      const drawdown = Math.max(0, maxEquity - equity);
      const drawdownR = Math.max(0, maxR - runningR);

      const date = new Date(t.exitDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date, equity, runningR, drawdown, drawdownR };
    });
  }, [closedTrades]);

  const profitTarget = account?.objectives?.isEnabled
    ? (account.objectives.profitTarget ?? null)
    : null;
  const maxLoss = account?.objectives?.isEnabled
    ? (account.objectives.maxLoss ?? null)
    : null;

  // Y domain with a bit of padding
  const allValues = isRMode ? data.map(d => d.runningR) : data.map(d => d.equity);
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 0;
  const pad = Math.abs(maxVal - minVal) * 0.08 || 100;
  const yMin = Math.floor(minVal - pad);
  const yMax = Math.ceil(maxVal + pad);

  const formatY = (v: number) =>
    isRMode
      ? `${v > 0 ? '+' : ''}${v.toFixed(1)}R`
      : `$${v >= 1000 || v <= -1000
          ? `${(v / 1000).toFixed(1)}k`
          : v.toFixed(0)}`;

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-[18px] py-[15px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[6px]">
        <div className="text-jtp-base-minus font-semibold text-jtp-text" style={{ letterSpacing: '0.2px' }}>
          Equity Curve
        </div>
        {/* $/R toggle */}
        <div className="flex border border-jtp-borderStrong rounded-jtp-xl overflow-hidden">
          <button
            onClick={() => setIsRMode(false)}
            className={`px-3 py-[5px] text-jtp-sm font-semibold font-mono border-none cursor-pointer transition-colors ${
              !isRMode
                ? 'bg-jtp-blue text-white'
                : 'bg-transparent text-jtp-textDim hover:text-jtp-textMuted'
            }`}
          >
            $
          </button>
          <button
            onClick={() => setIsRMode(true)}
            className={`px-3 py-[5px] text-jtp-sm font-semibold font-mono border-l border-jtp-borderStrong cursor-pointer transition-colors ${
              isRMode
                ? 'bg-jtp-blue text-white'
                : 'bg-transparent text-jtp-textDim hover:text-jtp-textMuted'
            }`}
          >
            R
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-[10px] text-jtp-xs-plus text-jtp-textDim">
        <span className="flex items-center gap-[5px]">
          <span className="inline-block w-[14px] h-[2px] bg-jtp-blue" />
          Equity
        </span>
        {!isRMode && profitTarget && (
          <span className="flex items-center gap-[5px]">
            <span className="inline-block w-[14px] h-[2px] bg-jtp-profit opacity-60" />
            Profit target +${profitTarget.toLocaleString()}
          </span>
        )}
        {!isRMode && maxLoss && (
          <span className="flex items-center gap-[5px]">
            <span className="inline-block w-[14px] h-[2px] bg-jtp-loss opacity-60" />
            Max loss ${maxLoss.toLocaleString()}
          </span>
        )}
        {!isRMode && (
          <span className="flex items-center gap-[5px]">
            <span className="inline-block w-[10px] h-[8px] bg-[rgba(229,99,95,.18)]" />
            Drawdown
          </span>
        )}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-jtp-textFaint text-jtp-sm">
          No closed trades yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5b6370', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
              minTickGap={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5b6370', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
              tickFormatter={formatY}
              domain={[yMin, yMax]}
              width={54}
            />
            <Tooltip
              content={<CustomTooltip isRMode={isRMode} />}
              cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {/* Drawdown area ($ mode only) */}
            {!isRMode && (
              <Area
                type="monotone"
                dataKey="drawdown"
                fill="rgba(229,99,95,0.18)"
                stroke="none"
                baseValue={0}
                isAnimationActive={false}
              />
            )}

            {/* Profit target line ($ mode) */}
            {!isRMode && profitTarget && (
              <ReferenceLine
                y={profitTarget}
                stroke="#4cc38a"
                strokeDasharray="5 4"
                strokeOpacity={0.6}
                strokeWidth={1}
              />
            )}

            {/* Max loss line ($ mode) */}
            {!isRMode && maxLoss && (
              <ReferenceLine
                y={maxLoss}
                stroke="#e5635f"
                strokeDasharray="5 4"
                strokeOpacity={0.6}
                strokeWidth={1}
              />
            )}

            {/* Zero line (R mode) */}
            {isRMode && (
              <ReferenceLine
                y={0}
                stroke="#323942"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}

            {/* Main equity / R line */}
            <Line
              type="monotone"
              dataKey={isRMode ? 'runningR' : 'equity'}
              stroke="#5b8def"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#5b8def', stroke: '#0f1216', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DashEquityCurve;
