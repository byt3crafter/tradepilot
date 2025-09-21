import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { XCircleIcon } from '../icons/XCircleIcon';

const TrialBanner: React.FC = () => {
  const { trialDaysRemaining, isTrialExpired } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || (!trialDaysRemaining && !isTrialExpired)) {
    return null;
  }

  const message = isTrialExpired
    ? "Your free trial has ended. Please upgrade to continue logging trades."
    : `You have ${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} left in your trial.`;

  const bannerClass = isTrialExpired ? 'bg-risk-high/80' : 'bg-photonic-blue/80';

  return (
    <div className={`w-full text-center p-2 text-sm text-future-dark font-semibold ${bannerClass} relative`}>
      <span>{message}</span>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20"
        aria-label="Dismiss"
      >
        <XCircleIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default TrialBanner;