import React, { useState } from 'react';
import Card from './Card';
import { useAccount } from '../context/AccountContext';
import Button from './ui/Button';
import { useTrade } from '../context/TradeContext';
import TradeRow from './TradeRow';
import Spinner from './Spinner';
import { PlusIcon } from './icons/PlusIcon';
import Modal from './ui/Modal';
import TradeForm from './trades/AddTradeForm';
import PendingOrderRow from './trades/PendingOrderRow';
import { useSettings } from '../context/SettingsContext';
import { useChecklist } from '../context/ChecklistContext';
import PreFlightChecklistModal from './trades/PreFlightChecklistModal';
import { Trade } from '../types';

type JournalView = 'active' | 'pending';
type AddTradeStep = 'closed' | 'checklist' | 'form';

const TradeJournal: React.FC = () => {
  const { activeAccount, isLoading: isAccountLoading } = useAccount();
  const { trades, pendingTrades, isLoading: isTradeLoading } = useTrade();
  const { enforceChecklist } = useSettings();
  const { rules } = useChecklist();
  const [addTradeStep, setAddTradeStep] = useState<AddTradeStep>('closed');
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [currentView, setCurrentView] = useState<JournalView>('active');

  const headers = [
    '', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Notes', 'Actions'
  ];

  const pendingHeaders = [
    'Date Created', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Strategy', 'Notes', 'Actions'
  ];

  const handleOpenAddTrade = () => {
    setEditingTrade(null);
    if (enforceChecklist && rules.length > 0) {
      setAddTradeStep('checklist');
    } else {
      setAddTradeStep('form');
    }
  };
  
  const handleOpenEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setAddTradeStep('form');
  };

  const handleChecklistSuccess = () => {
    setAddTradeStep('form');
  };

  const closeModals = () => {
    setAddTradeStep('closed');
    setEditingTrade(null);
  };

  const renderContent = () => {
    if (isAccountLoading || isTradeLoading) {
      return (
        <tr>
          <td colSpan={headers.length} className="text-center p-8 text-future-gray">
            <Spinner />
          </td>
        </tr>
      );
    }

    if (!activeAccount) {
      return (
        <tr>
          <td colSpan={headers.length} className="text-center p-16 text-future-gray">
            <h3 className="text-lg font-semibold text-future-light mb-2">Welcome to your Trade Journal</h3>
            <p className="mb-4">Create or select a broker account to get started.</p>
          </td>
        </tr>
      );
    }
    
    if (currentView === 'active' && trades.length === 0) {
      return (
        <tr>
          <td colSpan={headers.length} className="text-center p-8 text-future-gray">
            No active trades logged for this account yet.
          </td>
        </tr>
      );
    }
    
    if (currentView === 'pending' && pendingTrades.length === 0) {
      return (
        <tr>
          <td colSpan={pendingHeaders.length} className="text-center p-8 text-future-gray">
            You have no pending orders for this account.
          </td>
        </tr>
      );
    }

    if (currentView === 'active') {
      return trades.map((trade) => <TradeRow key={trade.id} trade={trade} onEdit={() => handleOpenEditTrade(trade)} />);
    }

    if (currentView === 'pending') {
        return pendingTrades.map((trade) => <PendingOrderRow key={trade.id} trade={trade} />);
    }

  };

  return (
    <>
      <Card className="opacity-0 animate-fade-in-up [animation-delay:0.3s]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-orbitron text-future-light">Trade Journal</h2>
            <p className="text-future-gray text-sm">Log and review your trading activity for <span className="text-future-light font-semibold">{activeAccount?.name || '...'}</span></p>
          </div>
          <Button onClick={handleOpenAddTrade} className="w-full md:w-auto flex items-center justify-center gap-2" disabled={!activeAccount}>
            <PlusIcon className="w-5 h-5" />
            <span>Add New Trade</span>
          </Button>
        </div>

        <div className="border-b border-photonic-blue/20 mb-4">
          <nav className="flex space-x-4">
            <button
              onClick={() => setCurrentView('active')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${currentView === 'active' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
            >
              Journal ({trades.length})
            </button>
            <button
              onClick={() => setCurrentView('pending')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${currentView === 'pending' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
            >
              Pending Orders ({pendingTrades.length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto table-scrollbar">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-photonic-blue/30">
                {(currentView === 'active' ? headers : pendingHeaders).map((header, index) => (
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
        <PreFlightChecklistModal
          onSuccess={handleChecklistSuccess}
          onClose={closeModals}
        />
      )}

      {addTradeStep === 'form' && (
        <Modal 
          title={editingTrade ? "Edit Trade" : "Add New Trade"} 
          onClose={closeModals}
          size={editingTrade ? '4xl' : 'lg'}
        >
          <TradeForm tradeToEdit={editingTrade} onSuccess={closeModals} />
        </Modal>
      )}
    </>
  );
};

export default TradeJournal;
