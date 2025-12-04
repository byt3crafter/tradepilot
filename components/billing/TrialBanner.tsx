import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import { XCircleIcon } from '../icons/XCircleIcon';

const TrialBanner: React.FC = () => {
  const { trialDaysRemaining, isTrialExpired, isTrialing, user } = useAuth();
  const { navigateTo } = useView();
  const [isVisible, setIsVisible] = useState(true);

  // Don't show trial banner for admin users
  if (!isVisible || !isTrialing || user?.role === 'ADMIN') {
    return null;
  }

  // Display trial period (showing remaining days)
  const daysRemaining = trialDaysRemaining || 14;
  const message = isTrialExpired
    ? "Your trial has ended. Upgrade to continue."
    : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in your trial`;

  // Minimal, subtle design - not stressful
  const bannerClass = isTrialExpired
    ? 'bg-white/5 border-b border-white/10'
    : 'bg-white/5 border-b border-photonic-blue/20';

  const handleUpgrade = () => {
    navigateTo('settings', 'billing');
  };

  return (
    <div className={`w-full px-4 py-2 text-xs text-future-gray font-medium ${bannerClass} relative flex items-center justify-between`}>
      <span>{message}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={handleUpgrade}
          className="px-3 py-1 rounded-md bg-photonic-blue/20 hover:bg-photonic-blue/30 text-photonic-blue font-semibold transition-colors text-xs"
        >
          Upgrade
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <XCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TrialBanner;