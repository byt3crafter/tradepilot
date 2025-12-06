import React from 'react';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';

const PublicPricingPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-future-dark">
      {/* Navigation Header */}
      <nav className="border-b border-white/5 bg-future-dark/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="text-future-light font-semibold hover:opacity-80 transition-opacity">
            ← Back to Home
          </a>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-future-gray hover:text-future-light transition-colors">
              Log In
            </a>
            <a href="/signup" className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium">
              Sign Up Free
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-orbitron font-bold text-future-light mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-future-gray max-w-2xl mx-auto">
            Start with a 15-day free trial. No credit card required.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {/* Free Trial Card */}
          <div className="bg-future-panel/50 rounded-lg p-8 border border-photonic-blue/10">
            <div className="mb-6">
              <h2 className="text-2xl font-orbitron font-bold text-future-light mb-2">
                Free Trial
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-future-gray">/15 days</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Full access to all features',
                'Unlimited trade logging',
                'AI-powered insights',
                'Custom playbooks',
                'No credit card required',
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-momentum-green flex-shrink-0 mt-0.5" />
                  <span className="text-future-light">{feature}</span>
                </div>
              ))}
            </div>

            <a
              href="/signup"
              className="block w-full text-center px-6 py-3 bg-white/5 border border-white/10 text-future-light hover:bg-white/10 hover:border-white/20 rounded-lg transition-colors font-medium"
            >
              Start Free Trial
            </a>
          </div>

          {/* Pro Plan Card - Monthly */}
          <div className="bg-gradient-to-br from-photonic-blue/20 to-photonic-blue/5 rounded-lg p-8 border-2 border-photonic-blue/50 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="px-4 py-1 bg-photonic-blue text-future-dark rounded-full text-sm font-bold">
                MONTHLY PLAN
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-orbitron font-bold text-future-light mb-2">
                Pro Plan
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">$5.99</span>
                <span className="text-future-gray">/month</span>
              </div>
              <p className="text-sm text-future-gray mt-2">
                Billed monthly • Cancel anytime
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Everything in Free Trial',
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

            <a
              href="/signup"
              className="block w-full text-center px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              Start Free Trial
            </a>

            <p className="text-xs text-center text-future-gray mt-4">
              $5.99/month billed monthly • Cancel anytime
            </p>
          </div>

          {/* Pro Plan Card - Annual */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-lg p-8 border-2 border-green-500/50 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="px-4 py-1 bg-green-500 text-black rounded-full text-sm font-bold">
                BEST VALUE • SAVE $11.88
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-orbitron font-bold text-future-light mb-2">
                Annual Plan
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">$5</span>
                <span className="text-future-gray">/month</span>
              </div>
              <p className="text-sm text-green-400 mt-2 font-semibold">
                Billed annually at $60/year
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Everything in Free Trial',
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

            <a
              href="/signup"
              className="block w-full text-center px-6 py-3 bg-green-500 text-black hover:bg-green-400 rounded-lg transition-colors font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            >
              Start Free Trial
            </a>

            <p className="text-xs text-center text-future-gray mt-4">
              $60 billed annually • Save $11.88/year • Cancel anytime
            </p>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="mb-16">
          <h2 className="text-3xl font-orbitron font-bold text-future-light text-center mb-8">
            Everything You Need to Master Trading
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-future-light mb-2">
                Advanced Analytics
              </h3>
              <p className="text-future-gray">
                Track win rate, profit factor, expectancy, drawdown, and 20+ key metrics to measure your trading performance.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-future-light mb-2">
                AI-Powered Insights
              </h3>
              <p className="text-future-gray">
                Get automated analysis of your trades, daily debriefs, and AI-generated insights to improve your edge.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-future-light mb-2">
                Playbook System
              </h3>
              <p className="text-future-gray">
                Document your trading setups, track performance by strategy, and build a systematic approach to trading.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-future-light mb-2">
                Pre-Trade Checklist
              </h3>
              <p className="text-future-gray">
                Enforce your trading rules with customizable checklists. Never enter a trade without following your plan.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold text-future-light mb-2">
                Risk Management
              </h3>
              <p className="text-future-gray">
                Smart limits and drawdown protection to help you stay disciplined and protect your capital.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-future-light mb-2">
                Prop Firm Tracking
              </h3>
              <p className="text-future-gray">
                Track prop firm objectives, manage multiple accounts, and monitor your progress toward funding.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-orbitron font-bold text-future-light text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-lg font-semibold text-future-light mb-2">
                How does the free trial work?
              </h3>
              <p className="text-future-gray">
                Sign up and get instant access to all Pro features for 15 days. No credit card required.
                After the trial, you can choose to upgrade to continue using the service.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-lg font-semibold text-future-light mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-future-gray">
                Yes! You can cancel your subscription at any time from your account settings.
                No questions asked, no strings attached.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-lg font-semibold text-future-light mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-future-gray">
                Your data is safe and will be preserved for 90 days. You can reactivate anytime
                and pick up right where you left off.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-lg font-semibold text-future-light mb-2">
                What if I'm not satisfied?
              </h3>
              <p className="text-future-gray">
                You can cancel your subscription at any time. As an early adopter, you lock in the $5/month price
                forever and continue to receive all new features as we build them.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-lg font-semibold text-future-light mb-2">
                What trading platforms do you support?
              </h3>
              <p className="text-future-gray">
                We support cTrader (CSV/HTML import) with MetaTrader 4/5 support coming soon.
                You can also manually log trades from any platform.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-lg font-semibold text-future-light mb-2">
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
        <div className="text-center bg-gradient-to-r from-photonic-blue/10 to-photonic-blue/5 rounded-lg p-12 border border-photonic-blue/30">
          <h2 className="text-3xl font-orbitron font-bold text-future-light mb-4">
            Ready to Master Your Trading?
          </h2>
          <p className="text-future-gray text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of traders using JTradeJournal to build discipline and improve their edge.
          </p>
          <a
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Start Your Free 15-Day Trial
          </a>
          <p className="text-sm text-future-gray mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-future-dark/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-future-gray text-sm">
              © 2024 JTradeJournal. Master your trading with intelligent insights.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="/about-us" className="text-future-gray hover:text-future-light transition-colors">
                Our Story
              </a>
              <a href="/privacy" className="text-future-gray hover:text-future-light transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-future-gray hover:text-future-light transition-colors">
                Terms
              </a>
              <a href="/refund-policy" className="text-future-gray hover:text-future-light transition-colors">
                Refund Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicPricingPage;
