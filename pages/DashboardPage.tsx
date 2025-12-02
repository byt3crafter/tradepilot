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
    <div className="min-h-screen w-full text-white bg-transparent">
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* 
        Adjusted padding-left: 
        Sidebar is 16rem (64) expanded or 4rem (16) collapsed.
        We add generous padding to the main content to separate it nicely.
        Main content wrapper has a subtle border to define the workspace.
      */}
      <div className={`relative transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
        <div className="min-h-screen border-l border-white/5 bg-[#08090A]/40 backdrop-blur-[2px]">
            {isTrialing && <TrialBanner />}

            <header className="p-4 md:hidden border-b border-white/10 flex items-center justify-between bg-[#08090A]">
            <span className="font-medium text-sm">JTradePilot</span>
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1 rounded-md text-secondary hover:bg-white/5 hover:text-white"
                aria-label="Open sidebar"
            >
                <MenuIcon className="w-6 h-6" />
            </button>
            </header>
            
            <main className="p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto">
            {renderView()}
            </main>
        </div>
      </div>
      <UpgradeModal />
    </div>
  );
};

export default DashboardPage;