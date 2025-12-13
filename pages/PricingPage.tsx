import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';
import { usePaddle } from '../context/PaddleContext';
import api from '../services/api';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';

type UiStage = 'idle' | 'opening' | 'paid' | 'activated' | 'error';
type BillingCycle = 'monthly' | 'yearly';

const PricingPage: React.FC = () => {
    const { user, accessToken, refreshUser } = useAuth();
    const { paddle, isLoading: isPaddleLoading } = usePaddle();

    const [uiStage, setUiStage] = useState<UiStage>('idle');
    const [error, setError] = useState<string>('');
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

    const hasRunAutoCheckout = React.useRef(false);

    React.useEffect(() => {
        const intendedPlan = localStorage.getItem('intendedPlan');
        if (intendedPlan && (intendedPlan === 'monthly' || intendedPlan === 'yearly') && !hasRunAutoCheckout.current && paddle && accessToken) {
            hasRunAutoCheckout.current = true;
            setBillingCycle(intendedPlan as BillingCycle);
            // Small delay to ensure state updates and UX smoothness
            setTimeout(() => {
                openCheckout();
                localStorage.removeItem('intendedPlan');
            }, 500);
        }
    }, [paddle, accessToken]);

    // TODO: Add these to your .env file
    const PRICE_ID_MONTHLY = (import.meta as any).env.VITE_PADDLE_PRICE_ID_MONTHLY || 'pri_01k5kb3jt97f5x5708vcrg14hc';
    const PRICE_ID_YEARLY = (import.meta as any).env.VITE_PADDLE_PRICE_ID_YEARLY || 'pri_01kc918kmzeepr3sg7cc74q8zs';

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

    const openCheckout = async () => {
        if (!paddle || !accessToken) {
            setError('Billing is not available at the moment. Please try again later.');
            return;
        }

        setError('');
        setUiStage('opening');

        try {
            const priceId = billingCycle === 'monthly' ? PRICE_ID_MONTHLY : PRICE_ID_YEARLY;
            const { transactionId } = await api.createCheckoutTransaction(accessToken, appliedPromo?.code, priceId);
            console.log('[PricingPage] Open Paddle checkout for txn:', transactionId);

            paddle.Checkout.open({ transactionId });

            const startPolling = async () => {
                setUiStage('paid');

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

    if (uiStage === 'activated') {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center">
                    <CheckCircleIcon className="w-16 h-16 mx-auto text-momentum-green" />
                    <h3 className="text-xl font-semibold text-momentum-green mt-4">Welcome Back to JTradePilot Pro!</h3>
                    <p className="text-future-gray mt-2">Your subscription is now active. Redirecting to dashboard...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 lg:p-16 space-y-12">

            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-orbitron font-bold text-white">
                    Upgrade to Pro
                </h1>
                <p className="text-future-gray max-w-2xl mx-auto">
                    Unlock the full potential of your trading with advanced analytics, AI insights, and unlimited journaling.
                </p>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-4 mt-8">
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
            </div>
            {/* Promo Code Input */}
            <div className="max-w-md mx-auto">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Have a promo code?"
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-future-gray focus:outline-none focus:border-momentum-green"
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
                {promoError && <p className="text-risk-high text-sm mt-1">{promoError}</p>}
                {appliedPromo && (
                    <p className="text-momentum-green text-sm mt-1">
                        Code applied! {appliedPromo.type === 'PERCENTAGE' ? `${appliedPromo.value}%` : `$${appliedPromo.value}`} discount will be applied at checkout.
                    </p>
                )}
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

                {/* Standard Plan */}
                <Card className={`!p-5 md:!p-6 transition-opacity duration-200 ${billingCycle === 'monthly' ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">Monthly</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">$5.99</span>
                            <span className="text-future-gray">/month</span>
                        </div>
                        <p className="text-sm text-future-gray mt-2">Flexible, cancel anytime.</p>
                    </div>

                    <Button
                        onClick={() => { setBillingCycle('monthly'); openCheckout(); }}
                        disabled={isButtonDisabled}
                        className={`w-full mb-6 ${billingCycle === 'monthly' ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {uiStage === 'opening' && billingCycle === 'monthly' ? <Spinner /> : (billingCycle === 'monthly' ? 'Choose Monthly' : 'Switch to Monthly')}
                    </Button>

                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-future-gray">
                            <CheckCircleIcon className="w-4 h-4 text-white" /> Live Trade Journaling
                        </li>
                        <li className="flex items-center gap-3 text-sm text-future-gray">
                            <CheckCircleIcon className="w-4 h-4 text-white" /> AI-Powered Edge Analysis
                        </li>
                        <li className="flex items-center gap-3 text-sm text-future-gray">
                            <CheckCircleIcon className="w-4 h-4 text-white" /> Unlimited Playbooks
                        </li>
                        <li className="flex items-center gap-3 text-sm text-future-gray">
                            <CheckCircleIcon className="w-4 h-4 text-white" /> Advanced Risk Analytics
                        </li>
                        <li className="flex items-center gap-3 text-sm text-future-gray">
                            <CheckCircleIcon className="w-4 h-4 text-white" /> Multi-Account Support
                        </li>
                    </ul>
                </Card >

                {/* Annual Plan (Highlighted) */}
                < Card className={`!p-5 md:!p-6 relative overflow-hidden ${billingCycle === 'yearly' ? 'border-momentum-green/50' : ''}`}>
                    {billingCycle === 'yearly' && (
                        <div className="absolute top-0 right-0 bg-momentum-green text-black text-xs font-bold px-3 py-1 rounded-bl-md">
                            BEST VALUE
                        </div>
                    )}

                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">Yearly</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">$60.00</span>
                            <span className="text-future-gray">/year</span>
                        </div>
                        <p className="text-sm text-momentum-green mt-2 font-bold">Save $11.88 per year</p>
                    </div>

                    <Button
                        onClick={() => { setBillingCycle('yearly'); openCheckout(); }}
                        disabled={isButtonDisabled}
                        className={`w-full mb-6 ${billingCycle === 'yearly' ? 'bg-momentum-green text-black hover:bg-momentum-green-hover' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {uiStage === 'opening' && billingCycle === 'yearly' ? <Spinner /> : (billingCycle === 'yearly' ? 'Choose Yearly' : 'Switch to Yearly')}
                    </Button>

                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-white">
                            <CheckCircleIcon className="w-4 h-4 text-momentum-green" /> All Monthly Features
                        </li>
                        <li className="flex items-center gap-3 text-sm text-white">
                            <CheckCircleIcon className="w-4 h-4 text-momentum-green" /> Priority Feature Access
                        </li>
                        <li className="flex items-center gap-3 text-sm text-white">
                            <CheckCircleIcon className="w-4 h-4 text-momentum-green" /> Exclusive Beta Testing
                        </li>
                    </ul>
                </Card >

            </div >

            {/* FAQ Section */}
            < div className="max-w-3xl mx-auto space-y-8" >
                <h3 className="text-xl font-orbitron font-bold text-center text-white">
                    Frequently Asked Questions
                </h3>
                <div className="grid gap-6">
                    <Card>
                        <h4 className="font-bold text-white mb-2">Can I cancel anytime?</h4>
                        <p className="text-sm text-future-gray">
                            Yes! You can cancel your subscription at any time from your account settings. No strings attached.
                        </p>
                    </Card>
                    <Card>
                        <h4 className="font-bold text-white mb-2">What happens to my data if I cancel?</h4>
                        <p className="text-sm text-future-gray">
                            Your data is safe and will be preserved. You can reactivate anytime and pick up right where you left off.
                        </p>
                    </Card>
                </div>
            </div >

        </div >
    );
};

export default PricingPage;
