import React, { useState } from 'react';
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
import AnalysisPage from './AnalysisPage';
import { UserButton, useClerk } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import MobileProfileMenu from '../components/ui/MobileProfileMenu';

export type DashboardView = 'dashboard' | 'journal' | 'playbooks' | 'analytics' | 'personalisation' | 'settings' | 'subscription' | 'analysis-tracker' | 'pricing';
export type SettingsSubView = 'profile' | 'accounts' | 'checklist' | 'security' | 'assets' | 'billing';

const DashboardPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isTrialing, isSubscribed } = useAuth();
  const { currentView, navigateTo } = useView();
  const { isSidebarCollapsed } = useUI();
  const { openUserProfile } = useClerk();

  React.useEffect(() => {
    // Only redirect to pricing flow if NOT subscribed
    if (!isSubscribed) {
      const intendedPlan = localStorage.getItem('intendedPlan');
      if (intendedPlan && (intendedPlan === 'monthly' || intendedPlan === 'yearly')) {
        // Don't clear it here, let the PricingPage handle it to know which plan to select
        navigateTo('pricing');
      }
    } else if (currentView === 'pricing') {
      // If subscribed but stuck on pricing view, go to dashboard
      navigateTo('dashboard');
    }
  }, [navigateTo, isSubscribed, currentView]);



  // Protected Views: 'journal', 'playbooks', 'analytics', 'analysis-tracker', 'dashboard'
  // Allowed Views: 'pricing', 'subscription', 'settings' (limited)

  const renderView = () => {
    // strict paywall check
    if (!isSubscribed) {
      if (currentView === 'pricing') return <PricingPage />;
      // settings is allowed, but maybe we want to limit it? For now allow settings to manage billing.
      if (currentView === 'settings') return <SettingsPage />;
      // Default fallback for any other view is SubscriptionPage (Paywall)
      return <PricingPage />;
    }

    switch (currentView) {
      case 'journal':
        return <TradeJournal />;
      case 'playbooks':
        return <PlaybooksPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'personalisation':
        return <PersonalisationPage />;
      case 'settings':
        return <SettingsPage />;
      case 'subscription':
        return <SubscriptionPage />;
      case 'pricing':
        return <PricingPage />;
      case 'analysis-tracker':
        return user?.featureFlags?.analysisTrackerEnabled ? <AnalysisPage /> : <Dashboard />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full text-white bg-transparent flex">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content area with proper flex layout */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>

        {/* Mobile header - fixed height, no scroll */}
        <header className="flex-shrink-0 p-4 md:hidden border-b border-white/10 flex items-center justify-between bg-[#08090A]">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 w-auto" />
            <span className="font-orbitron font-bold text-sm">JTradePilot</span>
          </a>
          <div className="flex items-center gap-3">
            <MobileProfileMenu />
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 rounded-md text-secondary hover:bg-white/5 hover:text-white"
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto border-l border-white/5 bg-[#08090A]/95">
          <div className="p-4 md:p-12 lg:p-16 max-w-[1600px] mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      <UpgradeModal />
    </div>
  );
};

export default DashboardPage;