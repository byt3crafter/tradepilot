/**
 * LandingPage — Pro Trading Terminal marketing page.
 *
 * Sections:
 *   1. MarketingNav (sticky, scroll-spy active)
 *   2. Ticker tape (live market data vibe)
 *   3. Hero — free journal for prop-firm traders + faux dashboard mock
 *   4. Trust strip — live capabilities only (no fake / coming-soon claims)
 *   5a. Feature panels — "AVAILABLE NOW · FREE" group (journal, analytics, playbooks)
 *   5b. Feature panels — "ON THE ROADMAP · COMING SOON" group (quant, AI, execution)
 *   6. Quant preview section — clearly labelled coming soon
 *   7. How it works — 3 live steps + 1 coming-soon step
 *   8. Pricing teaser — "free during beta; Pro coming with advanced features"
 *   9. Final CTA band
 *  10. MarketingFooter
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

// ── Feature data — split by availability ──────────────────────────────────────

const FEATURES_LIVE = [
  {
    id: 'journal',
    label: 'JOURNAL & PROP-FIRM RULES',
    headline: 'Log every trade. Enforce every rule.',
    body: 'Track entry, exit, P&L, R-multiple, MAE/MFE, and confidence — all in one log. Prop-firm objectives render as live progress bars with Passed/Safe/Breach badges. Smart limits block rule violations before they cost you your account.',
    bullets: [
      'P&L and R-multiple calculated server-side — always correct',
      'MAE / MFE excursion tracking',
      'Confidence rating + mistake tags per trade',
      'Prop-firm rules: profit target, max DD, daily loss',
      'Smart limits: soft warnings + hard stops',
    ],
    badge: { label: 'FREE', variant: 'profit' as const },
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
    badge: { label: 'FREE', variant: 'profit' as const },
  },
  {
    id: 'playbooks',
    label: 'PLAYBOOKS & CHECKLISTS',
    headline: 'Build repeatable, rule-driven setups.',
    body: 'Define playbooks with entry conditions, SL/TP rules, and per-setup asset specs. Run pre-trade and playbook checklists before every entry — two distinct flows so nothing gets skipped. Track which setups actually perform.',
    bullets: [
      'Unlimited playbooks with setup hierarchies',
      'Pre-trade checklist (separate from playbook checklist)',
      'Checklist rules: mandatory vs advisory',
      'Per-setup asset specifications',
      'Performance analytics broken down by playbook',
    ],
    badge: { label: 'FREE', variant: 'profit' as const },
  },
];

const FEATURES_SOON = [
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
    badge: { label: 'SOON', variant: 'neutral' as const },
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
      'Autonomous operation — not a chat interface',
    ],
    badge: { label: 'SOON', variant: 'neutral' as const },
  },
  {
    id: 'execution',
    label: 'NON-CUSTODIAL EXECUTION & BOT',
    headline: 'You sign every order. We never touch your funds.',
    body: 'Trade Polymarket prediction markets from the terminal. Connect your wallet, browse markets, and execute directly via your wallet signature. The cTrader bot will sync broker trades to your journal automatically.',
    bullets: [
      'Polymarket market browser built into the terminal',
      'Wallet-signed orders — non-custodial, end-to-end',
      'Edge-ranked outcomes — trade what the data says',
      'Full position and P&L tracking inside the journal',
      'cTrader auto-sync: broker trades land in your journal automatically',
    ],
    badge: { label: 'SOON', variant: 'neutral' as const },
  },
];

// ── How it works steps ─────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Connect your accounts',
    body: 'Add your prop-firm or live broker account. Set your trading objectives, smart limits, and fee model once — the terminal tracks everything from there.',
    live: true,
  },
  {
    n: '02',
    title: 'Log every trade',
    body: 'Open the log drawer, fill in entry/exit/SL/TP, rate your confidence, tag mistakes, capture screenshots. The terminal computes P&L, R-multiple, MAE/MFE instantly.',
    live: true,
  },
  {
    n: '03',
    title: 'See your edge, not just your P&L',
    body: "The Analytics page breaks your performance by every dimension. Switch $/R. Find which setups, sessions, and assets actually print. Kill what doesn't.",
    live: true,
  },
  {
    n: '04',
    title: 'AI agent + quant intelligence',
    body: 'Coming soon: schedule the AI agent to review your journal nightly, flag pattern breaks, surface Polymarket edge, and enforce your playbook — without babysitting it.',
    live: false,
  },
];

// ── Faux terminal dashboard mock ───────────────────────────────────────────────
const TerminalMock: React.FC = () => (
  <div
    className="rounded-[2px] border border-jtp-border overflow-hidden bg-jtp-panel w-full"
    style={{ borderTop: '2px solid #e8a23d' }}
    aria-label="JTradePilot terminal preview — journal dashboard"
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
        <line x1="0" y1="18" x2="300" y2="18" stroke="#1b2026" strokeWidth="1" />
        <line x1="0" y1="36" x2="300" y2="36" stroke="#1b2026" strokeWidth="1" />
        <text x="2" y="15" className="font-mono" fontSize="7" fill="#565d66">+8R</text>
        <text x="2" y="33" className="font-mono" fontSize="7" fill="#565d66">+4R</text>
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
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-jtp-textMuted w-[90px] shrink-0 truncate">Profit Target</span>
          <div className="flex-1 h-[5px] bg-jtp-control rounded-none overflow-hidden">
            <div className="h-full bg-jtp-profit transition-none" style={{ width: '72%' }} />
          </div>
          <span className="font-mono text-[9px] text-jtp-profit w-7 text-right tabular-nums shrink-0">72%</span>
          <span className="font-mono text-[8px] bg-[rgba(61,220,132,.12)] text-[#3ddc84] border border-[rgba(61,220,132,.35)] px-[4px] py-[1px] shrink-0">SAFE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-jtp-textMuted w-[90px] shrink-0 truncate">Daily Loss</span>
          <div className="flex-1 h-[5px] bg-jtp-control rounded-none overflow-hidden">
            <div className="h-full bg-jtp-profit transition-none" style={{ width: '33%' }} />
          </div>
          <span className="font-mono text-[9px] text-jtp-profit w-7 text-right tabular-nums shrink-0">33%</span>
          <span className="font-mono text-[8px] bg-[rgba(61,220,132,.12)] text-[#3ddc84] border border-[rgba(61,220,132,.35)] px-[4px] py-[1px] shrink-0">SAFE</span>
        </div>
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
        <div className="flex items-center gap-2 font-mono text-[8px] text-jtp-textDim tracking-[0.08em] uppercase pb-1 border-b border-jtp-borderSubtle mb-1">
          <span className="w-14">SYMBOL</span>
          <span className="w-10">SIDE</span>
          <span className="flex-1">P&L</span>
          <span className="w-10 text-right">R</span>
          <span className="w-8 text-right">CONF</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9.5px] py-[5px] border-b border-jtp-borderSubtle hover:bg-jtp-hover transition-colors duration-150">
          <span className="text-jtp-text w-14">EUR/USD</span>
          <span className="text-jtp-profit w-10">LONG</span>
          <span className="text-jtp-profit flex-1 tabular-nums">▲ +$420</span>
          <span className="text-jtp-text w-10 text-right tabular-nums">+2.1R</span>
          <span className="text-jtp-textDim w-8 text-right tabular-nums">63%</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9.5px] py-[5px] border-b border-jtp-borderSubtle hover:bg-jtp-hover transition-colors duration-150">
          <span className="text-jtp-text w-14">GBP/USD</span>
          <span className="text-jtp-loss w-10">SHORT</span>
          <span className="text-jtp-loss flex-1 tabular-nums">▼ -$120</span>
          <span className="text-jtp-text w-10 text-right tabular-nums">-0.6R</span>
          <span className="text-jtp-textDim w-8 text-right tabular-nums">45%</span>
        </div>
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

// ── Check icon ─────────────────────────────────────────────────────────────────
const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5L6.5 12L13 5" stroke="#3ddc84" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Divider row for feature group headings ─────────────────────────────────────
const FeatureGroupHeader: React.FC<{
  label: string;
  sublabel: string;
  labelCls?: string;
}> = ({ label, sublabel, labelCls }) => (
  <div className="flex items-center gap-3 mb-5">
    <span
      className={[
        'font-mono text-[10px] tracking-[0.14em] uppercase font-semibold px-2 py-[3px] border shrink-0',
        labelCls,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
    <div className="h-px flex-1 bg-jtp-borderSubtle" />
    <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-jtp-textDim shrink-0 hidden sm:block">
      {sublabel}
    </span>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
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
                Free Trading Journal · Beta
              </span>
            </div>

            {/* Headline */}
            <h1
              id="hero-headline"
              className="text-[32px] sm:text-[40px] lg:text-[46px] font-bold leading-[1.12] tracking-[-0.02em] mb-5"
            >
              The{' '}
              <span className="font-mono" style={{ color: '#e8a23d' }}>
                free journal
              </span>{' '}
              built for{' '}
              <span className="font-mono" style={{ color: '#e8a23d' }}>
                prop-firm traders.
              </span>
            </h1>

            {/* Sub */}
            <p className="text-jtp-textSoft text-[16px] leading-relaxed mb-3 max-w-[460px]">
              Log trades, enforce prop-firm rules, and surface your statistical edge — all
              in one terminal. No spreadsheets. No guesswork. Just data.
            </p>

            {/* Coming soon tease */}
            <p className="font-mono text-[11px] text-jtp-textDim mb-8 max-w-[400px]">
              Quant intelligence, AI agent &amp; non-custodial execution — coming soon.
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

            {/* Honest bullets — live features only */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-jtp-textMuted text-[13px]">
                <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                Free during beta — no credit card required
              </div>
              <div className="flex items-center gap-2 text-jtp-textMuted text-[13px]">
                <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                Prop-firm rules enforced in real time
              </div>
              <div className="flex items-center gap-2 text-jtp-textMuted text-[13px]">
                <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                Full analytics with $/R toggle
              </div>
            </div>
          </div>

          {/* Right: faux terminal mock (journal dashboard — honest) */}
          <div className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0">
            <TerminalMock />
          </div>
        </div>
      </section>

      {/* 4. Trust / capability stat strip — live features only */}
      <section
        className="border-y border-jtp-border bg-jtp-raised"
        aria-label="What's live now"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x-0 md:divide-x divide-jtp-border">
            {[
              {
                label: 'JOURNAL',
                value: 'Unlimited',
                sub: 'Trades, screenshots, notes',
              },
              {
                label: 'PROP-FIRM RULES',
                value: 'Live gauges',
                sub: 'Profit target, max DD, daily loss',
              },
              {
                label: 'ANALYTICS',
                value: 'Edge by setup',
                sub: 'Session, symbol, day-of-week',
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
                <div className="font-mono font-bold text-[15px] leading-snug" style={{ color: '#e8a23d' }}>
                  {stat.value}
                </div>
                <div className="text-[12px] text-jtp-textMuted mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Feature panels — two groups */}
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
            What the terminal does.
            <br />
            <span className="font-mono text-[24px] sm:text-[28px]" style={{ color: '#e8a23d' }}>And what's coming next.</span>
          </h2>
          <p className="text-jtp-textMuted text-[15px] max-w-xl">
            The trading journal is fully live and free. Quant intelligence, AI agent, and non-custodial execution are in active development.
          </p>
        </div>

        {/* — Group 1: Available now ——————————————————————————————————————————— */}
        <div className="mb-2">
          <FeatureGroupHeader
            label="AVAILABLE NOW"
            sublabel="FREE · NO CARD REQUIRED"
            labelCls="text-jtp-profit border-[rgba(61,220,132,.35)] bg-[rgba(61,220,132,.07)]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES_LIVE.map((feat) => (
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
        </div>

        {/* — Group 2: Coming soon ———————————————————————————————————————————— */}
        <div className="mt-12">
          <FeatureGroupHeader
            label="COMING SOON"
            sublabel="ROADMAP · NOT YET AVAILABLE"
            labelCls="text-jtp-textDim border-jtp-borderStrong bg-jtp-control"
          />
          {/* Muted wrapper makes it visually clear these aren't available */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-55">
            {FEATURES_SOON.map((feat) => (
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
        </div>
      </section>

      {/* 6. Quant section (dedicated anchor) — coming soon */}
      <section
        id="quant"
        className="border-y border-jtp-border bg-jtp-panel"
        aria-labelledby="quant-heading"
      >
        {/* Coming-soon banner */}
        <div
          className="border-b border-jtp-border bg-jtp-raised px-4 sm:px-8 py-3 flex items-center gap-3"
        >
          <svg className="w-3.5 h-3.5 text-jtp-textDim shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.1em]">
            PREVIEW — NOT YET AVAILABLE
          </span>
          <span className="ml-auto">
            <Badge variant="neutral" size="xs">COMING SOON</Badge>
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 opacity-70">
          <div className="flex flex-col lg:flex-row items-start gap-12">
            {/* Text side */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
                <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">Quant Module · Coming Soon</span>
              </div>
              <h2 id="quant-heading" className="text-[26px] sm:text-[32px] font-bold tracking-[-0.015em] mb-4 leading-tight">
                Find wallets with{' '}
                <span className="font-mono" style={{ color: '#e8a23d' }}>real edge.</span>
                <br />
                Not just winning streaks.
              </h2>
              <p className="text-jtp-textMuted text-[14px] leading-relaxed mb-6 max-w-lg">
                Most leaderboards rank by P&L — a noisy, luck-contaminated metric. JTradePilot's
                EdgeScore will rank by realized edge per trade with a 95% lower-confidence-bound
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

            {/* EdgeScore leaderboard mock — labelled as preview */}
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
                  <span className="font-mono text-[8px] bg-jtp-control text-jtp-textDim border border-jtp-borderStrong px-[5px] py-[1px]">PREVIEW</span>
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
                    className="flex items-center gap-2 px-3 py-2 border-b border-jtp-borderSubtle"
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
                  <span className="font-mono text-[8.5px] text-jtp-textFaint">Preview data · EdgeScore coming in a future release</span>
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
              className={[
                'bg-jtp-panel border border-jtp-border rounded-[2px] p-5',
                !step.live && 'opacity-55',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ borderTop: step.live ? '2px solid rgba(232,162,61,0.35)' : '2px solid rgba(232,162,61,0.12)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div
                  className="font-mono font-bold text-[28px] leading-none tabular-nums"
                  style={{ color: step.live ? 'rgba(232,162,61,0.4)' : 'rgba(232,162,61,0.2)' }}
                  aria-hidden="true"
                >
                  {step.n}
                </div>
                {!step.live && (
                  <Badge variant="neutral" size="xs" className="mt-1.5">SOON</Badge>
                )}
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
        id="pricing-teaser"
        className="border-y border-jtp-border bg-jtp-panel"
        aria-labelledby="pricing-teaser-heading"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: '#e8a23d' }}>▸</span>
            <span className="font-mono text-[10.5px] text-jtp-textDim tracking-[0.14em] uppercase">PRICING</span>
          </div>
          <h2 id="pricing-teaser-heading" className="text-[26px] sm:text-[30px] font-bold tracking-[-0.015em] mb-3">
            Free during beta. Full journal, no card.
          </h2>
          <p className="text-jtp-textMuted text-[15px] leading-relaxed mb-2 max-w-xl mx-auto">
            The complete trading journal and analytics are free — no credit card, no trial timer.
            A Pro tier with Quant intelligence, AI agent, and execution is coming. You will
            receive advance notice before any charges apply.
          </p>
          <p className="font-mono text-[11px] text-jtp-textDim mb-8">
            Planned Pro: $5.99 / month · $60.00 / year · Cancel anytime
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
              See full pricing details →
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
              Stop journaling in spreadsheets. Stop guessing at your edge. Start with a free
              terminal built for the way serious prop-firm traders actually work.
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
