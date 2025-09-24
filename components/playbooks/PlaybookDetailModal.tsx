import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Playbook, PlaybookStats } from '../../types';
import Button from '../ui/Button';
import { PencilIcon } from '../icons/PencilIcon';
import { useTrade } from '../../context/TradeContext';
import TradeRow from '../TradeRow';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PlaybookStatsTab from './PlaybookStatsTab';
import { usePlaybook } from '../../context/PlaybookContext';
import { TrashIcon } from '../icons/TrashIcon';

interface PlaybookDetailModalProps {
  playbook: Playbook;
  onClose: () => void;
  onEdit: () => void;
}

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-photonic-blue/10 text-photonic-blue text-xs font-semibold px-2.5 py-1 rounded-full">
    {children}
  </span>
);

const ChecklistDisplay: React.FC<{ title: string, items: { text: string }[] }> = ({ title, items }) => (
  <div>
    <h4 className="font-semibold text-future-light mb-2">{title}</h4>
    <ul className="list-disc list-inside space-y-1 text-sm text-future-gray">
      {items.map((item, index) => <li key={index}>{item.text}</li>)}
    </ul>
  </div>
);

const PlaybookDetailsTab: React.FC<{ playbook: Playbook }> = ({ playbook }) => {
  const { trades, isLoading: tradesLoading } = useTrade();
  const relevantTrades = trades.filter(trade => trade.playbookId === playbook.id);

  return (
    <div className="space-y-6">
      {/* --- HEADER --- */}
      <section>
        <p className="text-future-gray italic">{playbook.coreIdea}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {playbook.tradingStyles.map(tag => <Tag key={tag}>{tag}</Tag>)}
          {playbook.instruments.map(tag => <Tag key={tag}>{tag}</Tag>)}
          {playbook.timeframes.map(tag => <Tag key={tag}>{tag}</Tag>)}
        </div>
      </section>

      {/* --- PROS & CONS --- */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-orbitron text-momentum-green/80 mb-2">Pros</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-future-light">
            {playbook.pros.map((pro, i) => <li key={i}>{pro}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-orbitron text-risk-high/80 mb-2">Cons to Manage</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-future-light">
            {playbook.cons.map((con, i) => <li key={i}>{con}</li>)}
          </ul>
        </div>
      </section>

      {/* --- SETUPS --- */}
      <section>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-4 border-t border-photonic-blue/10 pt-4">Setups</h2>
        <div className="space-y-6">
          {playbook.setups.map(setup => (
            <div key={setup.id} className="p-4 bg-future-dark/50 rounded-lg">
              <h3 className="text-lg font-semibold text-future-light mb-4">{setup.name}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <ChecklistDisplay title="Entry Criteria" items={setup.entryCriteria} />
                  <ChecklistDisplay title="Risk Management" items={setup.riskManagement} />
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-future-gray">Ideal 'Before' Chart</span>
                    {setup.screenshotBeforeUrl ? <img src={setup.screenshotBeforeUrl} alt="Before" className="mt-1 rounded-md border border-future-panel" /> : <div className="mt-1 h-24 bg-future-dark/50 rounded-md flex items-center justify-center text-xs text-future-gray">Not provided</div>}
                  </div>
                  <div>
                    <span className="text-xs text-future-gray">Ideal 'After' Chart</span>
                    {setup.screenshotAfterUrl ? <img src={setup.screenshotAfterUrl} alt="After" className="mt-1 rounded-md border border-future-panel" /> : <div className="mt-1 h-24 bg-future-dark/50 rounded-md flex items-center justify-center text-xs text-future-gray">Not provided</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- TRADE GALLERY --- */}
      <section>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-4 border-t border-photonic-blue/10 pt-4">Trade Gallery</h2>
        {tradesLoading ? <p>Loading trades...</p> : relevantTrades.length > 0 ? (
          <div className="overflow-x-auto table-scrollbar -mx-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-photonic-blue/30">
                  {['', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Result', 'Net P/L', 'Actions'].map((header, index) => (
                    <th key={header} className={`p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs ${index === 0 ? 'w-12' : ''}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relevantTrades.map(trade => <TradeRow key={trade.id} trade={trade} onEdit={() => {}} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-future-gray">No trades have been logged with this playbook yet.</p>
        )}
      </section>
    </div>
  );
};

const PlaybookDetailModal: React.FC<PlaybookDetailModalProps> = ({ playbook, onClose, onEdit }) => {
  const { accessToken } = useAuth();
  const { deletePlaybook } = usePlaybook();
  const [activeTab, setActiveTab] = useState<'details' | 'stats'>('details');
  const [stats, setStats] = useState<PlaybookStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!accessToken) return;
      setIsLoadingStats(true);
      try {
        const data = await api.getPlaybookStats(playbook.id, accessToken);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch playbook stats", error);
        setStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, [playbook.id, accessToken]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this playbook?')) {
      await deletePlaybook(playbook.id);
      onClose();
    }
  };

  return (
    <Modal title={playbook.name} onClose={onClose} size="4xl">
      <div className="absolute top-4 right-20 flex items-center gap-4">
        <Button onClick={onEdit} variant="link" className="flex items-center gap-1 text-sm p-0">
          <PencilIcon className="w-4 h-4 mr-1" /> Edit
        </Button>
         <Button onClick={handleDelete} variant="link" className="flex items-center gap-1 text-sm p-0 text-risk-high">
          <TrashIcon className="w-4 h-4 mr-1" /> Delete
        </Button>
      </div>

      <div className="border-b border-photonic-blue/20 mb-4">
        <nav className="flex space-x-4 -mt-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'details' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
          >
            Playbook Details
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'stats' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
          >
            Performance Stats
          </button>
        </nav>
      </div>

      {activeTab === 'details' && <PlaybookDetailsTab playbook={playbook} />}
      {activeTab === 'stats' && <PlaybookStatsTab stats={stats} isLoading={isLoadingStats} />}

    </Modal>
  );
};

export default PlaybookDetailModal;