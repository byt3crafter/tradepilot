import React from 'react';
import { useTrade } from '../../context/TradeContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import StatCard from './StatCard';

// --- Visualization Components ---

const Gauge: React.FC<{ value: number }> = ({ value }) => {
  const isInfinite = !isFinite(value);
  const displayValue = isInfinite ? '∞' : value.toFixed(2);
  const clampedValue = Math.max(0, Math.min(isInfinite ? 4 : value, 4));
  // Display a tiny sliver for 0 or less, as in screenshot
  const percentage = value <= 0 ? 0.01 : clampedValue / 4;

  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * percentage);
  
  const colorClass = isInfinite || value >= 1.5 ? 'stroke-momentum-green' : value >= 1 ? 'stroke-risk-medium' : 'stroke-risk-high';

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 84 84" className="w-full h-full transform -rotate-90">
        <circle cx="42" cy="42" r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-future-dark/50" />
        <circle
            cx="42" cy="42" r={radius}
            fill="none" strokeWidth={strokeWidth}
            className={colorClass}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
        />
      </svg>
       <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold font-tech-mono text-future-light">{displayValue}</span>
      </div>
    </div>
  );
};

const DonutChart: React.FC<{ wins: number, losses: number }> = ({ wins, losses }) => {
    const total = wins + losses;
    if (total === 0) {
      return (
        <div className="w-12 h-12 rounded-full bg-future-dark flex items-center justify-center border-2 border-future-dark/50">
          <span className="text-future-gray text-xs">N/A</span>
        </div>
      );
    }
    const winPercent = (wins / total) * 100;

    const strokeWidth = 8;
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const winArcLength = (winPercent / 100) * circumference;

    return (
        <svg viewBox="0 0 48 48" className="w-12 h-12 transform -rotate-90">
            <circle cx="24" cy="24" r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-risk-high" />
            {winArcLength > 0 && (
              <circle
                  cx="24" cy="24" r={radius}
                  fill="none" strokeWidth={strokeWidth}
                  className="stroke-momentum-green"
                  strokeDasharray={`${winArcLength} ${circumference}`}
                  strokeLinecap="round"
              />
            )}
        </svg>
    );
};

const ProgressBar: React.FC<{ value1: number; value2: number }> = ({ value1, value2 }) => {
  const total = value1 + value2;
  const percent1 = total > 0 ? (value1 / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-risk-high w-full overflow-hidden">
        <div
          className="h-full bg-momentum-green rounded-full transition-all duration-500"
          style={{ width: `${percent1}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-tech-mono mt-1">
          <span className="text-momentum-green">${value1.toFixed(2)}</span>
          <span className="text-risk-high">${value2.toFixed(2)}</span>
      </div>
    </div>
  );
};


// --- Main Dashboard Component ---

const KeyMetricsDashboard: React.FC = () => {
  const { trades } = useTrade();
  const stats = useAnalytics(trades);

  const avgWinLossRatio = stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard title="Net P&L">
          <div className="flex-1 flex items-end pb-2">
            <p className={`text-4xl lg:text-5xl font-orbitron ${stats.netPL >= 0 ? 'text-momentum-green' : 'text-risk-high'}`}>
              {stats.netPL < 0 ? '$-' : '$'}{Math.abs(stats.netPL).toFixed(2)}
            </p>
          </div>
          <p className="text-xs text-future-gray">{stats.totalTrades} closed trades</p>
      </StatCard>
      
      <StatCard title="Trade Expectancy">
           <div className="flex-1 flex items-end pb-2">
              <p className={`text-4xl lg:text-5xl font-orbitron ${stats.expectancy >= 0 ? 'text-momentum-green' : 'text-risk-high'}`}>
                  {stats.expectancy < 0 ? '$-' : '$'}{Math.abs(stats.expectancy).toFixed(2)}
              </p>
          </div>
          <p className="text-xs text-future-gray">Avg. P/L per trade</p>
      </StatCard>

      <StatCard title="Profit Factor">
        <div className="flex-1 flex items-center justify-center">
            <Gauge value={stats.profitFactor} />
        </div>
      </StatCard>
      
       <StatCard title="Win %">
          <div className="flex-1 flex flex-col items-center justify-end pb-2">
              <p className="text-4xl lg:text-5xl font-orbitron text-center">{stats.winRate.toFixed(2)}%</p>
          </div>
          <div className="flex items-center justify-center gap-4">
              <DonutChart wins={stats.winningTrades} losses={stats.losingTrades} />
              <div className="text-xs space-y-1 text-left">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-momentum-green"></span> Wins: {stats.winningTrades}</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-risk-high"></span> Losses: {stats.losingTrades}</div>
              </div>
          </div>
      </StatCard>
      
      <StatCard title="Avg win/loss trade">
         <div className="flex-1 flex items-end pb-2">
            <p className="text-4xl lg:text-5xl font-orbitron">{avgWinLossRatio.toFixed(2)} R</p>
         </div>
         <ProgressBar value1={stats.avgWin} value2={stats.avgLoss} />
      </StatCard>
    </div>
  );
};

export default KeyMetricsDashboard;