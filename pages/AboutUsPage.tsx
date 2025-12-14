import React from 'react';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

const AboutUsPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
    (window as any).showAnimatedBackground?.(false);
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-future-dark">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-12">
        {/* Header */}
        <section className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-future-light leading-tight">
            About JTradePilot
          </h1>
          <p className="text-xl text-future-gray max-w-2xl mx-auto font-light">
            Built specifically for prop firm traders. Pass your challenge. Get funded. Stay disciplined.
          </p>
        </section>

        {/* Our Story */}
        <section className="bg-future-panel/50 rounded-lg p-8 md:p-12 border border-photonic-blue/10 space-y-6">
          <h2 className="text-3xl font-bold text-future-light">Our Story</h2>
          <div className="space-y-4 text-future-gray leading-relaxed">
            <p>
              Trading tools today are complicated. They are filled with confusing charts, overwhelming data, and features you never use. For a new trader or someone just trying to pass a prop challenge, it's distraction, not help.
            </p>
            <p>
              We built JTradePilot to be different. We stripped away the noise. No complex setup. No unnecessary charts. Just a clean, simple place to journal your trades and track your progress.
            </p>
            <p>
              Whether you are taking your first trade or managing a funded prop account, JTradePilot keeps you focused on what matters: your discipline and your data.
            </p>
          </div>
        </section>

        {/* Our Beliefs */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-future-light">What We Believe</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">Simplicity Wins</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                Trading is hard enough. Your journal shouldn't be. We believe in tools that are powerful but effortless to use.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">For Every Trader</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                You don't need to be a Wall Street pro to have professional tools. We support new traders building habits and prop traders managing strict risk rules.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">Focus Matters</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                Distraction is the enemy of profit. Our interface is designed to keep you calm, focused, and centered on your trading plan.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">Data is Truth</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                Your journal holds the secret to your edge. by tracking your trades simply and consistently, you unlock the path to profitability.
              </p>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section className="bg-gradient-to-r from-photonic-blue/10 to-photonic-blue/5 rounded-lg p-8 md:p-12 border border-photonic-blue/30 space-y-6">
          <h2 className="text-3xl font-bold text-future-light">Our Mission</h2>
          <p className="text-lg text-future-gray leading-relaxed">
            To make professional-grade trading journaling accessible, simple, and useful for everyone. From your first demo trade to your first payout.
          </p>
        </section>

        {/* What Makes Us Different */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-future-light">Why Choose Us</h2>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">Prop Firm Ready</h3>
                <p className="text-future-gray text-sm">
                  We understand the rules. Track your daily loss limits, profit targets, and drawdown easily. Perfect for FTMO, MFF, and others.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">Beginner Friendly</h3>
                <p className="text-future-gray text-sm">
                  Never journaled before? No problem. Our guided forms and simple dashboard make it easy to start building the right habits today.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">Zero Clutter</h3>
                <p className="text-future-gray text-sm">
                  No ads. No signal spam. No overwhelming charts. Just a clean, private space for you and your trading business.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Team Vision */}
        <section className="bg-future-panel/50 rounded-lg p-8 md:p-12 border border-photonic-blue/10 space-y-6">
          <h2 className="text-3xl font-bold text-future-light">Our Vision for the Future</h2>
          <div className="space-y-4 text-future-gray leading-relaxed">
            <p>
              We're in beta, and that's intentional. We're building this with real traders, for real traders. Your feedback directly shapes what we build next.
            </p>
            <p>In the next year, we want to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Help 10,000 traders build trading discipline</li>
              <li>Create advanced performance analytics that actually reveal trader edge</li>
              <li>Build community features where traders learn from each other</li>
              <li>Expand AI capabilities to provide even deeper insights</li>
              <li>Make JTradePilot the standard tool for serious traders</li>
            </ul>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="text-center space-y-6">
          <h2 className="text-3xl font-bold text-future-light">Let's Build Together</h2>
          <p className="text-lg text-future-gray max-w-2xl mx-auto">
            We're always listening. Have a feature idea? Found a bug? Just want to chat about trading? Reach out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="mailto:hello@jtradepilot.com"
              className="px-6 py-3 bg-photonic-blue text-future-dark font-semibold rounded-lg hover:bg-photonic-blue/90 transition-colors"
            >
              Email Us
            </a>
            <a
              href="/"
              className="px-6 py-3 bg-future-panel text-future-light font-semibold rounded-lg border border-photonic-blue/20 hover:border-photonic-blue/40 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
};

export default AboutUsPage;
