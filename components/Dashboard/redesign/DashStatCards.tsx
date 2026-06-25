import React, { useMemo } from 'react';
import { Trade, TradeResult } from '../../../types';

interface DashStatCardsProps {
  closedTrades: Trade[];
}

function getISOWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, …
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

interface StatCardProps {
  label: string;
  value: string;
  color?: string; // Tailwind color class like 'text-jtp-profit'
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color = 'text-jtp-text' }) => (
  <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-4 py-[13px]">
    <div
      className="text-jtp-xs-plus uppercase tracking-[0.5px] text-jtp-textDim font-normal mb-[5px]"
    >
      {label}
    </div>
    <div className={`font-mono font-semibold text-jtp-3xl leading-none ${color}`}>
      {value}
    </div>
  </div>
);

const DashStatCards: React.FC<DashStatCardsProps> = ({ closedTrades }) => {
  const stats = useMemo(() => {
    const { start, end } = getISOWeekBounds();

    // Trades this week
    const thisWeek = closedTrades.filter(t => {
      const d = new Date(t.exitDate ?? t.entryDate);
      return d >= start && d <= end;
    });

    // Win rate (all time, wins vs losses, excluding breakeven)
    const wins = closedTrades.filter(t => t.result === TradeResult.Win);
    const losses = closedTrades.filter(t => t.result === TradeResult.Loss);
    const ratable = wins.length + losses.length;
    const winRate = ratable > 0 ? (wins.length / ratable) * 100 : 0;

    // Net R (approximate realized R per trade)
    let netR = 0;
    for (const t of closedTrades) {
      if (t.result === TradeResult.Win) {
        netR += t.rr ?? 1;
      } else if (t.result === TradeResult.Loss) {
        netR -= 1;
      }
      // breakeven = 0
    }

    // Net P&L
    const netPL = closedTrades.reduce((sum, t) => {
      const pl = (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
      return sum + pl;
    }, 0);

    return { thisWeekCount: thisWeek.length, winRate, netR, netPL };
  }, [closedTrades]);

  const formatCurrency = (v: number) => {
    const sign = v >= 0 ? '+' : '';
    return `${sign}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatR = (v: number) => {
    const sign = v >= 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}R`;
  };

  const plColor = stats.netPL >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const rColor = stats.netR >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <StatCard
        label="Trades This Week"
        value={String(stats.thisWeekCount)}
        color="text-jtp-text"
      />
      <StatCard
        label="Win Rate"
        value={`${stats.winRate.toFixed(0)}%`}
        color={stats.winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss'}
      />
      <StatCard
        label="Net R"
        value={formatR(stats.netR)}
        color={rColor}
      />
      <StatCard
        label="Net P&L"
        value={formatCurrency(stats.netPL)}
        color={plColor}
      />
    </div>
  );
};

export default DashStatCards;
