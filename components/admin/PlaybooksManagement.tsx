import React, { useState } from 'react';
import { CommunityPlaybook } from '../../types';
import Button from '../ui/Button';
import { TrashIcon } from '../icons/TrashIcon';
import Card from '../Card';

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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-orbitron text-white">Community Playbooks</h2>
                <Button onClick={onRefresh} variant="secondary" className="text-sm">
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {playbooks.length === 0 ? (
                    <div className="text-center py-12 text-secondary">
                        No community playbooks found.
                    </div>
                ) : (
                    playbooks.map((playbook) => (
                        <Card key={playbook.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{playbook.name}</h3>
                                <div className="flex flex-wrap gap-2 mt-1 text-sm text-secondary">
                                    <span>by {playbook.authorName}</span>
                                    <span>•</span>
                                    <span>{playbook.tradeCount} Trades</span>
                                    <span>•</span>
                                    <span className={playbook.winRate >= 50 ? 'text-momentum-green' : 'text-risk-high'}>
                                        {playbook.winRate}% Win Rate
                                    </span>
                                </div>
                                {playbook.coreIdea && (
                                    <p className="text-sm text-future-gray mt-2 line-clamp-2">{playbook.coreIdea}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="danger"
                                    onClick={() => handleDelete(playbook.id)}
                                    isLoading={deletingId === playbook.id}
                                    className="w-full sm:w-auto"
                                >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default PlaybooksManagement;
