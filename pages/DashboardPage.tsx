import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TradeJournal from '../components/TradeJournal';
import PersonalisationPage from './PersonalisationPage';
import SettingsPage from './SettingsPage';
import StrategiesPage from './StrategiesPage';
import { MenuIcon } from '../components/icons/MenuIcon';
import TrialBanner from '../components/billing/TrialBanner';
import { useAuth } from '../context/AuthContext';
import UpgradeModal from '../components/billing/UpgradeModal';
import { useView } from '../context/ViewContext';
import SubscriptionPage from './SubscriptionPage';
import Dashboard from '../components/Dashboard/Dashboard';
import { useUI } from '../context/UIContext';

export type DashboardView = 'dashboard' | 'journal' | 'strategies' | 'personalisation' | 'settings' | 'subscription';
export type SettingsSubView = 'accounts' | 'checklist' | 'security';

const DashboardPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isTrialing } = useAuth();
  const { currentView } = useView();
  const { isSidebarCollapsed } = useUI();

  const renderView = () => {
    switch (currentView) {
      case 'journal':
        return <TradeJournal />;
      case 'strategies':
        return <StrategiesPage />;
      case 'personalisation':
        return <PersonalisationPage />;
      case 'settings':
        return <SettingsPage />;
      case 'subscription':
        return <SubscriptionPage />;
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
      <div className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-56'}`}>
        {isTrialing && <TrialBanner />}
        <main className="p-4 sm:p-6 lg:p-8">
           <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-1 mb-4 rounded-md text-future-gray hover:bg-future-panel"
            aria-label="Open sidebar"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          {renderView()}
        </main>
      </div>
      <UpgradeModal />
    </div>
  );
};

export default DashboardPage;
