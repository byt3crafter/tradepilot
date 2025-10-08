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
      <StatBox label="Largest Winning Trade" value={`$${data.largestWinningTrade.toFixed(2)}`} />
      <StatBox label="Largest Losing Trade" value={`-$${Math.abs(data.largestLosingTrade).toFixed(2)}`} />
      <StatBox label="Total Pips" value={data.totalPips.toFixed(1)} />
      <StatBox label="Average Pips / Trade" value={data.averagePips.toFixed(1)} />
      <StatBox label="Avg. Trade Duration" value={formatDuration(data.averageTradeDurationMinutes)} />
    </div>
  );
};

export default OverallSummary;
