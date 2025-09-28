import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import EditTradeForm from './trades/EditTradeForm';
import SelectInput from './ui/SelectInput';
import { useUI } from '../context/UIContext';

type TradeView = 'live' | 'pending' | 'history';
type AddTradeStep = 'closed' | 'checklist' | 'form';
type DateFilter = 'all-time' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom-range';

const TradeJournal: React.FC = () => {
  const { activeAccount, objectivesProgress, smartLimitsProgress, isLoading: isAccountLoading } = useAccount();
  const { liveTrades, pendingTrades, closedTrades, isLoading: isTradeLoading } = useTrade();
  const { enforceChecklist } = useSettings();
  const { rules } = useChecklist();
  const { isTrialExpired } = useAuth();
  const { showUpgradeModal } = useSubscription();
  const { isAddTradeModalOpenRequest, clearAddTradeModalRequest } = useUI();

  const [addTradeStep, setAddTradeStep] = useState<AddTradeStep>('closed');
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [currentView, setCurrentView] = useState<TradeView>('history');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const headers = {
    live: ['', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'SL / TP', 'Actions'],
    history: ['', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Result', 'Pips', 'Net P/L', 'Actions'],
    pending: ['', 'Date Created', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Playbook', 'Actions'],
  };

  const dailyLossRule = objectivesProgress?.find(obj => obj.key === 'maxDailyLoss');
  const isObjectiveBlocked = dailyLossRule?.status === 'Failed';
  
  const isSmartLimitBlocked = smartLimitsProgress?.isTradeCreationBlocked ?? false;
  const blockReason = isObjectiveBlocked ? 'Daily loss limit reached.' : smartLimitsProgress?.blockReason;

  const filteredClosedTrades = useMemo(() => {
    if (dateFilter === 'all-time') {
      return closedTrades;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Assuming Sunday is the start of the week (day 0)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - now.getDay()); 
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return closedTrades.filter(trade => {
      if (!trade.exitDate) return false;
      const exitDate = new Date(trade.exitDate);
      const exitDateDayOnly = new Date(exitDate.getFullYear(), exitDate.getMonth(), exitDate.getDate());

      switch (dateFilter) {
        case 'today':
          return exitDateDayOnly.getTime() === today.getTime();
        case 'yesterday':
          return exitDateDayOnly.getTime() === yesterday.getTime();
        case 'this-week':
          // Must be on or after the start of the week and before or on today
          return exitDate >= startOfWeek && exitDate <= now;
        case 'this-month':
          return exitDate.getFullYear() === startOfMonth.getFullYear() && exitDate.getMonth() === startOfMonth.getMonth();
        case 'custom-range': {
          if (!customStartDate || !customEndDate) return true;
          
          const startParts = customStartDate.split('-').map(Number);
          const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
          startDate.setHours(0, 0, 0, 0);

          const endParts = customEndDate.split('-').map(Number);
          const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
          endDate.setHours(23, 59, 59, 999);
          
          return exitDate >= startDate && exitDate <= endDate;
        }
        default:
          return true;
      }
    });
  }, [closedTrades, dateFilter, customStartDate, customEndDate]);


  const handleOpenAddTrade = useCallback(() => {
    if (isTrialExpired) {
      showUpgradeModal();
      return;
    }
    if (isObjectiveBlocked || isSmartLimitBlocked) return;

    setEditingTrade(null);
    if (enforceChecklist && rules.length > 0) {
      setAddTradeStep('checklist');
    } else {
      setAddTradeStep('form');
    }
  }, [isTrialExpired, showUpgradeModal, isObjectiveBlocked, isSmartLimitBlocked, enforceChecklist, rules.length]);

  useEffect(() => {
      if (isAddTradeModalOpenRequest) {
        handleOpenAddTrade();
        clearAddTradeModalRequest();
      }
  }, [isAddTradeModalOpenRequest, clearAddTradeModalRequest, handleOpenAddTrade]);
  
  const handleOpenEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
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
    if (currentView === 'history' && filteredClosedTrades.length === 0) {
        const message = dateFilter === 'all-time' 
            ? 'No closed trades logged for this account yet.'
            : 'No closed trades found for the selected period.';
        return <tr><td colSpan={headers.history.length} className="text-center p-8 text-future-gray">{message}</td></tr>;
    }

    switch(currentView) {
      case 'live':
        return liveTrades.map(trade => <LiveTradeRow key={trade.id} trade={trade} onEdit={() => handleOpenEditTrade(trade)} onClose={() => handleOpenCloseTrade(trade)} />);
      case 'pending':
        return pendingTrades.map(trade => <PendingOrderRow key={trade.id} trade={trade} onEdit={() => handleOpenEditTrade(trade)} />);
      case 'history':
        return filteredClosedTrades.map(trade => <TradeRow key={trade.id} trade={trade} onEdit={() => handleOpenEditTrade(trade)} />);
      default:
        return null;
    }
  };
  
  const renderModal = () => {
    if (addTradeStep !== 'form') return null;

    if (editingTrade) {
      // If the trade is closed (has a result), show the comprehensive edit form.
      if (editingTrade.result) {
        return (
          <Modal title={`Edit Closed Trade: ${editingTrade.asset}`} onClose={closeModals} size="4xl">
            <EditTradeForm tradeToEdit={editingTrade} onSuccess={closeModals} />
          </Modal>
        );
      }
      // Otherwise (live or pending), show the simpler entry form.
      const title = editingTrade.isPendingOrder ? "Edit Pending Order" : `Edit Live Trade: ${editingTrade.asset}`;
      return (
        <Modal title={title} onClose={closeModals} size="lg">
          <AddTradeForm tradeToEdit={editingTrade} onSuccess={closeModals} />
        </Modal>
      );
    }

    // This is for creating a new trade.
    return (
      <Modal title="Log Trade" onClose={closeModals} size="lg">
        <AddTradeForm onSuccess={closeModals} />
      </Modal>
    );
  };


  return (
    <>
      <Card className="opacity-0 animate-fade-in-up [animation-delay:0.3s]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-orbitron text-future-light">Trade Journal</h2>
            <p className="text-future-gray text-sm">Log and review your trades for <span className="text-future-light font-semibold">{activeAccount?.name || '...'}</span></p>
          </div>
          <div className="flex items-center gap-4">
            {currentView === 'history' && (
              <div className="flex items-end gap-2">
                <SelectInput
                  label=""
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  options={[
                    { value: 'all-time', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'this-week', label: 'This Week' },
                    { value: 'this-month', label: 'This Month' },
                    { value: 'custom-range', label: 'Custom Range' },
                  ]}
                  containerClassName="w-40"
                />
                 {dateFilter === 'custom-range' && (
                    <div className="flex items-end gap-2 animate-fade-in-up">
                        <div>
                            <label htmlFor="startDate" className="block text-xs font-medium text-future-gray mb-1">From</label>
                            <input
                                id="startDate"
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-future-dark border border-photonic-blue/30 rounded-md px-3 py-2 text-sm text-future-light focus:outline-none focus:ring-2 focus:ring-photonic-blue transition-shadow"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-xs font-medium text-future-gray mb-1">To</label>
                            <input
                                id="endDate"
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-future-dark border border-photonic-blue/30 rounded-md px-3 py-2 text-sm text-future-light focus:outline-none focus:ring-2 focus:ring-photonic-blue transition-shadow"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                    </div>
                )}
              </div>
            )}
            <div className="relative">
               <Button onClick={handleOpenAddTrade} disabled={isObjectiveBlocked || isSmartLimitBlocked} className="w-auto flex items-center gap-2 px-3 py-2 text-sm">
                  <PlusIcon className="w-5 h-5" />
                  <span>Log Trade</span>
               </Button>

              {(isObjectiveBlocked || isSmartLimitBlocked) && (
                   <div className="absolute -top-10 right-0 text-xs bg-risk-high text-white px-2 py-1 rounded-md shadow-lg w-max max-w-xs text-center">
                      {blockReason}
                  </div>
              )}
            </div>
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
              Trading History ({filteredClosedTrades.length})
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

      {renderModal()}

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