import React from 'react';
import { useTrade } from '../../context/TradeContext';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Spinner from '../Spinner';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import GettingStartedGuide from './GettingStartedGuide';
import DashStatCards from './redesign/DashStatCards';
import PropFirmRulesPanel from './redesign/PropFirmRulesPanel';
import DashEquityCurve from './redesign/DashEquityCurve';
import DashRecentActivity from './redesign/DashRecentActivity';
import TradingHealthScore from './redesign/TradingHealthScore';
import QuantDashPanel from './redesign/QuantDashPanel';

const Dashboard: React.FC = () => {
  const {
    closedTrades,
    liveTrades,
    isLoading: tradesLoading,
    isTradesSynced,
  } = useTrade();
  const { activeAccount, objectivesProgress, isLoading: accountLoading } = useAccount();
  const { quantEnabled } = useAuth();
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

  const showPropFirmRules =
    activeAccount?.objectives?.isEnabled &&
    objectivesProgress &&
    objectivesProgress.length > 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Row 1: KPI StatTile grid (top third — most important numbers, scannable) ── */}
      <DashStatCards closedTrades={closedTrades} />

      {/* ── Row 2: Primary — equity curve (flex-1) + prop firm rules (fixed ~320px) ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0 flex flex-col">
          <DashEquityCurve
            closedTrades={closedTrades}
            account={activeAccount}
          />
        </div>
        {showPropFirmRules && activeAccount && (
          <div className="w-full lg:w-80 flex-shrink-0 flex flex-col">
            <PropFirmRulesPanel
              objectives={objectivesProgress!}
              account={activeAccount}
            />
          </div>
        )}
      </div>

      {/* ── Row 3: Secondary — recent activity DataTable (flex-1) + trading health (fixed ~320px) ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0 flex flex-col">
          <DashRecentActivity closedTrades={closedTrades} />
        </div>
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col">
          <TradingHealthScore closedTrades={closedTrades} />
        </div>
      </div>

      {/* ── Row 4: Quant — shown only when quantEnabled ── */}
      {quantEnabled && <QuantDashPanel />}

    </div>
  );
};

export default Dashboard;
