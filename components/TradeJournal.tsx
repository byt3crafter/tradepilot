import React, { useState } from 'react';
import Card from './Card';
import { useAccount } from '../context/AccountContext';
import Button from './ui/Button';
import { useTrade } from '../context/TradeContext';
import TradeRow from './TradeRow';
import Spinner from './Spinner';
import { PlusIcon } from './icons/PlusIcon';
import Modal from './ui/Modal';
import AddTradeForm from './trades/AddTradeForm';
import PendingOrderRow from './trades/PendingOrderRow';
import { useSettings } from '../context/SettingsContext';
import { useChecklist } from '../context/ChecklistContext';
import PreTradeChecklistModal from './trades/PreFlightChecklistModal';
import { Trade } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import LiveTradeRow from './trades/LiveTradeRow.tsx';
import CloseTradeModal from './trades/CloseTradeModal';
import { DropdownMenu, DropdownMenuItem } from './ui/DropdownMenu';

type TradeView = 'live' | 'pending' | 'history';
type AddTradeStep = 'closed' | 'checklist' | 'form';

const TradeJournal: React.FC = () => {
  const { activeAccount, objectivesProgress, smartLimitsProgress, isLoading: isAccountLoading } = useAccount();
  const { liveTrades, pendingTrades, closedTrades, isLoading: isTradeLoading } = useTrade();
  const { enforceChecklist } = useSettings();
  const { rules } = useChecklist();
  const { isTrialExpired } = useAuth();
  const { showUpgradeModal } = useSubscription();

  const [addTradeStep, setAddTradeStep] = useState<AddTradeStep>('closed');
  const [isPending, setIsPending] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [currentView, setCurrentView] = useState<TradeView>('live');

  const headers = {
    live: ['', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'SL / TP', 'Actions'],
    history: ['', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Result', 'Net P/L', 'Actions'],
    pending: ['', 'Date Created', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Strategy', 'Actions'],
  };

  const dailyLossRule = objectivesProgress?.find(obj => obj.key === 'maxDailyLoss');
  const isObjectiveBlocked = dailyLossRule?.status === 'Failed';
  
  const isSmartLimitBlocked = smartLimitsProgress?.isTradeCreationBlocked ?? false;
  const blockReason = isObjectiveBlocked ? 'Daily loss limit reached.' : smartLimitsProgress?.blockReason;

  const handleOpenAddTrade = (pending: boolean) => {
    if (isTrialExpired) {
      showUpgradeModal();
      return;
    }
    if (isObjectiveBlocked || isSmartLimitBlocked) return;

    setEditingTrade(null);
    setIsPending(pending);
    if (enforceChecklist && rules.length > 0) {
      setAddTradeStep('checklist');
    } else {
      setAddTradeStep('form');
    }
  };
  
  const handleOpenEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsPending(trade.isPendingOrder);
    setAddTradeStep('form');
  };

  const handleOpenCloseTrade = (trade: Trade) => {
    setClosingTrade(trade);
  };

  const handleChecklistSuccess = () => {
    setAddTradeStep('form');
  };

  const closeModals = () => {
    setAddTradeStep('closed');
    setEditingTrade(null);
    setClosingTrade(null);
  };

  const renderContent = () => {
    if (isAccountLoading || isTradeLoading) {
      return (
        <tr>
          <td colSpan={headers[currentView].length} className="text-center p-8 text-future-gray">
            <Spinner />
          </td>
        </tr>
      );
    }

    if (!activeAccount) {
      return (
        <tr>
          <td colSpan={headers[currentView].length} className="text-center p-16 text-future-gray">
            <h3 className="text-lg font-semibold text-future-light mb-2">Welcome to your Trade Journal</h3>
            <p className="mb-4">Create or select a broker account to get started.</p>
          </td>
        </tr>
      );
    }
    
    if (currentView === 'live' && liveTrades.length === 0) return <tr><td colSpan={headers.live.length} className="text-center p-8 text-future-gray">No live trades in the market.</td></tr>;
    if (currentView === 'pending' && pendingTrades.length === 0) return <tr><td colSpan={headers.pending.length} className="text-center p-8 text-future-gray">You have no pending orders.</td></tr>;
    if (currentView === 'history' && closedTrades.length === 0) return <tr><td colSpan={headers.history.length} className="text-center p-8 text-future-gray">No closed trades logged for this account yet.</td></tr>;

    switch(currentView) {
      case 'live':
        return liveTrades.map(trade => <LiveTradeRow key={trade.id} trade={trade} onEdit={() => handleOpenEditTrade(trade)} onClose={() => handleOpenCloseTrade(trade)} />);
      case 'pending':
        return pendingTrades.map(trade => <PendingOrderRow key={trade.id} trade={trade} onEdit={() => handleOpenEditTrade(trade)} />);
      case 'history':
        return closedTrades.map(trade => <TradeRow key={trade.id} trade={trade} onEdit={() => handleOpenEditTrade(trade)} />);
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="opacity-0 animate-fade-in-up [animation-delay:0.3s]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-orbitron text-future-light">Trade Journal</h2>
            <p className="text-future-gray text-sm">Log and review your trades for <span className="text-future-light font-semibold">{activeAccount?.name || '...'}</span></p>
          </div>
          <div className="relative">
             <DropdownMenu>
                <DropdownMenuItem onSelect={() => handleOpenAddTrade(false)}>
                    Log Live Trade
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => handleOpenAddTrade(true)}>
                    Log Pending Order
                </DropdownMenuItem>
             </DropdownMenu>

            {(isObjectiveBlocked || isSmartLimitBlocked) && (
                 <div className="absolute -top-10 right-0 text-xs bg-risk-high text-white px-2 py-1 rounded-md shadow-lg w-max max-w-xs text-center">
                    {blockReason}
                </div>
            )}
          </div>
        </div>

        <div className="border-b border-photonic-blue/20 mb-4">
          <nav className="flex space-x-4">
            <button
              onClick={() => setCurrentView('live')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${currentView === 'live' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
            >
              Live Trades ({liveTrades.length})
            </button>
            <button
              onClick={() => setCurrentView('pending')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${currentView === 'pending' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
            >
              Pending Orders ({pendingTrades.length})
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${currentView === 'history' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
            >
              Trading History ({closedTrades.length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto table-scrollbar">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-photonic-blue/30">
                {headers[currentView].map((header, index) => (
                  <th 
                    key={header} 
                    className={`p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs ${index === 0 ? 'w-12' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderContent()}
            </tbody>
          </table>
        </div>
      </Card>

      {addTradeStep === 'checklist' && (
        <PreTradeChecklistModal
          onSuccess={handleChecklistSuccess}
          onClose={closeModals}
        />
      )}

      {addTradeStep === 'form' && (
        <Modal 
          title={editingTrade ? (isPending ? "Edit Pending Order" : "Edit Live Trade") : (isPending ? "Log Pending Order" : "Log Live Trade")}
          onClose={closeModals}
          size='lg'
        >
          <AddTradeForm tradeToEdit={editingTrade} isPending={isPending} onSuccess={closeModals} />
        </Modal>
      )}

      {closingTrade && (
        <CloseTradeModal
          tradeToClose={closingTrade}
          onClose={closeModals}
        />
      )}
    </>
  );
};

export default TradeJournal;