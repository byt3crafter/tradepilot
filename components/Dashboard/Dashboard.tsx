import React from 'react';
import { useTrade } from '../../context/TradeContext';
import { useAccount } from '../../context/AccountContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Spinner from '../Spinner';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import GettingStartedGuide from './GettingStartedGuide';
import DashStatCards from './redesign/DashStatCards';
import PropFirmRulesPanel from './redesign/PropFirmRulesPanel';
import DashEquityCurve from './redesign/DashEquityCurve';
import DashRecentActivity from './redesign/DashRecentActivity';
import TradingHealthScore from './redesign/TradingHealthScore';

const Dashboard: React.FC = () => {
  const {
    closedTrades,
    liveTrades,
    isLoading: tradesLoading,
    isTradesSynced,
  } = useTrade();
  const { activeAccount, objectivesProgress, isLoading: accountLoading } = useAccount();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useLocalStorage<boolean>(
    'onboardingQuestionnaireCompleted',
    false,
  );

  const hasTrades = closedTrades.length > 0 || liveTrades.length > 0;
  const isLoading = accountLoading || tradesLoading || !isTradesSynced;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  // No trades yet — show onboarding flow
  if (!hasTrades) {
    if (questionnaireCompleted) {
      return <GettingStartedGuide />;
    }
    return <OnboardingQuestionnaire onComplete={() => setQuestionnaireCompleted(true)} />;
  }

  // Has trades — show redesigned Dashboard
  const showPropFirmRules =
    activeAccount?.objectives?.isEnabled &&
    objectivesProgress &&
    objectivesProgress.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: 4 stat cards */}
      <DashStatCards closedTrades={closedTrades} />

      {/* Row 2: Trading Health Score */}
      <TradingHealthScore closedTrades={closedTrades} />

      {/* Row 3: Prop Firm Rules (only when account has objectives enabled) */}
      {showPropFirmRules && activeAccount && (
        <PropFirmRulesPanel
          objectives={objectivesProgress!}
          account={activeAccount}
        />
      )}

      {/* Row 4: Equity Curve + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <DashEquityCurve
            closedTrades={closedTrades}
            account={activeAccount}
          />
        </div>
        <div className="xl:col-span-1">
          <DashRecentActivity closedTrades={closedTrades} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
