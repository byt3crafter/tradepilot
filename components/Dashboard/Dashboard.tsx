
import React from 'react';
import { useTrade } from '../../context/TradeContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import KeyMetricsDashboard from './KeyMetricsDashboard';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import GettingStartedGuide from './GettingStartedGuide';
import { useAccount } from '../../context/AccountContext';
import TradingObjectivesCard from './TradingObjectivesCard';
import DashboardHeader from './DashboardHeader';

const Dashboard: React.FC = () => {
  const { closedTrades } = useTrade();
  const { activeAccount, objectivesProgress } = useAccount();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useLocalStorage<boolean>('onboardingQuestionnaireCompleted', false);

  const hasClosedTrades = closedTrades.length > 0;
  
  const renderMainContent = () => {
    if (hasClosedTrades) {
      return <KeyMetricsDashboard />;
    }
    if (questionnaireCompleted) {
      return <GettingStartedGuide />;
    }
    return <OnboardingQuestionnaire onComplete={() => setQuestionnaireCompleted(true)} />;
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <DashboardHeader />
      
      {/* Prop Firm Objectives (if applicable) - Rendered above the main bento grid if enabled */}
      {activeAccount?.objectives?.isEnabled && objectivesProgress && objectivesProgress.length > 0 && (
        <TradingObjectivesCard objectives={objectivesProgress} />
      )}
      
      {/* Main Content Area (Bento Grid or Onboarding) */}
      {renderMainContent()}
    </div>
  );
};

export default Dashboard;
