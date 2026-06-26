import React, { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import { Playbook, PlaybookStats, Trade } from '../../types';
import { Button, Tabs, Badge, Panel, EmptyState } from '../ui';
import type { Tab } from '../ui';
import { PencilIcon } from '../icons/PencilIcon';
import { useTrade } from '../../context/TradeContext';
import TradeRow from '../TradeRow';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PlaybookStatsTab from './PlaybookStatsTab';
import { usePlaybook } from '../../context/PlaybookContext';
import { TrashIcon } from '../icons/TrashIcon';
import TradeFormModal from '../trades/TradeFormModal';

interface PlaybookDetailModalProps {
  playbook: Playbook;
  onClose: () => void;
  onEdit: () => void;
}

// ─── Tag chip ────────────────────────────────────────────────────────────────
const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-jtp-xs px-2.5 py-[3px] rounded-jtp-md bg-jtp-blue/10 text-jtp-blue font-medium">
    {children}
  </span>
);

// ─── Checklist display (read-only) ────────────────────────────────────────────
const ChecklistDisplay: React.FC<{ title: string; items: { text: string }[] }> = ({ title, items }) => (
  <div>
    <div className="jtp-label mb-2">{title}</div>
    {items.length === 0 ? (
      <p className="text-jtp-md text-jtp-textFaint italic">Not defined</p>
    ) : (
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-jtp-lg text-jtp-textSoft leading-snug">
            <span className="text-jtp-textDim shrink-0 mt-px">·</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ─── Playbook details tab ─────────────────────────────────────────────────────
const PlaybookDetailsTab: React.FC<{ playbook: Playbook; onEditTrade: (trade: Trade) => void }> = ({
  playbook,
  onEditTrade,
}) => {
  const { closedTrades, isLoading: tradesLoading } = useTrade();
  const relevantTrades = closedTrades.filter(trade => trade.playbookId === playbook.id);

  const allTags = [
    ...playbook.tradingStyles,
    ...playbook.instruments,
    ...playbook.timeframes,
  ];

  return (
    <div className="space-y-5">
      {/* Header — core idea + tags */}
      <Panel label="OVERVIEW">
        <div className="space-y-3">
          {playbook.coreIdea && (
            <p className="text-jtp-lg text-jtp-textMuted leading-relaxed">{playbook.coreIdea}</p>
          )}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => <Tag key={tag}>{tag}</Tag>)}
            </div>
          )}
        </div>
      </Panel>

      {/* Pros & Cons */}
      {(playbook.pros.length > 0 || playbook.cons.length > 0) && (
        <Panel label="EDGE ANALYSIS">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="jtp-label text-jtp-profit mb-2">PROS</div>
              <ul className="space-y-1">
                {playbook.pros.filter(Boolean).map((pro, i) => (
                  <li key={i} className="flex gap-2 text-jtp-lg text-jtp-textSoft leading-snug">
                    <span className="text-jtp-profit shrink-0 mt-px">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="jtp-label text-jtp-loss mb-2">CONS TO MANAGE</div>
              <ul className="space-y-1">
                {playbook.cons.filter(Boolean).map((con, i) => (
                  <li key={i} className="flex gap-2 text-jtp-lg text-jtp-textSoft leading-snug">
                    <span className="text-jtp-loss shrink-0 mt-px">−</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {/* Setups */}
      {playbook.setups.length > 0 && (
        <Panel label="SETUPS">
          <div className="space-y-4">
            {playbook.setups.map(setup => (
              <div
                key={setup.id}
                className="bg-jtp-raised border border-jtp-border rounded-jtp-panel p-4"
              >
                <div className="font-semibold text-jtp-lg text-jtp-text mb-4">{setup.name}</div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left — criteria */}
                  <div className="space-y-4">
                    <ChecklistDisplay title="ENTRY CRITERIA"     items={setup.entryCriteria} />
                    {setup.confirmationFilters && setup.confirmationFilters.length > 0 && (
                      <ChecklistDisplay title="CONFIRMATION FILTERS" items={setup.confirmationFilters} />
                    )}
                    {setup.exitRules && setup.exitRules.length > 0 && (
                      <ChecklistDisplay title="EXIT RULES"       items={setup.exitRules} />
                    )}
                    <ChecklistDisplay title="RISK MANAGEMENT"   items={setup.riskManagement} />

                    {setup.riskSettings && (
                      <div className="p-3 bg-jtp-shell rounded-jtp-md border border-jtp-borderSubtle">
                        <div className="jtp-label mb-2">RISK PARAMETERS</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-jtp-xs text-jtp-textDim mb-0.5">Risk %</div>
                            <div className="font-mono font-semibold text-jtp-lg text-jtp-textSoft">
                              {setup.riskSettings.riskPercent}%
                            </div>
                          </div>
                          <div>
                            <div className="text-jtp-xs text-jtp-textDim mb-0.5">Stop Loss Type</div>
                            <div className="font-semibold text-jtp-lg text-jtp-textSoft">
                              {setup.riskSettings.stopLossType}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right — screenshots */}
                  <div className="space-y-3">
                    <div>
                      <div className="jtp-label mb-1">BEFORE CHART</div>
                      {setup.screenshotBeforeUrl ? (
                        <img
                          src={setup.screenshotBeforeUrl}
                          alt="Before"
                          className="rounded-jtp-md border border-jtp-border w-full"
                        />
                      ) : (
                        <div className="h-24 bg-jtp-shell rounded-jtp-md flex items-center justify-center text-jtp-xs text-jtp-textFaint border border-jtp-borderSubtle">
                          Not provided
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="jtp-label mb-1">AFTER CHART</div>
                      {setup.screenshotAfterUrl ? (
                        <img
                          src={setup.screenshotAfterUrl}
                          alt="After"
                          className="rounded-jtp-md border border-jtp-border w-full"
                        />
                      ) : (
                        <div className="h-24 bg-jtp-shell rounded-jtp-md flex items-center justify-center text-jtp-xs text-jtp-textFaint border border-jtp-borderSubtle">
                          Not provided
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Trade gallery */}
      <Panel label={`TRADE GALLERY${relevantTrades.length > 0 ? ` (${relevantTrades.length})` : ''}`} noPadding>
        {tradesLoading ? (
          <div className="px-4 py-6 text-jtp-md text-jtp-textDim text-center">Loading trades…</div>
        ) : relevantTrades.length > 0 ? (
          <div className="overflow-x-auto -mx-0">
            <table className="w-full border-collapse text-jtp-md">
              <thead>
                <tr className="border-b border-jtp-border bg-jtp-raised">
                  {['', '', 'Date', 'Asset', 'Direction', 'Entry Price', 'Risk %', 'Result', 'Net P/L', 'Actions'].map(
                    (header, i) => (
                      <th
                        key={i}
                        className="px-3 py-2.5 text-left jtp-label"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {relevantTrades.map(trade => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    onEdit={() => onEditTrade(trade)}
                    isSelected={false}
                    onSelect={() => {}}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No trades yet"
            description="No trades have been logged with this playbook yet."
          />
        )}
      </Panel>
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────
const TABS: Tab[] = [
  { id: 'details', label: 'Playbook Details' },
  { id: 'stats',   label: 'Performance Stats' },
];

const PlaybookDetailModal: React.FC<PlaybookDetailModalProps> = ({ playbook, onClose, onEdit }) => {
  const { accessToken } = useAuth();
  const { deletePlaybook } = usePlaybook();
  const { refreshTrades } = useTrade();
  const [activeTab, setActiveTab] = useState<string>('details');
  const [stats, setStats] = useState<PlaybookStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!accessToken) return;
      setIsLoadingStats(true);
      try {
        const data = await api.getPlaybookStats(playbook.id, accessToken);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch playbook stats', error);
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

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsTradeModalOpen(true);
  };

  const handleTradeSaved = async () => {
    await refreshTrades();
    setIsTradeModalOpen(false);
    setEditingTrade(null);
  };

  const footer = (
    <div className="flex items-center gap-3">
      <Button
        onClick={onEdit}
        variant="link"
        className="flex items-center gap-1.5 text-jtp-md p-0"
      >
        <PencilIcon className="w-4 h-4" /> Edit Playbook
      </Button>
      <span className="text-jtp-borderStrong">|</span>
      <Button
        onClick={handleDelete}
        variant="link"
        className="flex items-center gap-1.5 text-jtp-md p-0 !text-jtp-loss hover:!text-jtp-loss"
      >
        <TrashIcon className="w-4 h-4" /> Delete
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={playbook.name}
      subtitle={playbook.coreIdea || undefined}
      width="xl"
      footer={footer}
    >
      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        className="mb-5 -mt-1"
      />

      {activeTab === 'details' && (
        <PlaybookDetailsTab playbook={playbook} onEditTrade={handleEditTrade} />
      )}
      {activeTab === 'stats' && (
        <PlaybookStatsTab stats={stats} isLoading={isLoadingStats} />
      )}

      {isTradeModalOpen && (
        <TradeFormModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          tradeToEdit={editingTrade}
          onSuccess={handleTradeSaved}
        />
      )}
    </Drawer>
  );
};

export default PlaybookDetailModal;
