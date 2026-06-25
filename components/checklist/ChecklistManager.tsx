import React, { useState } from 'react';
import { useChecklist } from '../../context/ChecklistContext';
import Spinner from '../Spinner';
import { ChecklistRule } from '../../types';
import { ChecklistIcon } from '../icons/ChecklistIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { CancelIcon } from '../icons/CancelIcon';
import Button from '../ui/Button';
import ChecklistForm from './ChecklistForm';

const ChecklistManager: React.FC = () => {
  const { rules, isLoading, deleteRule, updateRule } = useChecklist();
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (rule: ChecklistRule) => {
    setEditingRuleId(rule.id);
    setEditingText(rule.rule);
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setEditingText('');
  };

  const saveEdit = async () => {
    if (!editingRuleId || !editingText.trim()) return;
    setIsSaving(true);
    try {
      await updateRule(editingRuleId, { rule: editingText.trim() });
      setEditingRuleId(null);
      setEditingText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
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
    <div>
      <div className="mb-5">
        <h2 className="text-jtp-xl font-semibold text-jtp-text">Pre-Trade Checklist</h2>
        <p className="text-jtp-sm text-jtp-textDim mt-0.5">
          Optional pre-trade checklist. These prompts are shown (optionally) when you log a trade; your adherence is tracked in Analytics.
        </p>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : (
          <>
            {rules.length === 0 ? (
              <div className="text-center p-10 border-2 border-dashed border-jtp-borderStrong rounded-jtp-panel mb-3">
                <ChecklistIcon className="w-10 h-10 mx-auto text-jtp-textDim" />
                <h3 className="text-jtp-lg font-semibold text-jtp-text mt-4">No Rules Defined</h3>
                <p className="text-jtp-sm text-jtp-textDim mt-2">Add your first pre-trade confirmation rule below.</p>
              </div>
            ) : (
              <ul className="space-y-1.5 mb-3">
                {rules.map((rule, index) => (
                  <li
                    key={rule.id}
                    className="flex items-center bg-jtp-raised border border-jtp-border rounded-jtp-md px-3 py-2"
                  >
                    {editingRuleId === rule.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-mono text-jtp-textDim text-jtp-sm flex-shrink-0">
                          {index + 1}.
                        </span>
                        <input
                          autoFocus
                          aria-label={`Edit rule ${index + 1}`}
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 min-w-0 bg-jtp-control border border-jtp-blue rounded-jtp-sm px-2.5 py-1 text-jtp-sm text-jtp-text outline-none focus:ring-1 focus:ring-jtp-blue/40 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={isSaving || !editingText.trim()}
                          aria-label="Save rule"
                          className="p-1.5 rounded text-jtp-profit hover:text-jtp-profitDot disabled:opacity-40 flex-shrink-0 transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          aria-label="Cancel editing"
                          className="p-1.5 rounded text-jtp-textDim hover:text-jtp-text flex-shrink-0 transition-colors"
                        >
                          <CancelIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-jtp-md text-jtp-text flex-1 min-w-0">
                          <span className="font-mono text-jtp-textDim mr-2.5">{index + 1}.</span>
                          {rule.rule}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                          <Button
                            variant="link"
                            className="p-1.5 h-auto text-jtp-textDim hover:text-jtp-text"
                            onClick={() => startEdit(rule)}
                            aria-label={`Edit rule ${index + 1}`}
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="link"
                            className="p-1.5 h-auto text-jtp-loss"
                            onClick={() => handleDelete(rule.id)}
                            aria-label={`Delete rule ${index + 1}`}
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <ChecklistForm />
          </>
        )}
      </div>
    </div>
  );
};

export default ChecklistManager;
