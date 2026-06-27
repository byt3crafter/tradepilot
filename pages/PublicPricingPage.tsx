/**
 * PublicPricingPage — honest pricing: free journal now, Pro coming soon.
 *
 * What's live and free:
 *   Journal, Analytics, Prop-Firm Rules, Playbooks, P&L/R math,
 *   MAE/MFE, $/R toggle, Smart Limits, Screenshots.
 *
 * What's planned (Pro tier, not yet purchasable):
 *   Quant (EdgeScore), AI agent, Non-custodial execution, cTrader bot.
 *
 * No billing toggle — there's nothing to bill yet. The Pro card shows
 * planned pricing as informational only; there is no buy CTA.
 */
import React, { useState } from 'react';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';
import { Ticker, Badge } from '../components/ui/index';
import PublicLink from '../components/PublicLink';

// ── Check icon ────────────────────────────────────────────────────────────────
const CheckIcon: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-4 h-4',
  color = '#3ddc84',
}) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5L6.5 12L13 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Clock icon (for coming-soon list items) ───────────────────────────────────
const ClockIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" stroke="#565d66" strokeWidth="1.4" />
    <path d="M8 5v3l2 1.5" stroke="#565d66" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── What's live today ─────────────────────────────────────────────────────────
const FREE_FEATURES: string[] = [
  'Unlimited trade journaling',
  'P&L / R-multiple math (server-side, always correct)',
  'MAE / MFE excursion tracking',
  'Confidence rating + mistake tags per trade',
  'Analytics: edge by setup, session, symbol, day',
  'Equity curve with $/R toggle',
  'Prop-firm rules dashboard with live gauges',
  'Smart limits (soft warnings + hard stops)',
  'Playbooks + pre-trade checklists',
  'Screenshot attachment per trade',
];

// ── What Pro will add ─────────────────────────────────────────────────────────
const PRO_EXTRAS: string[] = [
  'Quant module — EdgeScore leaderboard',
  'Non-custodial Polymarket execution',
  'AI trade analysis (Gemini-powered)',
  'Autonomous AI agent with scheduled runs',
  'cTrader auto-sync bot',
  'Priority support + early feature access',
];

// ── FAQ entries ───────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Is everything really free right now?',
    a: 'Yes. The complete trading journal, analytics, prop-firm rules dashboard, playbooks, and P&L math are free during the beta — no credit card required. When a paid Pro tier launches (with Quant, AI agent, and execution features), we will give you advance notice and a clear migration path.',
  },
  {
    q: 'What is and isn\'t available yet?',
    a: 'The trading journal, prop-firm rules, analytics, and playbooks are fully live. Quant intelligence (EdgeScore), AI trade analysis, the autonomous AI agent, non-custodial Polymarket execution, and the cTrader auto-sync bot are in development — not yet available.',
  },
  {
    q: 'When will Pro launch?',
    a: 'We don\'t have a firm date yet. Pro arrives alongside the Quant, AI agent, and execution features. We\'ll announce it with enough lead time to decide whether to upgrade.',
  },
  {
    q: 'Can I cancel a future paid subscription anytime?',
    a: 'Yes. When paid plans launch, you\'ll be able to cancel at any time from account settings. No lock-in, no penalty, no questions asked.',
  },
  {
    q: 'What happens to my data if I ever cancel?',
    a: 'Your trade journal and settings are preserved. Reactivate at any time and pick up exactly where you left off.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit (TLS) and at rest. Your trading data is never shared with third parties. Non-custodial execution (when it launches) means we never hold your funds or keys.',
  },
];

const PublicPricingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-jtp-bg text-jtp-text">

      {/* Nav */}
      <MarketingNav />

      {/* Ticker tape */}
      <Ticker
        items={[
          { symbol: 'EUR/USD', price: '1.0847', change: '+0.14%', positive: true },
          { symbol: 'GBP/USD', price: '1.2718', change: '-0.06%', positive: false },
          { symbol: 'USD/JPY', price: '149.82', change: '+0.22%', positive: true },
          { symbol: 'XAU/USD', price: '2,318.40', change: '+0.31%', positive: true },
          { symbol: 'BTC/USD', price: '67,450', change: '-0.45%', positive: false },
          { symbol: 'NAS100',  price: '17,842', change: '+0.18%', positive: true },
        ]}
        speed="slow"
      />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
          <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">PRICING</span>
        </div>
        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.015em] mb-4">
          Honest pricing.
        </h1>
        <p className="text-jtp-textMuted text-[15px] leading-relaxed max-w-xl mx-auto mb-2">
          The full trading journal, analytics, and prop-firm rules dashboard are free during
          beta — no credit card, no trial timer. A Pro tier with Quant intelligence, AI agent,
          and execution features is coming.
        </p>
        <p className="font-mono text-[11px] text-jtp-textDim">
          No credit card required · Advance notice before any charge
        </p>

        <div className="flex justify-center mt-6">
          <Badge variant="profit" size="md">FREE DURING BETA</Badge>
        </div>
      </section>

      {/* Pricing cards */}
      <section
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
        aria-label="Pricing plans"
      >
        <div className="grid md:grid-cols-2 gap-4">

          {/* ── Free card ────────────────────────────────────────────────── */}
          <div
            className="bg-jtp-panel border border-jtp-border rounded-[2px] p-6 flex flex-col"
            style={{ borderTop: '2px solid #3ddc84' }}
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] text-jtp-textDim tracking-[0.14em] uppercase">FREE</span>
                <Badge variant="profit" size="xs">NOW AVAILABLE</Badge>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-mono font-bold text-[32px] text-jtp-text tabular-nums">$0</span>
                <span className="text-jtp-textMuted text-[13px]">/ month</span>
              </div>
              <p className="text-jtp-textMuted text-[12.5px]">During beta · No credit card required</p>
            </div>

            <PublicLink
              href="/signup"
              className="block w-full py-2.5 rounded-[2px] font-mono text-[11px] font-bold uppercase tracking-wider text-center transition-colors duration-150 mb-6 focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue bg-[#3ddc84] text-jtp-bg hover:opacity-90"
            >
              START FREE →
            </PublicLink>

            <div className="mb-3">
              <span className="font-mono text-[9px] text-jtp-textDim tracking-[0.12em] uppercase">What's included</span>
            </div>
            <ul className="space-y-2.5 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-jtp-textSoft">
                  <CheckIcon className="w-3.5 h-3.5 mt-[2px] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Pro — coming soon card ────────────────────────────────────── */}
          <div
            className="bg-jtp-panel border border-jtp-border rounded-[2px] p-6 flex flex-col relative overflow-hidden opacity-70"
            style={{ borderTop: '2px solid rgba(232,162,61,0.4)' }}
          >
            {/* "Coming soon" ribbon */}
            <div
              className="absolute top-0 right-0 font-mono text-[9px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 text-[#08090b]"
              style={{ backgroundColor: 'rgba(232,162,61,0.7)' }}
            >
              COMING SOON
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] text-jtp-textDim tracking-[0.14em] uppercase">PRO</span>
                <Badge variant="warning" size="xs">IN DEVELOPMENT</Badge>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-mono font-bold text-[32px] text-jtp-text tabular-nums">$5.99</span>
                <span className="text-jtp-textMuted text-[13px]">/ month planned</span>
              </div>
              <p className="font-mono text-[12px] text-jtp-textDim">
                or $60 / year · Save $11.88
              </p>
            </div>

            {/* No buy CTA — not purchasable yet */}
            <div
              className="block w-full py-2.5 rounded-[2px] font-mono text-[11px] font-bold uppercase tracking-wider text-center mb-6 border border-jtp-borderStrong text-jtp-textDim cursor-default select-none"
            >
              NOT YET AVAILABLE
            </div>

            <div className="mb-2">
              <span className="font-mono text-[9px] text-jtp-textDim tracking-[0.12em] uppercase">Includes everything in Free, plus</span>
            </div>
            <ul className="space-y-2.5 flex-1">
              {PRO_EXTRAS.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-jtp-textSoft">
                  <ClockIcon className="w-3.5 h-3.5 mt-[2px] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Honest note */}
            <p className="mt-4 font-mono text-[10px] text-jtp-textFaint leading-relaxed border-t border-jtp-borderSubtle pt-3">
              We'll announce Pro with enough lead time to decide. No surprise charges.
            </p>
          </div>
        </div>

        {/* Clarification note */}
        <div
          className="mt-4 border border-jtp-border rounded-[2px] px-4 py-3 flex items-start gap-3"
          style={{ borderLeft: '2px solid rgba(232,162,61,0.6)' }}
        >
          <svg className="w-4 h-4 mt-[1px] shrink-0 text-jtp-amber" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-jtp-textMuted text-[12.5px] leading-relaxed">
            <strong className="font-mono text-jtp-text text-[11px] tracking-[0.05em] uppercase">Beta status:</strong>{' '}
            The trading journal, analytics, and prop-firm rules are fully live and free. Quant intelligence,
            AI agent, non-custodial execution, and the cTrader bot are in development — not yet available
            to users. The Pro card above shows our planned pricing once those features ship.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="border-t border-jtp-border"
        aria-labelledby="faq-heading"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
              <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">FAQ</span>
            </div>
            <h2 id="faq-heading" className="text-[24px] sm:text-[28px] font-bold tracking-[-0.015em]">
              Common questions.
            </h2>
          </div>

          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-jtp-panel border border-jtp-border rounded-[2px] overflow-hidden"
                style={{ borderTop: openFaq === i ? '2px solid rgba(232,162,61,0.55)' : '2px solid transparent' }}
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-body-${i}`}
                >
                  <span className="font-bold text-jtp-text text-[14px] group-hover:text-jtp-textSoft transition-colors pr-4">
                    {item.q}
                  </span>
                  <svg
                    className={`w-4 h-4 text-jtp-textMuted flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div id={`faq-body-${i}`} className="px-5 pb-4">
                    <p className="text-jtp-textMuted text-[13.5px] leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="relative rounded-[2px] border border-jtp-border overflow-hidden text-center px-6 py-12"
          style={{
            borderTop: '2px solid #e8a23d',
            background: 'linear-gradient(180deg, rgba(232,162,61,0.04) 0%, transparent 60%)',
          }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[180px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,162,61,0.1) 0%, transparent 70%)' }}
            aria-hidden="true"
          />
          <div className="relative z-10">
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.015em] mb-3">
              Start free. No strings attached.
            </h2>
            <p className="text-jtp-textMuted text-[14px] leading-relaxed mb-8 max-w-md mx-auto">
              Open the terminal, connect your account, and start journaling in minutes.
              Everything you need to trade with discipline — free, right now.
            </p>
            <PublicLink
              href="/signup"
              className="inline-flex items-center justify-center font-mono font-bold text-[12px] uppercase tracking-wider px-8 py-3.5 rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-jtp-blue"
              style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
            >
              OPEN THE TERMINAL →
            </PublicLink>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default PublicPricingPage;
