import React, { useState } from 'react';
import Card from '../Card';
import { SparklesIcon } from '../icons/SparklesIcon';
import Button from '../ui/Button';
import { useAccount } from '../../context/AccountContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Spinner from '../Spinner';

const AiDebriefCard: React.FC = () => {
  const { activeAccount } = useAccount();
  const { accessToken } = useAuth();
  const [debrief, setDebrief] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!activeAccount || !accessToken) return;
    setIsLoading(true);
    setError('');
    setDebrief(null);
    try {
      const response = await api.getWeeklyDebrief(activeAccount.id, accessToken);
      setDebrief(response.debrief);
    } catch (err: any) {
      setError(err.message || 'Failed to generate debrief.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <Spinner />
          <p className="mt-2 text-sm text-future-gray">The AI is analyzing your weekly performance...</p>
        </div>
      );
    }

    if (error) {
       return <p className="text-sm text-risk-high text-center">{error}</p>
    }

    if (debrief) {
      return (
        <div className="space-y-3">
          {debrief.split('\n').map((paragraph, index) => (
            <p key={index} className="text-future-light text-sm leading-relaxed">{paragraph}</p>
          ))}
        </div>
      );
    }
    
    // Initial state
    return (
      <div className="text-center">
        <p className="text-future-gray mb-4">Get a personalized summary of your trading performance, highlighting strengths, weaknesses, and actionable advice for next week.</p>
        <Button onClick={handleGenerate} className="w-auto flex items-center gap-2 mx-auto">
          <SparklesIcon className="w-5 h-5" />
          Generate My Weekly AI Debrief
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="w-6 h-6 text-photonic-blue" />
        <h2 className="text-xl font-orbitron text-photonic-blue">Weekly AI Debrief</h2>
      </div>
      {renderContent()}
    </Card>
  );
};

export default AiDebriefCard;
