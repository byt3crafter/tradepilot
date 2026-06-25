import React, { useMemo } from 'react';
import { Trade, TradeResult, Direction } from '../../../types';

interface DashRecentActivityProps {
  closedTrades: Trade[];
}

interface ActivityRowProps {
  trade: Trade;
}

const ActivityRow: React.FC<ActivityRowProps> = ({ trade }) => {
  const pl = (trade.profitLoss ?? 0) - (trade.commission ?? 0) - (trade.swap ?? 0);
  const isProfit = pl >= 0;
  const isLong = trade.direction === Direction.Buy;

  // Realized R (approximate)
  const rValue = trade.result === TradeResult.Win
    ? (trade.rr ?? 1)
    : trade.result === TradeResult.Loss
      ? -1
      : 0;

  const plColor = isProfit ? 'text-jtp-profit' : 'text-jtp-loss';
  const rColor = rValue >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const dirColor = isLong ? 'text-jtp-profit' : 'text-jtp-loss';

  const dateStr = new Date(trade.exitDate ?? trade.entryDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const plStr = `${isProfit ? '+' : ''}$${Math.abs(pl).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const rStr = `${rValue >= 0 ? '+' : ''}${rValue.toFixed(1)}R`;

  return (
    <div
      className="flex items-center gap-[10px] px-4 py-[9px] border-b border-jtp-borderSubtle hover:bg-jtp-active transition-colors cursor-pointer"
    >
      {/* Direction indicator */}
      <span className={`text-jtp-xs font-semibold flex-shrink-0 ${dirColor}`}>
        {isLong ? '▲' : '▼'}
      </span>

      {/* Asset + meta */}
      <div className="flex-1 min-w-0">
        <div className="text-jtp-base-minus font-semibold text-jtp-text">{trade.asset}</div>
        <div className="text-jtp-xs text-jtp-textFaint font-mono">
          {isLong ? 'Long' : 'Short'} · {dateStr}
        </div>
      </div>

      {/* P&L + R */}
      <div className="text-right flex-shrink-0">
        <div className={`font-mono text-jtp-base-minus font-semibold ${plColor}`}>{plStr}</div>
        <div className={`font-mono text-jtp-xs ${rColor}`}>{rStr}</div>
      </div>
    </div>
  );
};

const DashRecentActivity: React.FC<DashRecentActivityProps> = ({ closedTrades }) => {
  const recent = useMemo(() => {
    return [...closedTrades]
      .sort((a, b) => {
        const aDate = new Date(a.exitDate ?? a.entryDate).getTime();
        const bDate = new Date(b.exitDate ?? b.entryDate).getTime();
        return bDate - aDate;
      })
      .slice(0, 7);
  }, [closedTrades]);

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-[13px] border-b border-jtp-border flex-shrink-0">
        <div className="text-jtp-base-minus font-semibold text-jtp-text" style={{ letterSpacing: '0.2px' }}>
          Recent Activity
        </div>
      </div>

      {/* Trade rows */}
      <div className="flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8 text-jtp-textFaint text-jtp-sm">
            No recent trades
          </div>
        ) : (
          recent.map(trade => <ActivityRow key={trade.id} trade={trade} />)
        )}
      </div>
    </div>
  );
};

export default DashRecentActivity;
