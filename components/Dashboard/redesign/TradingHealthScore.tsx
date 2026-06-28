import React, { useMemo } from 'react';
import { Trade, TradeResult } from '../../../types';
import { Panel } from '../../ui';

interface TradingHealthScoreProps {
  closedTrades: Trade[];
}

interface SubMetric {
  key: string;
  label: string;
  score: number;   // 0-100
  display: string;
}

interface ComputedHealth {
  score: number;
  components: SubMetric[];
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function computeHealth(trades: Trade[]): ComputedHealth {
  const noData: ComputedHealth = {
    score: 0,
    components: [
      { key: 'winRate',      label: 'Win Rate',          score: 0, display: '—' },
      { key: 'pf',           label: 'Profit Factor',     score: 0, display: '—' },
      { key: 'wl',           label: 'Avg Win / Avg Loss', score: 0, display: '—' },
      { key: 'consistency',  label: 'Consistency',       score: 0, display: '—' },
      { key: 'maxDD',        label: 'Max Drawdown',      score: 0, display: '—' },
      { key: 'avgR',         label: 'Avg Realised R',    score: 0, display: '—' },
    ],
  };
  if (trades.length === 0) return noData;

  const wins   = trades.filter(t => t.result === TradeResult.Win);
  const losses = trades.filter(t => t.result === TradeResult.Loss);
  const ratable = wins.length + losses.length;
  const netPL  = (t: Trade) => (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);

  // 1. Win Rate
  const winRatePct  = ratable > 0 ? (wins.length / ratable) * 100 : 50;
  const winRateScore = Math.round(clamp(winRatePct));

  // 2. Profit Factor
  const grossProfit = wins.reduce((s, t) => s + Math.max(0, netPL(t)), 0);
  const grossLoss   = losses.reduce((s, t) => s + Math.abs(Math.min(0, netPL(t))), 0);
  const pf          = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 1;
  const pfScore     = pf === Infinity ? 100 : Math.round(clamp((Math.min(pf, 3) / 3) * 100));
  const pfDisplay   = pf === Infinity ? '∞' : pf.toFixed(2);

  // 3. Avg Win / Avg Loss
  const avgWin  = wins.length   > 0 ? grossProfit / wins.length   : 0;
  const avgLoss = losses.length > 0 ? grossLoss   / losses.length : 0;
  const wlRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3 : 1;
  const wlScore = Math.round(clamp((Math.min(wlRatio, 3) / 3) * 100));
  const wlDisplay = avgLoss > 0 ? wlRatio.toFixed(2) : avgWin > 0 ? '∞' : '—';

  // 4. Consistency (CV of daily P&L)
  const dailyMap: Record<string, number> = {};
  for (const t of trades) {
    const key = new Date(t.exitDate ?? t.entryDate).toDateString();
    dailyMap[key] = (dailyMap[key] ?? 0) + netPL(t);
  }
  const days = Object.values(dailyMap);
  let consistencyScore = 50;
  if (days.length >= 2) {
    const mean   = days.reduce((s, v) => s + v, 0) / days.length;
    const stdDev = Math.sqrt(days.reduce((s, v) => s + (v - mean) ** 2, 0) / days.length);
    const absMean = Math.abs(mean);
    const cv = absMean > 0.01 ? stdDev / absMean : stdDev > 0 ? 3 : 0;
    consistencyScore = Math.round(clamp(100 - (Math.min(cv, 3) / 3) * 100));
  } else {
    consistencyScore = 65;
  }

  // 5. Max Drawdown
  const sorted = [...trades].sort(
    (a, b) =>
      new Date(a.exitDate ?? a.entryDate).getTime() -
      new Date(b.exitDate ?? b.entryDate).getTime(),
  );
  let equity = 0, peakEquity = 0, maxDDPct = 0;
  for (const t of sorted) {
    equity += netPL(t);
    if (equity > peakEquity) peakEquity = equity;
    if (peakEquity > 0) {
      const dd = ((peakEquity - equity) / peakEquity) * 100;
      if (dd > maxDDPct) maxDDPct = dd;
    }
  }
  const displayDDPct = Math.min(maxDDPct, 100);
  const ddScore      = Math.round(clamp(100 - (displayDDPct / 30) * 100));

  // 6. Avg Realised R
  const tradesWithR = trades.filter(t => t.realisedR != null);
  let avgRScore = 40, avgRVal = 0;
  if (tradesWithR.length > 0) {
    avgRVal   = tradesWithR.reduce((s, t) => s + (t.realisedR ?? 0), 0) / tradesWithR.length;
    avgRScore = Math.round(clamp(((avgRVal + 1) / 2.5) * 100));
  }
  const avgRDisplay = tradesWithR.length > 0 ? `${avgRVal >= 0 ? '+' : ''}${avgRVal.toFixed(2)}R` : '—';

  const score = Math.round(
    winRateScore     * 0.20 +
    pfScore          * 0.20 +
    wlScore          * 0.15 +
    consistencyScore * 0.15 +
    ddScore          * 0.15 +
    avgRScore        * 0.15,
  );

  return {
    score: clamp(score),
    components: [
      { key: 'winRate',      label: 'Win Rate',          score: winRateScore,     display: `${winRatePct.toFixed(0)}%` },
      { key: 'pf',           label: 'Profit Factor',     score: pfScore,          display: pfDisplay },
      { key: 'wl',           label: 'Avg Win / Loss',    score: wlScore,          display: wlDisplay },
      { key: 'consistency',  label: 'Consistency',       score: consistencyScore, display: `${consistencyScore}/100` },
      { key: 'maxDD',        label: 'Max Drawdown',      score: ddScore,          display: `${displayDDPct.toFixed(1)}%` },
      { key: 'avgR',         label: 'Avg Realised R',    score: avgRScore,        display: avgRDisplay },
    ],
  };
}

function ringColor(score: number): string {
  if (score >= 70) return '#4cc38a'; // profit
  if (score >= 40) return '#d9a23b'; // warning
  return '#e5635f';                  // loss
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

const RADIUS      = 44;
const STROKE      = 6;
const CX          = 56;
const CY          = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TradingHealthScore: React.FC<TradingHealthScoreProps> = ({ closedTrades }) => {
  const { score, components } = useMemo(
    () => computeHealth(closedTrades),
    [closedTrades],
  );

  const hasData = closedTrades.length > 0;
  const color   = hasData ? ringColor(score) : '#1c2128';
  const offset  = hasData ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE;

  const footnote = (
    <span
      className="font-mono text-jtp-2xs text-jtp-textDim"
      style={{ letterSpacing: '0.02em' }}
    >
      WR 20% · PF 20% · W/L 15% · CONS 15% · DD 15% · R 15%
    </span>
  );

  return (
    <Panel label="TRADING HEALTH" actions={footnote} className="h-full">
      <div className="flex flex-col sm:flex-row items-start gap-5">

        {/* ── Ring gauge ── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-[6px]">
          <svg
            width={112}
            height={112}
            viewBox="0 0 112 112"
            aria-label={`Trading health score: ${hasData ? score : 'no data'} out of 100`}
          >
            {/* Track */}
            <circle
              cx={CX} cy={CY} r={RADIUS}
              fill="none"
              stroke="#1c2128"
              strokeWidth={STROKE}
            />
            {/* Progress */}
            <circle
              cx={CX} cy={CY} r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1), stroke 0.3s ease' }}
            />
            {/* Score number */}
            {hasData ? (
              <>
                <text
                  x={CX} y={51}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#e8eaed"
                  fontSize="24"
                  fontWeight="700"
                  fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
                >
                  {score}
                </text>
                <text
                  x={CX} y={70}
                  textAnchor="middle"
                  fill="#5b6370"
                  fontSize="10"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  /100
                </text>
              </>
            ) : (
              <text
                x={CX} y={CY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#5b6370"
                fontSize="11"
                fontFamily="Inter, sans-serif"
              >
                No data
              </text>
            )}
          </svg>

          {/* Score band label */}
          {hasData && (
            <span
              className="font-mono text-jtp-xs font-semibold px-[9px] py-[3px] rounded-jtp-sm"
              style={{ color, backgroundColor: `${color}1a` }}
            >
              {scoreLabel(score)}
            </span>
          )}
        </div>

        {/* ── Sub-metric bars (single column so labels are never clipped) ── */}
        <div className="flex-1 grid grid-cols-1 gap-y-[11px] w-full pt-[2px]">
          {components.map(c => (
            <div key={c.key}>
              <div className="flex items-baseline justify-between gap-3 mb-[5px]">
                <span className="text-jtp-md text-jtp-textDim whitespace-nowrap">{c.label}</span>
                <span
                  className="font-mono text-jtp-md text-jtp-textMuted flex-shrink-0"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {c.display}
                </span>
              </div>
              <div
                className="h-[3px] rounded-full overflow-hidden"
                style={{ backgroundColor: '#1c2128' }}
                role="progressbar"
                aria-valuenow={c.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${c.label}: ${c.score}/100`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width:           `${c.score}%`,
                    backgroundColor: c.score >= 70 ? '#4cc38a' : c.score >= 40 ? '#d9a23b' : '#e5635f',
                    transition:      'width 0.55s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

export default TradingHealthScore;
