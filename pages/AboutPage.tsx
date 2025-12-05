import React from 'react';
import { useView } from '../context/ViewContext';

const AboutPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { navigateTo } = useView();

  return (
    <div className="h-screen overflow-y-auto bg-future-dark pt-20 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <div
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-future-light leading-tight">
              JTradePilot
            </h1>
            <p className="text-2xl text-photonic-blue font-semibold">
              Build Trading Discipline Through Reflection
            </p>
            <p className="text-lg text-future-gray max-w-2xl mx-auto">
              A simple trading journal designed for traders who are serious about improving.
              Not signals. Not predictions. Just honest analysis and reflection.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* The Problem */}
        <section>
          <div className="bg-future-panel/50 rounded-lg p-8 border border-photonic-blue/10">
            <h2 className="text-3xl font-bold text-future-light mb-6">The Problem</h2>
            <div className="space-y-4 text-future-gray">
              <p>
                Trading is already difficult. The market doesn't care about your strategy—it only cares about your consistency.
              </p>
              <p>
                Most traders fail not because they have bad ideas. They fail because they lack discipline. They overtrade.
                They revenge trade. They ignore their rules. They don't learn from mistakes.
              </p>
              <p>
                Why? Because they don't journal their trades. And if they do, the tools available are either too complex,
                too expensive, or focused on the wrong things.
              </p>
              <p className="font-semibold text-future-light">
                That's what we're fixing.
              </p>
            </div>
          </div>
        </section>

        {/* Our Solution */}
        <section>
          <div className="bg-future-panel/50 rounded-lg p-8 border border-photonic-blue/10">
            <h2 className="text-3xl font-bold text-future-light mb-6">Our Solution</h2>
            <p className="text-future-gray mb-6">
              JTradePilot exists to make journaling frictionless and analysis automatic.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-3">
                  📝 Simple Journaling
                </h3>
                <p className="text-future-gray">
                  Log your trades in seconds. Entry price, exit price, emotion, setup—that's it.
                  No unnecessary complexity. Just the data that matters.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-3">
                  🤖 Smart Analysis
                </h3>
                <p className="text-future-gray">
                  AI automatically analyzes your trades, finding patterns you might miss.
                  Not to predict the future, but to help you understand the past.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-3">
                  📊 Real Metrics
                </h3>
                <p className="text-future-gray">
                  Win rate, profit factor, expectancy, largest wins/losses. The metrics that matter
                  for measuring trading performance.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-3">
                  🎯 Playbooks
                </h3>
                <p className="text-future-gray">
                  Document your trading setups. Define entry rules, exit rules, and risk management.
                  Build your edge through systematic repetition.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We're NOT */}
        <section>
          <div className="bg-future-panel/50 rounded-lg p-8 border border-photonic-blue/10">
            <h2 className="text-3xl font-bold text-future-light mb-6">What We're NOT</h2>
            <p className="text-future-gray mb-6">
              Let's be clear about what JTradePilot doesn't do:
            </p>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-risk-high font-bold">✗</span>
                <div>
                  <h3 className="font-semibold text-future-light">Trading Signals</h3>
                  <p className="text-future-gray text-sm">
                    We don't tell you when to trade. We help you understand why you traded.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-risk-high font-bold">✗</span>
                <div>
                  <h3 className="font-semibold text-future-light">Magic Indicators</h3>
                  <p className="text-future-gray text-sm">
                    There's no indicator that predicts the market. If there were, we wouldn't need to trade for a living.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-risk-high font-bold">✗</span>
                <div>
                  <h3 className="font-semibold text-future-light">Guaranteed Profits</h3>
                  <p className="text-future-gray text-sm">
                    We can't promise you'll be profitable. We can help you build the discipline to improve.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-risk-high font-bold">✗</span>
                <div>
                  <h3 className="font-semibold text-future-light">Shortcuts</h3>
                  <p className="text-future-gray text-sm">
                    Trading mastery takes years. We're here to help you work smarter during those years, not faster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section>
          <h2 className="text-3xl font-bold text-future-light mb-8">Our Core Values</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-2xl font-bold text-photonic-blue mb-3">Simplicity</h3>
              <p className="text-future-gray">
                We remove the complexity. Tools should serve your trading, not become a distraction.
                Simple design. Clear metrics. Obvious workflows.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-2xl font-bold text-photonic-blue mb-3">Honesty</h3>
              <p className="text-future-gray">
                We're honest about limitations. Our AI might be wrong. Signals might fail. Trading is hard.
                No false promises. Just the truth.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10">
              <h3 className="text-2xl font-bold text-photonic-blue mb-3">Trader-First Design</h3>
              <p className="text-future-gray">
                We built JTradePilot by listening to real traders. We iterate based on feedback.
                We don't build features traders don't need.
              </p>
            </div>
          </div>
        </section>

        {/* Target Audience */}
        <section>
          <div className="bg-future-panel/50 rounded-lg p-8 border border-photonic-blue/10">
            <h2 className="text-3xl font-bold text-future-light mb-6">Who Is JTradePilot For?</h2>

            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="text-momentum-green font-bold text-lg">✓</span>
                <div>
                  <h3 className="font-semibold text-future-light">New Traders (3-12 months)</h3>
                  <p className="text-future-gray text-sm">
                    Building consistency and learning from mistakes systematically.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-momentum-green font-bold text-lg">✓</span>
                <div>
                  <h3 className="font-semibold text-future-light">Intermediate Traders</h3>
                  <p className="text-future-gray text-sm">
                    Looking to systematize their approach and measure what actually works.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-momentum-green font-bold text-lg">✓</span>
                <div>
                  <h3 className="font-semibold text-future-light">Prop Firm Traders</h3>
                  <p className="text-future-gray text-sm">
                    Documenting trading objectives and tracking rule-based trading limits.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-momentum-green font-bold text-lg">✓</span>
                <div>
                  <h3 className="font-semibold text-future-light">Serious Traders</h3>
                  <p className="text-future-gray text-sm">
                    Anyone who wants to turn trading from gambling into a measured, systematic practice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section>
          <div className="bg-photonic-blue/10 rounded-lg p-8 border border-photonic-blue/30">
            <h2 className="text-3xl font-bold text-future-light mb-6">Our Mission</h2>
            <p className="text-lg text-future-light font-semibold mb-4">
              Help traders build discipline through honest reflection.
            </p>
            <p className="text-future-gray">
              We believe trading mastery doesn't come from better indicators or more signals.
              It comes from understanding yourself—your biases, your emotional triggers, your edge.
            </p>
            <p className="text-future-gray mt-4">
              JTradePilot is your partner in that journey. We remove the friction from journaling
              so you can focus on the hard part: actually improving as a trader.
            </p>
          </div>
        </section>

        {/* Currently in Beta */}
        <section>
          <div className="bg-warning/10 rounded-lg p-8 border border-warning/30">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🚀</span>
              <div>
                <h2 className="text-2xl font-bold text-future-light mb-4">Currently in Beta</h2>
                <p className="text-future-gray mb-4">
                  JTradePilot is actively being improved based on user feedback. You might find bugs.
                  You might find features missing. But we're building this with real traders, for real traders.
                </p>
                <p className="text-future-gray">
                  Your feedback directly shapes what we build next. Don't have a feature? Tell us.
                  Found a bug? Report it. We're listening.
                </p>
                <button
                  onClick={() => navigateTo('dashboard')}
                  className="mt-4 px-6 py-2 bg-photonic-blue text-future-dark font-semibold rounded-lg hover:bg-photonic-blue/90 transition-colors"
                >
                  Start Free Trial →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section>
          <div className="bg-future-panel/50 rounded-lg p-8 border border-photonic-blue/10">
            <h2 className="text-3xl font-bold text-future-light mb-6">Our Philosophy</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-2">
                  Trading Is Already Hard
                </h3>
                <p className="text-future-gray">
                  We're not here to make it easier. We're here to make the parts that should be simple
                  (journaling, analysis, tracking) actually be simple. So you can focus on the hard part:
                  becoming a better trader.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-2">
                  The Tool Serves You, Not the Other Way Around
                </h3>
                <p className="text-future-gray">
                  Your trading plan comes first. JTradePilot adapts to your style, not the other way around.
                  We don't force you into a system. We help you build your own.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-2">
                  Data Reveals Truth
                </h3>
                <p className="text-future-gray">
                  You can't improve what you don't measure. JTradePilot helps you see the truth about your
                  trading—the good and the bad. That's the first step to improvement.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-photonic-blue mb-2">
                  Community Over Competition
                </h3>
                <p className="text-future-gray">
                  We're building a community of traders committed to improvement. Traders lift each other up
                  through shared playbooks, shared learnings, and mutual accountability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-photonic-blue/10 to-photonic-blue/5 rounded-lg p-8 border border-photonic-blue/30 text-center">
          <h2 className="text-3xl font-bold text-future-light mb-4">
            Ready to Get Serious About Your Trading?
          </h2>
          <p className="text-future-gray mb-6 max-w-2xl mx-auto">
            Join JTradePilot Beta and start building trading discipline through honest reflection.
            Your first trial is free. No credit card required.
          </p>
          <button
            onClick={() => navigateTo('dashboard')}
            className="px-8 py-3 bg-photonic-blue text-future-dark font-bold rounded-lg hover:bg-photonic-blue/90 transition-colors text-lg"
          >
            Start Free Trial →
          </button>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-photonic-blue/10 text-center">
          <p className="text-future-gray text-sm mb-4">
            Questions? We'd love to hear from you.
          </p>
          <p className="text-future-gray text-sm">
            <strong>Email:</strong> hello@jtradepilot.com
          </p>
          <p className="text-future-gray text-sm mt-6">
            © 2024 JTradePilot. Building trading discipline, one trade at a time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
