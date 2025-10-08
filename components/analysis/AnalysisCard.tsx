import React from 'react';
import { Analysis, Direction, AnalysisStatus } from '../../types';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { PencilIcon } from '../icons/PencilIcon';
import { useAnalysis } from '../../context/AnalysisContext';
import { TrashIcon } from '../icons/TrashIcon';

interface AnalysisCardProps {
  analysis: Analysis;
  onEdit: () => void;
}

const BiasIndicator: React.FC<{ bias: Direction }> = ({ bias }) => {
  const isBuy = bias === 'Buy';
  const colorClass = isBuy ? 'text-momentum-green' : 'text-risk-high';
  const Icon = isBuy ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className={`inline-flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${isBuy ? 'bg-momentum-green/10' : 'bg-risk-high/10'} ${colorClass}`}>
      <Icon className="w-3 h-3" />
      <span>{isBuy ? 'Long' : 'Short'}</span>
    </div>
  );
};

const StatusPill: React.FC<{ status: AnalysisStatus }> = ({ status }) => {
    const styles: Record<AnalysisStatus, string> = {
        WATCHING: 'bg-photonic-blue/10 text-photonic-blue',
        ALERTED: 'bg-risk-medium/10 text-risk-medium',
        TRIGGERED: 'bg-purple-500/10 text-purple-400',
        EXECUTED: 'bg-momentum-green/10 text-momentum-green',
        MISSED: 'bg-future-gray/20 text-future-gray',
        EXPIRED: 'bg-future-gray/20 text-future-gray',
        ARCHIVED: 'bg-future-dark text-future-gray',
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>
            {status}
        </span>
    );
};


const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, onEdit }) => {
  const { deleteAnalysis } = useAnalysis();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      await deleteAnalysis(analysis.id);
    }
  };

  return (
    <div className="bg-future-dark/50 border border-photonic-blue/20 rounded-lg p-3 flex flex-col justify-between transition-all hover:border-photonic-blue/50 hover:shadow-glow-blue h-full">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-orbitron text-lg text-future-light">{analysis.symbol}</h3>
          <DropdownMenu>
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="text-risk-high hover:bg-risk-high/10">
              <TrashIcon className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 mt-1">
            <BiasIndicator bias={analysis.directionalBias} />
            <StatusPill status={analysis.status} />
        </div>
        <p className="text-xs text-future-gray mt-2">{analysis.category.replace('_', ' ')}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-photonic-blue/10 text-xs text-future-gray">
        <span>Next review:</span>
        <span className="font-semibold text-future-light ml-2">{new Date(analysis.nextReviewAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default AnalysisCard;
