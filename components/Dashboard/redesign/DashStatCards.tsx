import React, { useMemo } from 'react';
import { Trade, TradeResult } from '../../../types';
import { StatTile } from '../../ui';

interface DashStatCardsProps {
  closedTrades: Trade[];
}

const netOf = (t: Trade) =>
  (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);

const DashStatCards: React.FC<DashStatCardsProps> = ({ closedTrades }) => {
  const stats = useMemo(() => {
    const wins   = closedTrades.filter(t => t.result === TradeResult.Win);
    const losses = closedTrades.filter(t => t.result === TradeResult.Loss);
    const ratable = wins.length + losses.length;
    const winRate = ratable > 0 ? (wins.length / ratable) * 100 : 0;

    // Net P&L (after fees)
    const netPL = closedTrades.reduce((s, t) => s + netOf(t), 0);

    // Profit Factor
    const grossProfit = wins.reduce((s, t) => s + Math.max(0, netOf(t)), 0);
    const grossLoss   = losses.reduce((s, t) => s + Math.abs(Math.min(0, netOf(t))), 0);
    const pf: number | null =
      grossLoss > 0 ? grossProfit / grossLoss
      : grossProfit > 0 ? Infinity
      : closedTrades.length === 0 ? null
      : 1;

    // Avg R (mean of server-computed realised R)
    const tradesWithR = closedTrades.filter(t => t.realisedR != null);
    const avgR: number | null =
      tradesWithR.length > 0
        ? tradesWithR.reduce((s, t) => s + (t.realisedR ?? 0), 0) / tradesWithR.length
        : null;

    // Expectancy in R: (winRate × avgWinR) + (lossRate × avgLossR)  — avgLossR is negative
    const winsWithR  = wins.filter(t => t.realisedR != null);
    const lossWithR  = losses.filter(t => t.realisedR != null);
    const avgWinR  = winsWithR.length  > 0
      ? winsWithR.reduce((s, t)  => s + (t.realisedR ?? 0), 0) / winsWithR.length  : 0;
    const avgLossR = lossWithR.length > 0
      ? lossWithR.reduce((s, t) => s + (t.realisedR ?? 0), 0) / lossWithR.length : 0;
    const expectancy: number | null =
      ratable > 0
        ? (wins.length / ratable) * avgWinR + (losses.length / ratable) * avgLossR
        : null;

    // Today P&L
    const todayStr = new Date().toDateString();
    const todayTrades = closedTrades.filter(t =>
      new Date(t.exitDate ?? t.entryDate).toDateString() === todayStr,
    );
    const todayPL    = todayTrades.reduce((s, t) => s + netOf(t), 0);
    const todayCount = todayTrades.length;

    return {
      netPL,
      winRate,
      winsCount: wins.length,
      lossCount: losses.length,
      ratable,
      pf,
      avgR,
      rCount: tradesWithR.length,
      expectancy,
      todayPL,
      todayCount,
      totalTrades: closedTrades.length,
    };
  }, [closedTrades]);

  // ── Format helpers ─────────────────────────────────────────────────────────
  const fmtCurrency = (v: number) => {
    const sign = v >= 0 ? '+' : '-';
    const abs  = Math.abs(v);
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
    return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const fmtR = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;

  const fmtPF = (v: number | null): string => {
    if (v === null)     return '—';
    if (v === Infinity) return '∞';
    return v.toFixed(2);
  };

  // ── Derived colours ────────────────────────────────────────────────────────
  const plColor  = stats.netPL  >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const wrColor  = stats.winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss';
  const pfColor  = (stats.pf ?? 0) >= 1 ? 'text-jtp-profit' : 'text-jtp-loss';
  const arColor  = (stats.avgR ?? 0) >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const exColor  = (stats.expectancy ?? 0) >= 0 ? 'text-jtp-profit' : 'text-jtp-loss';
  const tdColor  =
    stats.todayCount > 0
      ? (stats.todayPL >= 0 ? 'text-jtp-profit' : 'text-jtp-loss')
      : 'text-jtp-textDim';

  const noData = stats.totalTrades === 0;

  return (
    /*
     * §6b KPI grid: 4-col on default, 6-col on xl (one dense row).
     * Mobile: 2-col (3 rows). Sm: 4-col (2 rows). XL: 6-col (1 row).
     */
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3">

      {/* 1 — NET P&L */}
      <StatTile
        label="NET P&L"
        value={noData ? '—' : fmtCurrency(stats.netPL)}
        valueColor={noData ? 'text-jtp-textDim' : plColor}
        positive={noData ? undefined : stats.netPL >= 0}
        subValue="after fees"
      />

      {/* 2 — WIN RATE */}
      <StatTile
        label="WIN RATE"
        value={stats.ratable > 0 ? `${stats.winRate.toFixed(0)}%` : '—'}
        valueColor={stats.ratable > 0 ? wrColor : 'text-jtp-textDim'}
        positive={stats.ratable > 0 ? stats.winRate >= 50 : undefined}
        subValue={`${stats.winsCount}W · ${stats.lossCount}L`}
      />

      {/* 3 — PROFIT FACTOR */}
      <StatTile
        label="PROFIT FACTOR"
        value={fmtPF(stats.pf)}
        valueColor={stats.pf === null ? 'text-jtp-textDim' : pfColor}
        positive={stats.pf === null ? undefined : stats.pf >= 1}
        subValue={stats.pf !== null && stats.pf !== Infinity ? 'gross W/L' : undefined}
      />

      {/* 4 — AVG R */}
      <StatTile
        label="AVG R"
        value={stats.avgR === null ? '—' : fmtR(stats.avgR)}
        valueColor={stats.avgR === null ? 'text-jtp-textDim' : arColor}
        positive={stats.avgR === null ? undefined : stats.avgR >= 0}
        subValue={stats.avgR !== null ? `${stats.rCount} trades` : undefined}
      />

      {/* 5 — EXPECTANCY */}
      <StatTile
        label="EXPECTANCY"
        value={stats.expectancy === null ? '—' : fmtR(stats.expectancy)}
        valueColor={stats.expectancy === null ? 'text-jtp-textDim' : exColor}
        positive={stats.expectancy === null ? undefined : stats.expectancy >= 0}
        subValue="per trade (R)"
      />

      {/* 6 — TODAY */}
      <StatTile
        label="TODAY"
        value={stats.todayCount > 0 ? fmtCurrency(stats.todayPL) : '—'}
        valueColor={tdColor}
        positive={stats.todayCount > 0 ? stats.todayPL >= 0 : undefined}
        subValue={
          stats.todayCount > 0
            ? `${stats.todayCount} trade${stats.todayCount !== 1 ? 's' : ''}`
            : 'no trades today'
        }
      />

    </div>
  );
};

export default DashStatCards;
