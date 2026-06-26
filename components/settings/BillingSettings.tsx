import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePaddle } from '../../context/PaddleContext';
import { useView } from '../../context/ViewContext';
import { Panel, Badge, Button } from '../ui';

const BillingSettings: React.FC = () => {
  const { user, isTrialing } = useAuth();
  const { isLoading: isPaddleLoading } = usePaddle();
  const { navigateTo } = useView();

  const calculateDaysRemaining = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getStatusVariant = (): 'profit' | 'info' | 'loss' | 'neutral' => {
    switch (user?.subscriptionStatus) {
      case 'ACTIVE':   return 'profit';
      case 'TRIALING': return 'info';
      case 'PAST_DUE': return 'loss';
      case 'CANCELED': return 'neutral';
      default:         return 'neutral';
    }
  };

  const getStatusDisplay = (): string => {
    switch (user?.subscriptionStatus) {
      case 'ACTIVE':   return 'ACTIVE';
      case 'TRIALING': return 'TRIALING';
      case 'PAST_DUE': return 'PAST DUE';
      case 'CANCELED': return 'CANCELED';
      default:         return 'UNKNOWN';
    }
  };

  const daysRemaining = calculateDaysRemaining(user?.trialEndsAt || null);
  const showTrialWarning = isTrialing && daysRemaining !== null && daysRemaining <= 7;

  return (
    <div className="space-y-4">
      <Panel label="SUBSCRIPTION">
        {/* Status row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Badge variant={getStatusVariant()} size="md">{getStatusDisplay()}</Badge>
          {showTrialWarning && daysRemaining !== null && (
            <p className="text-jtp-lg font-mono font-semibold text-jtp-warning">
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
            </p>
          )}
        </div>

        {/* Pro Access Expiration */}
        {user?.proAccessExpiresAt && user?.subscriptionStatus === 'ACTIVE' && (
          <div className="pt-4 border-t border-jtp-border mt-4">
            <p className="jtp-label mb-1">PRO ACCESS EXPIRES</p>
            <p className="text-jtp-md text-jtp-text">
              {new Date(user.proAccessExpiresAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Action */}
        <div className="pt-4 border-t border-jtp-border mt-4">
          {isTrialing || user?.subscriptionStatus === 'PAST_DUE' ? (
            <div className="space-y-3">
              <p className="text-jtp-md text-jtp-textMuted">
                {isTrialing
                  ? 'Your trial is active. Upgrade to Pro for unlimited access and all features.'
                  : 'Your subscription has expired. Upgrade now to restore access.'}
              </p>
              <Button
                onClick={() => navigateTo('pricing')}
                isLoading={isPaddleLoading}
                disabled={isPaddleLoading}
                className="w-full"
              >
                {isPaddleLoading ? 'Loading...' : 'View Plans & Upgrade'}
              </Button>
            </div>
          ) : user?.subscriptionStatus === 'ACTIVE' ? (
            <p className="text-jtp-md text-jtp-profit">
              Your subscription is active. Thank you for being a TradePilot user!
            </p>
          ) : (
            <p className="text-jtp-md text-jtp-textMuted">
              Your subscription has been canceled.
            </p>
          )}
        </div>
      </Panel>

      <Panel label="BILLING FAQ">
        <div className="space-y-4">
          <div>
            <p className="text-jtp-md font-semibold text-jtp-textSoft mb-1">What happens when my trial ends?</p>
            <p className="text-jtp-md text-jtp-textMuted">
              Your account will be restricted and you won't be able to create new trades or access advanced features. You can still view your historical data.
            </p>
          </div>

          <div className="pt-4 border-t border-jtp-border">
            <p className="text-jtp-md font-semibold text-jtp-textSoft mb-1">Can I cancel my subscription anytime?</p>
            <p className="text-jtp-md text-jtp-textMuted">
              Yes, you can cancel your subscription anytime from your billing settings or by contacting our support team.
            </p>
          </div>

          <div className="pt-4 border-t border-jtp-border">
            <p className="text-jtp-md font-semibold text-jtp-textSoft mb-1">Early Adopter Pricing</p>
            <p className="text-jtp-md text-jtp-textMuted">
              As an early adopter, you lock in{' '}
              <span className="font-mono font-semibold text-jtp-text">$5.99/month</span>{' '}
              pricing forever and receive all new features. Contact{' '}
              <a href="mailto:support@jtradepilot.com" className="text-jtp-blue hover:text-jtp-blueHover">
                support@jtradepilot.com
              </a>
              {' '}for any billing questions.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default BillingSettings;
