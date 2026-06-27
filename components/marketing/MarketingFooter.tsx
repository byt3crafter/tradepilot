/**
 * MarketingFooter — terminal-flavored footer for public marketing pages.
 *
 * Consistent across LandingPage and PublicPricingPage. Contains link columns,
 * social links, and an honest legal disclaimer (no fabricated social proof).
 */
import React from 'react';
import PublicLink from '../PublicLink';

const MarketingFooter: React.FC = () => {
  return (
    <footer className="border-t border-jtp-border bg-jtp-shell mt-0">
      {/* Top footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-[2px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #e8a23d 0%, #c47e1e 100%)' }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                  <polyline points="2,14 7,8 11,11 18,4" stroke="#08090b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="18" cy="4" r="1.8" fill="#08090b" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-mono font-bold text-jtp-text text-[13px]">JTradePilot</span>
                <span className="font-mono text-[8px] tracking-[0.18em] uppercase" style={{ color: '#e8a23d' }}>
                  PRO TRADING TERMINAL
                </span>
              </div>
            </div>
            <p className="text-jtp-textMuted text-[13px] leading-relaxed mb-4">
              The terminal for prop-firm traders and on-chain quants. Log trades, enforce rules, find edge.
            </p>
            {/* Social */}
            <a
              href="https://x.com/jtradepilot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-jtp-textMuted hover:text-jtp-text transition-colors duration-150"
              aria-label="JTradePilot on X (Twitter)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-mono text-[11px]">@jtradepilot</span>
            </a>
          </div>

          {/* Product column */}
          <div>
            <h3 className="jtp-label mb-4">PRODUCT</h3>
            <ul className="space-y-2.5">
              <li>
                <PublicLink href="/features" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Features
                </PublicLink>
              </li>
              <li>
                <PublicLink href="/pricing" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Pricing
                </PublicLink>
              </li>
              <li>
                <PublicLink href="/faq" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  FAQ
                </PublicLink>
              </li>
            </ul>
          </div>

          {/* Account column */}
          <div>
            <h3 className="jtp-label mb-4">ACCOUNT</h3>
            <ul className="space-y-2.5">
              <li>
                <PublicLink href="/signup" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Start free
                </PublicLink>
              </li>
              <li>
                <PublicLink href="/login" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Sign in
                </PublicLink>
              </li>
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h3 className="jtp-label mb-4">LEGAL</h3>
            <ul className="space-y-2.5">
              <li>
                <PublicLink href="/privacy" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Privacy Policy
                </PublicLink>
              </li>
              <li>
                <PublicLink href="/terms" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Terms of Service
                </PublicLink>
              </li>
              <li>
                <PublicLink href="/refund-policy" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Refund Policy
                </PublicLink>
              </li>
              <li>
                <PublicLink href="/risk-disclaimer" className="text-jtp-textMuted hover:text-jtp-text text-[13px] transition-colors duration-150">
                  Risk Disclaimer
                </PublicLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-jtp-border bg-jtp-statusbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="font-mono text-[10px] text-jtp-textDim tracking-[0.05em]">
              © 2026 JTradePilot.
            </p>
            {/* Mandatory risk disclaimer */}
            <p className="text-[11px] text-jtp-textFaint leading-relaxed max-w-xl text-left sm:text-right">
              Prediction markets and leveraged trading are high-risk activities. Past performance does not guarantee future results.
              This platform is a journaling and analytics tool — not financial advice. Trade responsibly.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
