import React from 'react';
import { PlaybookStats } from '../../types';
import Spinner from '../Spinner';
import Card from '../Card';
import StatBox from './StatBox';
import EquityCurveChart from '../charts/EquityCurveChart';

interface PlaybookStatsTabProps {
  stats: PlaybookStats | null;
  isLoading: boolean;
}

const PlaybookStatsTab: React.FC<PlaybookStatsTabProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-future-gray py-16">
        <p>Could not load performance statistics for this playbook.</p>
      </div>
    );
  }

  if (stats.totalTrades === 0) {
    return (
      <div className="text-center text-future-gray py-16">
        <h3 className="text-lg font-semibold text-future-light">No Data Yet</h3>
        <p>Log some closed trades with this playbook to see its performance stats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-orbitron text-photonic-blue mb-4">Equity Curve</h3>
        <div className="h-64">
          <EquityCurveChart data={stats.equityCurve} />
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatBox label="Net P&L" value={`$${stats.netPL.toFixed(2)}`} />
        <StatBox label="Total Trades" value={stats.totalTrades} />
        <StatBox label="Win Rate" value={`${stats.winRate.toFixed(2)}%`} />
        <StatBox label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'} />
        <StatBox label="Expectancy" value={`$${stats.expectancy.toFixed(2)}`} />
        <StatBox label="Avg. Win" value={`$${stats.avgWin.toFixed(2)}`} />
        <StatBox label="Avg. Loss" value={`$${stats.avgLoss.toFixed(2)}`} />
        <StatBox label="Avg. Hold Time" value={`${stats.avgHoldTimeHours.toFixed(1)} hrs`} />
      </div>
    </div>
  );
};

export default PlaybookStatsTab;