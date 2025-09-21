import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { DashboardView, SettingsSubView } from '../pages/DashboardPage';

interface ViewContextType {
  currentView: DashboardView;
  currentSubView: SettingsSubView;
  navigateTo: (view: DashboardView, subView?: SettingsSubView) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
  const [currentSubView, setCurrentSubView] = useState<SettingsSubView>('accounts');

  const navigateTo = useCallback((view: DashboardView, subView?: SettingsSubView) => {
    console.log('[ViewContext] Navigating to:', { view, subView });
    setCurrentView(view);
    if (subView) {
      setCurrentSubView(subView);
    } else if (view !== 'settings') {
      // Reset sub-view to default if we navigate to a non-settings top-level view
      setCurrentSubView('accounts');
    }
  }, []);

  const value = {
    currentView,
    currentSubView,
    navigateTo,
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};