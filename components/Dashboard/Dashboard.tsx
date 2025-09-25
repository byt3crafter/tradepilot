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
  const { trades } = useTrade();
  const { activeAccount, objectivesProgress, smartLimitsProgress } = useAccount();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useLocalStorage<boolean>('onboardingQuestionnaireCompleted', false);

  const hasTrades = trades.length > 0;
  
  const renderContent = () => {
    if (hasTrades) {
      return (
        <div className="space-y-6">
          {activeAccount?.objectives?.isEnabled && objectivesProgress && (
            <TradingObjectivesCard objectives={objectivesProgress} />
          )}
          {activeAccount?.smartLimits?.isEnabled && smartLimitsProgress && (
            <SmartLimitsCard progress={smartLimitsProgress} limits={activeAccount.smartLimits} />
          )}
          <KeyMetricsDashboard />
        </div>
      );
    }
    if (questionnaireCompleted) {
      return <GettingStartedGuide />;
    }
    return <OnboardingQuestionnaire onComplete={() => setQuestionnaireCompleted(true)} />;
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8 flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl text-future-light">
            Good morning, <span className="font-orbitron">{user?.fullName.split(' ')[0]}!</span>
          </h1>
          <p className="text-future-gray">Here's your mission overview for today.</p>
        </div>
        <AccountStats />
      </div>

      {renderContent()}
    </div>
  );
};

export default Dashboard;