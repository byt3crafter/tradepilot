import React, { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { PropFirmTemplate } from '../../types';
import Spinner from '../Spinner';
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
    try {
      setDeletingId(id);
      await onDelete(id);
      setConfirmDelete(null);
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-jtp-xl font-semibold text-jtp-text tracking-tight">Prop Firm Templates</h2>
        <Button onClick={onCreate} className="text-jtp-sm h-8 px-3">Create Template</Button>
      </div>

      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-jtp-sm">
            <thead>
              <tr className="bg-jtp-raised border-b border-jtp-border">
                <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-left text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Firm</th>
                <th className="px-4 py-2.5 text-right text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Account Size</th>
                <th className="px-4 py-2.5 text-right text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Profit Target</th>
                <th className="px-4 py-2.5 text-right text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Max Drawdown</th>
                <th className="px-4 py-2.5 text-center text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-jtp-xs font-semibold text-jtp-textDim uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-jtp-textDim">
                    No templates found. Create one to get started.
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id} className="border-b border-jtp-borderSubtle last:border-0 hover:bg-jtp-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-jtp-text">{template.name}</td>
                    <td className="px-4 py-3 text-jtp-textMuted">{template.firmName}</td>
                    <td className="px-4 py-3 font-mono text-jtp-text text-right tabular-nums">
                      ${template.accountSize.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-jtp-profit text-right tabular-nums">
                      ${template.profitTarget.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-jtp-loss text-right tabular-nums">
                      ${template.maxDrawdown.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-semibold border ${
                        template.isActive
                          ? 'bg-jtp-profit/10 text-jtp-profit border-jtp-profit/25'
                          : 'bg-jtp-control text-jtp-textDim border-jtp-borderStrong'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(template)}
                          className="p-1.5 text-jtp-textDim hover:text-jtp-blue hover:bg-jtp-blue/10 rounded-jtp-sm transition-colors"
                          title="Edit template"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(template.id)}
                          className="p-1.5 text-jtp-textDim hover:text-jtp-loss hover:bg-jtp-loss/10 rounded-jtp-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={deletingId === template.id}
                          title="Delete template"
                        >
                          {deletingId === template.id ? (
                            <div className="w-3.5 h-3.5 flex items-center justify-center">
                              <Spinner />
                            </div>
                          ) : (
                            <TrashIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDelete && (
        <Modal title="Confirm Delete" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <p className="text-jtp-sm text-jtp-textMuted">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="text-jtp-sm h-8 px-3">
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDelete)} className="text-jtp-sm h-8 px-3">
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TemplatesManagement;
