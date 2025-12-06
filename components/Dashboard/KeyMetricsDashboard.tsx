
import React from 'react';
import { useTrade } from '../../context/TradeContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import EquityHero from './Bento/EquityHero';
import StatGrid from './Bento/StatGrid';
import RecentActivity from './Bento/RecentActivity';

const KeyMetricsDashboard: React.FC = () => {
  const { trades } = useTrade();
  const stats = useAnalytics(trades);

  // Filter only closed trades for the stats, but maybe keep all for the feed?
  // Let's stick to closed trades for consistency with the analytics.
  const closedTrades = trades.filter(t => t.result);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 animate-fade-in-up items-start">
      {/* --- Main Column (Left) --- */}
      <div className="xl:col-span-2 flex flex-col gap-4 md:gap-6">
        {/* Row 1: Equity Hero */}
        <EquityHero
          netPL={stats.netPL}
          equityCurve={stats.equityCurve}
        />

        {/* Row 2: Stats Grid */}
        <StatGrid
          winRate={stats.winRate}
          profitFactor={stats.profitFactor}
          currentStreak={stats.currentStreak}
        />
      </div>

      {/* --- Side Column (Right) --- */}
      <div className="xl:col-span-1 min-h-[400px] xl:min-h-0">
        <div className="h-full min-h-[400px]">
          <RecentActivity trades={closedTrades} />
        </div>
      </div>
    </div>
  );
};

export default KeyMetricsDashboard;
