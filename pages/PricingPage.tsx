import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

import Card from '../components/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';
import { usePaddle } from '../context/PaddleContext';
import api from '../services/api';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { usePublicRouter } from '../context/PublicRouterContext';
import { useView } from '../context/ViewContext';

type UiStage = 'idle' | 'opening' | 'paid' | 'activated' | 'error';
type BillingCycle = 'monthly' | 'yearly';



const PricingPage: React.FC = () => {
    const { user, accessToken, refreshUser, isAuthenticated } = useAuth();
    const { paddle, isLoading: isPaddleLoading } = usePaddle();
    const { replace } = usePublicRouter();
    // Use window.location directly since we aren't in react-router
    const searchParams = window.location.search;

    const [uiStage, setUiStage] = useState<UiStage>('idle');
    const [error, setError] = useState<string>('');
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [plans, setPlans] = useState<any[]>([]);
    const [arePlansLoading, setArePlansLoading] = useState(true);

    useEffect(() => {
        const loadPlans = async () => {
            try {
                const data = await api.getPublicPlans();
                setPlans(data);
            } catch (e) {
                console.error("Failed to load plans", e);
            } finally {
                setArePlansLoading(false);
            }
        };
        loadPlans();
    }, []);

    const monthlyPlan = plans.find(p => p.interval === 'month') || {
        amount: 5.99,
        paddlePriceId: (import.meta as any).env.VITE_PADDLE_PRICE_ID_MONTHLY || 'pri_01k5kb3jt97f5x5708vcrg14hc',
        currency: 'USD'
    };

    const yearlyPlan = plans.find(p => p.interval === 'year') || {
        amount: 60.00,
        paddlePriceId: (import.meta as any).env.VITE_PADDLE_PRICE_ID_YEARLY || 'pri_01kc918kmzeepr3sg7cc74q8zs',
        currency: 'USD'
    };

    const hasRunAutoCheckout = React.useRef(false);

    React.useEffect(() => {
        // Check URL params for auto-checkout plan
        const params = new URLSearchParams(searchParams);
        const planParam = params.get('plan');

        if (planParam && (planParam === 'monthly' || planParam === 'yearly') && !hasRunAutoCheckout.current && paddle && accessToken && !arePlansLoading) {
            hasRunAutoCheckout.current = true;
            setBillingCycle(planParam as BillingCycle);

            // Remove the param from URL without refreshing and WITHOUT triggering a React re-render
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            // Trigger checkout
            setTimeout(() => {
                openCheckout(planParam as BillingCycle);
            }, 500);
        }
    }, [paddle, accessToken, arePlansLoading]);

    const { navigateTo } = useView();

    // Listen for global payment success event (from PaddleContext)
    useEffect(() => {
        const handlePaymentSuccess = async () => {
            console.log('[PricingPage] Payment success event received! Starting sync...');
            setUiStage('paid');

            // Force immediate sync with Paddle to bypass webhook latency
            try {
                if (accessToken) await api.syncSubscription(accessToken);
            } catch (e) {
                console.error('Sync failed', e);
            }

            // Trigger immediate refresh
            refreshUser().then((updated) => {
                if (updated?.subscriptionStatus === 'ACTIVE') {
                    setUiStage('activated');
                }
            });
        };
        window.addEventListener('payment_success', handlePaymentSuccess);
        return () => window.removeEventListener('payment_success', handlePaymentSuccess);
    }, [refreshUser, accessToken]);


    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [isValidatingPromo, setIsValidatingPromo] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: string; value: number } | null>(null);

    const validatePromo = async () => {
        if (!promoCode) return;
        setIsValidatingPromo(true);
        setPromoError('');
        try {
            const res = await api.validatePromoCode(promoCode, accessToken || '');
            setAppliedPromo(res);
            setPromoError('');
        } catch (err: any) {
            setPromoError(err.message || 'Invalid promo code');
            setAppliedPromo(null);
        } finally {
            setIsValidatingPromo(false);
        }
    };

    const isButtonDisabled = useMemo(
        () => isPaddleLoading || uiStage === 'opening' || !paddle,
        [isPaddleLoading, uiStage, paddle]
    );

    const openCheckout = async (cycleOverride?: BillingCycle) => {
        if (!paddle || !accessToken) {
            setError('Billing is not available at the moment. Please try again later.');
            return;
        }

        setError('');
        setUiStage('opening');

        try {
            // Use override if provided (state updates are async), otherwise fallback to current state
            const targetCycle = cycleOverride || billingCycle;
            const priceId = targetCycle === 'monthly' ? monthlyPlan.paddlePriceId : yearlyPlan.paddlePriceId;

            const { transactionId } = await api.createCheckoutTransaction(accessToken, appliedPromo?.code, priceId, user?.email);
            console.log('[PricingPage] Open Paddle checkout for txn:', transactionId);

            paddle.Checkout.open({
                transactionId,
                settings: {
                    theme: 'dark'
                }
            });

            const startPolling = async () => {
                setUiStage('paid');

                // Force a sync at start of polling (in case webhook is slow)
                if (accessToken) {
                    await api.syncSubscription(accessToken).catch(() => null);
                }

                const waits = [2000, 3000, 5000, 8000, 13000, 21000, 34000];
                for (let i = 0; i < waits.length; i++) {
                    const updated = await refreshUser();
                    console.log(`[PricingPage] Poll #${i + 1}: subscription=${updated?.subscriptionStatus}`);
                    if (updated?.subscriptionStatus === 'ACTIVE') {
                        setUiStage('activated');
                        return;
                    }
                    await new Promise((r) => setTimeout(r, waits[i]));
                }

                setError('Payment successful! Your account is finalizing. If it doesn\'t update shortly, please refresh.');
                setUiStage('idle');
            };

            setTimeout(() => void startPolling(), 2000);
        } catch (e: any) {
            console.error('[PricingPage] Error starting checkout:', e);
            setError(e?.message || 'Could not start checkout. Please try again.');
            setUiStage('error');
        }
    };

    // Auto-redirect when activated
    React.useEffect(() => {
        if (uiStage === 'activated') {
            const timer = setTimeout(() => {
                // Determine where to go - default to dashboard
                navigateTo('dashboard');
                // Also force reload if needed, but navigateTo handles ViewContext state which controls DashboardPage render
            }, 3000); // 3 second delay to read the success message
            return () => clearTimeout(timer);
        }
    }, [uiStage, navigateTo]);

    if (uiStage === 'activated' || uiStage === 'paid') {
        return (
            <div className="h-full flex items-center justify-center p-6 animate-fade-in">
                <Card className="max-w-md w-full text-center border-jtp-profit/50">
                    <CheckCircleIcon className="w-16 h-16 mx-auto text-jtp-profit animate-bounce-slow" />
                    <h3 className="text-2xl font-sans font-bold text-jtp-profit mt-6">
                        {uiStage === 'activated' ? 'Welcome to Pro!' : 'Payment Received!'}
                    </h3>
                    <p className="text-jtp-textMuted mt-2 mb-4">
                        {uiStage === 'activated'
                            ? 'Your subscription is now active. Unlocking full access...'
                            : 'Finalizing your account setup...'}
                    </p>
                    <div className="w-full bg-jtp-control h-1 mt-4 rounded-full overflow-hidden">
                        <div className="bg-jtp-profit h-full animate-progress-indeterminate origin-left"></div>
                    </div>

                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="mt-6 text-sm text-jtp-textMuted hover:text-jtp-text underline decoration-dotted underline-offset-4 transition-colors"
                    >
                        Taking too long? Click here to continue
                    </button>
                </Card>
            </div>
        );
    }

    const savingsPercent = monthlyPlan.amount > 0 ? Math.round((1 - (yearlyPlan.amount / (monthlyPlan.amount * 12))) * 100) : 0;
    const savingsAmount = ((monthlyPlan.amount * 12) - yearlyPlan.amount).toFixed(2);

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 lg:p-16 space-y-12">

            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-sans font-bold text-jtp-text">
                    Upgrade to Pro
                </h1>
                <p className="text-jtp-textMuted max-w-2xl mx-auto">
                    Unlock the full potential of your trading with advanced analytics, AI insights, and unlimited journaling.
                </p>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-4 mt-8">
                    <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-jtp-text' : 'text-jtp-textMuted'}`}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                        className="w-12 h-6 bg-jtp-control border border-jtp-borderStrong rounded-full p-1 relative transition-colors hover:bg-jtp-active"
                    >
                        <div className={`w-4 h-4 bg-jtp-profit rounded-full shadow-sm transform transition-transform duration-200 ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-jtp-text' : 'text-jtp-textMuted'}`}>
                        Yearly <span className="text-jtp-profit text-xs ml-1">(Save {savingsPercent}%)</span>
                    </span>
                </div>
            </div>
            {/* Promo Code Input */}
            <div className="max-w-md mx-auto">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Have a promo code?"
                        className="flex-1 bg-jtp-control border border-jtp-borderStrong rounded-jtp-md px-4 py-2 text-jtp-text placeholder-jtp-textMuted focus:outline-none focus:border-jtp-blue transition-colors"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    />
                    <Button
                        onClick={validatePromo}
                        disabled={!promoCode || isValidatingPromo}
                        variant="ghost"
                        className="whitespace-nowrap"
                    >
                        {isValidatingPromo ? 'Checking...' : 'Apply'}
                    </Button>
                </div>
                {promoError && <p className="text-jtp-loss text-sm mt-1">{promoError}</p>}
                {appliedPromo && (
                    <p className="text-jtp-profit text-sm mt-1">
                        Code applied! {appliedPromo.type === 'PERCENTAGE' ? `${appliedPromo.value}%` : `$${appliedPromo.value}`} discount will be applied at checkout.
                    </p>
                )}
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

                {/* Standard Plan */}
                <Card className={`!p-5 md:!p-6 transition-opacity duration-200 ${billingCycle === 'monthly' ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-jtp-text mb-2">Monthly</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-jtp-text">{monthlyPlan.currency === 'USD' ? '$' : monthlyPlan.currency}{monthlyPlan.amount.toFixed(2)}</span>
                            <span className="text-jtp-textMuted">/month</span>
                        </div>
                        <p className="text-sm text-jtp-textMuted mt-2">Flexible, cancel anytime.</p>
                    </div>

                    <Button
                        onClick={() => {
                            if (!isAuthenticated) {
                                // Redirect to sign-in with return URL
                                window.location.href = `/sign-in?redirect_url=${encodeURIComponent('/pricing?plan=monthly')}`;
                                return;
                            }
                            setBillingCycle('monthly');
                            openCheckout('monthly');
                        }}
                        disabled={isButtonDisabled && isAuthenticated} // Don't disable if just needs login
                        className={`w-full mb-6 ${billingCycle === 'monthly' ? 'bg-jtp-blue text-white hover:bg-jtp-blueHover' : 'bg-jtp-control text-jtp-textMuted hover:bg-jtp-active'}`}
                    >
                        {uiStage === 'opening' && billingCycle === 'monthly' ? <Spinner /> : (billingCycle === 'monthly' ? 'Choose Monthly' : 'Switch to Monthly')}
                    </Button>

                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> Live Trade Journaling
                        </li>
                        <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> AI-Powered Edge Analysis
                        </li>
                        <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> Unlimited Playbooks
                        </li>
                        <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> Advanced Risk Analytics
                        </li>
                        <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> Multi-Account Support
                        </li>
                    </ul>
                </Card >

                {/* Annual Plan (Highlighted) */}
                < Card className={`!p-5 md:!p-6 relative overflow-hidden ${billingCycle === 'yearly' ? 'border-jtp-profit/50' : ''}`}>
                    {billingCycle === 'yearly' && (
                        <div className="absolute top-0 right-0 bg-jtp-profit text-jtp-bg text-xs font-bold px-3 py-1 rounded-bl-jtp-md">
                            BEST VALUE
                        </div>
                    )}

                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-jtp-text mb-2">Yearly</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-jtp-text">{yearlyPlan.currency === 'USD' ? '$' : yearlyPlan.currency}{yearlyPlan.amount.toFixed(2)}</span>
                            <span className="text-jtp-textMuted">/year</span>
                        </div>
                        <p className="text-sm text-jtp-profit mt-2 font-bold">Save ${savingsAmount} per year</p>
                    </div>

                    <Button
                        onClick={() => {
                            if (!isAuthenticated) {
                                window.location.href = `/sign-in?redirect_url=${encodeURIComponent('/pricing?plan=yearly')}`;
                                return;
                            }
                            setBillingCycle('yearly');
                            openCheckout('yearly');
                        }}
                        disabled={isButtonDisabled && isAuthenticated}
                        className={`w-full mb-6 ${billingCycle === 'yearly' ? 'bg-jtp-profit text-jtp-bg hover:opacity-90' : 'bg-jtp-control text-jtp-textMuted hover:bg-jtp-active'}`}
                    >
                        {uiStage === 'opening' && billingCycle === 'yearly' ? <Spinner /> : (billingCycle === 'yearly' ? 'Choose Yearly' : 'Switch to Yearly')}
                    </Button>

                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-jtp-text">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-profit shrink-0" /> All Monthly Features
                        </li>
                        <li className="flex items-center gap-3 text-sm text-jtp-text">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-profit shrink-0" /> Priority Feature Access
                        </li>
                        <li className="flex items-center gap-3 text-sm text-jtp-text">
                            <CheckCircleIcon className="w-4 h-4 text-jtp-profit shrink-0" /> Exclusive Beta Testing
                        </li>
                    </ul>
                </Card >

            </div >

            {/* FAQ Section */}
            < div className="max-w-3xl mx-auto space-y-8" >
                <h3 className="text-xl font-sans font-bold text-center text-jtp-text">
                    Frequently Asked Questions
                </h3>
                <div className="grid gap-6">
                    <Card>
                        <h4 className="font-bold text-jtp-text mb-2">Can I cancel anytime?</h4>
                        <p className="text-sm text-jtp-textMuted">
                            Yes! You can cancel your subscription at any time from your account settings. No strings attached.
                        </p>
                    </Card>
                    <Card>
                        <h4 className="font-bold text-jtp-text mb-2">What happens to my data if I cancel?</h4>
                        <p className="text-sm text-jtp-textMuted">
                            Your data is safe and will be preserved. You can reactivate anytime and pick up right where you left off.
                        </p>
                    </Card>
                </div>
            </div >

        </div >
    );
};

export default PricingPage;
