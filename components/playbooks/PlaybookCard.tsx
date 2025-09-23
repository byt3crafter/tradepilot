import React from 'react';
import { Playbook } from '../../types';

interface PlaybookCardProps {
  playbook: Playbook;
  onViewDetails: () => void;
}

const PlaybookCard: React.FC<PlaybookCardProps> = ({ playbook, onViewDetails }) => {
  
  return (
    <div 
        onClick={onViewDetails}
        className="bg-future-dark/50 border border-photonic-blue/20 rounded-lg p-4 flex flex-col justify-between transition-all hover:border-photonic-blue/50 hover:shadow-glow-blue h-full cursor-pointer"
    >
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-orbitron text-lg text-future-light">{playbook.name}</h3>
        </div>
        <p className="text-sm text-future-gray mt-2 min-h-[60px]">
          {playbook.coreIdea || 'No core idea provided.'}
        </p>
      </div>
    </div>
  );
};

export default PlaybookCard;