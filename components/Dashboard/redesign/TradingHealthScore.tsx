import React, { useMemo } from 'react';
import { Trade, TradeResult } from '../../../types';

interface TradingHealthScoreProps {
  closedTrades: Trade[];
}

interface SubMetric {
  key: string;
  label: string;
  score: number;   // 0-100
  display: string; // human-readable raw value
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

  const netPL = (t: Trade) => (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);

  // ── 1. Win Rate ────────────────────────────────────────────────────────
  const winRatePct = ratable > 0 ? (wins.length / ratable) * 100 : 50;
  const winRateScore = Math.round(clamp(winRatePct));

  // ── 2. Profit Factor ───────────────────────────────────────────────────
  const grossProfit = wins.reduce((s, t) => s + Math.max(0, netPL(t)), 0);
  const grossLoss   = losses.reduce((s, t) => s + Math.abs(Math.min(0, netPL(t))), 0);
  const pf =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
        ? Infinity
        : 1; // all breakeven → neutral
  // PF ≥ 3 → 100, PF = 1 → 33, PF = 0 → 0
  const pfScore = pf === Infinity ? 100 : Math.round(clamp((Math.min(pf, 3) / 3) * 100));
  const pfDisplay = pf === Infinity ? '∞' : pf.toFixed(2);

  // ── 3. Avg Win / Avg Loss ratio ────────────────────────────────────────
  const avgWin  = wins.length   > 0 ? grossProfit / wins.length   : 0;
  const avgLoss = losses.length > 0 ? grossLoss   / losses.length : 0;
  const wlRatio =
    avgLoss > 0
      ? avgWin / avgLoss
      : avgWin > 0
        ? 3   // no losses — cap at top of scale
        : 1;  // neutral
  const wlScore = Math.round(clamp((Math.min(wlRatio, 3) / 3) * 100));
  const wlDisplay = avgLoss > 0 ? wlRatio.toFixed(2) : avgWin > 0 ? '∞' : '—';

  // ── 4. Consistency (CV of daily P&L) ──────────────────────────────────
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
    // Coefficient of variation — lower is more consistent
    const cv = absMean > 0.01 ? stdDev / absMean : (stdDev > 0 ? 3 : 0);
    consistencyScore = Math.round(clamp(100 - (Math.min(cv, 3) / 3) * 100));
  } else {
    // Single day or single trade — not enough to penalise
    consistencyScore = 65;
  }

  // ── 5. Max Drawdown (% of running peak equity, smaller = better) ───────
  const sorted = [...trades].sort(
    (a, b) => new Date(a.exitDate ?? a.entryDate).getTime() - new Date(b.exitDate ?? b.entryDate).getTime(),
  );
  let equity = 0;
  let peakEquity = 0;
  let maxDDPct = 0;
  for (const t of sorted) {
    equity += netPL(t);
    if (equity > peakEquity) peakEquity = equity;
    if (peakEquity > 0) {
      const dd = ((peakEquity - equity) / peakEquity) * 100;
      if (dd > maxDDPct) maxDDPct = dd;
    }
  }
  // Clamp display to 100% — values above 100% are artefacts of a tiny early peak
  const displayDDPct = Math.min(maxDDPct, 100);
  // 0% DD → 100, 30%+ DD → 0
  const ddScore = Math.round(clamp(100 - (displayDDPct / 30) * 100));

  // ── 6. Avg Realised R ──────────────────────────────────────────────────
  const tradesWithR = trades.filter(t => t.realisedR != null);
  let avgRScore = 40;
  let avgRVal = 0;
  if (tradesWithR.length > 0) {
    avgRVal = tradesWithR.reduce((s, t) => s + (t.realisedR ?? 0), 0) / tradesWithR.length;
    // Linear map: -1R → 0, 0R → 40, 1.5R → 100
    avgRScore = Math.round(clamp(((avgRVal + 1) / 2.5) * 100));
  }
  const avgRDisplay = tradesWithR.length > 0 ? `${avgRVal >= 0 ? '+' : ''}${avgRVal.toFixed(2)}R` : '—';

  // ── Weighted composite ─────────────────────────────────────────────────
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
      { key: 'winRate',     label: 'Win Rate',          score: winRateScore,     display: `${winRatePct.toFixed(0)}%` },
      { key: 'pf',          label: 'Profit Factor',     score: pfScore,          display: pfDisplay },
      { key: 'wl',          label: 'Avg Win / Avg Loss', score: wlScore,         display: wlDisplay },
      { key: 'consistency', label: 'Consistency',       score: consistencyScore, display: `${consistencyScore}/100` },
      { key: 'maxDD',       label: 'Max Drawdown',      score: ddScore,          display: `${displayDDPct.toFixed(1)}%` },
      { key: 'avgR',        label: 'Avg Realised R',    score: avgRScore,        display: avgRDisplay },
    ],
  };
}

