import React, { useState, useMemo } from 'react';
import { usePlaybook } from '../context/PlaybookContext';
import { useTrade } from '../context/TradeContext';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';
import { PlusIcon } from '../components/icons/PlusIcon';
import { CopyIcon } from '../components/icons/CopyIcon';
import { EyeIcon } from '../components/icons/EyeIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/DropdownMenu';
import PlaybookBuilderModal from '../components/playbooks/PlaybookBuilderModal';
import PlaybookDetailModal from '../components/playbooks/PlaybookDetailModal';
import CommunityPlaybookDetailModal from '../components/playbooks/CommunityPlaybookDetailModal';
import SetupsList, { SetupItem } from '../components/playbooks/SetupsList';
import SetupDetail from '../components/playbooks/SetupDetail';
import { Playbook, CommunityPlaybook } from '../types';

// ─── Tag chip ─────────────────────────────────────────────────────────────────
const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-jtp-xs px-2.5 py-[3px] rounded-jtp-md bg-jtp-blue/10 text-jtp-blue font-medium mr-1 mb-1 inline-block">
    {children}
  </span>
);

// ─── Community tab row ────────────────────────────────────────────────────────
const CommunityRow: React.FC<{
  playbook: CommunityPlaybook;
  isOwnPlaybook: boolean;
  onView: () => void;
  onCopy: () => void;
}> = ({ playbook, isOwnPlaybook, onView, onCopy }) => {
  const allTags = [...playbook.tradingStyles, ...playbook.instruments, ...playbook.timeframes];
  return (
    <tr className="border-b border-jtp-borderSubtle hover:bg-jtp-hover transition-colors">
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="font-medium text-jtp-base text-jtp-textSoft hover:text-jtp-blue transition-colors text-left"
        >
          {playbook.name}
        </button>
        {playbook.coreIdea && (
          <div className="text-jtp-xs text-jtp-textFaint mt-0.5 truncate max-w-xs">
            {playbook.coreIdea}
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-jtp-base-minus text-jtp-profit">
        {playbook.winRate !== undefined ? `${playbook.winRate}%` : '—'}
      </td>
      <td className="px-4 py-3 font-mono text-jtp-base-minus text-jtp-textSoft">
        {playbook.tradeCount !== undefined ? playbook.tradeCount : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap">
          {allTags.slice(0, 3).map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {!isOwnPlaybook && (
            <button
              onClick={onCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-jtp-md bg-jtp-raised border border-jtp-borderStrong text-jtp-textMuted hover:text-jtp-text hover:border-jtp-borderHover text-jtp-xs font-medium transition-colors"
            >
              <CopyIcon className="w-3 h-3" />
              Copy
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuItem onSelect={onView}>
              <EyeIcon className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────
const PlaybooksPage: React.FC = () => {
  const { playbooks, communityPlaybooks, isLoading, deletePlaybook, createPlaybook } = usePlaybook();
  const { closedTrades } = useTrade();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [viewingPlaybook, setViewingPlaybook] = useState<Playbook | null>(null);
  const [viewingCommunityPlaybook, setViewingCommunityPlaybook] = useState<CommunityPlaybook | null>(null);
  const [selectedSetupKey, setSelectedSetupKey] = useState<string | null>(null);

  // Build a flat list of setup items from all user playbooks
  const setupItems = useMemo((): SetupItem[] => {
    return playbooks.flatMap(playbook => {
      if (playbook.setups.length === 0) {
        return [
          {
            key: `playbook:${playbook.id}`,
            name: playbook.name,
            playbook,
            setup: null,
          },
        ];
      }
      return playbook.setups.map(setup => ({
        key: setup.id,
        name: setup.name,
        playbook,
        setup,
      }));
    });
  }, [playbooks]);

  // Auto-select first item when items change
  const effectiveKey = useMemo(() => {
    if (selectedSetupKey && setupItems.some(i => i.key === selectedSetupKey)) {
      return selectedSetupKey;
    }
    return setupItems.length > 0 ? setupItems[0].key : null;
  }, [selectedSetupKey, setupItems]);

  const selectedItem = useMemo(
    () => setupItems.find(i => i.key === effectiveKey) ?? null,
    [setupItems, effectiveKey]
  );

  const openAddModal = () => { setEditingPlaybook(null); setIsBuilderOpen(true); };
  const openEditModal = (pb: Playbook) => { setEditingPlaybook(pb); setViewingPlaybook(null); setIsBuilderOpen(true); };
  const closeAllModals = () => { setIsBuilderOpen(false); setEditingPlaybook(null); setViewingPlaybook(null); setViewingCommunityPlaybook(null); };

  const handleDelete = async (playbookId: string) => {
    if (window.confirm('Are you sure you want to delete this playbook? This will not affect any trades already logged with it.')) {
      try {
        await deletePlaybook(playbookId);
      } catch (err) {
        console.error('Failed to delete playbook:', err);
        alert('Could not delete the playbook. Please try again.');
      }
    }
  };

  const handleCopyPlaybook = async (playbook: CommunityPlaybook) => {
    if (window.confirm(`Do you want to copy "${playbook.name}" to your playbooks?`)) {
      try {
        await createPlaybook({
          name: `${playbook.name} (Copy)`,
          coreIdea: playbook.coreIdea,
          tradingStyles: playbook.tradingStyles,
          instruments: playbook.instruments,
          timeframes: playbook.timeframes,
          pros: playbook.pros,
          cons: playbook.cons,
          setups: playbook.setups.map(setup => {
            const { id, ...rest } = setup;
            return {
              ...rest,
              entryCriteria: setup.entryCriteria.map(c => ({ text: c.text, type: c.type, id: undefined as any })),
              riskManagement: setup.riskManagement.map(r => ({ text: r.text, type: r.type, id: undefined as any })),
            };
          }) as any,
          isPublic: false,
        });
        alert('Playbook copied successfully!');
        setActiveTab('my');
      } catch (err) {
        console.error('Failed to copy playbook:', err);
        alert('Could not copy the playbook. Please try again.');
      }
    }
  };

  // ── My Playbooks content ──────────────────────────────────────────────────
  const renderMyPlaybooks = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      );
    }

    if (playbooks.length === 0) {
      return (
        <div className="flex items-center justify-center py-24 px-6">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 mx-auto mb-5 rounded-jtp-panel bg-jtp-raised border border-jtp-border flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-jtp-textDim">
                <path d="M3 3h7l3 3v7H3z" />
                <line x1="5.5" y1="7" x2="10.5" y2="7" />
                <line x1="5.5" y1="10" x2="9" y2="10" />
              </svg>
            </div>
            <h3 className="font-semibold text-jtp-lg text-jtp-text mb-2">No setups yet</h3>
            <p className="text-jtp-sm text-jtp-textMuted mb-6 leading-relaxed">
              Create your first playbook and define your trading setups to start measuring your edge.
            </p>
            <Button onClick={openAddModal} className="flex items-center gap-2 mx-auto">
              <PlusIcon className="w-4 h-4" />
              Create a Playbook
            </Button>
          </div>
        </div>
      );
    }

    // Two-pane layout
    return (
      <div className="flex h-full min-h-0">
        {/* Left pane: setups list */}
        <div className="w-64 xl:w-72 shrink-0 border-r border-jtp-border flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-jtp-borderSubtle">
            <span className="text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim">
              Setups ({setupItems.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SetupsList
              items={setupItems}
              closedTrades={closedTrades}
              selectedKey={effectiveKey}
              onSelect={setSelectedSetupKey}
            />
          </div>

          {/* Playbook management link row */}
          <div className="border-t border-jtp-border px-4 py-2.5 flex flex-col gap-1">
            {playbooks.map(pb => (
              <div
                key={pb.id}
                className="flex items-center justify-between group py-0.5"
              >
                <span className="text-jtp-xs text-jtp-textFaint truncate">{pb.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    title="Edit"
                    onClick={() => openEditModal(pb)}
                    className="p-1 text-jtp-textDim hover:text-jtp-text rounded-jtp-sm"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => handleDelete(pb.id)}
                    className="p-1 text-jtp-textDim hover:text-jtp-loss rounded-jtp-sm"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right pane: setup detail */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {selectedItem ? (
            <SetupDetail item={selectedItem} closedTrades={closedTrades} />
          ) : (
            <div className="flex items-center justify-center h-full text-jtp-textFaint text-jtp-sm">
              Select a setup to view details.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Community tab ─────────────────────────────────────────────────────────
  const renderCommunityPlaybooks = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      );
    }

    if (communityPlaybooks.length === 0) {
      return (
        <div className="flex items-center justify-center py-24 px-6">
          <div className="text-center">
            <p className="text-jtp-textDim text-jtp-base">No community playbooks available yet.</p>
            <p className="text-jtp-textFaint text-jtp-sm mt-1">Check back later or make yours public to share.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-jtp-border">
              <th className="px-4 py-2.5 text-left text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim font-medium">Name</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim font-medium">Win Rate</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim font-medium">Trades</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim font-medium">Tags</th>
              <th className="px-4 py-2.5 text-left text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {communityPlaybooks.map(pb => (
              <CommunityRow
                key={pb.id}
                playbook={pb}
                isOwnPlaybook={user?.id === pb.authorId}
                onView={() => setViewingCommunityPlaybook(pb)}
                onCopy={() => handleCopyPlaybook(pb)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-jtp-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-jtp-border shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="font-semibold text-jtp-xl text-jtp-text">Playbooks</h1>
          <span className="text-jtp-sm text-jtp-textDim">Your setups, measured</span>
        </div>
        <Button
          onClick={openAddModal}
          className="flex items-center gap-2 py-1.5 px-3 text-jtp-sm"
        >
          <PlusIcon className="w-4 h-4" />
          New Playbook
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-5 border-b border-jtp-border shrink-0">
        <button
          onClick={() => setActiveTab('my')}
          className={`py-2.5 px-1 mr-5 text-jtp-sm font-medium border-b-2 transition-colors
            ${activeTab === 'my'
              ? 'border-jtp-blue text-jtp-text'
              : 'border-transparent text-jtp-textSubtle hover:text-jtp-textMuted'}`}
        >
          My Playbooks
          <span className="ml-1.5 font-mono text-jtp-xs text-jtp-textFaint">
            {playbooks.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`py-2.5 px-1 text-jtp-sm font-medium border-b-2 transition-colors
            ${activeTab === 'community'
              ? 'border-jtp-blue text-jtp-text'
              : 'border-transparent text-jtp-textSubtle hover:text-jtp-textMuted'}`}
        >
          Community
          <span className="ml-1.5 font-mono text-jtp-xs text-jtp-textFaint">
            {communityPlaybooks.length}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-jtp-panel">
        {activeTab === 'my' ? renderMyPlaybooks() : renderCommunityPlaybooks()}
      </div>

      {/* Modals */}
      {isBuilderOpen && (
        <PlaybookBuilderModal
          playbookToEdit={editingPlaybook}
          onClose={closeAllModals}
        />
      )}
      {viewingPlaybook && (
        <PlaybookDetailModal
          playbook={viewingPlaybook}
          onClose={closeAllModals}
          onEdit={() => openEditModal(viewingPlaybook)}
        />
      )}
      {viewingCommunityPlaybook && (
        <CommunityPlaybookDetailModal
          playbook={viewingCommunityPlaybook}
          onClose={closeAllModals}
        />
      )}
    </div>
  );
};

export default PlaybooksPage;
