import React from 'react';
import { Strategy } from '../../types';
import { useStrategy } from '../../context/StrategyContext';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface StrategyCardProps {
  strategy: Strategy;
  onEdit: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, onEdit }) => {
  const { deleteStrategy } = useStrategy();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this strategy? This action is permanent.')) {
      try {
        await deleteStrategy(strategy.id);
      } catch (err) {
        console.error('Failed to delete strategy:', err);
        alert('Could not delete the strategy. Please try again.');
      }
    }
  };

  return (
    <div className="bg-future-dark/50 border border-photonic-blue/20 rounded-lg p-4 flex flex-col justify-between transition-all hover:border-photonic-blue/50 hover:shadow-glow-blue h-full">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-orbitron text-lg text-future-light">{strategy.name}</h3>
          <DropdownMenu>
            <DropdownMenuItem onSelect={onEdit}>
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="text-risk-high hover:bg-risk-high/10">
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
        <p className="text-sm text-future-gray mt-2 min-h-[60px]">
          {strategy.description || 'No description provided.'}
        </p>
      </div>
    </div>
  );
};

export default StrategyCard;
