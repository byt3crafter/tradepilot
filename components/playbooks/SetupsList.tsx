import React, { useMemo } from 'react';
import { Playbook, PlaybookSetup, Trade, TradeResult } from '../../types';

export interface SetupItem {
  /** Unique key: setup.id if a real setup, else `playbook:${playbook.id}` */
  key: string;
  name: string;
  playbook: Playbook;
  setup: PlaybookSetup | null;
}

export interface SetupStats {
  tradeCount: number;
  winRate: number; // 0–1
  avgR: number;
  netPL: number;
  expectancy: number; // same as avgR per comp
}

function computeStats(trades: Trade[]): SetupStats {
  if (trades.length === 0) {
    return { tradeCount: 0, winRate: 0, avgR: 0, netPL: 0, expectancy: 0 };
  }
  const wins = trades.filter(t => t.result === TradeResult.Win).length;
  const winRate = wins / trades.length;
  const avgR = trades.reduce((s, t) => s + (t.realisedR ?? 0), 0) / trades.length;
  const netPL = trades.reduce((s, t) => {
    return s + (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
  }, 0);
  return { tradeCount: trades.length, winRate, avgR, netPL, expectancy: avgR };
}

function fmtR(r: number): string {
  const sign = r >= 0 ? '+' : '−';
  return `${sign}${Math.abs(r).toFixed(1)}R`;
}

function fmtNet(n: number): string {
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

interface SetupsListProps {
  items: SetupItem[];
  closedTrades: Trade[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

const SetupsList: React.FC<SetupsListProps> = ({
  items,
  closedTrades,
  selectedKey,
  onSelect,
}) => {
  const rows = useMemo(() => {
    return items.map(item => {
      const trades =
        item.setup !== null
          ? closedTrades.filter(t => t.playbookSetupId === item.setup!.id)
          : closedTrades.filter(t => t.playbookId === item.playbook.id && !t.playbookSetupId);
      const stats = computeStats(trades);
      return { item, stats };
    });
  }, [items, closedTrades]);

  // For the R bar: scale to max absolute avgR across all rows
  const maxAbsR = useMemo(() => {
    return Math.max(0.5, ...rows.map(r => Math.abs(r.stats.avgR)));
  }, [rows]);

  // Sort by avgR desc
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => b.stats.avgR - a.stats.avgR);
  }, [rows]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
        <p className="text-jtp-textMuted text-jtp-lg">No setups yet.</p>
        <p className="text-jtp-textFaint text-jtp-md mt-1">
          Add setups inside a playbook to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-jtp-borderSubtle overflow-y-auto">
      {sorted.map(({ item, stats }) => {
        const isSelected = item.key === selectedKey;
        const rColor =
          stats.avgR > 0
            ? 'text-jtp-profit'
            : stats.avgR < 0
            ? 'text-jtp-loss'
            : 'text-jtp-textMuted';
        const barColor = stats.avgR >= 0 ? 'bg-jtp-profit' : 'bg-jtp-loss';

        // Positive bar width as pct of 50% of track width
        const posW = stats.avgR >= 0 ? (stats.avgR / maxAbsR) * 50 : 0;
        const negW = stats.avgR < 0 ? (Math.abs(stats.avgR) / maxAbsR) * 50 : 0;

        const winPct = stats.tradeCount > 0 ? Math.round(stats.winRate * 100) : 0;
        const subtitle =
          stats.tradeCount > 0
            ? `${stats.tradeCount} trade${stats.tradeCount !== 1 ? 's' : ''} · ${winPct}% win · ${fmtNet(stats.netPL)}`
            : 'No trades yet';

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={`w-full text-left px-4 py-3 transition-colors duration-100 focus:outline-none
              ${isSelected
                ? 'bg-[rgba(232,162,61,.10)] border-l-2 border-l-jtp-blue'
                : 'border-l-2 border-l-transparent hover:bg-jtp-hover'}
            `}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`font-medium text-jtp-md leading-tight ${isSelected ? 'text-jtp-text' : 'text-jtp-textSoft'}`}>
                {item.name}
              </span>
              <span className={`font-mono font-semibold text-jtp-base-minus shrink-0 ${rColor}`}>
                {stats.tradeCount > 0 ? fmtR(stats.avgR) : '—'}
              </span>
            </div>

            {/* R bar */}
            <div className="relative h-[4px] my-[6px] rounded-full bg-jtp-border overflow-hidden">
              {/* Centre divider reference: bar centre is at 50% */}
              {stats.tradeCount > 0 && (
                <>
                  {stats.avgR >= 0 ? (
                    <div
                      className={`absolute top-0 h-full rounded-full ${barColor}`}
                      style={{ left: '50%', width: `${posW}%` }}
                    />
                  ) : (
                    <div
                      className={`absolute top-0 h-full rounded-full ${barColor}`}
                      style={{ right: '50%', width: `${negW}%` }}
                    />
                  )}
                </>
              )}
            </div>

            <div className="text-jtp-xs text-jtp-textFaint mt-0.5 truncate">
              {subtitle}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export { computeStats };
export default SetupsList;
