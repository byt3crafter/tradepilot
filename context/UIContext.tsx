// @refresh full
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface UIContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>('sidebarCollapsed', false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, [setIsSidebarCollapsed]);

  const value = {
    isSidebarCollapsed,
    toggleSidebar,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
