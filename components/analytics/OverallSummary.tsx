import React from 'react';
import { AccountAnalytics } from '../../types';
import StatBox from '../playbooks/StatBox';

interface OverallSummaryProps {
  data: AccountAnalytics;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = Math.round(minutes % 60);
  return `${hours}h ${remMinutes}m`;
};

const OverallSummary: React.FC<OverallSummaryProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <StatBox label="Net Profit" value={`$${(data.netProfit ?? 0).toFixed(2)}`} valueColor={(data.netProfit ?? 0) >= 0 ? 'text-momentum-green' : 'text-risk-high'} />
      <StatBox label="Win Rate" value={`${(data.winRate ?? 0).toFixed(1)}%`} />
      <StatBox label="Profit Factor" value={(data.profitFactor ?? 0).toFixed(2)} valueColor={(data.profitFactor ?? 0) > 1.5 ? 'text-momentum-green' : 'text-future-light'} />
      <StatBox label="Expectancy" value={`$${(data.expectancy ?? 0).toFixed(2)}`} />
      <StatBox label="Current Streak" value={`${data.currentStreak ?? 0}`} valueColor={(data.currentStreak ?? 0) > 0 ? 'text-momentum-green' : 'text-risk-high'} />

      <StatBox label="Largest Win" value={`$${data.largestWinningTrade.toFixed(2)}`} />
      <StatBox label="Largest Loss" value={`-$${Math.abs(data.largestLosingTrade).toFixed(2)}`} />
      <StatBox label="Avg. Duration" value={formatDuration(data.averageTradeDurationMinutes)} />
    </div>
  );
};

export default OverallSummary;
