import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import TradeJournal from '../components/TradeJournal';
import PersonalisationPage from './PersonalisationPage';
import SettingsPage from './SettingsPage';
import PlaybooksPage from './PlaybooksPage';
import { MenuIcon } from '../components/icons/MenuIcon';
import { useAuth } from '../context/AuthContext';
import UpgradeModal from '../components/billing/UpgradeModal';
import { useView } from '../context/ViewContext';
import SubscriptionPage from './SubscriptionPage';
import PricingPage from './PricingPage';
import Dashboard from '../components/Dashboard/Dashboard';
import { useUI } from '../context/UIContext';
import AnalyticsPage from './AnalyticsPage';
import NotebookPage from './NotebookPage';
import MobileProfileMenu from '../components/ui/MobileProfileMenu';
import { useTrade } from '../context/TradeContext';
import BotPage from './BotPage';
import QuantPage from './QuantPage';
import CryptoPage from './CryptoPage';
import Copilot from '../components/ai/Copilot';
import StatusBar from '../components/StatusBar';

export type DashboardView =
  | 'dashboard'
  | 'journal'
  | 'notebook'
  | 'playbooks'
  | 'analytics'
  | 'quant'
  | 'crypto'
  | 'personalisation'
  | 'settings'
  | 'subscription'
  | 'pricing'
  | 'bot';

export type SettingsSubView = 'profile' | 'accounts' | 'checklist' | 'security' | 'assets' | 'billing' | 'ai';

const VIEW_META: Record<DashboardView, { title: string; subtitle: string }> = {
  dashboard:        { title: 'Dashboard',       subtitle: 'Account & rule status' },
  journal:          { title: 'Journal',         subtitle: 'Log · review · learn' },
  notebook:         { title: 'Notebook',        subtitle: 'Daily reflections & notes' },
  analytics:        { title: 'Analytics',       subtitle: 'What your edge is made of' },
  playbooks:        { title: 'Playbooks',       subtitle: 'Your setups, measured' },
  quant:            { title: 'Quant',           subtitle: 'Polymarket wallet intelligence' },
  crypto:           { title: 'Crypto',          subtitle: 'Multi-exchange trading engine' },
  settings:         { title: 'Settings',        subtitle: 'Profile & configuration' },
  personalisation:  { title: 'Personalisation', subtitle: '' },
  subscription:     { title: 'Subscription',    subtitle: '' },
  pricing:          { title: 'Pricing',         subtitle: '' },
  bot:              { title: 'Bot',             subtitle: 'AI trading automation' },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <circle cx="6.5" cy="6.5" r="4" />
    <line x1="9.5" y1="9.5" x2="13" y2="13" strokeLinecap="round" />
  </svg>
);

// ── App-level top command bar (52 px) ─────────────────────────────────────────

