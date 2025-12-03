import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { XCircleIcon } from '../icons/XCircleIcon';

const TrialBanner: React.FC = () => {
  const { trialDaysRemaining, isTrialExpired, isTrialing } = useAuth();
  const { requestUpgradeModal } = useUI();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || !isTrialing) {
    return null;
  }

  // Display 15 days trial period (showing remaining days)
  const daysRemaining = trialDaysRemaining || 15;
  const message = isTrialExpired
    ? "Your free trial has ended. Please upgrade to continue logging trades."
    : `You have ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in your trial.`;

  const bannerClass = isTrialExpired ? 'bg-risk-high/80' : 'bg-photonic-blue/80';

  return (
    <div className={`w-full p-3 text-sm text-future-dark font-semibold ${bannerClass} relative flex items-center justify-between`}>
      <span>{message}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={requestUpgradeModal}
          className="px-3 py-1 rounded-md bg-future-dark/80 hover:bg-future-dark text-photonic-blue font-semibold transition-colors text-xs"
        >
          Upgrade Now
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 rounded-full hover:bg-black/20"
          aria-label="Dismiss"
        >
          <XCircleIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TrialBanner;