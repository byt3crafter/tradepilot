
import React from 'react';
import { useTrade } from '../../context/TradeContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import KeyMetricsDashboard from './KeyMetricsDashboard';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import GettingStartedGuide from './GettingStartedGuide';
import { useAccount } from '../../context/AccountContext';
import TradingObjectivesCard from './TradingObjectivesCard';
import DashboardHeader from './DashboardHeader';

import Spinner from '../Spinner';

const Dashboard: React.FC = () => {
  const { closedTrades, liveTrades, isLoading: tradesLoading } = useTrade();
  const { activeAccount, objectivesProgress, isLoading: accountLoading } = useAccount();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useLocalStorage<boolean>('onboardingQuestionnaireCompleted', false);

  const hasTrades = closedTrades.length > 0 || liveTrades.length > 0;

  // Wait for BOTH account AND trades to load before showing anything
  const isLoading = accountLoading || tradesLoading;

  // Show loading spinner while fetching data - DON'T show anything else
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  // After loading, determine what to show
  const renderMainContent = () => {
    // If user has trades, show dashboard
    if (hasTrades) {
      return <KeyMetricsDashboard />;
    }

    // No trades - show onboarding flow
    if (questionnaireCompleted) {
      return <GettingStartedGuide />;
    }

    // Show questionnaire (Mission Briefing)
    return <OnboardingQuestionnaire onComplete={() => setQuestionnaireCompleted(true)} />;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-fade-in-up">
      {/* Only show header and objectives if there's data */}
      {hasTrades && (
        <>
          <DashboardHeader />

          {/* Old Design - Trading Objectives (Equity, Profit Target, etc.) */}
          {activeAccount && (
            <TradingObjectivesCard
              objectives={objectivesProgress}
              currentEquity={activeAccount.currentBalance}
            />
          )}
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default Dashboard;