const AppTopBar: React.FC = () => {
  const { currentView, navigateTo } = useView();
  const { requestAddTradeModalOpen } = useUI();
  const { closedTrades } = useTrade();
  const { quantEnabled } = useAuth();

  const handleConnectWallet = () => {
    try { localStorage.setItem('jtp.quantMode', 'trade'); } catch { /* ignore */ }
    navigateTo('quant');
    window.dispatchEvent(new CustomEvent('jtp:quant-trade'));
  };

  const meta = VIEW_META[currentView] ?? VIEW_META.dashboard;

  const dateRange = useMemo(() => {
    const dated = closedTrades.filter(t => t.exitDate);
    if (dated.length === 0) return null;
    const times = dated.map(t => new Date(t.exitDate!).getTime());
    const earliest = new Date(Math.min(...times));
    const latest   = new Date(Math.max(...times));
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const year = latest.getFullYear();
    if (earliest.getFullYear() !== latest.getFullYear()) {
      return `${fmt(earliest)}, ${earliest.getFullYear()} – ${fmt(latest)}, ${year}`;
    }
    return `${fmt(earliest)} – ${fmt(latest)}, ${year}`;
  }, [closedTrades]);

  const handleLogTrade = () => {
    requestAddTradeModalOpen();
    navigateTo('journal');
  };

  return (
    <header
      className="flex-shrink-0 h-topbar border-b border-jtp-border bg-jtp-shell flex items-center px-5 gap-3"
      style={{ minHeight: '52px', maxHeight: '52px' }}
    >
      {/* Section title */}
      <div className="flex items-center gap-[10px] min-w-0">
        <span className="text-jtp-xl font-bold text-jtp-text truncate font-mono tracking-[0.02em]">
          <span style={{ color: '#e8a23d' }}>▸</span>{' '}{meta.title}
        </span>
        {meta.subtitle && (
          <span className="text-jtp-sm text-jtp-textDim hidden sm:block flex-shrink-0">
            {meta.subtitle}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Command / search trigger — visual affordance; Wave 2 wires up actual search */}
      <button
        className="hidden lg:flex items-center gap-[8px] px-[10px] py-[6px] bg-jtp-active border border-jtp-borderStrong rounded-jtp-xl text-jtp-textDim text-jtp-sm hover:border-jtp-borderFocus hover:text-jtp-textMuted transition-colors"
        title="Search or run a command (coming soon)"
        aria-label="Search or run a command"
        onClick={() => {/* Wave 2: open command palette */}}
      >
        <SearchIcon className="w-3 h-3" />
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', letterSpacing: '0.05em' }}>
          &gt; SEARCH OR JUMP TO...
        </span>
        <kbd
          className="ml-2 flex items-center gap-[2px] text-jtp-textDim font-mono"
          style={{ fontSize: '9px', letterSpacing: '0.1em' }}
          aria-hidden="true"
        >
          ⌘K
        </kbd>
      </button>

      {/* Date range chip */}
      {dateRange && (
        <div className="flex items-center gap-[7px] px-[10px] py-[6px] bg-jtp-active border border-jtp-borderStrong rounded-jtp-xl text-jtp-textDim text-jtp-sm hidden md:flex flex-shrink-0">
          <span className="w-[5px] h-[5px] rounded-full bg-jtp-profitDot flex-shrink-0" />
          <span className="font-mono text-jtp-xs-plus" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {dateRange}
          </span>
        </div>
      )}

      {/* Connect Wallet — only when the Quant module is enabled */}
      {quantEnabled && (
        <button
          onClick={handleConnectWallet}
          className="flex items-center gap-[6px] px-[13px] py-[7px] bg-jtp-active hover:bg-jtp-activeHover text-jtp-amber font-mono font-bold tracking-wider uppercase text-[11px] rounded-[2px] border border-jtp-amber/40 cursor-pointer transition-colors flex-shrink-0"
          aria-label="Go to Polymarket trading"
          title="Open the Polymarket trading panel"
        >
          <span className="hidden sm:inline">POLYMARKET</span>
          <span className="sm:hidden">Trade</span>
        </button>
      )}

      {/* Log Trade */}
      <button
        onClick={handleLogTrade}
        className="flex items-center gap-[6px] px-[13px] py-[7px] bg-jtp-blue hover:bg-jtp-blueHover text-[#08090b] font-mono font-bold tracking-wider uppercase text-[11px] rounded-[2px] border-none cursor-pointer transition-colors flex-shrink-0"
        aria-label="Log a new trade"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Log Trade</span>
      </button>
    </header>
  );
};

// ── Main shell ────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isSubscribed } = useAuth();
  const { currentView, navigateTo } = useView();
  const { isSidebarCollapsed } = useUI();

  React.useEffect(() => {
    if (!isSubscribed) {
      const intendedPlan = localStorage.getItem('intendedPlan');
      if (intendedPlan && (intendedPlan === 'monthly' || intendedPlan === 'yearly')) {
        navigateTo('pricing');
      }
    } else if (currentView === 'pricing') {
      navigateTo('dashboard');
    }
  }, [navigateTo, isSubscribed, currentView]);

  const renderView = () => {
    if (!isSubscribed) {
      if (currentView === 'pricing') return <PricingPage />;
      if (currentView === 'settings') return <SettingsPage />;
      return <PricingPage />;
    }

    switch (currentView) {
      case 'journal':          return <TradeJournal />;
      case 'notebook':         return <NotebookPage />;
      case 'playbooks':        return <PlaybooksPage />;
      case 'analytics':        return <AnalyticsPage />;
      case 'quant':            return <QuantPage />;
      case 'crypto':           return <CryptoPage />;
      case 'personalisation':  return <PersonalisationPage />;
      case 'settings':         return <SettingsPage />;
      case 'subscription':     return <SubscriptionPage />;
      case 'pricing':          return <PricingPage />;
      case 'bot':              return <BotPage />;
      case 'dashboard':
      default:                 return <Dashboard />;
    }
  };

  // Sidebar offset: 228px expanded, w-16 (64px) collapsed
  const mainMargin = isSidebarCollapsed ? 'md:ml-16' : 'md:ml-[228px]';

  return (
    /*
     * Outer: flex-col so we can stack [app body] + [status bar]
     * StatusBar is flex-shrink-0 at the bottom, always visible
     */
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-jtp-bg text-jtp-text">

      {/* ── App body row: sidebar (fixed) + main column ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main column */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${mainMargin}`}
        >
          {/* Mobile header */}
          <header className="flex-shrink-0 p-4 md:hidden border-b border-jtp-border flex items-center justify-between bg-jtp-shell">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/JTP_logo.png" alt="JTP Logo" className="h-5 w-auto" />
              <span
                className="font-semibold text-jtp-lg text-jtp-text"
                style={{ letterSpacing: '-0.2px' }}
              >
                JTradePilot
              </span>
            </a>
            <div className="flex items-center gap-3">
              <MobileProfileMenu />
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1 rounded-jtp-xl text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text transition-colors"
                aria-label="Open navigation sidebar"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Desktop top command bar */}
          <div className="hidden md:block flex-shrink-0">
            <AppTopBar />
          </div>

          {/* Scrollable view content */}
          <main
            className="flex-1 overflow-y-auto bg-jtp-bg"
            id="main-content"
            tabIndex={-1}
          >
            <div className="px-5 py-[18px] pb-10 min-h-full">
              {renderView()}
            </div>
          </main>
        </div>
      </div>

      {/* ── Status bar — full width, always visible at bottom ── */}
      <StatusBar />

      {/* ── Portals / overlays (rendered outside layout flow) ── */}
      <UpgradeModal />
      {isSubscribed && <Copilot />}
    </div>
  );
};

export default DashboardPage;
