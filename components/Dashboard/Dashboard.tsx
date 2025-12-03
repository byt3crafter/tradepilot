
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
      <div className="fixed inset-0 flex justify-center items-center bg-void/50 backdrop-blur-sm z-50">
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
    <div className="space-y-8 animate-fade-in-up">
      {/* Only show header and objectives if there's data */}
      {hasTrades && (
        <>
          <DashboardHeader />

          {/* Prop Firm Objectives */}
          {activeAccount?.objectives?.isEnabled && objectivesProgress && objectivesProgress.length > 0 && (
            <TradingObjectivesCard objectives={objectivesProgress} currentEquity={activeAccount.currentBalance} />
          )}
        </>
      )}

      {/* Main Content Area */}
      {renderMainContent()}
    </div>
  );
};

export default Dashboard;
