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
import { useSettings } from '../../context/SettingsContext';
import ToggleSwitch from '../ui/ToggleSwitch';

const ChecklistManager: React.FC = () => {
  const { rules, isLoading, deleteRule } = useChecklist();
  const { enforceChecklist, setEnforceChecklist } = useSettings();
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-orbitron text-photonic-blue">Pre-Trade Checklist</h2>
          <p className="text-future-gray text-sm mt-1">Define the rules you must follow before every trade.</p>
        </div>
        <Button onClick={openAddModal} className="w-auto flex items-center gap-2 px-3 py-2 text-sm">
          <PlusIcon className="w-5 h-5" />
          <span>Add Rule</span>
        </Button>
      </div>

      {rules.length > 0 && (
        <div className="bg-future-dark/50 p-3 rounded-md border border-future-panel mb-4">
          <ToggleSwitch
            label="Enforce checklist before logging a trade"
            checked={enforceChecklist}
            onChange={setEnforceChecklist}
          />
        </div>
      )}

      <div>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-photonic-blue/20 rounded-lg">
            <ChecklistIcon className="w-12 h-12 mx-auto text-future-gray" />
            <h3 className="text-lg font-semibold text-future-light mt-4">No Rules Defined</h3>
            <p className="text-future-gray mt-2 mb-4">Add your first pre-trade confirmation rule.</p>
            <div className="flex justify-center">
              <Button onClick={openAddModal} className="w-auto">
                Create a Rule
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {rules.map((rule, index) => (
              <li key={rule.id} className="flex items-center justify-between bg-future-dark/50 p-3 rounded-md border border-future-panel">
                <span className="text-future-light">
                  <span className="font-tech-mono text-photonic-blue/80 mr-3">{index + 1}.</span>
                  {rule.rule}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="link" className="p-1 h-auto" onClick={() => openEditModal(rule)}>
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button variant="link" className="p-1 h-auto text-risk-high" onClick={() => handleDelete(rule.id)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <Modal
          title={editingRule ? "Edit Rule" : "Add New Rule"}
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
