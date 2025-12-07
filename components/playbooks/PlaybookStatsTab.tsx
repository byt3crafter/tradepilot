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
        <StatBox label="Risk/Reward Ratio" value={isFinite(stats.riskRewardRatio) ? stats.riskRewardRatio.toFixed(2) : '∞'} />
        <StatBox label="Max Drawdown" value={`$${stats.maxDrawdown.toFixed(2)}`} />
        <StatBox label="Drawdown %" value={`${stats.maxDrawdownPercent.toFixed(2)}%`} />
        <StatBox label="Largest Daily Loss" value={`$${stats.largestDailyLoss.toFixed(2)}`} />
        <StatBox label="Recovery Factor" value={isFinite(stats.recoveryFactor) ? stats.recoveryFactor.toFixed(2) : '∞'} />
        <StatBox label="Trades Per Day" value={stats.tradesPerDay} />
        <StatBox label="Best Win Streak (Days)" value={stats.maxConsecutiveProfitableDays} />
        <StatBox label="Current Streak" value={stats.currentStreak} />
        <StatBox label="Avg. Hold Time" value={`${stats.avgHoldTimeHours.toFixed(1)} hrs`} />
      </div>

      {stats.setups && stats.setups.length > 0 && (
        <Card>
          <h3 className="text-lg font-orbitron text-photonic-blue mb-4">Performance by Setup</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-future-light">
              <thead className="text-xs text-future-gray uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Setup Name</th>
                  <th className="px-4 py-3">Trades</th>
                  <th className="px-4 py-3">Win Rate</th>
                  <th className="px-4 py-3">Net P/L</th>
                </tr>
              </thead>
              <tbody>
                {stats.setups.map(setup => (
                  <tr key={setup.setupId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{setup.setupName}</td>
                    <td className="px-4 py-3">{setup.totalTrades}</td>
                    <td className={`px-4 py-3 ${setup.winRate >= 50 ? 'text-momentum-green' : 'text-risk-high'}`}>
                      {setup.winRate}%
                    </td>
                    <td className={`px-4 py-3 ${setup.netPL >= 0 ? 'text-momentum-green' : 'text-risk-high'}`}>
                      ${setup.netPL.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlaybookStatsTab;