import React, { useState } from 'react';
import { CommunityPlaybook } from '../../types';
import Button from '../ui/Button';
import { TrashIcon } from '../icons/TrashIcon';

interface PlaybooksManagementProps {
    playbooks: CommunityPlaybook[];
    onRefresh: () => void;
    onDelete: (id: string) => void;
}

const PlaybooksManagement: React.FC<PlaybooksManagementProps> = ({ playbooks, onRefresh, onDelete }) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this playbook? This action cannot be undone.')) {
            setDeletingId(id);
            await onDelete(id);
            setDeletingId(null);
            onRefresh();
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-between items-center">
                <h2 className="text-jtp-xl font-semibold text-jtp-text tracking-tight">Community Playbooks</h2>
                <Button onClick={onRefresh} variant="secondary" className="text-jtp-sm h-8 px-3">
                    Refresh
                </Button>
            </div>

            {playbooks.length === 0 ? (
                <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-5 py-14 text-center">
                    <p className="text-jtp-textDim text-jtp-sm">No community playbooks found.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {playbooks.map((playbook) => (
                        <div
                            key={playbook.id}
                            className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="text-jtp-lg font-semibold text-jtp-text truncate">{playbook.name}</h3>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                    <span className="text-jtp-sm text-jtp-textMuted">by {playbook.authorName}</span>
                                    <span className="text-jtp-textDim">·</span>
                                    <span className="font-mono text-jtp-sm text-jtp-textMuted tabular-nums">
                                        {playbook.tradeCount} trades
                                    </span>
                                    <span className="text-jtp-textDim">·</span>
                                    <span className={`font-mono text-jtp-sm font-semibold tabular-nums ${
                                        playbook.winRate >= 50 ? 'text-jtp-profit' : 'text-jtp-loss'
                                    }`}>
                                        {playbook.winRate}% win rate
                                    </span>
                                </div>
                                {playbook.coreIdea && (
                                    <p className="text-jtp-sm text-jtp-textDim mt-2 line-clamp-2">{playbook.coreIdea}</p>
                                )}
                            </div>

                            <Button
                                variant="danger"
                                onClick={() => handleDelete(playbook.id)}
                                isLoading={deletingId === playbook.id}
                                className="flex-shrink-0 text-jtp-sm h-8 px-3"
                            >
                                <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
                                Delete
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlaybooksManagement;
