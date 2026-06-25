import React, { useState } from 'react';
import { useChecklist } from '../../context/ChecklistContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Modal from '../ui/Modal';
import { ChecklistRule } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { ChecklistIcon } from '../icons/ChecklistIcon';
import ChecklistForm from './ChecklistForm';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
const ChecklistManager: React.FC = () => {
  const { rules, isLoading, deleteRule } = useChecklist();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChecklistRule | null>(null);

  const openAddModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: ChecklistRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await deleteRule(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete rule.');
      }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-jtp-xl font-semibold text-jtp-text">Pre-Trade Checklist</h2>
          <p className="text-jtp-sm text-jtp-textDim mt-0.5">
            Optional pre-trade checklist. These prompts are shown (optionally) when you log a trade; your adherence is tracked in Analytics.
          </p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-1.5 px-3 py-1.5 text-jtp-sm">
          <PlusIcon className="w-4 h-4" />
          <span>Add Rule</span>
        </Button>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-jtp-borderStrong rounded-jtp-panel">
            <ChecklistIcon className="w-10 h-10 mx-auto text-jtp-textDim" />
            <h3 className="text-jtp-lg font-semibold text-jtp-text mt-4">No Rules Defined</h3>
            <p className="text-jtp-sm text-jtp-textDim mt-2 mb-5">Add your first pre-trade confirmation rule.</p>
            <div className="flex justify-center">
              <Button onClick={openAddModal} className="w-auto">
                Create a Rule
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {rules.map((rule, index) => (
              <li
                key={rule.id}
                className="flex items-center justify-between bg-jtp-raised border border-jtp-border rounded-jtp-md px-3 py-2.5"
              >
                <span className="text-jtp-md text-jtp-text">
                  <span className="font-mono text-jtp-textDim mr-2.5">{index + 1}.</span>
                  {rule.rule}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <Button variant="link" className="p-1.5 h-auto text-jtp-textDim hover:text-jtp-text" onClick={() => openEditModal(rule)}>
                    <PencilIcon className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="link" className="p-1.5 h-auto text-jtp-loss" onClick={() => handleDelete(rule.id)}>
                    <TrashIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <Modal
          title={editingRule ? 'Edit Rule' : 'Add New Rule'}
          onClose={() => setIsModalOpen(false)}
          size="md"
        >
          <ChecklistForm
            rule={editingRule}
            onSuccess={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

export default ChecklistManager;
