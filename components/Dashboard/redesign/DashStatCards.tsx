import React, { useMemo } from 'react';
import { Trade, TradeResult } from '../../../types';
import StatTile from '../../ui/StatTile';

interface DashStatCardsProps {
  closedTrades: Trade[];
}

function getISOWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, …
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

const DashStatCards: React.FC<DashStatCardsProps> = ({ closedTrades }) => {
  const stats = useMemo(() => {
    const { start, end } = getISOWeekBounds();

    // Trades this week
    const thisWeek = closedTrades.filter(t => {
      const d = new Date(t.exitDate ?? t.entryDate);
      return d >= start && d <= end;
    });

    // Win rate (all time, wins vs losses, excluding breakeven)
    const wins   = closedTrades.filter(t => t.result === TradeResult.Win);
    const losses = closedTrades.filter(t => t.result === TradeResult.Loss);
    const ratable = wins.length + losses.length;
    const winRate = ratable > 0 ? (wins.length / ratable) * 100 : 0;

    // Net R — sum of server-computed realised R
    const netR = closedTrades.reduce((sum, t) => sum + (t.realisedR ?? 0), 0);

    // Net P&L
    const netPL = closedTrades.reduce((sum, t) => {
      const pl = (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
      return sum + pl;
    }, 0);

    // All-time trade count
    const totalTrades = closedTrades.length;

    return {
      thisWeekCount: thisWeek.length,
      winRate,
      netR,
      netPL,
      totalTrades,
      winsCount: wins.length,
      lossCount: losses.length,
    };
  }, [closedTrades]);

  const formatCurrency = (v: number) => {
    const sign = v >= 0 ? '+' : '-';
    const abs  = Math.abs(v);
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
    return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatR = (v: number) => {
    const sign = v >= 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}R`;
  };

  const plColor  = stats.netPL >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const rColor   = stats.netR  >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const wrColor  = stats.winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss';

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <StatTile
        label="TRADES THIS WEEK"
        value={String(stats.thisWeekCount)}
        subValue={`${stats.totalTrades} all-time`}
      />
      <StatTile
        label="WIN RATE"
        value={`${stats.winRate.toFixed(0)}%`}
        valueColor={wrColor}
        subValue={`${stats.winsCount}W · ${stats.lossCount}L`}
      />
      <StatTile
        label="NET R"
        value={formatR(stats.netR)}
        valueColor={rColor}
        positive={stats.netR >= 0}
        subValue="all-time"
      />
      <StatTile
        label="NET P&L"
        value={formatCurrency(stats.netPL)}
        valueColor={plColor}
        positive={stats.netPL >= 0}
        subValue="after fees"
      />
    </div>
  );
};

export default DashStatCards;
