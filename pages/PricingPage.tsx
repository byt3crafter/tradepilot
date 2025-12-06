import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';
import { usePaddle } from '../context/PaddleContext';
import api from '../services/api';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';

type UiStage = 'idle' | 'opening' | 'paid' | 'activated' | 'error';

const PricingPage: React.FC = () => {
    const { user, accessToken, refreshUser } = useAuth();
    const { paddle, isLoading: isPaddleLoading } = usePaddle();

    const [uiStage, setUiStage] = useState<UiStage>('idle');
    const [error, setError] = useState<string>('');

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
            <div className="h-screen overflow-y-auto flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <div className="text-center p-8">
                        <CheckCircleIcon className="w-16 h-16 mx-auto text-momentum-green" />
                        <h3 className="text-xl font-semibold text-momentum-green mt-4">Welcome Back to JTradePilot Pro!</h3>
                        <p className="text-future-gray mt-2">Your subscription is now active. Redirecting to dashboard...</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-y-auto flex items-center justify-center p-6">
            <div className="max-w-5xl w-full space-y-8">
                {/* Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-orbitron font-bold text-future-light">
                        Your Trial Has Expired
                    </h1>
                    <p className="text-future-gray text-lg max-w-2xl mx-auto">
                        Continue your trading journey with full access to all JTradePilot Pro features
                    </p>
                </div>

                {/* Pricing Card */}
                <Card className="max-w-2xl mx-auto">
                    <div className="p-8">
                        {/* Plan Header */}
                        <div className="text-center mb-8">
                            <div className="inline-block px-4 py-1 bg-photonic-blue/10 text-photonic-blue rounded-full text-sm font-semibold mb-4">
                                EARLY ADOPTER PRICE
                            </div>
                            <h2 className="text-3xl font-orbitron font-bold text-future-light mb-2">
                                JTradePilot Pro
                            </h2>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-5xl font-bold text-white">$5.99</span>
                                <span className="text-future-gray">/month</span>
                            </div>
                            <p className="text-sm text-green-400 mt-2 font-semibold">
                                Or save $11.88/year with annual plan ($60/year)
                            </p>
                        </div>

                        {/* Features List */}
                        <div className="space-y-4 mb-8">
                            {[
                                'Unlimited trade logging & journaling',
                                'Advanced analytics & performance tracking',
                                'AI-powered trade insights & debriefs',
                                'Pre-trade checklist & risk management',
                                'Custom playbooks & trading strategies',
                                'Prop firm objective tracking',
                                'Smart limits & drawdown protection',
                                'Priority support & updates',
                            ].map((feature, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <CheckCircleIcon className="w-5 h-5 text-momentum-green flex-shrink-0 mt-0.5" />
                                    <span className="text-future-light">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <Button
                            onClick={openCheckout}
                            disabled={isButtonDisabled}
                            className="w-full text-lg py-4"
                        >
                            {uiStage === 'opening' && <Spinner />}
                            {uiStage === 'idle' && 'Upgrade Now – $5.99/month'}
                            {uiStage === 'paid' && (
                                <span className="inline-flex items-center gap-2">
                                    <Spinner /> Payment received — finalizing…
                                </span>
                            )}
                            {uiStage === 'error' && 'Try again'}
                        </Button>

                        {error && <p className="text-sm text-risk-high mt-3 text-center">{error}</p>}

                        {/* Trust Signals */}
                        <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-2">
                            <p className="text-xs text-future-gray">
                                ✓ Cancel anytime • ✓ Secure payment via Paddle • ✓ Early adopter pricing
                            </p>
                        </div>
                    </div>
                </Card>

                {/* FAQ Section */}
                <div className="max-w-2xl mx-auto space-y-4">
                    <h3 className="text-xl font-orbitron font-semibold text-future-light text-center mb-6">
                        Frequently Asked Questions
                    </h3>
                    <Card>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-future-light mb-1">Can I cancel anytime?</h4>
                                <p className="text-sm text-future-gray">
                                    Yes! You can cancel your subscription at any time from your account settings. No strings attached.
                                </p>
                            </div>
                            <div className="border-t border-white/10 pt-4">
                                <h4 className="font-semibold text-future-light mb-1">What happens to my data if I cancel?</h4>
                                <p className="text-sm text-future-gray">
                                    Your data is safe and will be preserved. You can reactivate anytime and pick up right where you left off.
                                </p>
                            </div>
                            <div className="border-t border-white/10 pt-4">
                                <h4 className="font-semibold text-future-light mb-1">What if I'm not satisfied?</h4>
                                <p className="text-sm text-future-gray">
                                    You can cancel your subscription at any time. No questions asked, no strings attached.
                                    Your data will be preserved for 90 days if you want to return.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
