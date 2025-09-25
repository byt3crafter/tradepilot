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
    <div className="animate-fade-in-up space-y-6">
      <DashboardHeader />
      
      {activeAccount?.objectives?.isEnabled && objectivesProgress && objectivesProgress.length > 0 && (
        <TradingObjectivesCard objectives={objectivesProgress} />
      )}
      
      {renderMainContent()}
    </div>
  );
};

export default Dashboard;