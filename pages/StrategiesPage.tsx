import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import { useStrategy } from '../context/StrategyContext';
import Spinner from '../components/Spinner';
import { PlusIcon } from '../components/icons/PlusIcon';
import Modal from '../components/ui/Modal';
import { Strategy } from '../types';
import StrategyCard from '../components/strategies/StrategyCard';
import StrategyForm from '../components/strategies/StrategyForm';

const StrategiesPage: React.FC = () => {
  const { strategies, isLoading } = useStrategy();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);

  const openAddModal = () => {
    setEditingStrategy(null);
    setIsModalOpen(true);
  };

  const openEditModal = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-orbitron text-future-light">Strategy Playbook</h1>
          <p className="text-future-gray">Define and manage your arsenal of trading strategies.</p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          <span>New Strategy</span>
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : strategies.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-photonic-blue/20 rounded-lg">
            <h3 className="text-lg font-semibold text-future-light">Your Playbook is Empty</h3>
            <p className="text-future-gray mt-2 mb-4">Create your first strategy to get started.</p>
            <Button onClick={openAddModal} className="w-auto">
              Add a Strategy
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map(strategy => (
                <StrategyCard
                    key={strategy.id} 
                    strategy={strategy} 
                    onEdit={() => openEditModal(strategy)} 
                />
            ))}
          </div>
        )}
      </Card>
      
      {isModalOpen && (
        <Modal 
            title={editingStrategy ? "Edit Strategy" : "Add New Strategy"} 
            onClose={() => setIsModalOpen(false)}
            size="md"
        >
            <StrategyForm 
                strategy={editingStrategy} 
                onSuccess={() => setIsModalOpen(false)} 
            />
        </Modal>
      )}
    </div>
  );
};

export default StrategiesPage;
