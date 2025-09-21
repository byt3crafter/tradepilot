import React, { createContext, useState, useContext, ReactNode } from 'react';

interface SubscriptionContextType {
  isUpgradeModalOpen: boolean;
  showUpgradeModal: () => void;
  hideUpgradeModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const showUpgradeModal = () => setIsUpgradeModalOpen(true);
  const hideUpgradeModal = () => setIsUpgradeModalOpen(false);

  const value = {
    isUpgradeModalOpen,
    showUpgradeModal,
    hideUpgradeModal,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};