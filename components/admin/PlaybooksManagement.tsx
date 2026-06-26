/**
 * PlaybooksManagement — Operator Console view for Community Playbooks.
 *
 * Panel + DataTable: name/author, trade count, win rate colored by sign,
 * and a delete action.
 */
import React, { useState } from 'react';
import { CommunityPlaybook } from '../../types';
import {
  Panel,
  DataTable,
  Badge,
  Button,
  EmptyState,
  Modal,
} from '../ui';
import type { TableColumn } from '../ui';
import { TrashIcon } from '../icons/TrashIcon';

interface PlaybooksManagementProps {
  playbooks: CommunityPlaybook[];
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

const PlaybooksManagement: React.FC<PlaybooksManagementProps> = ({
  playbooks,
  onRefresh,
  onDelete,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setConfirmDelete(null);
    onRefresh();
  };

  const columns: TableColumn<CommunityPlaybook>[] = [
    {
      key: 'name',
      header: 'PLAYBOOK',
      render: (name, row) => (
        <div>
          <p className="font-medium text-jtp-text text-jtp-md leading-snug">{name}</p>
          {row.coreIdea && (
            <p className="text-jtp-xs text-jtp-textDim mt-0.5 line-clamp-1">{row.coreIdea}</p>
          )}
        </div>
      ),
    },
    {
      key: 'authorName',
      header: 'AUTHOR',
      render: (author) => (
        <span className="text-jtp-md text-jtp-textMuted">{author}</span>
      ),
    },
    {
      key: 'tradeCount',
      header: 'TRADES',
      align: 'right',
      mono: true,
      render: (count) => (
        <span className="font-mono text-jtp-xs text-jtp-textMuted tabular-nums font-semibold">
          {count}
        </span>
      ),
    },
    {
      key: 'winRate',
      header: 'WIN RATE',
      align: 'right',
      mono: true,
      render: (rate) => {
        const r = rate as number;
        return (
          <span
            className={`font-mono text-jtp-xs tabular-nums font-bold ${
              r >= 50 ? 'text-jtp-profit' : 'text-jtp-loss'
            }`}
          >
            {r}%
          </span>
        );
      },
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      width: '56px',
      render: (_, row) => (
        <button
          onClick={() => setConfirmDelete(row.id)}
          disabled={deletingId === row.id}
          className="p-1.5 text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-loss/10 rounded-jtp-sm transition-colors disabled:opacity-40"
          title="Delete playbook"
          aria-label="Delete playbook"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      <Panel
        label={`COMMUNITY PLAYBOOKS${playbooks.length ? ` (${playbooks.length})` : ''}`}
        noPadding
        actions={
          <Button
            variant="secondary"
            onClick={onRefresh}
            className="h-7 px-3 text-jtp-xs"
          >
            Refresh
          </Button>
        }
      >
        {playbooks.length === 0 ? (
          <EmptyState
            title="No community playbooks"
            description="Playbooks shared by users will appear here."
          />
        ) : (
          <DataTable
            columns={columns}
            data={playbooks}
            keyFn={(p) => p.id}
            emptyMessage="No playbooks found."
          />
        )}
      </Panel>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <Modal title="Delete Playbook" onClose={() => setConfirmDelete(null)} size="md">
          <div className="space-y-5">
            <p className="text-jtp-lg text-jtp-textMuted leading-snug">
              Are you sure you want to delete this playbook?{' '}
              <span className="text-jtp-loss font-medium">This cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
                className="text-jtp-sm h-8 px-4"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(confirmDelete)}
                isLoading={!!deletingId}
                className="text-jtp-sm h-8 px-4"
              >
                Delete Playbook
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PlaybooksManagement;
