import React, { useState } from 'react';
import { useStrategy } from '../../context/StrategyContext';
import { Strategy } from '../../types';
import AuthInput from '../auth/AuthInput';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Textarea from '../ui/Textarea';

interface StrategyFormProps {
  strategy: Strategy | null;
  onSuccess: () => void;
}

const StrategyForm: React.FC<StrategyFormProps> = ({ strategy, onSuccess }) => {
  const { createStrategy, updateStrategy } = useStrategy();
  const [name, setName] = useState(strategy?.name || '');
  const [description, setDescription] = useState(strategy?.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (strategy) {
        await updateStrategy(strategy.id, { name, description });
      } else {
        await createStrategy({ name, description });
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
      <AuthInput
        label="Strategy Name"
        id="strategyName"
        type="text"
        placeholder="e.g., London Breakout"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Textarea
        label="Description (Optional)"
        id="strategyDescription"
        placeholder="Describe the key principles of this strategy..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      
      {error && <p className="text-risk-high text-sm text-center my-4">{error}</p>}
      <div className="mt-6">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : (strategy ? 'Save Changes' : 'Create Strategy')}
        </Button>
      </div>
    </form>
  );
};

export default StrategyForm;
