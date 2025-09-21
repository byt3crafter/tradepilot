import React, { useState } from 'react';
import { Trade, TradeJournal } from '../../types';
import { useTrade } from '../../context/TradeContext';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import Textarea from '../ui/Textarea';

interface JournalFormProps {
  trade: Trade;
  onSuccess: () => void;
}

const JournalForm: React.FC<JournalFormProps> = ({ trade, onSuccess }) => {
  const { createOrUpdateJournal } = useTrade();
  
  const [mindsetBefore, setMindsetBefore] = useState(trade.tradeJournal?.mindsetBefore || '');
  const [exitReasoning, setExitReasoning] = useState(trade.tradeJournal?.exitReasoning || '');
  const [lessonsLearned, setLessonsLearned] = useState(trade.tradeJournal?.lessonsLearned || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = mindsetBefore && exitReasoning && lessonsLearned;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
        setError('Please fill out all fields.');
        return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      await createOrUpdateJournal(trade.id, { mindsetBefore, exitReasoning, lessonsLearned });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Textarea
          label="What did you see and how did you feel before entry?"
          id="mindsetBefore"
          value={mindsetBefore}
          onChange={(e) => setMindsetBefore(e.target.value)}
          placeholder="Describe your analysis, the setup, and your emotional state..."
          required
        />
        <Textarea
          label="Why did you exit where you did?"
          id="exitReasoning"
          value={exitReasoning}
          onChange={(e) => setExitReasoning(e.target.value)}
          placeholder="Did you hit your take profit, stop loss, or exit manually? Explain why."
          required
        />
        <Textarea
          label="What are the key lessons learned from this trade?"
          id="lessonsLearned"
          value={lessonsLearned}
          onChange={(e) => setLessonsLearned(e.target.value)}
          placeholder="What went well? What could be improved next time?"
          required
        />
      </div>
      
      {error && <p className="text-risk-high text-sm text-center my-4">{error}</p>}

      <div className="mt-6">
        <Button type="submit" disabled={isLoading || !canSubmit} className="w-full">
          {isLoading ? <Spinner /> : 'Save Journal Entry'}
        </Button>
      </div>
    </form>
  );
};

export default JournalForm;
