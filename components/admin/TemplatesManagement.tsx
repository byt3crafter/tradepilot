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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-orbitron text-white">Prop Firm Templates</h2>
        <Button onClick={onCreate}>Create Template</Button>
      </div>

      <div className="bg-future-panel/30 rounded-lg border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">Firm</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-secondary uppercase">Account Size</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-secondary uppercase">Profit Target</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-secondary uppercase">Max Drawdown</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-secondary uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-secondary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-secondary">
                  No templates found. Create one to get started.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white text-sm">{template.name}</td>
                  <td className="px-4 py-3 text-secondary text-sm">{template.firmName}</td>
                  <td className="px-4 py-3 text-white text-sm text-right">
                    ${template.accountSize.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-green-400 text-sm text-right">
                    ${template.profitTarget.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-red-400 text-sm text-right">
                    ${template.maxDrawdown.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        template.isActive
                          ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                          : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'
                      }`}
                    >
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(template)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                        title="Edit template"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(template.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={deletingId === template.id}
                        title="Delete template"
                      >
                        {deletingId === template.id ? (
                          <div className="w-4 h-4 flex items-center justify-center">
                            <Spinner />
                          </div>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
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

      {confirmDelete && (
        <Modal
          title="Confirm Delete"
          onClose={() => setConfirmDelete(null)}
        >
          <div className="space-y-4">
            <p className="text-secondary">Are you sure you want to delete this template? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => handleDelete(confirmDelete)}>
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
