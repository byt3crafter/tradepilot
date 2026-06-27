import React, { useState, useMemo } from 'react';
import { usePlaybook } from '../context/PlaybookContext';
import { useTrade } from '../context/TradeContext';
import { useAuth } from '../context/AuthContext';
import { Button, Tabs, Badge, Panel, EmptyState, Skeleton, DataTable } from '../components/ui';
import type { Tab, TableColumn } from '../components/ui';
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

// ─── Page tabs ────────────────────────────────────────────────────────────────
const PAGE_TABS: Tab[] = [
  { id: 'my',        label: 'My Playbooks' },
  { id: 'community', label: 'Community' },
];

// ─── Community tag chip ───────────────────────────────────────────────────────
const CommunityTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-jtp-xs px-2 py-[2px] rounded-[2px] bg-jtp-blue/10 text-jtp-blue font-mono inline-block mr-1 mb-0.5">
    {children}
  </span>
);

// ─── Main page ─────────────────────────────────────────────────────────────────
const PlaybooksPage: React.FC = () => {
  const { playbooks, communityPlaybooks, isLoading, deletePlaybook, createPlaybook } = usePlaybook();
  const { closedTrades } = useTrade();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('my');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [viewingPlaybook, setViewingPlaybook] = useState<Playbook | null>(null);
  const [viewingCommunityPlaybook, setViewingCommunityPlaybook] = useState<CommunityPlaybook | null>(null);
  const [selectedSetupKey, setSelectedSetupKey] = useState<string | null>(null);

  // Build a flat list of setup items from all user playbooks
  const setupItems = useMemo((): SetupItem[] => {
    return playbooks.flatMap(playbook => {
      if (playbook.setups.length === 0) {
        return [{ key: `playbook:${playbook.id}`, name: playbook.name, playbook, setup: null }];
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

  const openAddModal  = () => { setEditingPlaybook(null); setIsBuilderOpen(true); };
  const openEditModal = (pb: Playbook) => { setEditingPlaybook(pb); setViewingPlaybook(null); setIsBuilderOpen(true); };
  const closeAllModals = () => {
    setIsBuilderOpen(false);
    setEditingPlaybook(null);
    setViewingPlaybook(null);
    setViewingCommunityPlaybook(null);
  };

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
        <div className="flex gap-4 h-full p-4">
          <div className="w-64 xl:w-72 shrink-0 space-y-2">
            <Skeleton variant="text" lines={6} />
          </div>
          <div className="flex-1">
            <Skeleton variant="panel" className="h-48" />
          </div>
        </div>
      );
    }

    if (playbooks.length === 0) {
      return (
        <div className="flex items-center justify-center h-full py-12">
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 3h7l3 3v7H3z" />
                <line x1="5.5" y1="7" x2="10.5" y2="7" />
                <line x1="5.5" y1="10" x2="9" y2="10" />
              </svg>
            }
            title="No setups yet"
            description="Create your first playbook and define your trading setups to start measuring your edge."
            action={
              <Button onClick={openAddModal} className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                Create a Playbook
              </Button>
            }
          />
        </div>
      );
    }

    // Two-pane layout
    return (
      <div className="flex h-full min-h-0">
        {/* Left pane: setups list */}
        <div className="w-64 xl:w-72 shrink-0 border-r border-jtp-border flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-jtp-borderSubtle">
            <span className="jtp-label">SETUPS ({setupItems.length})</span>
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
              <div key={pb.id} className="flex items-center justify-between group py-0.5">
                <span className="text-jtp-xs text-jtp-textFaint truncate">{pb.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    title="Edit"
                    onClick={() => openEditModal(pb)}
                    className="p-1 text-jtp-textDim hover:text-jtp-text rounded-jtp-sm transition-colors"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => handleDelete(pb.id)}
                    className="p-1 text-jtp-textDim hover:text-jtp-loss rounded-jtp-sm transition-colors"
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
            <div className="flex items-center justify-center h-full text-jtp-textFaint text-jtp-md">
              Select a setup to view details.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Community tab ─────────────────────────────────────────────────────────
  const communityColumns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'NAME',
      render: (_v, row) => (
        <div className="py-0.5">
          <button
            onClick={() => setViewingCommunityPlaybook(row)}
            className="font-medium text-jtp-textSoft hover:text-jtp-blue transition-colors text-left"
          >
            {row.name}
          </button>
          {row.coreIdea && (
            <div className="text-jtp-md text-jtp-textDim mt-0.5 truncate max-w-xs">
              {row.coreIdea}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'winRate',
      header: 'WIN RATE',
      width: '100px',
      mono: true,
      align: 'right',
      render: (v) => (
        <span className={v !== undefined ? 'text-jtp-profit' : 'text-jtp-textDim'}>
          {v !== undefined ? `${v}%` : '—'}
        </span>
      ),
    },
    {
      key: 'tradeCount',
      header: 'TRADES',
      width: '90px',
      mono: true,
      align: 'right',
      render: (v) => v !== undefined ? String(v) : '—',
    },
    {
      key: 'tags',
      header: 'TAGS',
      render: (_v, row) => {
        const allTags = [...row.tradingStyles, ...row.instruments, ...row.timeframes];
        return (
          <div className="flex flex-wrap py-0.5">
            {allTags.slice(0, 3).map(tag => (
              <CommunityTag key={tag}>{tag}</CommunityTag>
            ))}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (_v, row) => (
        <div className="flex items-center gap-2">
          {user?.id !== row.authorId && (
            <button
              onClick={() => handleCopyPlaybook(row)}
              className="flex items-center gap-1 px-2 py-1 rounded-[2px] bg-jtp-raised border border-jtp-borderStrong text-jtp-textMuted hover:text-jtp-text hover:border-jtp-borderHover text-jtp-xs font-mono transition-colors"
            >
              <CopyIcon className="w-3 h-3" />
              Copy
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuItem onSelect={() => setViewingCommunityPlaybook(row)}>
              <EyeIcon className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const renderCommunityPlaybooks = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-2">
          <Skeleton variant="text" lines={5} />
        </div>
      );
    }

    if (communityPlaybooks.length === 0) {
      return (
        <div className="flex items-center justify-center py-16">
          <EmptyState
            title="No community playbooks yet"
            description="Check back later, or make your own playbook public to share it."
          />
        </div>
      );
    }

    return (
      <Panel label="COMMUNITY PLAYBOOKS" noPadding className="mx-4 my-3">
        <DataTable
          columns={communityColumns}
          data={communityPlaybooks as any[]}
          keyFn={(pb) => pb.id}
          emptyMessage="No community playbooks yet."
        />
      </Panel>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-jtp-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-jtp-border shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="font-semibold text-jtp-xl text-jtp-text">Playbooks</h1>
          <span className="text-jtp-md text-jtp-textDim">Your setups, measured</span>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-2 py-1.5 px-3 text-jtp-md">
          <PlusIcon className="w-4 h-4" />
          New Playbook
        </Button>
      </div>

      {/* Tabs row */}
      <div className="px-5 border-b border-jtp-border shrink-0 bg-jtp-shell">
        <Tabs
          tabs={[
            { id: 'my',        label: 'My Playbooks', badge: isLoading ? undefined : playbooks.length },
            { id: 'community', label: 'Community',    badge: isLoading ? undefined : communityPlaybooks.length },
          ]}
          active={activeTab}
          onChange={setActiveTab}
          className="border-b-0"
        />
      </div>

      {/* Content area */}
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
