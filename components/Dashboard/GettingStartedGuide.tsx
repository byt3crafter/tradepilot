import React from 'react';
import { useAccount } from '../../context/AccountContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { useView } from '../../context/ViewContext';
import { useTrade } from '../../context/TradeContext';
import StepCard from './StepCard';

const GettingStartedGuide: React.FC = () => {
  const { accounts } = useAccount();
  const { playbooks } = usePlaybook();
  const { navigateTo } = useView();
  const { closedTrades } = useTrade();

  const hasAccounts = accounts.length > 0;
  const hasPlaybooks = playbooks.length > 0;
  const hasTrades = closedTrades.length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-jtp-xl font-semibold text-jtp-text mb-1">Get started</h2>
        <p className="text-jtp-sm text-jtp-textMuted">Three steps to unlock your analytics.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StepCard
          stepNumber={1}
          title="Create a Broker Account"
          description="Add your first broker or prop firm account to start logging trades."
          ctaText="Add Account"
          ctaAction={() => navigateTo('settings', 'accounts')}
          isComplete={hasAccounts}
        />
        <StepCard
          stepNumber={2}
          title="Define a Strategy"
          description="Document your trading strategies to analyze their performance over time."
          ctaText="Add Playbook"
          ctaAction={() => navigateTo('playbooks')}
          isComplete={hasPlaybooks}
        />
        <StepCard
          stepNumber={3}
          title="Import or Log Your First Trade"
          description="Import from your broker (CSV/HTML) or add trades manually. The fastest path to insights is an import."
          ctaText="Go to Journal"
          ctaAction={() => navigateTo('journal')}
          isComplete={hasTrades}
          isLocked={!hasAccounts}
        />
      </div>
    </div>
  );
};

export default GettingStartedGuide;
