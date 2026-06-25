import React, { useState } from 'react';
import { useChecklist } from '../../context/ChecklistContext';
import { PlusIcon } from '../icons/PlusIcon';

const ChecklistForm: React.FC = () => {
  const { createRule } = useChecklist();
  const [ruleText, setRuleText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    const trimmed = ruleText.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError('');
    try {
      await createRule({ rule: trimmed });
      setRuleText('');
    } catch (err: any) {
      setError(err.message || 'Failed to add rule.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 bg-jtp-raised border border-jtp-border rounded-jtp-md px-3 py-2">
        <PlusIcon className="w-3.5 h-3.5 text-jtp-textDim flex-shrink-0" />
        <input
          type="text"
          aria-label="New rule text"
          placeholder="Add a rule — e.g., Is price above 200 EMA?"
          value={ruleText}
          onChange={e => setRuleText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          disabled={isLoading}
          className="flex-1 bg-transparent text-jtp-sm text-jtp-text placeholder:text-jtp-textDisabled outline-none min-w-0"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading || !ruleText.trim()}
          className="flex-shrink-0 px-3 py-1 rounded-jtp-sm bg-jtp-blue text-white text-jtp-xs font-medium disabled:opacity-40 hover:bg-jtp-blueHover transition-colors"
        >
          {isLoading ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="text-jtp-loss text-jtp-xs mt-1.5 pl-1">{error}</p>}
    </div>
  );
};

export default ChecklistForm;
