import React, { useState } from 'react';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

type BillingCycle = 'monthly' | 'yearly';

const PublicPricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-jtp-bg text-jtp-text font-sans selection:bg-jtp-profit/30 relative">

      <PublicNavbar />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">

        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl font-sans font-bold text-jtp-text">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-jtp-textMuted max-w-2xl mx-auto leading-relaxed">
            Unlock the full potential of your trading with advanced analytics, AI insights, and unlimited journaling.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-jtp-text' : 'text-jtp-textMuted'}`}>Monthly</span>
            <button
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              className="w-12 h-6 bg-jtp-control rounded-full p-1 relative transition-colors hover:bg-jtp-active border border-jtp-borderStrong"
            >
              <div className={`w-4 h-4 bg-jtp-profit rounded-full shadow-sm transform transition-transform duration-200 ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-jtp-text' : 'text-jtp-textMuted'}`}>
              Yearly <span className="text-jtp-profit text-xs ml-1">(Save 17%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">

          {/* Standard Plan */}
          <div className={`bg-jtp-panel border border-jtp-border rounded-jtp-panel p-5 md:p-8 transition-opacity duration-200 ${billingCycle === 'monthly' ? 'opacity-100' : 'opacity-60'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-jtp-text mb-2">Monthly</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-jtp-text">$5.99</span>
                <span className="text-jtp-textMuted">/month</span>
              </div>
              <p className="text-sm text-jtp-textMuted mt-2">Flexible, cancel anytime.</p>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('intendedPlan', 'monthly');
                window.location.href = '/signup';
              }}
              className={`block w-full py-3 rounded-jtp-md font-bold mb-6 text-center transition-colors ${billingCycle === 'monthly' ? 'bg-jtp-blue text-white hover:bg-jtp-blueHover' : 'bg-jtp-control text-jtp-textMuted hover:bg-jtp-active'}`}
            >
              {billingCycle === 'monthly' ? 'Choose Monthly' : 'Switch to Monthly'}
            </button>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> Unlimited Journaling
              </li>
              <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> Basic Analytics
              </li>
              <li className="flex items-center gap-3 text-sm text-jtp-textMuted">
                <CheckCircleIcon className="w-4 h-4 text-jtp-text shrink-0" /> AI Insights
              </li>
            </ul>
          </div>

          {/* Annual Plan (Highlighted) */}
          <div className={`bg-jtp-panel rounded-jtp-panel p-5 md:p-8 relative overflow-hidden border ${billingCycle === 'yearly' ? 'border-jtp-profit/50' : 'border-jtp-border'}`}>
            {billingCycle === 'yearly' && (
              <div className="absolute top-0 right-0 bg-jtp-profit text-jtp-bg text-xs font-bold px-3 py-1 rounded-bl-jtp-md">
                BEST VALUE
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold text-jtp-text mb-2">Yearly</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-jtp-text">$60.00</span>
                <span className="text-jtp-textMuted">/year</span>
              </div>
              <p className="text-sm text-jtp-profit mt-2 font-bold">Save $11.88 per year</p>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('intendedPlan', 'yearly');
                window.location.href = '/signup';
              }}
              className={`block w-full py-3 rounded-jtp-md font-bold mb-6 text-center transition-colors ${billingCycle === 'yearly' ? 'bg-jtp-profit text-jtp-bg hover:opacity-90' : 'bg-jtp-control text-jtp-textMuted hover:bg-jtp-active'}`}
            >
              {billingCycle === 'yearly' ? 'Choose Yearly' : 'Switch to Yearly'}
            </button>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-jtp-text">
                <CheckCircleIcon className="w-4 h-4 text-jtp-profit shrink-0" /> All Monthly Features
              </li>
              <li className="flex items-center gap-3 text-sm text-jtp-text">
                <CheckCircleIcon className="w-4 h-4 text-jtp-profit shrink-0" /> Priority Support
              </li>
              <li className="flex items-center gap-3 text-sm text-jtp-text">
                <CheckCircleIcon className="w-4 h-4 text-jtp-profit shrink-0" /> Early Access to Features
              </li>
            </ul>
          </div>

        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16 space-y-8">
          <h2 className="text-2xl font-sans font-bold text-center text-jtp-text mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid gap-6">
            <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-6">
              <h3 className="text-lg font-bold text-jtp-text mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-jtp-textMuted">
                Yes! You can cancel your subscription at any time from your account settings.
                No questions asked, no strings attached.
              </p>
            </div>

            <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-6">
              <h3 className="text-lg font-bold text-jtp-text mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-jtp-textMuted">
                Your data is safe and will be preserved. You can reactivate anytime
                and pick up right where you left off.
              </p>
            </div>

            <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel p-6">
              <h3 className="text-lg font-bold text-jtp-text mb-2">
                Is my data secure?
              </h3>
              <p className="text-jtp-textMuted">
                Absolutely. We use industry-standard encryption and security practices.
                Your trading data is stored securely and is never shared with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-jtp-panel rounded-jtp-panel p-12 border border-jtp-border relative overflow-hidden">
          <h2 className="text-3xl font-sans font-bold text-jtp-text mb-4 relative z-10">
            Ready to Master Your Trading?
          </h2>
          <p className="text-jtp-textMuted text-lg mb-8 max-w-2xl mx-auto relative z-10">
            Join thousands of traders using JTradePilot to build discipline and improve their edge.
          </p>
          <a
            href="/signup"
            className="inline-block px-8 py-4 bg-jtp-blue text-white hover:bg-jtp-blueHover rounded-jtp-md transition-colors font-bold text-lg relative z-10"
          >
            Get Started Now
          </a>
          <p className="text-sm text-jtp-textMuted mt-4 relative z-10">
            Cancel anytime
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default PublicPricingPage;
