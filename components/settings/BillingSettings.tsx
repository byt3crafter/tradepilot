import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePaddle } from '../../context/PaddleContext';
import Card from '../Card';
import Button from '../ui/Button';
import api from '../../services/api';

const BillingSettings: React.FC = () => {
  const { user, isTrialing, accessToken } = useAuth();
  const { paddle, isLoading: isPaddleLoading } = usePaddle();
  const [isLoading, setIsLoading] = useState(false);

  const calculateDaysRemaining = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      if (!paddle) {
        console.error('Paddle not initialized');
        throw new Error('Payment system is not ready. Please refresh the page and try again.');
      }

      // Create checkout transaction on backend
      const { transactionId } = await api.post('/api/billing/checkout', {}, accessToken!);

      // Open Paddle checkout with the transaction ID
      paddle.Checkout.open({
        transactionId,
        settings: {
          allowLogout: false,
          displayMode: 'modal',
        },
      });
    } catch (err: any) {
      console.error('Upgrade error:', err);
      alert(err.message || 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (): string => {
    switch (user?.subscriptionStatus) {
      case 'ACTIVE':
        return 'text-momentum-green';
      case 'TRIALING':
        return 'text-photonic-blue';
      case 'PAST_DUE':
        return 'text-risk-high';
      case 'CANCELED':
        return 'text-future-gray';
      default:
        return 'text-future-gray';
    }
  };

  const getStatusDisplay = (): string => {
    switch (user?.subscriptionStatus) {
      case 'ACTIVE':
        return 'Active';
      case 'TRIALING':
        return 'Trial';
      case 'PAST_DUE':
        return 'Past Due';
      case 'CANCELED':
        return 'Canceled';
      default:
        return 'Unknown';
    }
  };

  const daysRemaining = calculateDaysRemaining(user?.trialEndsAt || null);
  const showTrialWarning = isTrialing && daysRemaining !== null && daysRemaining <= 7;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-6">Subscription Status</h2>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="pb-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-future-gray mb-2">Current Status</p>
                <p className={`text-lg font-semibold ${getStatusColor()}`}>
                  {getStatusDisplay()}
                </p>
              </div>
            </div>
          </div>

          {/* Trial Information */}
          {isTrialing && user?.trialEndsAt && (
            <div className="pb-6 border-b border-white/10">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-future-gray mb-2">Trial Ends</p>
                  <p className="text-future-light">
                    {new Date(user.trialEndsAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {daysRemaining !== null && (
                  <div>
                    <p className={`text-sm font-semibold ${
                      showTrialWarning ? 'text-risk-high' : 'text-future-gray'
                    }`}>
                      {daysRemaining === 0
                        ? 'Trial expired - upgrade now to keep trading'
                        : `${daysRemaining} days remaining`}
                    </p>
                  </div>
                )}

                {showTrialWarning && daysRemaining !== 0 && (
                  <div className="mt-3 p-3 bg-risk-high/10 border border-risk-high/20 rounded-md">
                    <p className="text-sm text-risk-high">
                      Your trial is ending soon. Upgrade now to maintain access to your account.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pro Access Expiration */}
          {user?.proAccessExpiresAt && user?.subscriptionStatus === 'ACTIVE' && (
            <div className="pb-6 border-b border-white/10">
              <div>
                <p className="text-sm text-future-gray mb-2">Pro Access Expires</p>
                <p className="text-future-light">
                  {new Date(user.proAccessExpiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div>
            {isTrialing || user?.subscriptionStatus === 'PAST_DUE' ? (
              <div className="space-y-3">
                <p className="text-sm text-future-gray">
                  {isTrialing
                    ? 'Your trial period is active. Upgrade to pro for unlimited access and features.'
                    : 'Your subscription has expired. Upgrade now to restore access.'}
                </p>
                <Button
                  onClick={handleUpgrade}
                  isLoading={isLoading || isPaddleLoading}
                  disabled={isPaddleLoading}
                  className="w-full"
                >
                  {isPaddleLoading ? 'Loading...' : isTrialing ? 'Upgrade to Pro' : 'Renew Subscription'}
                </Button>
              </div>
            ) : user?.subscriptionStatus === 'ACTIVE' ? (
              <p className="text-sm text-momentum-green">
                ✓ Your subscription is active. Thank you for being a TradePilot user!
              </p>
            ) : (
              <p className="text-sm text-future-gray">
                Your subscription has been canceled.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Billing FAQ */}
      <Card>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-4">Billing FAQ</h2>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-future-light mb-1">What happens when my trial ends?</p>
            <p className="text-future-gray">
              Your account will be restricted and you won't be able to create new trades or access advanced features. You can still view your historical data.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="font-semibold text-future-light mb-1">Can I cancel my subscription anytime?</p>
            <p className="text-future-gray">
              Yes, you can cancel your subscription anytime from your billing settings or by contacting our support team.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="font-semibold text-future-light mb-1">Do you offer refunds?</p>
            <p className="text-future-gray">
              We offer a 30-day money-back guarantee for all new subscriptions. Contact support@tradepilot.com for refund requests.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BillingSettings;
