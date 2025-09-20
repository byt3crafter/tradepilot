import React, { createContext, useState, useContext, ReactNode } from 'react';

interface SettingsContextType {
  enforceChecklist: boolean;
  setEnforceChecklist: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getInitialState = (): boolean => {
  try {
    const item = window.localStorage.getItem('tradePilotSettings.enforceChecklist');
    // Default to true to encourage good trading habits
    return item ? JSON.parse(item) : true;
  } catch (error) {
    console.error('Error reading from localStorage', error);
    return true;
  }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [enforceChecklist, setEnforceChecklistState] = useState<boolean>(getInitialState);

  const setEnforceChecklist = (value: boolean) => {
    try {
      setEnforceChecklistState(value);
      window.localStorage.setItem('tradePilotSettings.enforceChecklist', JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  };

  const value = {
    enforceChecklist,
    setEnforceChecklist,
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