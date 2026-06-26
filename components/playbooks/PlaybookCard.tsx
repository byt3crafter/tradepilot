import React from 'react';
import { Playbook } from '../../types';

interface PlaybookCardProps {
  playbook: Playbook;
  onViewDetails: () => void;
}

const PlaybookCard: React.FC<PlaybookCardProps> = ({ playbook, onViewDetails }) => {
  return (
    <button
      type="button"
      onClick={onViewDetails}
      className="w-full text-left bg-jtp-panel border border-jtp-border rounded-jtp-panel p-4 flex flex-col gap-2 transition-colors hover:border-jtp-borderHover hover:bg-jtp-hover"
    >
      <h3 className="font-semibold text-jtp-lg text-jtp-text leading-tight">{playbook.name}</h3>
      <p className="text-jtp-md text-jtp-textMuted leading-snug line-clamp-2 min-h-[2.5rem]">
        {playbook.coreIdea || 'No core idea provided.'}
      </p>
    </button>
  );
};

export default PlaybookCard;
