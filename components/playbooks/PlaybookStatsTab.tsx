import React from 'react';
import { PlaybookStats } from '../../types';
import { Panel, Skeleton, EmptyState, DataTable, Badge } from '../ui';
import type { TableColumn } from '../ui';
import StatBox from './StatBox';
import EquityCurveChart from '../charts/EquityCurveChart';

interface PlaybookStatsTabProps {
  stats: PlaybookStats | null;
  isLoading: boolean;
}

interface SetupRow {
  setupId: string;
  setupName: string;
  totalTrades: number;
  winRate: number;
  netPL: number;
}

const setupCols: TableColumn<SetupRow>[] = [
  { key: 'setupName', header: 'SETUP' },
  { key: 'totalTrades', header: 'TRADES', align: 'right', mono: true },
  {
    key: 'winRate',
    header: 'WIN RATE',
    align: 'right',
    mono: true,
    render: (v) => (
      <span className={Number(v) >= 50 ? 'text-jtp-profit' : 'text-jtp-loss'}>
        {Number(v)}%
      </span>
    ),
  },
  {
    key: 'netPL',
    header: 'NET P&L',
    align: 'right',
    mono: true,
    render: (v) => (
      <span className={Number(v) >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}>
        {Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}
      </span>
    ),
  },
];

const PlaybookStatsTab: React.FC<PlaybookStatsTabProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="panel" className="h-40" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="stat" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <EmptyState
        title="Stats unavailable"
        description="Could not load performance statistics for this playbook."
      />
    );
  }

  if (stats.totalTrades === 0) {
    return (
      <EmptyState
        title="No data yet"
        description="Log some closed trades with this playbook to see its performance stats."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Equity curve */}
      <Panel label="EQUITY CURVE">
        <div className="h-52">
          <EquityCurveChart data={stats.equityCurve} />
        </div>
      </Panel>

      {/* Key metrics grid */}
      <Panel label="PERFORMANCE METRICS">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatBox label="NET P&L"           value={`$${stats.netPL.toFixed(2)}`} />
          <StatBox label="TOTAL TRADES"      value={stats.totalTrades} />
          <StatBox label="WIN RATE"          value={`${stats.winRate.toFixed(2)}%`} />
          <StatBox label="PROFIT FACTOR"     value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'} />
          <StatBox label="EXPECTANCY"        value={`$${stats.expectancy.toFixed(2)}`} />
          <StatBox label="AVG WIN"           value={`$${stats.avgWin.toFixed(2)}`} />
          <StatBox label="AVG LOSS"          value={`$${stats.avgLoss.toFixed(2)}`} />
          <StatBox label="RISK/REWARD"       value={isFinite(stats.riskRewardRatio) ? stats.riskRewardRatio.toFixed(2) : '∞'} />
          <StatBox label="MAX DRAWDOWN"      value={`$${stats.maxDrawdown.toFixed(2)}`} />
          <StatBox label="DRAWDOWN %"        value={`${stats.maxDrawdownPercent.toFixed(2)}%`} />
          <StatBox label="LARGEST DAILY LOSS" value={`$${stats.largestDailyLoss.toFixed(2)}`} />
          <StatBox label="RECOVERY FACTOR"  value={isFinite(stats.recoveryFactor) ? stats.recoveryFactor.toFixed(2) : '∞'} />
          <StatBox label="TRADES / DAY"     value={stats.tradesPerDay} />
          <StatBox label="BEST WIN STREAK"  value={stats.maxConsecutiveProfitableDays} />
          <StatBox label="CURRENT STREAK"   value={stats.currentStreak} />
          <StatBox label="AVG HOLD TIME"    value={`${stats.avgHoldTimeHours.toFixed(1)} hrs`} />
        </div>
      </Panel>

      {/* Setups breakdown */}
      {stats.setups && stats.setups.length > 0 && (
        <Panel label="PERFORMANCE BY SETUP" noPadding>
          <DataTable<SetupRow>
            columns={setupCols}
            data={stats.setups}
            keyFn={(s) => s.setupId}
          />
        </Panel>
      )}
    </div>
  );
};

export default PlaybookStatsTab;
