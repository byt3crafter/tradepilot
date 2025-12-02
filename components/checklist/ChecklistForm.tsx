
import React, { useState } from 'react';
import { useChecklist } from '../../context/ChecklistContext';
import { ChecklistRule } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface ChecklistFormProps {
  rule: ChecklistRule | null;
  onSuccess: () => void;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ rule, onSuccess }) => {
  const { createRule, updateRule } = useChecklist();
  const [ruleText, setRuleText] = useState(rule?.rule || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (rule) {
        await updateRule(rule.id, { rule: ruleText });
      } else {
        await createRule({ rule: ruleText });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Rule"
        id="ruleText"
        type="text"
        placeholder="e.g., Is price above 200 EMA?"
        value={ruleText}
        onChange={(e) => setRuleText(e.target.value)}
        required
      />
      
      {error && <p className="text-risk-high text-sm text-center my-4">{error}</p>}
      <div className="mt-6">
        <Button type="submit" isLoading={isLoading} className="w-full">
          {rule ? 'Save Changes' : 'Add Rule'}
        </Button>
      </div>
    </form>
  );
};

export default ChecklistForm;
