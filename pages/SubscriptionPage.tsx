import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';
import { usePaddle } from '../context/PaddleContext';
import api from '../services/api';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';

type UiStage = 'idle' | 'opening' | 'paid' | 'activated' | 'error';

const SubscriptionPage: React.FC = () => {
  const { user, accessToken, isSubscribed, isTrialing, trialDaysRemaining, refreshUser } = useAuth();
  const { paddle, isLoading: isPaddleLoading } = usePaddle();

  const [uiStage, setUiStage] = useState<UiStage>('idle');
  const [error, setError] = useState<string>('');
  
  const hasGiftedAccess = useMemo(() => user?.proAccessExpiresAt && new Date(user.proAccessExpiresAt) > new Date(), [user]);


  // Debug
  useEffect(() => {
    console.log('[SubscriptionPage] Paddle state:', { paddle, isPaddleLoading });
  }, [paddle, isPaddleLoading]);

  // If user becomes subscribed at any point, mark activated
  useEffect(() => {
    if (isSubscribed) setUiStage('activated');
  }, [isSubscribed]);

  const isButtonDisabled = useMemo(
    () => isPaddleLoading || uiStage === 'opening' || !paddle,
    [isPaddleLoading, uiStage, paddle]
  );

  const openCheckout = async () => {
    if (!paddle || !accessToken) {
      setError('Billing is not available at the moment. Please try again later.');
      return;
    }

    setError('');
    setUiStage('opening');

    try {
      const { transactionId } = await api.createCheckoutTransaction(accessToken);
      console.log('[SubscriptionPage] Open Paddle checkout for txn:', transactionId);

      // Important: events are globally handled in Paddle.Initialize(eventCallback).
      // We still want a local UX change when the sheet closes or completes.
      paddle.Checkout.open({ transactionId });

      // We can’t rely on local event handlers here (Paddle v2 emits to the global callback).
      // So we set up a small “completion watcher” that:
      //  1) Moves to "paid" when the global event callback (in PaddleContext) runs refreshUser().
      //  2) Polls user until it flips to ACTIVE, then we set "activated".
      // To keep it simple, we kick off a poll after a short delay.
      const startPolling = async () => {
        // optimistic: we already know checkout completed via the PaddleContext callback
        // (it calls refreshUser once). We display "paid" state while polling.
        setUiStage('paid');

        // Poll up to ~60s using exponential backoff: 2s, 3s, 5s, 8s, 13s, 21s, 34s…
        const waits = [2000, 3000, 5000, 8000, 13000, 21000, 34000];
        for (let i = 0; i < waits.length; i++) {
          const updated = await refreshUser();
          console.log(`[SubscriptionPage] Poll #${i + 1}: subscription=${updated?.subscriptionStatus}`);
          if (updated?.subscriptionStatus === 'ACTIVE') {
            setUiStage('activated');
            return;
          }
          await new Promise((r) => setTimeout(r, waits[i]));
        }

        // If still not active after max time, inform the user gently.
        setError('Payment successful! Your account is finalizing. If it doesn’t update shortly, please refresh.');
        setUiStage('idle');
      };

      // Kick polling a bit after checkout completes; in practice, PaddleContext’s eventCallback
      // refreshes once already. This stagger avoids racing the webhook.
      setTimeout(() => void startPolling(), 2000);
    } catch (e: any) {
      console.error('[SubscriptionPage] Error starting checkout:', e);
      setError(e?.message || 'Could not start checkout. Please try again.');
      setUiStage('error');
    }
  };

  // ——— Render helpers ———
  const renderStatusPill = () => {
    if (hasGiftedAccess) {
       return (
        <div className="bg-future-purple/10 text-future-purple text-sm font-semibold px-3 py-1 rounded-full inline-block">
          Pro (Gifted)
        </div>
      );
    }
    if (isSubscribed || uiStage === 'activated') {
      return (
        <div className="bg-momentum-green/10 text-momentum-green text-sm font-semibold px-3 py-1 rounded-full inline-block">
          Pro Active
        </div>
      );
    }
    if (isTrialing) {
      return (
        <div className="bg-photonic-blue/10 text-photonic-blue text-sm font-semibold px-3 py-1 rounded-full inline-block">
          Trial Period
        </div>
      );
    }
    return (
      <div className="bg-future-gray/10 text-future-gray text-sm font-semibold px-3 py-1 rounded-full inline-block">
        No Active Subscription
      </div>
    );
  };

  if (hasGiftedAccess) {
     const isLifetime = new Date(user?.proAccessExpiresAt || 0).getFullYear() > 9000;
     return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <div className="mb-8">
          <h1 className="text-3xl font-orbitron text-future-light">Subscription</h1>
          <p className="text-future-gray">You have full access to all tradePilot features.</p>
        </div>
        <Card className="!p-0">
          <div className="text-center p-8 bg-future-panel rounded-lg">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-future-purple" />
            <h3 className="text-xl font-semibold text-future-light mt-4">Pro Access Granted</h3>
            <p className="text-future-gray mt-2">
              An administrator has granted you Pro access. 
              {isLifetime ? ' You have lifetime access.' : ` Your access is valid until ${new Date(user!.proAccessExpiresAt!).toLocaleDateString()}.`}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isSubscribed || uiStage === 'activated') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <div className="mb-8">
          <h1 className="text-3xl font-orbitron text-future-light">Subscription</h1>
          <p className="text-future-gray">You have full access to all tradePilot features.</p>
        </div>
        <Card>
          <div className="text-center p-8">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-momentum-green" />
            <h3 className="text-xl font-semibold text-momentum-green mt-4">Welcome to tradePilot Pro!</h3>
            <p className="text-future-gray mt-2">Your subscription is active. Manage or cancel anytime.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron text-future-light">Subscription</h1>
        <p className="text-future-gray">Manage your tradePilot subscription plan.</p>
      </div>

      <Card>
        <div className="bg-future-dark/50 p-4 rounded-lg border border-photonic-blue/10 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-future-gray">Current Status</span>
            {renderStatusPill()}
          </div>

          {isTrialing && (
            <div className="flex justify-between items-center">
              <span className="text-future-gray">Trial Ends</span>
              <span className="text-future-light font-semibold">{trialDaysRemaining} days remaining</span>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <h3 className="text-lg font-semibold text-future-light">Upgrade to tradePilot Pro</h3>
          <p className="text-future-gray mt-2 mb-4">Unlock unlimited trade logging, AI insights, and all future updates.</p>

          {/* Button content changes by stage */}
          <Button onClick={openCheckout} disabled={isButtonDisabled} className="w-full sm:w-auto">
            {uiStage === 'opening' && <Spinner />}
            {uiStage === 'idle' && 'Upgrade to Pro – $19/month'}
            {uiStage === 'paid' && (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Payment received — finalizing…
              </span>
            )}
            {uiStage === 'error' && 'Try again'}
          </Button>

          {error && <p className="text-sm text-risk-high mt-3">{error}</p>}
        </div>
      </Card>
    </div>
  );
};

export default SubscriptionPage;