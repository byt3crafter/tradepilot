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
import Dashboard from '../components/Dashboard/Dashboard';
import { useUI } from '../context/UIContext';
import AnalyticsPage from './AnalyticsPage';
import AnalysisPage from './AnalysisPage';

export type DashboardView = 'dashboard' | 'journal' | 'playbooks' | 'analytics' | 'personalisation' | 'settings' | 'subscription' | 'analysis-tracker';
export type SettingsSubView = 'accounts' | 'checklist' | 'security' | 'assets';

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
      case 'analysis-tracker':
        return user?.featureFlags?.analysisTrackerEnabled ? <AnalysisPage /> : <Dashboard />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-future-dark text-future-light">
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={`relative transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-56'}`}>
        {isTrialing && <TrialBanner />}

        <header className="p-4 md:hidden">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1 rounded-md text-future-gray hover:bg-future-panel"
            aria-label="Open sidebar"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          {renderView()}
        </main>
      </div>
      <UpgradeModal />
    </div>
  );
};

export default DashboardPage;