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
  /** Unix timestamp — drives the time-scale XAxis so ticks can't duplicate */
  dateMs: number;
  /** Human-readable label shown in the tooltip */
  date: string;
  /** Cumulative net P&L (profitLoss − commission − swap) */
  equity: number;
  /** Running maximum of equity — always ≥ equity */
  peak: number;
  /** Cumulative realised R */
  runningR: number;
  /** Running maximum of runningR */
  peakR: number;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------
const CustomTooltip: React.FC<any> = ({ active, payload, isRMode }) => {
  if (!active || !payload?.length) return null;
  // All series share the same ChartPoint — read from whichever is first.
  const d = payload[0]?.payload as ChartPoint | undefined;
  if (!d) return null;

  const ddDollar = d.equity - d.peak;   // ≤ 0 when underwater
  const ddR      = d.runningR - d.peakR; // ≤ 0 when underwater

  return (
    <div
      className="bg-jtp-shell border border-jtp-borderStrong rounded-jtp-2xl px-3 py-2 shadow-jtp-drawer"
      style={{ minWidth: 128 }}
    >
      <div className="text-jtp-textDim font-mono text-jtp-xs mb-1">{d.date}</div>
      {isRMode ? (
        <>
          <div className="text-jtp-text font-mono font-semibold text-jtp-xs">
            {d.runningR >= 0 ? '+' : ''}{d.runningR.toFixed(2)}R
          </div>
          {ddR < -0.01 && (
            <div className="text-jtp-loss font-mono text-jtp-xs mt-[2px]">
              DD {ddR.toFixed(2)}R
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-jtp-text font-mono font-semibold text-jtp-xs">
            {d.equity >= 0 ? '+' : ''}${Math.abs(d.equity).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          {ddDollar < -0.01 && (
            <div className="text-jtp-loss font-mono text-jtp-xs mt-[2px]">
              DD ${Math.abs(ddDollar).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const DashEquityCurve: React.FC<DashEquityCurveProps> = ({
  closedTrades,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  account: _account,
}) => {
  const [isRMode, setIsRMode] = useState(false);

  // One point per closed trade, sorted exit-date → entry-date
  const data = useMemo<ChartPoint[]>(() => {
    const sorted = [...closedTrades]
      .filter(t => t.result && t.exitDate)
      .sort((a, b) => {
        const diff = new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime();
        return diff !== 0
          ? diff
          : new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      });

    let equity  = 0;
    let runningR = 0;
    let peak    = 0;   // running max, starts at 0 (initial balance reference)
    let peakR   = 0;

    return sorted.map(t => {
      equity   += (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
      runningR += t.realisedR ?? 0;
      peak     = Math.max(peak, equity);
      peakR    = Math.max(peakR, runningR);

      return {
        dateMs  : new Date(t.exitDate!).getTime(),
        date    : new Date(t.exitDate!).toLocaleDateString('en-US', {
          month: 'short',
          day  : 'numeric',
        }),
        equity,
        peak,
        runningR,
        peakR,
      };
    });
  }, [closedTrades]);

  // Y domain — include both equity and peak values so the drawdown region is never clipped.
  const { yMin, yMax } = useMemo(() => {
    if (data.length === 0) return { yMin: -100, yMax: 100 };
    const vals = isRMode
      ? [...data.map(d => d.runningR), ...data.map(d => d.peakR)]
      : [...data.map(d => d.equity),   ...data.map(d => d.peak)];
    const lo  = Math.min(...vals);
    const hi  = Math.max(...vals);
    const pad = Math.max(Math.abs(hi - lo) * 0.12, 10);
    return { yMin: lo - pad, yMax: hi + pad };
  }, [data, isRMode]);

  /**
   * baseValue must be ≤ every data value so the "fill-between" cover trick
   * works correctly even when equity is negative:
   *
   *   Layer 1 — red Area(peak,   baseValue): fills from peak down to chart floor
   *   Layer 2 — panel Area(equity, baseValue): fills from equity down, covering red below equity
   *   Layer 3 — blue glow Area(equity, baseValue): decorative gradient on top of cover
   *   Layer 4 — blue Line(equity): the actual curve
   *
   * Net visual: red is only visible between the peak line and the equity line —
   * exactly the drawdown "underwater" region.
   */
  const baseValue = yMin;

  // Active dataKeys for the current mode
  const eqKey = isRMode ? 'runningR' : 'equity';
  const pkKey = isRMode ? 'peakR'    : 'peak';

  const formatY = (v: number): string => {
    if (isRMode) return `${v > 0 ? '+' : ''}${v.toFixed(1)}R`;
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-[18px] py-[15px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-[6px]">
        <div
          className="text-jtp-base-minus font-semibold text-jtp-text"
          style={{ letterSpacing: '0.2px' }}
        >
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

      {/* ── Legend ── */}
      <div className="flex gap-4 mb-[10px] text-jtp-xs-plus text-jtp-textDim">
        <span className="flex items-center gap-[5px]">
          <span className="inline-block w-[14px] h-[2px] bg-jtp-blue" />
          Equity
        </span>
        <span className="flex items-center gap-[5px]">
          <span
            className="inline-block w-[10px] h-[8px] rounded-sm"
            style={{ background: 'rgba(229,99,95,0.25)' }}
          />
          Drawdown
        </span>
      </div>

      {/* ── Chart ── */}
      {data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-jtp-textFaint text-jtp-sm">
          No closed trades yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {/* Subtle blue glow below the equity line — purely decorative */}
              <linearGradient id="jtpEquityGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#5b8def" stopOpacity={0.13} />
                <stop offset="100%" stopColor="#5b8def" stopOpacity={0}    />
              </linearGradient>
            </defs>

            {/* ── X axis — numeric time scale → no duplicate labels ── */}
            <XAxis
              dataKey="dateMs"
              type="number"
              scale="time"
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5b6370', fontSize: 10, fontFamily: '"IBM Plex Mono"' }}
              tickFormatter={(v: number) =>
                new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
              tickCount={6}
              minTickGap={30}
            />

            {/* ── Y axis — auto-scaled to data range ── */}
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
              cursor={{
                stroke       : 'rgba(255,255,255,0.08)',
                strokeWidth  : 1,
                strokeDasharray: '4 4',
              }}
            />

            {/* Zero reference line — subtle orientation guide */}
            <ReferenceLine
              y={0}
              stroke="#1c2128"
              strokeDasharray="4 4"
              strokeWidth={1}
            />

            {/*
             * ── Drawdown fill (fill-between trick) ──────────────────────
             *
             * Layer 1 — red from peak downward
             *   Covers the full region [baseValue, peak] in red.
             */}
            <Area
              type="linear"
              dataKey={pkKey}
              fill="rgba(229,99,95,0.18)"
              stroke="none"
              baseValue={baseValue}
              isAnimationActive={false}
              legendType="none"
              activeDot={false}
              dot={false}
            />

            {/*
             * Layer 2 — solid panel cover from equity downward
             *   Covers [baseValue, equity] with the panel background, hiding the
             *   red in that region. Red remains visible only between peak and equity.
             */}
            <Area
              type="linear"
              dataKey={eqKey}
              fill="#0f1216"
              stroke="none"
              baseValue={baseValue}
              isAnimationActive={false}
              legendType="none"
              activeDot={false}
              dot={false}
            />

            {/*
             * Layer 3 — blue glow on top of the cover
             *   Semi-transparent gradient; adds visual depth below the equity line.
             */}
            <Area
              type="linear"
              dataKey={eqKey}
              fill="url(#jtpEquityGlow)"
              stroke="none"
              baseValue={baseValue}
              isAnimationActive={false}
              legendType="none"
              activeDot={false}
              dot={false}
            />

            {/* ── Main equity / R line ── */}
            <Line
              type="linear"
              dataKey={eqKey}
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
