import React, { createContext, useState, useContext, ReactNode } from 'react';

interface SettingsContextType {
  enforceChecklist: boolean;
  setEnforceChecklist: (value: boolean) => void;
  lowPerformanceMode: boolean;
  setLowPerformanceMode: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getInitialChecklistState = (): boolean => {
  try {
    const item = window.localStorage.getItem('tradePilotSettings.enforceChecklist');
    return item ? JSON.parse(item) : true;
  } catch (error) {
    console.error('Error reading from localStorage', error);
    return true;
  }
};

const getInitialPerformanceState = (): boolean => {
  try {
    const item = window.localStorage.getItem('lowPerformanceMode');
    return item === 'true';
  } catch (error) {
    console.error('Error reading from localStorage', error);
    return false;
  }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [enforceChecklist, setEnforceChecklistState] = useState<boolean>(getInitialChecklistState);
  const [lowPerformanceMode, setLowPerformanceModeState] = useState<boolean>(getInitialPerformanceState);

  const setEnforceChecklist = (value: boolean) => {
    try {
      setEnforceChecklistState(value);
      window.localStorage.setItem('tradePilotSettings.enforceChecklist', JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  };

  const setLowPerformanceMode = (value: boolean) => {
    try {
      setLowPerformanceModeState(value);
      window.localStorage.setItem('lowPerformanceMode', String(value));
      // Force reload to apply changes to global scripts if needed, or just let the user know
      // For now, we just set it. The index.html script reads it on load/route change.
      // To make it instant for the background, we can call the global function if it exists.
      const win = window as any;
      if (win.showAnimatedBackground) {
        // If enabling low performance (value=true), hide background.
        // If disabling (value=false), show background ONLY if on landing page.
        if (value) {
          win.showAnimatedBackground(false);
        } else if (window.location.pathname === '/') {
          win.showAnimatedBackground(true);
        }
      }
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  };

  const value = {
    enforceChecklist,
    setEnforceChecklist,
    lowPerformanceMode,
    setLowPerformanceMode,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};