import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePaddle } from '../../context/PaddleContext';
import { useView } from '../../context/ViewContext';
import Card from '../Card';
import Button from '../ui/Button';

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

  const getStatusColor = (): string => {
    switch (user?.subscriptionStatus) {
      case 'ACTIVE':    return 'text-jtp-profit';
      case 'TRIALING':  return 'text-jtp-blue';
      case 'PAST_DUE':  return 'text-jtp-loss';
      case 'CANCELED':  return 'text-jtp-textDim';
      default:          return 'text-jtp-textDim';
    }
  };

  const getStatusDisplay = (): string => {
    switch (user?.subscriptionStatus) {
      case 'ACTIVE':   return 'Active';
      case 'TRIALING': return 'Trial';
      case 'PAST_DUE': return 'Past Due';
      case 'CANCELED': return 'Canceled';
      default:         return 'Unknown';
    }
  };

  const daysRemaining = calculateDaysRemaining(user?.trialEndsAt || null);
  const showTrialWarning = isTrialing && daysRemaining !== null && daysRemaining <= 7;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-jtp-xl font-semibold text-jtp-text mb-5">Subscription</h2>

        <div className="space-y-5">
          {/* Current Status */}
          <div className="pb-5 border-b border-jtp-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-1">Current Status</p>
                <p className={`text-jtp-2xl font-semibold ${getStatusColor()}`}>
                  {getStatusDisplay()}
                </p>
              </div>
              {showTrialWarning && daysRemaining !== null && (
                <div className="text-right">
                  <p className="text-jtp-sm text-jtp-warning font-medium">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</p>
                  <p className="text-jtp-xs text-jtp-textDim">in trial period</p>
                </div>
              )}
            </div>
          </div>

          {/* Pro Access Expiration */}
          {user?.proAccessExpiresAt && user?.subscriptionStatus === 'ACTIVE' && (
            <div className="pb-5 border-b border-jtp-border">
              <p className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-1">Pro Access Expires</p>
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
          <div>
            {isTrialing || user?.subscriptionStatus === 'PAST_DUE' ? (
              <div className="space-y-3">
                <p className="text-jtp-sm text-jtp-textDim">
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
              <p className="text-jtp-sm text-jtp-profit">
                Your subscription is active. Thank you for being a TradePilot user!
              </p>
            ) : (
              <p className="text-jtp-sm text-jtp-textDim">
                Your subscription has been canceled.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Billing FAQ */}
      <Card>
        <h2 className="text-jtp-xl font-semibold text-jtp-text mb-4">Billing FAQ</h2>

        <div className="space-y-4 text-jtp-sm">
          <div>
            <p className="font-semibold text-jtp-textSoft mb-1">What happens when my trial ends?</p>
            <p className="text-jtp-textDim">
              Your account will be restricted and you won't be able to create new trades or access advanced features. You can still view your historical data.
            </p>
          </div>

          <div className="pt-4 border-t border-jtp-border">
            <p className="font-semibold text-jtp-textSoft mb-1">Can I cancel my subscription anytime?</p>
            <p className="text-jtp-textDim">
              Yes, you can cancel your subscription anytime from your billing settings or by contacting our support team.
            </p>
          </div>

          <div className="pt-4 border-t border-jtp-border">
            <p className="font-semibold text-jtp-textSoft mb-1">Early Adopter Pricing</p>
            <p className="text-jtp-textDim">
              As an early adopter, you lock in $5/month pricing forever and receive all new features. Contact{' '}
              <a href="mailto:support@tradepilot.com" className="text-jtp-blue hover:text-jtp-blueHover">
                support@tradepilot.com
              </a>
              {' '}for any billing questions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BillingSettings;
