import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import { usePlaybook } from '../context/PlaybookContext';
import Spinner from '../components/Spinner';
import { PlusIcon } from '../components/icons/PlusIcon';
import { Playbook } from '../types';
import PlaybookCard from '../components/playbooks/PlaybookCard';
import PlaybookBuilderModal from '../components/playbooks/PlaybookBuilderModal';
import PlaybookDetailModal from '../components/playbooks/PlaybookDetailModal';

const StrategiesPage: React.FC = () => {
  const { playbooks, isLoading } = usePlaybook();
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-orbitron text-future-light">Strategy Playbook</h1>
          <p className="text-future-gray">Define and manage your arsenal of trading strategies.</p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          <span>New Playbook</span>
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : playbooks.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-photonic-blue/20 rounded-lg">
            <h3 className="text-lg font-semibold text-future-light">Your Playbook is Empty</h3>
            <p className="text-future-gray mt-2 mb-4">Create your first playbook to get started.</p>
            <Button onClick={openAddModal} className="w-auto">
              Create a Playbook
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playbooks.map(playbook => (
                <PlaybookCard
                    key={playbook.id} 
                    playbook={playbook} 
                    onViewDetails={() => openDetailModal(playbook)} 
                />
            ))}
          </div>
        )}
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

export default StrategiesPage;
