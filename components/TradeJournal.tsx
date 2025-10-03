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
import Checkbox from './ui/Checkbox';
import { TrashIcon } from './icons/TrashIcon';

type TradeView = 'live' | 'pending' | 'history';
type AddTradeStep = 'closed' | 'checklist' | 'form';
type DateFilter = 'all-time' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom-range';

const TradeJournal: React.FC = () => {
  const { activeAccount, objectivesProgress, smartLimitsProgress, isLoading: isAccountLoading } = useAccount();
  const { liveTrades, pendingTrades, closedTrades, isLoading: isTradeLoading, bulkDeleteTrades } = useTrade();
  const { enforceChecklist } = useSettings();
  const { rules } = useChecklist();
  const { isTrialExpired } = useAuth();
  const { showUpgradeModal } = useSubscription();
  const { isAddTradeModalOpenRequest, clearAddTradeModalRequest } = useUI();

  const [addTradeStep, setAddTradeStep] = useState<AddTradeStep>('closed');
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [currentView, setCurrentView] = useState<TradeView>('history');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // State for bulk actions
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const headers = {
    live: ['', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'SL / TP', 'Actions'],
    history: ['', '', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Result', 'Pips', 'Net P/L', 'Actions'],
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
          return exitDate >= startOfWeek && exitDate <= now;
        case 'this-month':
          return exitDate.getFullYear() === startOfMonth.getFullYear() && exitDate.getMonth() === startOfMonth.getMonth();
        case 'custom-range': {
          if (!customStartDate || !customEndDate) return true;
          const startDate = new Date(`${customStartDate}T00:00:00.000Z`);
          const endDate = new Date(`${customEndDate}T23:59:59.999Z`);
          return exitDate >= startDate && exitDate <= endDate;
        }
        default:
          return true;
      }
    });
  }, [closedTrades, dateFilter, customStartDate, customEndDate]);

  const totalPnl = useMemo(() => {
    return filteredClosedTrades.reduce((acc, trade) => acc + (trade.profitLoss ?? 0), 0);
  }, [filteredClosedTrades]);

  // Clear selection when view or filter changes
  useEffect(() => {
    setSelectedTradeIds([]);
  }, [currentView, dateFilter, customStartDate, customEndDate, activeAccount]);


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
    setIsDeleteConfirmOpen(false);
  };

  // --- Bulk Action Handlers ---
  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTradeIds(filteredClosedTrades.map(t => t.id));
    } else {
      setSelectedTradeIds([]);
    }
  };

  const handleToggleSelect = (tradeId: string) => {
    setSelectedTradeIds(prev =>
      prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedTradeIds.length === 0) return;
    try {
      await bulkDeleteTrades(selectedTradeIds);
      setSelectedTradeIds([]);
      setIsDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete trades: ${err.message}`);
    }
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
        return filteredClosedTrades.map(trade => (
          <TradeRow
            key={trade.id}
            trade={trade}
            onEdit={() => handleOpenEditTrade(trade)}
            isSelected={selectedTradeIds.includes(trade.id)}
            onSelect={handleToggleSelect}
          />
        ));
      default:
        return null;
    }
  };
  
  const renderModal = () => {
    if (addTradeStep !== 'form') return null;

    if (editingTrade) {
      if (editingTrade.result) {
        return (
          <Modal title={`Edit Closed Trade: ${editingTrade.asset}`} onClose={closeModals} size="4xl">
            <EditTradeForm tradeToEdit={editingTrade} onSuccess={closeModals} />
          </Modal>
        );
      }
      const title = editingTrade.isPendingOrder ? "Edit Pending Order" : `Edit Live Trade: ${editingTrade.asset}`;
      return (
        <Modal title={title} onClose={closeModals} size="lg">
          <AddTradeForm tradeToEdit={editingTrade} onSuccess={closeModals} />
        </Modal>
      );
    }

    return (
      <Modal title="Log Trade" onClose={closeModals} size="lg">
        <AddTradeForm onSuccess={closeModals} />
      </Modal>
    );
  };
  
  const isAllSelected = filteredClosedTrades.length > 0 && selectedTradeIds.length === filteredClosedTrades.length;
  const isPartiallySelected = selectedTradeIds.length > 0 && !isAllSelected;


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
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'this-week', label: 'This Week' },
                    { value: 'this-month', label: 'This Month' },
                    { value: 'all-time', label: 'All Time' },
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

        <div className="border-b border-photonic-blue/20 mb-4 flex justify-between items-end">
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
          {currentView === 'history' && filteredClosedTrades.length > 0 && (
            <div className="pb-2 text-sm">
              <span className="text-future-gray">Total P/L: </span>
              <span className={`font-tech-mono font-bold ${totalPnl >= 0 ? 'text-momentum-green' : 'text-risk-high'}`}>
                {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {selectedTradeIds.length > 0 && currentView === 'history' && (
          <div className="bg-photonic-blue/10 border border-photonic-blue/20 rounded-lg px-4 py-2 mb-4 flex justify-between items-center animate-fade-in-up">
            <span className="text-sm font-semibold text-future-light">{selectedTradeIds.length} trades selected</span>
            <Button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="w-auto flex items-center gap-2 px-3 py-1.5 text-sm bg-risk-high text-white hover:bg-risk-high/90 shadow-glow-red"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}

        <div className="overflow-x-auto table-scrollbar">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-photonic-blue/30">
                {currentView === 'history' && (
                  <th className="p-3 w-12">
                    <Checkbox
                      id="select-all"
                      onChange={handleToggleSelectAll}
                      checked={isAllSelected}
                      indeterminate={isPartiallySelected}
                      disabled={filteredClosedTrades.length === 0}
                    />
                  </th>
                )}
                {headers[currentView].slice(currentView === 'history' ? 1 : 0).map((header, index) => (
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
      
      {isDeleteConfirmOpen && (
        <Modal title="Confirm Deletion" onClose={closeModals} size="md">
            <div className="text-center">
                <p className="text-future-gray">Are you sure you want to permanently delete these {selectedTradeIds.length} trades?</p>
                <p className="text-sm text-risk-medium mt-2">This action cannot be undone.</p>
                <div className="mt-6 flex justify-center gap-4">
                    <Button onClick={closeModals} variant="secondary" className="w-auto">Cancel</Button>
                    <Button onClick={handleDeleteSelected} className="w-auto bg-risk-high text-white hover:bg-risk-high/90 shadow-glow-red">
                        Delete
                    </Button>
                </div>
            </div>
        </Modal>
      )}
    </>
  );
};

export default TradeJournal;