import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TradeJournal from '../components/TradeJournal';
import PersonalisationPage from './PersonalisationPage';
import SettingsPage from './SettingsPage';
import StrategiesPage from './StrategiesPage';
import { MenuIcon } from '../components/icons/MenuIcon';

export type DashboardView = 'journal' | 'strategies' | 'personalisation' | 'settings';

const DashboardPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<DashboardView>('journal');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'strategies':
        return <StrategiesPage />;
      case 'personalisation':
        return <PersonalisationPage />;
      case 'settings':
        return <SettingsPage />;
      case 'journal':
      default:
        return <TradeJournal />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-future-dark text-future-light">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="md:pl-64 transition-all duration-300 ease-in-out">
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
    </div>
  );
};

export default DashboardPage;
