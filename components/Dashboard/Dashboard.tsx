import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrade } from '../../context/TradeContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import KeyMetricsDashboard from './KeyMetricsDashboard';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import GettingStartedGuide from './GettingStartedGuide';
import { useAccount } from '../../context/AccountContext';
import TradingObjectivesCard from './TradingObjectivesCard';
import SmartLimitsCard from './SmartLimitsCard';
import AccountStats from './AccountStats';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { closedTrades } = useTrade();
  const { activeAccount, objectivesProgress, smartLimitsProgress } = useAccount();
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl text-future-light">
            Good morning, <span className="font-orbitron">{user?.fullName.split(' ')[0]}!</span>
          </h1>
          <p className="text-future-gray">Here's your mission overview for today.</p>
        </div>

        <div className="flex items-center gap-4">
          <AccountStats />
          {activeAccount?.smartLimits?.isEnabled && smartLimitsProgress && (
            <SmartLimitsCard progress={smartLimitsProgress} limits={activeAccount.smartLimits} />
          )}
        </div>
      </div>
      
      {activeAccount?.objectives?.isEnabled && objectivesProgress && objectivesProgress.length > 0 && (
        <TradingObjectivesCard objectives={objectivesProgress} />
      )}
      
      {renderMainContent()}
    </div>
  );
};

export default Dashboard;