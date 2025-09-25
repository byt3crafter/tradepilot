import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import { usePlaybook } from '../context/PlaybookContext';
import Spinner from '../components/Spinner';
import { PlusIcon } from '../components/icons/PlusIcon';
import { Playbook, CommunityPlaybook } from '../types';
import PlaybookBuilderModal from '../components/playbooks/PlaybookBuilderModal';
import PlaybookDetailModal from '../components/playbooks/PlaybookDetailModal';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/DropdownMenu';
import { EyeIcon } from '../components/icons/EyeIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import CommunityPlaybookCard from '../components/playbooks/CommunityPlaybookCard';
import CommunityPlaybookDetailModal from '../components/playbooks/CommunityPlaybookDetailModal';

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-photonic-blue/10 text-photonic-blue text-xs font-semibold mr-1 mb-1 px-2 py-0.5 rounded-full inline-block">
    {children}
  </span>
);

const PlaybooksPage: React.FC = () => {
  const { playbooks, communityPlaybooks, isLoading, deletePlaybook } = usePlaybook();
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [viewingPlaybook, setViewingPlaybook] = useState<Playbook | null>(null);
  const [viewingCommunityPlaybook, setViewingCommunityPlaybook] = useState<CommunityPlaybook | null>(null);

  const openAddModal = () => {
    setEditingPlaybook(null);
    setIsBuilderOpen(true);
  };

  const openEditModal = (playbook: Playbook) => {
    setEditingPlaybook(playbook);
    setViewingPlaybook(null);
    setIsBuilderOpen(true);
  };
  
  const openDetailModal = (playbook: Playbook) => {
    setViewingPlaybook(playbook);
  };
  
  const closeAllModals = () => {
    setIsBuilderOpen(false);
    setEditingPlaybook(null);
    setViewingPlaybook(null);
    setViewingCommunityPlaybook(null);
  }

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

  const renderMyPlaybooks = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8 h-64">
          <Spinner />
        </div>
      );
    }

    if (playbooks.length === 0) {
      return (
        <div className="text-center p-16">
          <div className="border-2 border-dashed border-photonic-blue/20 rounded-lg p-8">
            <h3 className="text-lg font-semibold text-future-light">Your Playbook is Empty</h3>
            <p className="text-future-gray mt-2 mb-4">Create your first playbook to get started.</p>
            <Button onClick={openAddModal} className="w-auto">
              Create a Playbook
            </Button>
          </div>
        </div>
      );
    }

    return (
       <div className="overflow-x-auto table-scrollbar">
          <table className="w-full text-sm">
            <thead className="border-b border-photonic-blue/30">
              <tr>
                <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Name</th>
                <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Core Idea</th>
                <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Tags</th>
                <th className="p-3 text-left font-orbitron text-photonic-blue/80 uppercase tracking-wider text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {playbooks.map(playbook => (
                <tr key={playbook.id} className="border-b border-future-panel/50 hover:bg-photonic-blue/5">
                  <td className="p-3">
                    <button onClick={() => openDetailModal(playbook)} className="font-semibold text-future-light hover:text-photonic-blue hover:underline text-left">
                      {playbook.name}
                    </button>
                  </td>
                  <td className="p-3 text-sm text-future-gray max-w-xs truncate">{playbook.coreIdea || '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap">
                      {[...playbook.tradingStyles, ...playbook.instruments, ...playbook.timeframes].slice(0, 3).map(tag => <Tag key={tag}>{tag}</Tag>)}
                    </div>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuItem onSelect={() => openDetailModal(playbook)}>
                        <EyeIcon className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openEditModal(playbook)}>
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleDelete(playbook.id)} className="text-risk-high hover:bg-risk-high/10">
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    );
  };
  
  const renderCommunityPlaybooks = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8 h-64">
          <Spinner />
        </div>
      );
    }

    if (communityPlaybooks.length === 0) {
      return (
         <div className="text-center p-16">
            <h3 className="text-lg font-semibold text-future-light">Community Playbooks</h3>
            <p className="text-future-gray mt-2">No public playbooks from other users are available yet. Check back later!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {communityPlaybooks.map(playbook => (
          <CommunityPlaybookCard 
            key={playbook.id} 
            playbook={playbook}
            onViewDetails={() => setViewingCommunityPlaybook(playbook)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-orbitron text-future-light">Playbooks</h1>
          <p className="text-future-gray">Define and manage your arsenal of trading playbooks.</p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          <span>New Playbook</span>
        </Button>
      </div>

      <div className="border-b border-photonic-blue/20 mb-4">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'my' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
            >
              My Playbooks ({playbooks.length})
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'community' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
            >
              Community ({communityPlaybooks.length})
            </button>
          </nav>
      </div>

      <Card>
        {activeTab === 'my' ? renderMyPlaybooks() : renderCommunityPlaybooks()}
      </Card>
      
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