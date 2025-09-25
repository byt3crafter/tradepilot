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
  const { activeAccount, isLoading } = useAccount();

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

  const { initialBalance, currentBalance, currency } = activeAccount;
  const equity = currentBalance; // Assuming no floating P/L for now

  return (
    <div className="bg-future-panel/50 border border-photonic-blue/10 rounded-lg p-3 flex items-center gap-4">
      <StatItem 
        label="Starting Balance" 
        value={initialBalance} 
        currency={currency}
        tooltip="The initial balance of your account."
      />
      <div className="h-10 w-px bg-photonic-blue/20 self-center"></div>
      <StatItem 
        label="Current Balance" 
        value={currentBalance} 
        currency={currency}
        tooltip="Your account balance including all closed trades."
      />
      <div className="h-10 w-px bg-photonic-blue/20 self-center"></div>
      <StatItem 
        label="Equity" 
        value={equity} 
        currency={currency}
        tooltip="Your account balance plus the floating P/L of open positions. (Currently reflects balance)"
      />
    </div>
  );
};

export default AccountStats;
