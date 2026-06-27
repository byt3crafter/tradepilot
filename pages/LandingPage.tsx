/**
 * LandingPage — Pro Trading Terminal marketing page.
 *
 * Sections:
 *   1. MarketingNav (sticky, terminal-flavored)
 *   2. Ticker tape (live market data vibe)
 *   3. Hero — headline + CTA + faux terminal dashboard mock
 *   4. Trust strip — honest capability stats (no fake user counts)
 *   5. Feature panels — Journal, Analytics, Quant, AI Agent, Non-custodial
 *   6. How it works — 4 numbered mono steps
 *   7. Pricing teaser — links to pricing page, honest "free while in beta"
 *   8. Final CTA band
 *   9. MarketingFooter
 */
import React from 'react';
import { AuthPage } from '../types';
import { Ticker, Panel, Badge } from '../components/ui/index';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';
import PublicLink from '../components/PublicLink';

interface LandingPageProps {
  navigate: (page: AuthPage) => void;
}

// ── Static ticker data (market-tape vibe) ─────────────────────────────────────
const TICKER_ITEMS = [
  { symbol: 'EUR/USD', price: '1.0847', change: '+0.14%', positive: true },
  { symbol: 'GBP/USD', price: '1.2718', change: '-0.06%', positive: false },
  { symbol: 'USD/JPY', price: '149.82', change: '+0.22%', positive: true },
  { symbol: 'XAU/USD', price: '2,318.40', change: '+0.31%', positive: true },
  { symbol: 'BTC/USD', price: '67,450', change: '-0.45%', positive: false },
  { symbol: 'NAS100',  price: '17,842', change: '+0.18%', positive: true },
  { symbol: 'US30',    price: '38,940', change: '+0.09%', positive: true },
  { symbol: 'USD/CAD', price: '1.3617', change: '-0.11%', positive: false },
  { symbol: 'AUD/USD', price: '0.6612', change: '+0.07%', positive: true },
  { symbol: 'USD/CHF', price: '0.9084', change: '-0.03%', positive: false },
];

// ── Feature data ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'journal',
    label: 'JOURNAL & PROP-FIRM RULES',
    headline: 'Log every trade. Enforce every rule.',
    body: 'Track entry, exit, P&L, R-multiple, MAE/MFE, and confidence — all in one log. Prop-firm objectives render as live progress bars with Passed/Safe/Breach badges. Smart limits block rule violations before they cost you your account.',
    bullets: [
      'P&L and R-multiple calculated server-side — always correct',
      'MAE / MFE excursion tracking',
      'Confidence rating + mistake tags per trade',
      'Prop-firm rules dashboard: profit target, max DD, daily loss',
      'Smart limits: soft warnings + hard stops',
    ],
    badge: { label: 'CORE', variant: 'info' as const },
  },
  {
    id: 'analytics',
    label: 'ANALYTICS',
    headline: 'Edge lives in the breakdown.',
    body: 'Surface where your strategy actually makes money. Break P&L and R by setup, session, symbol, and day-of-week. Switch between $ and R with a single toggle so you see risk-adjusted reality, not just dollar illusion.',
    bullets: [
      'Equity curve with $/R toggle everywhere',
      'Win rate, avg R, expectancy per setup/session',
      'Mistake-tag frequency analysis',
      'Confidence vs P&L correlation',
      'MAE/MFE distribution — see where you leave money on the table',
    ],
    badge: { label: 'ANALYTICS', variant: 'info' as const },
  },
  {
    id: 'quant',
    label: 'QUANT INTELLIGENCE',
    headline: 'EdgeScore: LCB-ranked, luck-adjusted.',
    body: 'The Polymarket leaderboard ranks wallets by EdgeScore — realized edge per trade with 95% lower-confidence-bound ranking. High sample size, real outcomes, stat-adjusted. Surfaces genuine alpha. Buries luck.',
    bullets: [
      'EdgeScore = realized edge per trade (Polymarket)',
      '95% LCB ranking — penalizes small samples, rewards consistency',
      'Non-custodial copy execution: you sign, we never hold keys',
      'Wallet audit trail: every position, every outcome',
      'Filter by market, timeframe, sample size',
    ],
    badge: { label: 'QUANT', variant: 'warning' as const },
  },
  {
    id: 'ai',
    label: 'AI + AUTONOMOUS AGENT',
    headline: 'A tool-using agent, not a chatbot.',
    body: "The AI agent has real tools: it reads your journal, surfaces your mistake patterns, finds high-edge opportunities, and can execute scheduled tasks autonomously with a full audit log. It doesn't hallucinate — it cites the data.",
    bullets: [
      'AI trade analysis: mistakes, good points, Gemini-powered',
      'Opportunity finder: scans for high-edge setups',
      'Installable skills — extend what the agent can do',
      'Scheduled runs + audit log for every agent action',
      'Pre-trade checklist + playbook checklist — two distinct flows',
    ],
    badge: { label: 'AI', variant: 'warning' as const },
  },
  {
    id: 'execution',
    label: 'NON-CUSTODIAL EXECUTION',
    headline: 'You sign every order. We never touch your funds.',
    body: 'Trade Polymarket prediction markets from the terminal. Connect your wallet, browse markets, and execute directly via your wallet signature. No custodian. No trust assumption. Your keys, your orders.',
    bullets: [
      'Polymarket market browser built into the terminal',
      'Wallet-signed orders — non-custodial, end-to-end',
      'Edge-ranked outcomes — trade what the data says',
      'Full position and P&L tracking inside the journal',
      'cTrader auto-sync: broker trades land in your journal automatically',
    ],
    badge: { label: 'EXECUTION', variant: 'profit' as const },
  },
];

