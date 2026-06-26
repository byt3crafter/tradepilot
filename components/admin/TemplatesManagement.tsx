/**
 * TemplatesManagement — Operator Console view for Prop Firm Templates.
 *
 * Panel + DataTable layout with Badge status chips and icon action buttons.
 */
import React, { useState } from 'react';
import { PropFirmTemplate } from '../../types';
import {
  Panel,
  DataTable,
  Badge,
  Button,
  Modal,
  EmptyState,
} from '../ui';
import type { TableColumn } from '../ui';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface TemplatesManagementProps {
  templates: PropFirmTemplate[];
  onRefresh: () => Promise<void>;
  onEdit: (template: PropFirmTemplate) => void;
  onCreate: () => void;
  onDelete: (id: string) => Promise<void>;
}

const TemplatesManagement: React.FC<TemplatesManagementProps> = ({
  templates,
  onRefresh,
  onEdit,
  onCreate,
  onDelete,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      setConfirmDelete(null);
      await onRefresh();
    } catch (err) {
      console.error('Failed to delete template:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumn<PropFirmTemplate>[] = [
    {
      key: 'name',
      header: 'NAME',
      render: (name, row) => (
        <div>
          <p className="font-medium text-jtp-text text-jtp-md leading-snug">{name}</p>
          <p className="text-jtp-xs text-jtp-textDim mt-0.5">{row.firmName}</p>
        </div>
      ),
    },
    {
      key: 'drawdownType',
      header: 'TYPE',
      width: '80px',
      render: (type) => (
        <Badge variant="neutral" size="xs">
          {type}
        </Badge>
      ),
    },
    {
      key: 'accountSize',
      header: 'ACCOUNT',
      align: 'right',
      mono: true,
      render: (v) => (
        <span className="font-mono text-jtp-xs text-jtp-text tabular-nums font-semibold">
          ${(v as number).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'profitTarget',
      header: 'TARGET',
      align: 'right',
      mono: true,
      render: (v) => (
        <span className="font-mono text-jtp-xs text-jtp-profit tabular-nums font-semibold">
          ${(v as number).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'dailyDrawdown',
      header: 'DAILY DD',
      align: 'right',
      mono: true,
      render: (v) => (
        <span className="font-mono text-jtp-xs text-jtp-loss tabular-nums font-semibold">
          ${(v as number).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'maxDrawdown',
      header: 'MAX DD',
      align: 'right',
      mono: true,
      render: (v) => (
        <span className="font-mono text-jtp-xs text-jtp-loss tabular-nums font-semibold">
          ${(v as number).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'minTradingDays',
      header: 'MIN DAYS',
      align: 'right',
      mono: true,
      render: (v) => (
        <span className="font-mono text-jtp-xs text-jtp-textMuted tabular-nums">{v}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'STATUS',
      align: 'center',
      width: '80px',
      render: (active) => (
        <Badge variant={active ? 'profit' : 'neutral'} size="xs">
          {active ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '',
      align: 'right',
      width: '72px',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(row)}
            className="p-1.5 text-jtp-textDim hover:text-jtp-blue hover:bg-jtp-blue/10 rounded-jtp-sm transition-colors"
            title="Edit template"
            aria-label="Edit template"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(row.id)}
            disabled={deletingId === row.id}
            className="p-1.5 text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-loss/10 rounded-jtp-sm transition-colors disabled:opacity-40"
            title="Delete template"
            aria-label="Delete template"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Panel
        label={`PROP FIRM TEMPLATES${templates.length ? ` (${templates.length})` : ''}`}
        noPadding
        actions={
          <Button onClick={onCreate} className="h-7 px-3 text-jtp-xs">
            + New Template
          </Button>
        }
      >
        {templates.length === 0 ? (
          <EmptyState
            title="No templates"
            description="Create the first prop firm template to get started."
            action={
              <Button onClick={onCreate} className="text-jtp-sm">
                Create Template
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={templates}
            keyFn={(t) => t.id}
            emptyMessage="No templates found."
          />
        )}
      </Panel>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <Modal title="Confirm Delete" onClose={() => setConfirmDelete(null)} size="md">
          <div className="space-y-5">
            <p className="text-jtp-lg text-jtp-textMuted leading-snug">
              Are you sure you want to delete this template?{' '}
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
                Delete Template
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default TemplatesManagement;
