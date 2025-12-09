import React from 'react';
import { useAccount } from '../../context/AccountContext';
import { InfoIcon } from '../icons/InfoIcon';
import Tooltip from '../ui/Tooltip';

const StatItem: React.FC<{ label: string; value: number; currency: string; tooltip: string }> = ({ label, value, currency, tooltip }) => (
  <div className="text-right">
    <Tooltip text={tooltip}>
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-xs text-future-gray">{label}</span>
        <InfoIcon className="w-3.5 h-3.5 text-future-gray/50" />
      </div>
    </Tooltip>
    <p className="font-tech-mono text-future-light text-base mt-1">
      {currency} {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </p>
  </div>
);

const AccountStats: React.FC = () => {
  const { activeAccount, isLoading, analytics } = useAccount();

  if (isLoading || !activeAccount) {
    // Render a skeleton loader while loading
    return (
      <div className="bg-future-panel/50 border border-photonic-blue/10 rounded-lg p-3 flex items-center gap-4 animate-pulse h-[68px] min-w-[400px]">
        <div className="flex-1 h-8 bg-future-dark/50 rounded"></div>
        <div className="h-10 w-px bg-photonic-blue/20 self-center"></div>
        <div className="flex-1 h-8 bg-future-dark/50 rounded"></div>
        <div className="h-10 w-px bg-photonic-blue/20 self-center"></div>
        <div className="flex-1 h-8 bg-future-dark/50 rounded"></div>
      </div>
    );
  }

  const { initialBalance, currentBalance, currency, consistencyScore } = activeAccount;
  const equity = currentBalance; // Assuming no floating P/L for now

  // Use analytics data if available, otherwise fallback or 0
  const winRate = analytics?.winRate ?? 0;
  const avgWin = analytics?.averagePips ?? 0; // Placeholder, should be avg win $
  const avgLoss = 0; // Placeholder
  const profitFactor = analytics?.profitFactor ?? 0;
  const expectancy = analytics?.expectancy ?? 0;
  const totalTrades = analytics?.totalTrades ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-future-panel/50 border border-photonic-blue/10 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xs text-future-gray uppercase tracking-wider font-semibold">Equity</h3>
          <InfoIcon className="w-3.5 h-3.5 text-future-gray/50" />
        </div>
        <div className="text-2xl font-orbitron text-future-light">
          {currency} {equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-future-gray mt-1">
          Balance: {currency} {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div className="bg-future-panel/50 border border-photonic-blue/10 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xs text-future-gray uppercase tracking-wider font-semibold">Win Rate</h3>
          <InfoIcon className="w-3.5 h-3.5 text-future-gray/50" />
        </div>
        <div className={`text-2xl font-orbitron ${winRate >= 50 ? 'text-momentum-green' : 'text-risk-high'}`}>
          {winRate.toFixed(1)}%
        </div>
        <div className="text-xs text-future-gray mt-1">
          {totalTrades} Trades
        </div>
      </div>

      <div className="bg-future-panel/50 border border-photonic-blue/10 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xs text-future-gray uppercase tracking-wider font-semibold">Consistency Score</h3>
          <InfoIcon className="w-3.5 h-3.5 text-future-gray/50" />
        </div>
        <div className="text-2xl font-orbitron text-future-light">
          {consistencyScore ? `${consistencyScore.toFixed(1)}%` : '-'}
        </div>
        <div className="text-xs text-future-gray mt-1">
          Max Profit / Total Profit
        </div>
      </div>

      <div className="bg-future-panel/50 border border-photonic-blue/10 rounded-lg p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xs text-future-gray uppercase tracking-wider font-semibold">Profit Factor</h3>
          <InfoIcon className="w-3.5 h-3.5 text-future-gray/50" />
        </div>
        <div className="text-2xl font-orbitron text-future-light">
          {profitFactor.toFixed(2)}
        </div>
        <div className="text-xs text-future-gray mt-1">
          Expectancy: {currency} {expectancy.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default AccountStats;
