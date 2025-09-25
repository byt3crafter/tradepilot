import React from 'react';
import { useAccount } from '../../context/AccountContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { useView } from '../../context/ViewContext';
import StepCard from './StepCard';

const GettingStartedGuide: React.FC = () => {
  const { accounts } = useAccount();
  const { playbooks } = usePlaybook();
  const { navigateTo } = useView();

  const hasAccounts = accounts.length > 0;
  const hasPlaybooks = playbooks.length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-orbitron text-photonic-blue">Your Mission Briefing</h2>
        <p className="text-future-gray mt-1">Complete these steps to unlock your analytics dashboard.</p>
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
          ctaText="Add Strategy"
          ctaAction={() => navigateTo('playbooks')}
          isComplete={hasPlaybooks}
        />
        <StepCard
          stepNumber={3}
          title="Log Your First Trade"
          description="Start your journal by logging your very first trade with tradePilot."
          ctaText="Log Trade"
          ctaAction={() => navigateTo('journal')}
          isComplete={false} // This step is complete when the component disappears
          isLocked={!hasAccounts || !hasPlaybooks}
        />
      </div>
    </div>
  );
};

export default GettingStartedGuide;