function ringColor(score: number): string {
  if (score >= 70) return '#4cc38a'; // jtp-profit
  if (score >= 40) return '#d9a23b'; // jtp-warning
  return '#e5635f';                  // jtp-loss
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

const RADIUS = 42;
const STROKE = 7;
const CX = 55;
const CY = 55;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TradingHealthScore: React.FC<TradingHealthScoreProps> = ({ closedTrades }) => {
  const { score, components } = useMemo(
    () => computeHealth(closedTrades),
    [closedTrades],
  );

  const hasData = closedTrades.length > 0;
  const color   = hasData ? ringColor(score) : '#1c2128';
  const offset  = hasData ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE;

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-[18px] py-[15px]">
      {/* Header */}
      <div className="text-jtp-base-minus font-semibold text-jtp-text mb-[14px]" style={{ letterSpacing: '0.2px' }}>
        Trading Health Score
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* ── Ring gauge ── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-[6px]">
          <svg width={110} height={110} viewBox="0 0 110 110" aria-label={`Trading health score: ${hasData ? score : 'no data'} out of 100`}>
            {/* Track ring */}
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke="#1c2128"
              strokeWidth={STROKE}
            />
            {/* Progress ring */}
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 0.55s ease, stroke 0.3s ease' }}
            />
            {/* Score number */}
            {hasData ? (
              <>
                <text
                  x={CX}
                  y={50}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#e8eaed"
                  fontSize="22"
                  fontWeight="600"
                  fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
                >
                  {score}
                </text>
                <text
                  x={CX}
                  y={68}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="10"
                  fontFamily="Inter, sans-serif"
                >
                  /100
                </text>
              </>
            ) : (
              <text
                x={CX}
                y={CY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#5b6370"
                fontSize="12"
                fontFamily="Inter, sans-serif"
              >
                No data
              </text>
            )}
          </svg>

          {/* Band label */}
          {hasData && (
            <span
              className="text-jtp-xs font-semibold px-[8px] py-[2px] rounded-jtp-xs"
              style={{ color, backgroundColor: `${color}1a` }}
            >
              {scoreLabel(score)}
            </span>
          )}
        </div>

        {/* ── Sub-metric bars ── */}
        <div className="flex-1 grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-6 gap-y-[11px] w-full pt-[2px]">
          {components.map(c => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-[4px]">
                <span className="text-jtp-xs text-jtp-textDim truncate mr-1">{c.label}</span>
                <span className="text-jtp-xs font-mono text-jtp-textMuted flex-shrink-0">{c.display}</span>
              </div>
              <div
                className="h-[3px] rounded-full overflow-hidden"
                style={{ backgroundColor: '#1c2128' }}
                role="progressbar"
                aria-valuenow={c.score}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.score}%`,
                    backgroundColor:
                      c.score >= 70 ? '#4cc38a' : c.score >= 40 ? '#d9a23b' : '#e5635f',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footnote */}
      <div className="mt-[12px] text-jtp-xs text-jtp-textFaint">
        Composite of Win Rate (20%), Profit Factor (20%), Avg Win/Loss (15%), Consistency (15%), Max Drawdown (15%), Avg R (15%).
      </div>
    </div>
  );
};

export default TradingHealthScore;
