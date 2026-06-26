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

export type DashboardView =
  | 'dashboard'
  | 'journal'
  | 'notebook'
  | 'playbooks'
  | 'analytics'
  | 'personalisation'
  | 'settings'
  | 'subscription'
  | 'pricing';

export type SettingsSubView = 'profile' | 'accounts' | 'checklist' | 'security' | 'assets' | 'billing';

const VIEW_META: Record<DashboardView, { title: string; subtitle: string }> = {
  dashboard:        { title: 'Dashboard',   subtitle: 'Account & rule status' },
  journal:          { title: 'Journal',     subtitle: 'Log, review, learn' },
  notebook:         { title: 'Notebook',    subtitle: 'Daily reflections & notes' },
  analytics:        { title: 'Analytics',   subtitle: 'What your edge is made of' },
  playbooks:        { title: 'Playbooks',   subtitle: 'Your setups, measured' },
  settings:         { title: 'Settings',    subtitle: 'Profile & configuration' },
  personalisation:  { title: 'Personalisation', subtitle: '' },
  subscription:     { title: 'Subscription', subtitle: '' },
  pricing:          { title: 'Pricing',     subtitle: '' },
};

// Small "+" icon inline SVG
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);

// App-level topbar (52 px)
const AppTopBar: React.FC = () => {
  const { currentView, navigateTo } = useView();
  const { requestAddTradeModalOpen } = useUI();
  const { closedTrades } = useTrade();

  const meta = VIEW_META[currentView] ?? VIEW_META.dashboard;

  const dateRange = useMemo(() => {
    const dated = closedTrades.filter(t => t.exitDate);
    if (dated.length === 0) return null;
    const times = dated.map(t => new Date(t.exitDate!).getTime());
    const earliest = new Date(Math.min(...times));
    const latest = new Date(Math.max(...times));
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
      className="flex-shrink-0 h-topbar border-b border-jtp-border bg-jtp-shell flex items-center px-5 gap-4"
      style={{ minHeight: '52px', maxHeight: '52px' }}
    >
      {/* Title */}
      <div
        className="text-jtp-xl font-semibold text-jtp-text"
        style={{ letterSpacing: '-0.2px' }}
      >
        {meta.title}
      </div>

      {/* Subtitle */}
      {meta.subtitle && (
        <div className="text-jtp-sm text-jtp-textDim hidden sm:block">
          {meta.subtitle}
        </div>
      )}

      <div className="flex-1" />

      {/* Date range chip */}
      {dateRange && (
        <div className="flex items-center gap-[8px] px-[11px] py-[6px] bg-jtp-active border border-jtp-borderStrong rounded-jtp-xl text-jtp-textDim text-jtp-sm hidden md:flex">
          <span className="w-[6px] h-[6px] rounded-full bg-jtp-profitDot flex-shrink-0" />
          <span className="font-mono">{dateRange}</span>
        </div>
      )}

      {/* Log Trade */}
      <button
        onClick={handleLogTrade}
        className="flex items-center gap-[7px] px-[14px] py-[8px] bg-jtp-blue hover:bg-jtp-blueHover text-white font-semibold text-jtp-base rounded-jtp-xl border-none cursor-pointer transition-colors"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        <span>Log Trade</span>
      </button>
    </header>
  );
};

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
      case 'personalisation':  return <PersonalisationPage />;
      case 'settings':         return <SettingsPage />;
      case 'subscription':     return <SubscriptionPage />;
      case 'pricing':          return <PricingPage />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  // Sidebar offset: 228px when expanded, 64px (Tailwind w-16) when collapsed
  const mainMargin = isSidebarCollapsed ? 'md:ml-16' : 'md:ml-[228px]';

  return (
    <div className="fixed inset-0 w-full h-full flex overflow-hidden bg-jtp-bg text-jtp-text">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main column */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${mainMargin}`}>

        {/* Mobile header */}
        <header className="flex-shrink-0 p-4 md:hidden border-b border-jtp-border flex items-center justify-between bg-jtp-shell">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/JTP_logo.png" alt="JTP Logo" className="h-5 w-auto" />
            <span className="font-semibold text-jtp-lg text-jtp-text" style={{ letterSpacing: '-0.2px' }}>
              JTradePilot
            </span>
          </a>
          <div className="flex items-center gap-3">
            <MobileProfileMenu />
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 rounded-jtp-xl text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text transition-colors"
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Desktop topbar */}
        <div className="hidden md:block">
          <AppTopBar />
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-jtp-bg">
          <div className="px-5 py-[18px] pb-8 min-h-full">
            {renderView()}
          </div>
        </main>
      </div>

      <UpgradeModal />
    </div>
  );
};

export default DashboardPage;
