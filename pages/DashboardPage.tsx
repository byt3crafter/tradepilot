import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TradeJournal from '../components/TradeJournal';
import PersonalisationPage from './PersonalisationPage';
import SettingsPage from './SettingsPage';
import PlaybooksPage from './PlaybooksPage';
import { MenuIcon } from '../components/icons/MenuIcon';
import TrialBanner from '../components/billing/TrialBanner';
import { useAuth } from '../context/AuthContext';
import UpgradeModal from '../components/billing/UpgradeModal';
import { useView } from '../context/ViewContext';
import SubscriptionPage from './SubscriptionPage';
import PricingPage from './PricingPage';
import Dashboard from '../components/Dashboard/Dashboard';
import { useUI } from '../context/UIContext';
import AnalyticsPage from './AnalyticsPage';
import AnalysisPage from './AnalysisPage';

export type DashboardView = 'dashboard' | 'journal' | 'playbooks' | 'analytics' | 'personalisation' | 'settings' | 'subscription' | 'analysis-tracker' | 'pricing';
export type SettingsSubView = 'accounts' | 'checklist' | 'security' | 'assets' | 'billing';

const DashboardPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isTrialing } = useAuth();
  const { currentView } = useView();
  const { isSidebarCollapsed } = useUI();

  const renderView = () => {
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
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        {/* Trial Banner - fixed height, no scroll */}
        {isTrialing && <TrialBanner />}

        {/* Mobile header - fixed height, no scroll */}
        <header className="flex-shrink-0 p-4 md:hidden border-b border-white/10 flex items-center justify-between bg-[#08090A]">
          <span className="font-medium text-sm">JTradePilot</span>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1 rounded-md text-secondary hover:bg-white/5 hover:text-white"
            aria-label="Open sidebar"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto border-l border-white/5 bg-[#08090A]/40 backdrop-blur-[2px]">
          <div className="p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      <UpgradeModal />
    </div>
  );
};

export default DashboardPage;