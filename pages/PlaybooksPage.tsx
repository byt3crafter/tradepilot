import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import { usePlaybook } from '../context/PlaybookContext';
import Spinner from '../components/Spinner';
import { PlusIcon } from '../components/icons/PlusIcon';
import { Playbook } from '../types';
import PlaybookBuilderModal from '../components/playbooks/PlaybookBuilderModal';
import PlaybookDetailModal from '../components/playbooks/PlaybookDetailModal';
import { DropdownMenu, DropdownMenuItem } from '../components/ui/DropdownMenu';
import { EyeIcon } from '../components/icons/EyeIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-photonic-blue/10 text-photonic-blue text-xs font-semibold mr-1 mb-1 px-2 py-0.5 rounded-full inline-block">
    {children}
  </span>
);

const PlaybooksPage: React.FC = () => {
  const { playbooks, isLoading, deletePlaybook } = usePlaybook();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [viewingPlaybook, setViewingPlaybook] = useState<Playbook | null>(null);

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={4} className="text-center p-8">
            <Spinner />
          </td>
        </tr>
      );
    }

    if (playbooks.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="text-center p-16">
            <div className="border-2 border-dashed border-photonic-blue/20 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-future-light">Your Playbook is Empty</h3>
              <p className="text-future-gray mt-2 mb-4">Create your first playbook to get started.</p>
              <Button onClick={openAddModal} className="w-auto">
                Create a Playbook
              </Button>
            </div>
          </td>
        </tr>
      );
    }

    return playbooks.map(playbook => (
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
    ));
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

      <Card>
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
              {renderContent()}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};

export default PlaybooksPage;