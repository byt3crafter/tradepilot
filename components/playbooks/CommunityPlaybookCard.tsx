import React from 'react';
import { CommunityPlaybook } from '../../types';
import { Badge } from '../ui';

interface CommunityPlaybookCardProps {
  playbook: CommunityPlaybook;
  onViewDetails: () => void;
}

const CommunityPlaybookCard: React.FC<CommunityPlaybookCardProps> = ({ playbook, onViewDetails }) => {
  const allTags = [...playbook.tradingStyles, ...playbook.instruments, ...playbook.timeframes];

  return (
    <button
      type="button"
      onClick={onViewDetails}
      className="w-full text-left bg-jtp-panel border border-jtp-border rounded-jtp-panel p-4 flex flex-col gap-2 transition-colors hover:border-jtp-borderHover hover:bg-jtp-hover"
    >
      <div>
        <h3 className="font-semibold text-jtp-lg text-jtp-text leading-tight">{playbook.name}</h3>
        <div className="text-jtp-xs text-jtp-textFaint mt-0.5">by {playbook.authorName}</div>
      </div>
      <p className="text-jtp-md text-jtp-textMuted leading-snug line-clamp-2 min-h-[2.5rem]">
        {playbook.coreIdea || 'No core idea provided.'}
      </p>
      <div className="flex flex-wrap gap-1 mt-1">
        {allTags.slice(0, 3).map(tag => (
          <Badge key={tag} variant="info" size="xs">{tag}</Badge>
        ))}
        {allTags.length > 3 && (
          <Badge variant="neutral" size="xs">+{allTags.length - 3} more</Badge>
        )}
      </div>
    </button>
  );
};

export default CommunityPlaybookCard;
