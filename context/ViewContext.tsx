import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { DashboardView, SettingsSubView } from '../pages/DashboardPage';

interface ViewContextType {
  currentView: DashboardView;
  currentSubView: SettingsSubView;
  navigateTo: (view: DashboardView, subView?: SettingsSubView) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

  // Persist the current page across refreshes (the app has no router, so without this
  // a refresh always drops back to the dashboard).
  const [currentView, setCurrentView] = useState<DashboardView>(() => {
    try { return (localStorage.getItem('jtp.view') as DashboardView) || 'dashboard'; } catch { return 'dashboard'; }
  });
  const [currentSubView, setCurrentSubView] = useState<SettingsSubView>(() => {
    try { return (localStorage.getItem('jtp.subView') as SettingsSubView) || 'accounts'; } catch { return 'accounts'; }
  });

  const navigateTo = useCallback((view: DashboardView, subView?: SettingsSubView) => {
    setCurrentView(view);
    try { localStorage.setItem('jtp.view', view); } catch { /* ignore */ }
    if (subView) {
      setCurrentSubView(subView);
      try { localStorage.setItem('jtp.subView', subView); } catch { /* ignore */ }
    } else if (view !== 'settings') {
      // Reset sub-view to default if we navigate to a non-settings top-level view
      setCurrentSubView('accounts');
      try { localStorage.setItem('jtp.subView', 'accounts'); } catch { /* ignore */ }
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
