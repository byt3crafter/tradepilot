/**
 * MarketingNav — sticky terminal-flavored nav for public marketing pages.
 *
 * Used on LandingPage and PublicPricingPage. Accepts optional callbacks for
 * the primary CTAs (Start free / Sign in) so the landing page can use its
 * `navigate` prop directly. Falls back to href navigation when no callbacks
 * are provided (pricing page scenario).
 */
import React, { useState } from 'react';
import PublicLink from '../PublicLink';
import { MenuIcon } from '../icons/MenuIcon';
import { XIcon } from '../icons/XIcon';

interface MarketingNavProps {
  onSignup?: () => void;
  onLogin?: () => void;
}

const MarketingNav: React.FC<MarketingNavProps> = ({ onSignup, onLogin }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSignup = () => {
    setMobileOpen(false);
    onSignup?.();
  };

  const handleLogin = () => {
    setMobileOpen(false);
    onLogin?.();
  };

  return (
    <nav
      className="sticky top-0 z-50 bg-jtp-shell border-b border-jtp-border"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <PublicLink
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue rounded-[2px]"
          aria-label="JTradePilot — home"
        >
          {/* Amber brand mark */}
          <div
            className="w-7 h-7 rounded-[2px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #e8a23d 0%, #c47e1e 100%)' }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
              <polyline points="2,14 7,8 11,11 18,4" stroke="#08090b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="4" r="1.8" fill="#08090b" />
            </svg>
          </div>

          {/* Brand text */}
          <div className="flex flex-col leading-none">
            <span className="font-mono font-bold text-jtp-text text-[13px] tracking-[0.03em]">
              JTradePilot
            </span>
            <span
              className="font-mono text-[8px] tracking-[0.18em] uppercase"
              style={{ color: '#e8a23d' }}
            >
              PRO TRADING TERMINAL
            </span>
          </div>
        </PublicLink>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scrollTo('features')}
            className="font-mono text-[11.5px] text-jtp-textMuted hover:text-jtp-text px-3 py-1.5 rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
          >
            FEATURES
          </button>
          <button
            onClick={() => scrollTo('quant')}
            className="font-mono text-[11.5px] text-jtp-textMuted hover:text-jtp-text px-3 py-1.5 rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
          >
            QUANT
          </button>
          <PublicLink
            href="/pricing"
            className="font-mono text-[11.5px] text-jtp-textMuted hover:text-jtp-text px-3 py-1.5 rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
          >
            PRICING
          </PublicLink>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          {onLogin ? (
            <button
              onClick={handleLogin}
              className="font-mono text-[11px] text-jtp-textMuted hover:text-jtp-text px-3 py-[7px] border border-jtp-borderStrong hover:border-jtp-borderHover rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
            >
              SIGN IN
            </button>
          ) : (
            <PublicLink
              href="/login"
              className="font-mono text-[11px] text-jtp-textMuted hover:text-jtp-text px-3 py-[7px] border border-jtp-borderStrong hover:border-jtp-borderHover rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
            >
              SIGN IN
            </PublicLink>
          )}

          {onSignup ? (
            <button
              onClick={handleSignup}
              className="font-mono text-[11px] font-bold uppercase tracking-wider px-4 py-[7px] rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
              style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ffb838')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e8a23d')}
            >
              START FREE →
            </button>
          ) : (
            <PublicLink
              href="/signup"
              className="font-mono text-[11px] font-bold uppercase tracking-wider px-4 py-[7px] rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
              style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
            >
              START FREE →
            </PublicLink>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-jtp-textMuted hover:text-jtp-text p-2 rounded-[2px] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-jtp-blue"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden fixed inset-0 z-50 bg-jtp-bg flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {/* Mobile header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-jtp-border bg-jtp-shell">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-[2px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #e8a23d 0%, #c47e1e 100%)' }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
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
            <button
              onClick={() => setMobileOpen(false)}
              className="text-jtp-textMuted hover:text-jtp-text p-2 rounded-[2px] transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile links */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            <button
              onClick={() => scrollTo('features')}
              className="block w-full text-left font-mono text-[13px] text-jtp-textMuted hover:text-jtp-text px-3 py-3 border-b border-jtp-borderSubtle transition-colors cursor-pointer"
            >
              FEATURES
            </button>
            <button
              onClick={() => scrollTo('quant')}
              className="block w-full text-left font-mono text-[13px] text-jtp-textMuted hover:text-jtp-text px-3 py-3 border-b border-jtp-borderSubtle transition-colors cursor-pointer"
            >
              QUANT
            </button>
            <PublicLink
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="block font-mono text-[13px] text-jtp-textMuted hover:text-jtp-text px-3 py-3 border-b border-jtp-borderSubtle transition-colors"
            >
              PRICING
            </PublicLink>

            <div className="pt-6 space-y-3">
              {onLogin ? (
                <button
                  onClick={handleLogin}
                  className="block w-full text-center font-mono text-[12px] text-jtp-text px-4 py-3 border border-jtp-borderStrong rounded-[2px] transition-colors hover:bg-jtp-hover cursor-pointer"
                >
                  SIGN IN
                </button>
              ) : (
                <PublicLink
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center font-mono text-[12px] text-jtp-text px-4 py-3 border border-jtp-borderStrong rounded-[2px] transition-colors hover:bg-jtp-hover"
                >
                  SIGN IN
                </PublicLink>
              )}
              {onSignup ? (
                <button
                  onClick={handleSignup}
                  className="block w-full text-center font-mono text-[12px] font-bold uppercase tracking-wider px-4 py-3 rounded-[2px] transition-colors cursor-pointer"
                  style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
                >
                  START FREE →
                </button>
              ) : (
                <PublicLink
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center font-mono text-[12px] font-bold uppercase tracking-wider px-4 py-3 rounded-[2px] transition-colors"
                  style={{ backgroundColor: '#e8a23d', color: '#08090b' }}
                >
                  START FREE →
                </PublicLink>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default MarketingNav;
