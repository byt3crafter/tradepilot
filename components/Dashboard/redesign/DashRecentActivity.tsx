import React, { useMemo } from 'react';
import { Trade, TradeResult, Direction } from '../../../types';
import Panel from '../../ui/Panel';
import Badge, { BadgeVariant } from '../../ui/Badge';

interface DashRecentActivityProps {
  closedTrades: Trade[];
}

interface ActivityRowProps {
  trade: Trade;
}

function resultVariant(result?: string): BadgeVariant {
  if (result === TradeResult.Win)      return 'profit';
  if (result === TradeResult.Loss)     return 'loss';
  if (result === TradeResult.Breakeven) return 'neutral';
  return 'neutral';
}

const ActivityRow: React.FC<ActivityRowProps> = ({ trade }) => {
  const pl     = (trade.profitLoss ?? 0) - (trade.commission ?? 0) - (trade.swap ?? 0);
  const isProfit = pl >= 0;
  const isLong   = trade.direction === Direction.Buy;
  const rValue   = trade.realisedR ?? 0;

  const plColor  = isProfit ? 'text-jtp-profit' : 'text-jtp-loss';
  const rColor   = rValue >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const dirColor = isLong ? 'text-jtp-profit' : 'text-jtp-loss';

  const dateStr = new Date(trade.exitDate ?? trade.entryDate).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  });

  const plStr = `${isProfit ? '+' : ''}$${Math.abs(pl).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const rStr = `${rValue >= 0 ? '+' : ''}${rValue.toFixed(1)}R`;

  return (
    <div className="flex items-center gap-[10px] px-4 py-[10px] border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-active transition-colors cursor-pointer group">
      {/* Direction indicator */}
      <span className={`text-jtp-xs font-bold flex-shrink-0 ${dirColor}`} aria-hidden="true">
        {isLong ? '▲' : '▼'}
      </span>

      {/* Asset + meta */}
      <div className="flex-1 min-w-0">
        <div className="text-jtp-md font-semibold text-jtp-text leading-tight">{trade.asset}</div>
        <div className="font-mono text-jtp-xs text-jtp-textFaint mt-[1px]">
          {isLong ? 'Long' : 'Short'} · {dateStr}
        </div>
      </div>

      {/* Result badge (compact) */}
      <Badge variant={resultVariant(trade.result)} size="xs" className="flex-shrink-0 hidden sm:inline-flex">
        {trade.result === TradeResult.Win ? 'WIN' : trade.result === TradeResult.Loss ? 'LOSS' : 'BE'}
      </Badge>

      {/* P&L + R */}
      <div className="text-right flex-shrink-0">
        <div className={`font-mono text-jtp-md font-semibold ${plColor} leading-tight`}
          style={{ fontVariantNumeric: 'tabular-nums' }}>
          {plStr}
        </div>
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
      .slice(0, 8);
  }, [closedTrades]);

  return (
    <Panel label="RECENT ACTIVITY" noPadding className="h-full">
      <div className="flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex items-center justify-center h-full py-10 text-jtp-textFaint text-jtp-md">
            No recent trades
          </div>
        ) : (
          recent.map(trade => <ActivityRow key={trade.id} trade={trade} />)
        )}
      </div>
    </Panel>
  );
};

export default DashRecentActivity;
