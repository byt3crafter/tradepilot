// @refresh full
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface UIContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isAddTradeModalOpenRequest: boolean;
  requestAddTradeModalOpen: () => void;
  clearAddTradeModalRequest: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>('sidebarCollapsed', false);
  const [isAddTradeModalOpenRequest, setIsAddTradeModalOpenRequest] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, [setIsSidebarCollapsed]);

  const requestAddTradeModalOpen = useCallback(() => {
    setIsAddTradeModalOpenRequest(true);
  }, []);

  const clearAddTradeModalRequest = useCallback(() => {
    setIsAddTradeModalOpenRequest(false);
  }, []);

  const value = {
    isSidebarCollapsed,
    toggleSidebar,
    isAddTradeModalOpenRequest,
    requestAddTradeModalOpen,
    clearAddTradeModalRequest,
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