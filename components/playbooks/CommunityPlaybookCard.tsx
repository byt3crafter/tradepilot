import React from 'react';
import { CommunityPlaybook } from '../../types';

interface CommunityPlaybookCardProps {
  playbook: CommunityPlaybook;
  onViewDetails: () => void;
}

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-photonic-blue/10 text-photonic-blue text-xs font-semibold mr-1 mb-1 px-2 py-0.5 rounded-full inline-block">
    {children}
  </span>
);


const CommunityPlaybookCard: React.FC<CommunityPlaybookCardProps> = ({ playbook, onViewDetails }) => {
  const allTags = [...playbook.tradingStyles, ...playbook.instruments, ...playbook.timeframes];
  
  return (
    <div 
        onClick={onViewDetails}
        className="bg-future-dark/50 border border-photonic-blue/20 rounded-lg p-4 flex flex-col justify-between transition-all hover:border-photonic-blue/50 hover:shadow-glow-blue h-full cursor-pointer"
    >
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-orbitron text-lg text-future-light">{playbook.name}</h3>
        </div>
        <p className="text-xs text-future-gray mb-2">by {playbook.authorName}</p>
        <p className="text-sm text-future-gray mt-2 h-12 overflow-hidden">
          {playbook.coreIdea || 'No core idea provided.'}
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-photonic-blue/10">
        {allTags.slice(0, 3).map(tag => <Tag key={tag}>{tag}</Tag>)}
        {allTags.length > 3 && <Tag>+{allTags.length - 3} more</Tag>}
      </div>
    </div>
  );
};

export default CommunityPlaybookCard;