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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Helper constants
  const PRICE_ID_MONTHLY = (import.meta as any).env.VITE_PADDLE_PRICE_ID_MONTHLY || 'pri_01k5kb3jt97f5x5708vcrg14hc';
  const PRICE_ID_YEARLY = (import.meta as any).env.VITE_PADDLE_PRICE_ID_YEARLY || 'pri_01kc918kmzeepr3sg7cc74q8zs';

  const hasGiftedAccess = useMemo(() =>
    user?.isLifetimeAccess ||
    user?.role === 'ADMIN' ||
    (user?.proAccessExpiresAt && new Date(user.proAccessExpiresAt) > new Date()),
    [user]);


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
      const priceId = billingCycle === 'monthly' ? PRICE_ID_MONTHLY : PRICE_ID_YEARLY;
      const { transactionId } = await api.createCheckoutTransaction(accessToken, undefined, priceId);
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
        <div className="bg-purple-500/10 text-purple-400 text-sm font-semibold px-3 py-1 rounded-full inline-block">
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
    return (
      <div className="bg-future-gray/10 text-future-gray text-sm font-semibold px-3 py-1 rounded-full inline-block">
        No Active Subscription
      </div>
    );
  };

  if (hasGiftedAccess) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <div className="mb-8">
          <h1 className="text-3xl font-orbitron text-future-light">Subscription</h1>
          <p className="text-future-gray">You have full access to all JTradePilot features.</p>
        </div>
        <Card>
          <div className="text-center p-8">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-purple-400" />
            <h3 className="text-xl font-semibold text-future-light mt-4">Pro Access Granted</h3>
            <p className="text-future-gray mt-2">
              An administrator has granted you Pro access.
              {user?.proAccessExpiresAt ? ` Your access is valid until ${new Date(user.proAccessExpiresAt).toLocaleDateString()}.` : ' You have lifetime access.'}
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
          <p className="text-future-gray">You have full access to all JTradePilot features.</p>
        </div>
        <Card>
          <div className="text-center p-8">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-momentum-green" />
            <h3 className="text-xl font-semibold text-momentum-green mt-4">Welcome to JTradePilot Pro!</h3>
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
        <p className="text-future-gray">Manage your JTradePilot subscription plan.</p>
      </div>

      <Card>
        <div className="bg-future-dark/50 p-4 rounded-lg border border-photonic-blue/10 space-y-3 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-future-gray">Current Status</span>
            {renderStatusPill()}
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-future-light">Upgrade to JTradePilot Pro</h3>
          <p className="text-future-gray mt-2 mb-6">Unlock unlimited trade logging, AI insights, and all future updates.</p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-future-gray'}`}>Monthly</span>
            <button
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              className="w-12 h-6 bg-white/10 rounded-full p-1 relative transition-colors hover:bg-white/20"
            >
              <div className={`w-4 h-4 bg-momentum-green rounded-full shadow-sm transform transition-transform duration-200 ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-future-gray'}`}>
              Yearly <span className="text-momentum-green text-xs ml-1">(Save 17%)</span>
            </span>
          </div>

          {/* Price Display */}
          <div className="mb-8">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-white">
                {billingCycle === 'monthly' ? '$5.99' : '$60.00'}
              </span>
              <span className="text-future-gray">
                /{billingCycle === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-sm text-momentum-green mt-2 font-bold">Save $11.88 per year</p>
            )}
          </div>

          {/* Button content changes by stage */}
          <Button onClick={openCheckout} disabled={isButtonDisabled} className="w-full sm:w-auto min-w-[200px]">
            {uiStage === 'opening' && <Spinner />}
            {uiStage === 'idle' && (billingCycle === 'monthly' ? 'Subscribe Monthly' : 'Subscribe Yearly')}
            {uiStage === 'paid' && (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Finalizing...
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