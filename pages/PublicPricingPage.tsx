/**
 * PublicPricingPage — terminal-styled public pricing page.
 *
 * Restyled to match the Pro Trading Terminal aesthetic.
 * Uses MarketingNav + MarketingFooter for consistency with LandingPage.
 */
import React, { useState } from 'react';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';
import { Ticker, Badge } from '../components/ui/index';
import PublicLink from '../components/PublicLink';

type BillingCycle = 'monthly' | 'yearly';

// ── Check icon ────────────────────────────────────────────────────────────────
const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5L6.5 12L13 5" stroke="#3ddc84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Shared features between plans ─────────────────────────────────────────────
const PLAN_FEATURES: string[] = [
  'Unlimited trade journaling',
  'P&L / R-multiple math (server-side, always correct)',
  'MAE / MFE excursion tracking',
  'Confidence rating + mistake tags per trade',
  'Analytics: edge by setup, session, symbol, day',
  'Equity curve with $/R toggle',
  'Prop-firm rules dashboard with live gauges',
  'Smart limits (soft warnings + hard stops)',
  'Quant module — EdgeScore leaderboard',
  'Non-custodial Polymarket execution',
  'AI trade analysis (Gemini-powered)',
  'Autonomous AI agent with scheduled runs',
  'Pre-trade + playbook checklists',
  'Screenshot attachment per trade',
];

const ANNUAL_ONLY: string[] = [
  'Priority support',
  'Early access to new features',
];

// ── FAQ entries ───────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Is it really free right now?',
    a: 'Yes. JTradePilot is free during the beta — all features, no credit card required. When a paid plan launches, we will give you advance notice and transition time.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel any paid subscription at any time from your account settings. No lock-in, no penalty, no questions asked.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your trade journal and settings are preserved. Reactivate at any time and pick up exactly where you left off.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit (TLS) and at rest. Your trading data is never shared with third parties. Non-custodial execution means we never hold your funds or keys.',
  },
  {
    q: 'What does "non-custodial execution" mean?',
    a: 'When you trade Polymarket from the terminal, you sign every order with your own wallet. JTradePilot never holds your keys, your funds, or has any ability to move your assets.',
  },
];

const PublicPricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-jtp-bg text-jtp-text">

      {/* Nav (no navigate callbacks — use PublicLink fallback) */}
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
          Simple, honest pricing.
        </h1>
        <p className="text-jtp-textMuted text-[15px] leading-relaxed max-w-xl mx-auto mb-2">
          Full terminal access during beta at no cost. When paid plans launch, you'll have advance notice
          and a clear migration path.
        </p>
        <p className="font-mono text-[11px] text-jtp-textDim">
          No credit card required · Cancel anytime · All features included
        </p>

        {/* Beta badge */}
        <div className="flex justify-center mt-6">
          <Badge variant="profit" size="md">FREE DURING BETA</Badge>
        </div>
      </section>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 pb-8" role="group" aria-label="Billing cycle">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`font-mono text-[11.5px] px-3 py-1.5 rounded-[2px] border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue ${
            billingCycle === 'monthly'
              ? 'border-jtp-borderFocus text-jtp-text bg-jtp-active'
              : 'border-jtp-borderStrong text-jtp-textMuted hover:text-jtp-text hover:bg-jtp-hover'
          }`}
          aria-pressed={billingCycle === 'monthly'}
        >
          MONTHLY
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`font-mono text-[11.5px] px-3 py-1.5 rounded-[2px] border transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue ${
            billingCycle === 'yearly'
              ? 'border-jtp-borderFocus text-jtp-text bg-jtp-active'
              : 'border-jtp-borderStrong text-jtp-textMuted hover:text-jtp-text hover:bg-jtp-hover'
          }`}
          aria-pressed={billingCycle === 'yearly'}
        >
          YEARLY
          <span className="ml-2 font-mono text-[9px] text-jtp-profit">(SAVE 17%)</span>
        </button>
      </div>

      {/* Pricing cards */}
      <section
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
        aria-label="Pricing plans"
      >
        <div className="grid md:grid-cols-2 gap-4">

          {/* Monthly plan */}
          <div
            className={`bg-jtp-panel border rounded-[2px] p-6 flex flex-col transition-opacity duration-200 ${
              billingCycle === 'yearly' ? 'opacity-50' : 'border-jtp-border'
            }`}
            style={billingCycle === 'monthly' ? { borderTop: '2px solid rgba(232,162,61,0.7)' } : { borderTop: '2px solid rgba(27,32,38,1)' }}
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] text-jtp-textDim tracking-[0.14em] uppercase">MONTHLY</span>
                {billingCycle === 'monthly' && (
                  <Badge variant="info" size="xs">SELECTED</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-mono font-bold text-[32px] text-jtp-text tabular-nums">$5.99</span>
                <span className="text-jtp-textMuted text-[13px]">/ month</span>
              </div>
              <p className="text-jtp-textMuted text-[12.5px]">Billed monthly · Cancel anytime</p>
            </div>

            <PublicLink
              href="/signup"
              onClick={() => localStorage.setItem('intendedPlan', 'monthly')}
              className={`block w-full py-2.5 rounded-[2px] font-mono text-[11px] font-bold uppercase tracking-wider text-center transition-colors duration-150 mb-6 focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue ${
                billingCycle === 'monthly'
                  ? 'bg-jtp-blue text-[#08090b] hover:bg-jtp-blueHover'
                  : 'bg-jtp-control text-jtp-textMuted hover:bg-jtp-active border border-jtp-borderStrong'
              }`}
            >
              {billingCycle === 'monthly' ? 'START FREE →' : 'CHOOSE MONTHLY →'}
            </PublicLink>

            <ul className="space-y-2.5 flex-1">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-jtp-textSoft">
                  <CheckIcon className="w-3.5 h-3.5 mt-[2px] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Yearly plan */}
          <div
            className={`bg-jtp-panel border rounded-[2px] p-6 flex flex-col relative overflow-hidden transition-opacity duration-200 ${
              billingCycle === 'monthly' ? 'opacity-50 border-jtp-border' : 'border-jtp-profit/40'
            }`}
            style={billingCycle === 'yearly' ? { borderTop: '2px solid #3ddc84' } : { borderTop: '2px solid rgba(27,32,38,1)' }}
          >
            {/* Best value ribbon */}
            {billingCycle === 'yearly' && (
              <div
                className="absolute top-0 right-0 font-mono text-[9px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 text-jtp-bg"
                style={{ backgroundColor: '#3ddc84' }}
              >
                BEST VALUE
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] text-jtp-textDim tracking-[0.14em] uppercase">YEARLY</span>
                {billingCycle === 'yearly' && (
                  <Badge variant="profit" size="xs">SELECTED</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-mono font-bold text-[32px] text-jtp-text tabular-nums">$60</span>
                <span className="text-jtp-textMuted text-[13px]">/ year</span>
              </div>
              <p className="font-mono text-[12px] text-jtp-profit font-semibold">
                Save $11.88 vs monthly
              </p>
            </div>

            <PublicLink
              href="/signup"
              onClick={() => localStorage.setItem('intendedPlan', 'yearly')}
              className={`block w-full py-2.5 rounded-[2px] font-mono text-[11px] font-bold uppercase tracking-wider text-center transition-colors duration-150 mb-6 focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue ${
                billingCycle === 'yearly'
                  ? 'bg-jtp-profit text-jtp-bg hover:opacity-90'
                  : 'bg-jtp-control text-jtp-textMuted hover:bg-jtp-active border border-jtp-borderStrong'
              }`}
            >
              {billingCycle === 'yearly' ? 'START FREE →' : 'CHOOSE YEARLY →'}
            </PublicLink>

            <ul className="space-y-2.5 flex-1">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-jtp-textSoft">
                  <CheckIcon className="w-3.5 h-3.5 mt-[2px] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
              {/* Annual-only perks */}
              <li className="pt-2 border-t border-jtp-borderSubtle" aria-hidden="true" />
              {ANNUAL_ONLY.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-jtp-profit">
                  <CheckIcon className="w-3.5 h-3.5 mt-[2px] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Beta note */}
        <div
          className="mt-4 border border-jtp-border rounded-[2px] px-4 py-3 flex items-start gap-3"
          style={{ borderLeft: '2px solid rgba(232,162,61,0.6)' }}
        >
          <svg className="w-4 h-4 mt-[1px] shrink-0 text-jtp-amber" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-jtp-textMuted text-[12.5px] leading-relaxed">
            <strong className="font-mono text-jtp-text text-[11px] tracking-[0.05em] uppercase">Beta pricing:</strong>{' '}
            All features are free during the current beta period. The prices above are our planned post-beta rates.
            You will receive advance notice before any charges apply, and will always be able to cancel first.
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
              Upgrade whenever you're ready.
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
