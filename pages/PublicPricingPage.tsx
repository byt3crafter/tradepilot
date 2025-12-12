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
    <div className="h-screen overflow-y-auto bg-[#08090A] text-white font-sans selection:bg-momentum-green/30 relative">

      <PublicNavbar />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">

        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-future-gray max-w-2xl mx-auto leading-relaxed">
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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">

          {/* Standard Plan */}
          <div className={`bg-[#0C0D0E] border border-white/10 rounded-sm p-5 md:p-8 transition-opacity duration-200 ${billingCycle === 'monthly' ? 'opacity-100' : 'opacity-60'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Monthly</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">$5.99</span>
                <span className="text-future-gray">/month</span>
              </div>
              <p className="text-sm text-future-gray mt-2">Flexible, cancel anytime.</p>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('intendedPlan', 'monthly');
                window.location.href = '/signup';
              }}
              className={`block w-full py-3 rounded-md font-bold mb-6 text-center transition-colors ${billingCycle === 'monthly' ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {billingCycle === 'monthly' ? 'Choose Monthly' : 'Switch to Monthly'}
            </button>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-future-gray">
                <CheckCircleIcon className="w-4 h-4 text-white" /> Unlimited Journaling
              </li>
              <li className="flex items-center gap-3 text-sm text-future-gray">
                <CheckCircleIcon className="w-4 h-4 text-white" /> Basic Analytics
              </li>
              <li className="flex items-center gap-3 text-sm text-future-gray">
                <CheckCircleIcon className="w-4 h-4 text-white" /> AI Insights
              </li>
            </ul>
          </div>

          {/* Annual Plan (Highlighted) */}
          <div className={`bg-[#0C0D0E] border rounded-sm p-5 md:p-8 relative overflow-hidden ${billingCycle === 'yearly' ? 'border-momentum-green/50' : 'border-white/10'}`}>
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

            <button
              onClick={() => {
                localStorage.setItem('intendedPlan', 'yearly');
                window.location.href = '/signup';
              }}
              className={`block w-full py-3 rounded-md font-bold mb-6 text-center transition-colors ${billingCycle === 'yearly' ? 'bg-momentum-green text-black hover:bg-momentum-green-hover' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {billingCycle === 'yearly' ? 'Choose Yearly' : 'Switch to Yearly'}
            </button>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-white">
                <CheckCircleIcon className="w-4 h-4 text-momentum-green" /> All Monthly Features
              </li>
              <li className="flex items-center gap-3 text-sm text-white">
                <CheckCircleIcon className="w-4 h-4 text-momentum-green" /> Priority Support
              </li>
              <li className="flex items-center gap-3 text-sm text-white">
                <CheckCircleIcon className="w-4 h-4 text-momentum-green" /> Early Access to Features
              </li>
            </ul>
          </div>

        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16 space-y-8">
          <h2 className="text-2xl font-orbitron font-bold text-center text-white mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid gap-6">
            <div className="bg-[#0C0D0E] border border-white/10 rounded-sm p-6">
              <h3 className="text-lg font-bold text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-future-gray">
                Yes! You can cancel your subscription at any time from your account settings.
                No questions asked, no strings attached.
              </p>
            </div>

            <div className="bg-[#0C0D0E] border border-white/10 rounded-sm p-6">
              <h3 className="text-lg font-bold text-white mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-future-gray">
                Your data is safe and will be preserved. You can reactivate anytime
                and pick up right where you left off.
              </p>
            </div>

            <div className="bg-[#0C0D0E] border border-white/10 rounded-sm p-6">
              <h3 className="text-lg font-bold text-white mb-2">
                Is my data secure?
              </h3>
              <p className="text-future-gray">
                Absolutely. We use industry-standard encryption and security practices.
                Your trading data is stored securely and is never shared with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-[#0C0D0E] rounded-sm p-12 border border-white/10 relative overflow-hidden">
          <h2 className="text-3xl font-orbitron font-bold text-white mb-4 relative z-10">
            Ready to Master Your Trading?
          </h2>
          <p className="text-future-gray text-lg mb-8 max-w-2xl mx-auto relative z-10">
            Join thousands of traders using JTradePilot to build discipline and improve their edge.
          </p>
          <a
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-md transition-colors font-bold text-lg relative z-10"
          >
            Get Started Now
          </a>
          <p className="text-sm text-future-gray mt-4 relative z-10">
            Cancel anytime
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default PublicPricingPage;
