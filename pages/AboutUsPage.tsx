import React from 'react';

const AboutUsPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
    (window as any).showAnimatedBackground?.(false);
  }, []);

  return (
    <div className="min-h-screen bg-future-dark pb-12">
      {/* Navigation Header */}
      <nav className="border-b border-white/5 bg-future-dark/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="text-future-light font-semibold hover:opacity-80 transition-opacity">
            ← Back to Home
          </a>
          <div className="flex items-center gap-6 text-sm">
            <a href="/about" className="text-future-gray hover:text-future-light transition-colors">
              About
            </a>
            <a href="/faq" className="text-future-gray hover:text-future-light transition-colors">
              FAQ
            </a>
            <a href="/" className="text-future-gray hover:text-future-light transition-colors">
              Home
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-12">
        {/* Header */}
        <section className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-orbitron font-bold text-future-light leading-tight">
            About JTradePilot
          </h1>
          <p className="text-xl text-future-gray max-w-2xl mx-auto font-light">
            We're building the tools traders actually need to improve. No hype. No shortcuts. Just discipline.
          </p>
        </section>

        {/* Our Story */}
        <section className="bg-future-panel/50 rounded-lg p-8 md:p-12 border border-photonic-blue/10 space-y-6">
          <h2 className="text-3xl font-bold text-future-light">Our Story</h2>
          <div className="space-y-4 text-future-gray leading-relaxed">
            <p>
              JTradePilot was born from frustration. We watched traders with solid strategies fail because they lacked discipline. They didn't journal. They didn't reflect. They made the same mistakes repeatedly.
            </p>
            <p>
              The existing tools were either too complex, too expensive, or focused on the wrong things. They promised signals, predictions, and shortcuts. We knew there had to be a better way.
            </p>
            <p>
              So we built JTradePilot. A simple trading journal that makes reflection effortless and analysis automatic. Not to replace trader judgment—to support it.
            </p>
          </div>
        </section>

        {/* Our Beliefs */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-future-light">What We Believe</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">Trading Is Hard</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                We don't believe in shortcuts or magic. Trading requires years of practice, discipline, and honest reflection. We're here to make the reflection part easier.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">Data Reveals Truth</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                You can't improve what you don't measure. By journaling and analyzing your trades, you see patterns you'd otherwise miss. The data becomes your teacher.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">Tools Should Disappear</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                The best tools get out of the way. We designed JTradePilot to be intuitive enough that you forget you're using it. Just log, analyze, improve.
              </p>
            </div>

            <div className="bg-future-panel/50 rounded-lg p-6 border border-photonic-blue/10 space-y-3">
              <h3 className="text-xl font-semibold text-photonic-blue">Community Over Competition</h3>
              <p className="text-future-gray text-sm leading-relaxed">
                We're building a community of traders committed to improvement. Traders share playbooks, learnings, and accountability. We rise together.
              </p>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section className="bg-gradient-to-r from-photonic-blue/10 to-photonic-blue/5 rounded-lg p-8 md:p-12 border border-photonic-blue/30 space-y-6">
          <h2 className="text-3xl font-bold text-future-light">Our Mission</h2>
          <p className="text-lg text-future-gray leading-relaxed">
            Help traders build discipline through honest reflection. We believe trading mastery doesn't come from better indicators or more signals. It comes from understanding yourself—your biases, your emotional triggers, your edge.
          </p>
          <p className="text-lg text-future-gray leading-relaxed">
            JTradePilot removes the friction from journaling so you can focus on the hard part: actually improving as a trader.
          </p>
        </section>

        {/* What Makes Us Different */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-future-light">What Makes Us Different</h2>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">Not a Signal Provider</h3>
                <p className="text-future-gray text-sm">
                  We don't tell you when to trade. We help you understand why you traded and whether it worked.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">No Guaranteed Profits</h3>
                <p className="text-future-gray text-sm">
                  We're honest about what we can't do. Trading involves substantial risk of loss. We help you manage that risk through discipline.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">Built by Traders, For Traders</h3>
                <p className="text-future-gray text-sm">
                  We listen to real traders. Features are driven by user feedback, not marketing trends. We iterate fast and ship what matters.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">AI That Helps, Not Replaces</h3>
                <p className="text-future-gray text-sm">
                  Our AI provides educational insights to help you see patterns. But the final decision is always yours. AI amplifies human judgment, it doesn't replace it.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-photonic-blue mt-2 flex-shrink-0"></div>
              <div>
                <h3 className="text-lg font-semibold text-future-light mb-1">Privacy First</h3>
                <p className="text-future-gray text-sm">
                  Your trading data is yours. We never sell it, share it, or use it for anything beyond serving you. We're transparent about what we do.
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

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-photonic-blue/10 text-center">
          <p className="text-future-gray text-sm">
            © 2024 JTradePilot. Building trading discipline, one trade at a time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;