// ── How it works steps ─────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Connect your accounts',
    body: 'Add your prop-firm or live broker account. Set your trading objectives, smart limits, and fee model once — the terminal tracks everything from there.',
  },
  {
    n: '02',
    title: 'Log every trade',
    body: 'Open the log drawer, fill in entry/exit/SL/TP, rate your confidence, tag mistakes, capture screenshots. The terminal computes P&L, R-multiple, MAE/MFE instantly.',
  },
  {
    n: '03',
    title: 'See your edge, not just your P&L',
    body: 'The Analytics page breaks your performance by every dimension. Switch $/R. Find which setups, sessions, and assets actually print. Kill what doesn\'t.',
  },
  {
    n: '04',
    title: 'Let the agent work while you trade',
    body: 'Schedule the AI agent to review your journal nightly, flag pattern breaks, surface Polymarket edge, and enforce your playbook — without babysitting it.',
  },
];

// ── Faux terminal dashboard mock ───────────────────────────────────────────────
const TerminalMock: React.FC = () => (
  <div
    className="rounded-[2px] border border-jtp-border overflow-hidden bg-jtp-panel w-full"
    style={{ borderTop: '2px solid #e8a23d' }}
    aria-label="JTradePilot terminal preview"
    role="img"
  >
    {/* Status bar */}
    <div className="flex items-center justify-between px-3 py-[7px] border-b border-jtp-border bg-jtp-raised">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.2em]" style={{ color: '#e8a23d' }}>[JTP]</span>
        <span className="font-mono text-[9px] text-jtp-textDim">DEMO ACCOUNT</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="status-dot-live" aria-hidden="true" />
          <span className="font-mono text-[9px] text-jtp-textDim">SYSTEM OK</span>
        </span>
        <span className="font-mono text-[9px] text-jtp-textFaint">UTC 14:32:08</span>
      </div>
    </div>

    {/* KPI row */}
    <div className="grid grid-cols-3 divide-x divide-jtp-border border-b border-jtp-border">
      <div className="px-3 py-3" style={{ borderLeft: '2px solid rgba(232,162,61,0.6)' }}>
        <div className="font-mono text-[8.5px] text-jtp-textDim tracking-[0.1em] uppercase mb-1">NET P&L</div>
        <div className="font-mono font-bold text-jtp-profit text-[17px] leading-none tabular-nums">▲ +$4,320</div>
        <div className="font-mono text-[9px] text-jtp-textDim mt-1">47 trades</div>
      </div>
      <div className="px-3 py-3">
        <div className="font-mono text-[8.5px] text-jtp-textDim tracking-[0.1em] uppercase mb-1">WIN RATE</div>
        <div className="font-mono font-bold text-jtp-text text-[17px] leading-none tabular-nums">63.8%</div>
        <div className="font-mono text-[9px] text-jtp-textDim mt-1">30 wins</div>
      </div>
      <div className="px-3 py-3">
        <div className="font-mono text-[8.5px] text-jtp-textDim tracking-[0.1em] uppercase mb-1">MAX DD</div>
        <div className="font-mono font-bold text-jtp-loss text-[17px] leading-none tabular-nums">▼ -1.8%</div>
        <div className="font-mono text-[9px] text-jtp-textDim mt-1">limit 5%</div>
      </div>
    </div>

    {/* Equity sparkline */}
    <div className="p-3 border-b border-jtp-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: '#e8a23d' }} aria-hidden="true">▸</span>
          <span className="font-mono text-[8.5px] text-jtp-textDim tracking-[0.1em] uppercase">EQUITY CURVE (30D)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[8px] px-1.5 py-[1px] border rounded-none" style={{ borderColor: 'rgba(232,162,61,0.5)', color: '#e8a23d', background: 'rgba(232,162,61,0.1)' }}>$</span>
          <span className="font-mono text-[8px] px-1.5 py-[1px] border border-jtp-borderStrong text-jtp-textDim rounded-none">R</span>
        </div>
      </div>
      <svg viewBox="0 0 300 56" className="w-full" height="56" aria-hidden="true" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="mockEqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ddc84" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3ddc84" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1="0" y1="18" x2="300" y2="18" stroke="#1b2026" strokeWidth="1" />
        <line x1="0" y1="36" x2="300" y2="36" stroke="#1b2026" strokeWidth="1" />
        {/* Y-axis labels */}
        <text x="2" y="15" className="font-mono" fontSize="7" fill="#565d66">+8R</text>
        <text x="2" y="33" className="font-mono" fontSize="7" fill="#565d66">+4R</text>
        {/* Equity curve — upward trending with a dip then recovery */}
        <path
          d="M0,50 C15,48 28,44 42,40 C56,36 65,38 78,33 C91,28 100,32 114,26 C128,20 138,24 152,18 C166,12 175,16 190,10 C205,4 215,8 230,6 C245,4 260,7 275,4 C285,2 295,3 300,2"
          fill="none"
          stroke="#3ddc84"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M0,50 C15,48 28,44 42,40 C56,36 65,38 78,33 C91,28 100,32 114,26 C128,20 138,24 152,18 C166,12 175,16 190,10 C205,4 215,8 230,6 C245,4 260,7 275,4 C285,2 295,3 300,2 L300,56 L0,56 Z"
          fill="url(#mockEqGrad)"
        />
      </svg>
    </div>

    {/* Prop firm rules */}
    <div className="p-3 border-b border-jtp-border">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-[9px]" style={{ color: '#e8a23d' }} aria-hidden="true">▸</span>
        <span className="font-mono text-[8.5px] text-jtp-textDim tracking-[0.1em] uppercase">PROP FIRM RULES</span>
      </div>
      <div className="space-y-2">
        {/* Profit target */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-jtp-textMuted w-[90px] shrink-0 truncate">Profit Target</span>
          <div className="flex-1 h-[5px] bg-jtp-control rounded-none overflow-hidden">
            <div className="h-full bg-jtp-profit transition-none" style={{ width: '72%' }} />
          </div>
          <span className="font-mono text-[9px] text-jtp-profit w-7 text-right tabular-nums shrink-0">72%</span>
          <span className="font-mono text-[8px] bg-[rgba(61,220,132,.12)] text-[#3ddc84] border border-[rgba(61,220,132,.35)] px-[4px] py-[1px] shrink-0">SAFE</span>
        </div>
        {/* Daily loss */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-jtp-textMuted w-[90px] shrink-0 truncate">Daily Loss</span>
          <div className="flex-1 h-[5px] bg-jtp-control rounded-none overflow-hidden">
            <div className="h-full bg-jtp-profit transition-none" style={{ width: '33%' }} />
          </div>
          <span className="font-mono text-[9px] text-jtp-profit w-7 text-right tabular-nums shrink-0">33%</span>
          <span className="font-mono text-[8px] bg-[rgba(61,220,132,.12)] text-[#3ddc84] border border-[rgba(61,220,132,.35)] px-[4px] py-[1px] shrink-0">SAFE</span>
        </div>
        {/* Max drawdown */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-jtp-textMuted w-[90px] shrink-0 truncate">Max Drawdown</span>
          <div className="flex-1 h-[5px] bg-jtp-control rounded-none overflow-hidden">
            <div className="h-full bg-jtp-warning transition-none" style={{ width: '54%' }} />
          </div>
          <span className="font-mono text-[9px] text-jtp-warning w-7 text-right tabular-nums shrink-0">54%</span>
          <span className="font-mono text-[8px] bg-[rgba(232,162,61,.12)] text-[#e8a23d] border border-[rgba(232,162,61,.35)] px-[4px] py-[1px] shrink-0">WATCH</span>
        </div>
      </div>
    </div>

    {/* Recent trades */}
    <div className="px-3 pt-2.5 pb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px]" style={{ color: '#e8a23d' }} aria-hidden="true">▸</span>
        <span className="font-mono text-[8.5px] text-jtp-textDim tracking-[0.1em] uppercase">RECENT TRADES</span>
      </div>
      <div className="space-y-0">
        {/* Header */}
        <div className="flex items-center gap-2 font-mono text-[8px] text-jtp-textDim tracking-[0.08em] uppercase pb-1 border-b border-jtp-borderSubtle mb-1">
          <span className="w-14">SYMBOL</span>
          <span className="w-10">SIDE</span>
          <span className="flex-1">P&L</span>
          <span className="w-10 text-right">R</span>
          <span className="w-8 text-right">CONF</span>
        </div>
        {/* Trade row 1 */}
        <div className="flex items-center gap-2 font-mono text-[9.5px] py-[5px] border-b border-jtp-borderSubtle hover:bg-jtp-hover transition-colors duration-150">
          <span className="text-jtp-text w-14">EUR/USD</span>
          <span className="text-jtp-profit w-10">LONG</span>
          <span className="text-jtp-profit flex-1 tabular-nums">▲ +$420</span>
          <span className="text-jtp-text w-10 text-right tabular-nums">+2.1R</span>
          <span className="text-jtp-textDim w-8 text-right tabular-nums">63%</span>
        </div>
        {/* Trade row 2 */}
        <div className="flex items-center gap-2 font-mono text-[9.5px] py-[5px] border-b border-jtp-borderSubtle hover:bg-jtp-hover transition-colors duration-150">
          <span className="text-jtp-text w-14">GBP/USD</span>
          <span className="text-jtp-loss w-10">SHORT</span>
          <span className="text-jtp-loss flex-1 tabular-nums">▼ -$120</span>
          <span className="text-jtp-text w-10 text-right tabular-nums">-0.6R</span>
          <span className="text-jtp-textDim w-8 text-right tabular-nums">45%</span>
        </div>
        {/* Trade row 3 */}
        <div className="flex items-center gap-2 font-mono text-[9.5px] py-[5px] hover:bg-jtp-hover transition-colors duration-150">
          <span className="text-jtp-text w-14">USD/JPY</span>
          <span className="text-jtp-profit w-10">LONG</span>
          <span className="text-jtp-profit flex-1 tabular-nums">▲ +$280</span>
          <span className="text-jtp-text w-10 text-right tabular-nums">+1.4R</span>
          <span className="text-jtp-textDim w-8 text-right tabular-nums">71%</span>
        </div>
      </div>
    </div>
  </div>
);

// ── Check icon (SVG, inline) ───────────────────────────────────────────────────
const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5L6.5 12L13 5" stroke="#3ddc84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  // Capture referral code from URL params (must be preserved)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referralCode', ref);
    }
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-jtp-bg text-jtp-text">

      {/* 1. Nav */}
      <MarketingNav
        onSignup={() => navigate('signup')}
        onLogin={() => navigate('login')}
      />

      {/* 2. Ticker tape */}
      <Ticker items={TICKER_ITEMS} speed="slow" />

      {/* 3. Hero */}
      <section
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-20 md:pb-24"
        aria-labelledby="hero-headline"
      >
        <div className="flex flex-col lg:flex-row items-start gap-12 xl:gap-16">

          {/* Left: copy */}
          <div className="flex-1 min-w-0 lg:max-w-[540px]">
            {/* Pre-headline badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="status-dot-live" aria-hidden="true" />
              <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">
                Pro Trading Terminal · Beta
              </span>
            </div>

            {/* Headline */}
            <h1
              id="hero-headline"
              className="text-[32px] sm:text-[40px] lg:text-[46px] font-bold leading-[1.12] tracking-[-0.02em] mb-5"
            >
              The{' '}
              <span className="font-mono" style={{ color: '#e8a23d' }}>
                terminal
              </span>{' '}
              for{' '}
              <span className="font-mono" style={{ color: '#e8a23d' }}>
                prop-firm traders
              </span>{' '}
              &amp; on-chain{' '}
              <span className="font-mono" style={{ color: '#e8a23d' }}>
                quants.
              </span>
            </h1>

            {/* Sub */}
            <p className="text-jtp-textSoft text-[16px] leading-relaxed mb-8 max-w-[460px]">
              Log trades, enforce prop-firm rules, surface your statistical edge, and
              execute Polymarket orders non-custodially — all from one terminal. No fluff.
              No custodian. Just data.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10">
              <button
                onClick={() => navigate('signup')}
                className="font-mono font-bold text-[12px] uppercase tracking-wider px-6 py-3.5 rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-jtp-blue"
                style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ffb838')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e8a23d')}
              >
                START FREE →
              </button>
              <button
                onClick={() => navigate('login')}
                className="font-mono text-[12px] text-jtp-text px-6 py-3.5 rounded-[2px] border border-jtp-borderStrong hover:border-jtp-borderHover hover:bg-jtp-hover transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-jtp-blue"
              >
                SIGN IN
              </button>
            </div>

            {/* Honest capability proof — no fake numbers */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-jtp-textMuted text-[13px]">
                <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                Free while in beta — no credit card required
              </div>
              <div className="flex items-center gap-2 text-jtp-textMuted text-[13px]">
                <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                Non-custodial execution — your keys, your orders
              </div>
              <div className="flex items-center gap-2 text-jtp-textMuted text-[13px]">
                <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                Prop-firm rules enforced in real time
              </div>
            </div>
          </div>

          {/* Right: faux terminal mock */}
          <div className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0">
            <TerminalMock />
          </div>
        </div>
      </section>

      {/* 4. Trust / capability stat strip */}
      <section
        className="border-y border-jtp-border bg-jtp-raised"
        aria-label="Product capabilities"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x-0 md:divide-x divide-jtp-border">
            {[
              {
                label: 'EDGE SCORING',
                value: 'LCB-ranked',
                sub: '95% lower confidence bound',
              },
              {
                label: 'EXECUTION',
                value: 'Non-custodial',
                sub: 'Wallet-signed, no custody',
              },
              {
                label: 'AI AGENT',
                value: 'Tool-using',
                sub: 'Scheduled + audit log',
              },
              {
                label: 'P&L DISPLAY',
                value: '$ or R',
                sub: 'Toggle anywhere in the terminal',
              },
            ].map((stat) => (
              <div key={stat.label} className="px-4 first:pl-0 last:pr-0">
                <div className="font-mono text-[9px] text-jtp-textDim tracking-[0.14em] uppercase mb-1">
                  {stat.label}
                </div>
                <div className="font-mono font-bold text-jtp-text text-[15px] leading-snug" style={{ color: '#e8a23d' }}>
                  {stat.value}
                </div>
                <div className="text-[12px] text-jtp-textMuted mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Feature panels */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        aria-labelledby="features-heading"
      >
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
            <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">Capabilities</span>
          </div>
          <h2 id="features-heading" className="text-[28px] sm:text-[34px] font-bold leading-tight tracking-[-0.015em] mb-3">
            Everything a serious trader needs.
            <br />
            <span className="font-mono text-[24px] sm:text-[28px]" style={{ color: '#e8a23d' }}>Nothing they don't.</span>
          </h2>
          <p className="text-jtp-textMuted text-[15px] max-w-xl">
            Built for discipline-first trading — prop challenges, live accounts, and on-chain prediction markets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feat) => (
            <Panel key={feat.id} label={feat.label} className="h-full">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-jtp-text text-[17px] leading-snug tracking-tight">
                    {feat.headline}
                  </h3>
                  <Badge variant={feat.badge.variant} size="xs" className="shrink-0 mt-1">
                    {feat.badge.label}
                  </Badge>
                </div>
                <p className="text-jtp-textMuted text-[13.5px] leading-relaxed mb-5">
                  {feat.body}
                </p>
                <ul className="space-y-2 mt-auto">
                  {feat.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[12.5px] text-jtp-textSoft">
                      <CheckIcon className="w-3.5 h-3.5 mt-[2px] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* 6. Quant section (dedicated anchor) */}
      <section
        id="quant"
        className="border-y border-jtp-border bg-jtp-panel"
        aria-labelledby="quant-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col lg:flex-row items-start gap-12">
            {/* Text side */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
                <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">Quant Module</span>
              </div>
              <h2 id="quant-heading" className="text-[26px] sm:text-[32px] font-bold tracking-[-0.015em] mb-4 leading-tight">
                Find wallets with{' '}
                <span className="font-mono" style={{ color: '#e8a23d' }}>real edge.</span>
                <br />
                Not just winning streaks.
              </h2>
              <p className="text-jtp-textMuted text-[14px] leading-relaxed mb-6 max-w-lg">
                Most leaderboards rank by P&L — a noisy, luck-contaminated metric. JTradePilot's
                EdgeScore ranks by realized edge per trade with a 95% lower-confidence-bound
                correction. Large sample sizes get full credit. Small samples get discounted.
                Luck gets buried.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'EdgeScore', desc: 'Realized edge per trade, LCB-corrected for sample size' },
                  { label: 'Non-custodial copy', desc: 'Execute identified edge via your own wallet signature' },
                  { label: 'Market filter', desc: 'Browse by category, resolution date, and volume' },
                  { label: 'Full audit trail', desc: 'Every position, outcome, and R logged in your journal' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div
                      className="w-1 h-4 mt-[3px] rounded-none flex-shrink-0"
                      style={{ backgroundColor: '#e8a23d' }}
                      aria-hidden="true"
                    />
                    <div>
                      <span className="font-mono font-bold text-jtp-text text-[12.5px]">{item.label}</span>
                      <span className="text-jtp-textMuted text-[12.5px]"> — {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quant leaderboard mock */}
            <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0">
              <div
                className="rounded-[2px] border border-jtp-border overflow-hidden bg-jtp-bg"
                style={{ borderTop: '2px solid #e8a23d' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-[9px] border-b border-jtp-border bg-jtp-raised">
                  <span className="font-mono text-[9px] text-jtp-textDim tracking-[0.12em] uppercase">
                    <span style={{ color: '#e8a23d', marginRight: '5px' }}>▸</span>
                    EDGESCORE LEADERBOARD
                  </span>
                  <span className="font-mono text-[8px] bg-[rgba(61,220,132,.12)] text-[#3ddc84] border border-[rgba(61,220,132,.35)] px-[5px] py-[1px]">LIVE</span>
                </div>
                {/* Column headers */}
                <div className="flex items-center gap-2 px-3 py-[6px] border-b border-jtp-borderSubtle bg-jtp-raised">
                  <span className="font-mono text-[8px] text-jtp-textDim tracking-[0.1em] w-6">#</span>
                  <span className="font-mono text-[8px] text-jtp-textDim tracking-[0.1em] flex-1">WALLET</span>
                  <span className="font-mono text-[8px] text-jtp-textDim tracking-[0.1em] w-16 text-right">EDGE/TRADE</span>
                  <span className="font-mono text-[8px] text-jtp-textDim tracking-[0.1em] w-12 text-right">TRADES</span>
                  <span className="font-mono text-[8px] text-jtp-textDim tracking-[0.1em] w-16 text-right">LCB</span>
                </div>
                {/* Wallet rows */}
                {[
                  { rank: '01', wallet: '0x4f2a…8b3c', edge: '+8.4%', trades: '342', lcb: '7.1%', color: 'text-jtp-profit' },
                  { rank: '02', wallet: '0x91d3…2e7a', edge: '+6.2%', trades: '218', lcb: '5.0%', color: 'text-jtp-profit' },
                  { rank: '03', wallet: '0xb823…fa1d', edge: '+5.8%', trades: '189', lcb: '4.4%', color: 'text-jtp-profit' },
                  { rank: '04', wallet: '0x3c0e…d942', edge: '+4.1%', trades: '97', lcb: '2.9%', color: 'text-jtp-warning' },
                  { rank: '05', wallet: '0x7f56…11e8', edge: '+3.7%', trades: '63', lcb: '1.8%', color: 'text-jtp-warning' },
                ].map((row) => (
                  <div
                    key={row.rank}
                    className="flex items-center gap-2 px-3 py-2 border-b border-jtp-borderSubtle hover:bg-jtp-hover transition-colors duration-150 cursor-pointer"
                  >
                    <span className="font-mono text-[9px] text-jtp-textDim w-6 tabular-nums">{row.rank}</span>
                    <span className="font-mono text-[9.5px] text-jtp-textMuted flex-1 truncate">{row.wallet}</span>
                    <span className={`font-mono text-[9.5px] font-bold w-16 text-right tabular-nums ${row.color}`}>{row.edge}</span>
                    <span className="font-mono text-[9px] text-jtp-textDim w-12 text-right tabular-nums">{row.trades}</span>
                    <span className={`font-mono text-[9.5px] w-16 text-right tabular-nums ${row.color}`}>{row.lcb}</span>
                  </div>
                ))}
                {/* Footer */}
                <div className="px-3 py-2 bg-jtp-raised">
                  <span className="font-mono text-[8.5px] text-jtp-textFaint">EdgeScore = realized edge per trade · 95% LCB correction applied</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. How it works */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        aria-labelledby="how-heading"
      >
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
            <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">HOW IT WORKS</span>
          </div>
          <h2 id="how-heading" className="text-[26px] sm:text-[32px] font-bold tracking-[-0.015em]">
            Up and running in minutes.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="bg-jtp-panel border border-jtp-border rounded-[2px] p-5"
              style={{ borderTop: '2px solid rgba(232,162,61,0.35)' }}
            >
              <div
                className="font-mono font-bold text-[28px] leading-none mb-4 tabular-nums"
                style={{ color: 'rgba(232,162,61,0.4)' }}
                aria-hidden="true"
              >
                {step.n}
              </div>
              <h3 className="font-bold text-jtp-text text-[14px] mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="text-jtp-textMuted text-[13px] leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Pricing teaser */}
      <section
        className="border-y border-jtp-border bg-jtp-panel"
        aria-labelledby="pricing-teaser-heading"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
            <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">PRICING</span>
          </div>
          <h2 id="pricing-teaser-heading" className="text-[26px] sm:text-[30px] font-bold tracking-[-0.015em] mb-3">
            Free while in beta.
          </h2>
          <p className="text-jtp-textMuted text-[15px] leading-relaxed mb-2 max-w-xl mx-auto">
            Full access to the terminal — journal, analytics, quant, AI agent — at no cost
            during the beta. Billing infrastructure is in place; we'll give you advance notice before any paid plan kicks in.
          </p>
          <p className="font-mono text-[11px] text-jtp-textDim mb-8">
            Planned: $5.99 / month · $60.00 / year · Cancel anytime
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('signup')}
              className="font-mono font-bold text-[12px] uppercase tracking-wider px-8 py-3.5 rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-jtp-blue w-full sm:w-auto"
              style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ffb838')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e8a23d')}
            >
              START FREE →
            </button>
            <PublicLink
              href="/pricing"
              className="font-mono text-[11.5px] text-jtp-textMuted hover:text-jtp-text transition-colors duration-150 cursor-pointer"
            >
              View full pricing details →
            </PublicLink>
          </div>
        </div>
      </section>

      {/* 9. Final CTA band */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        aria-labelledby="final-cta-heading"
      >
        <div
          className="relative rounded-[2px] border border-jtp-border overflow-hidden text-center px-6 py-14"
          style={{ borderTop: '2px solid #e8a23d', background: 'linear-gradient(180deg, rgba(232,162,61,0.04) 0%, transparent 60%)' }}
        >
          {/* Amber glow — purely decorative */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,162,61,0.12) 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10">
            <h2 id="final-cta-heading" className="text-[26px] sm:text-[34px] font-bold tracking-[-0.015em] mb-4">
              Ready to trade with discipline?
            </h2>
            <p className="text-jtp-textMuted text-[15px] leading-relaxed mb-8 max-w-lg mx-auto">
              Stop journaling in spreadsheets. Stop guessing at your edge. Start using a terminal
              built for the way serious traders actually work.
            </p>
            <button
              onClick={() => navigate('signup')}
              className="font-mono font-bold text-[13px] uppercase tracking-wider px-10 py-4 rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-jtp-blue"
              style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ffb838')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e8a23d')}
            >
              OPEN THE TERMINAL →
            </button>
            <p className="font-mono text-[10.5px] text-jtp-textDim mt-4">
              Free during beta · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
};

export default LandingPage;
