import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { BrokerAccount } from '../types';
import { useAuth } from './AuthContext';

interface AccountContextType {
  accounts: BrokerAccount[];
  activeAccount: BrokerAccount | null;
  isLoading: boolean;
  createAccount: (data: Omit<BrokerAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentBalance'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<BrokerAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  switchAccount: (id: string) => void;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<BrokerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    if (isAuthenticated && accessToken) {
      setIsLoading(true);
      try {
        const fetchedAccounts = await api.getAccounts(accessToken);
        setAccounts(fetchedAccounts);
        
        const lastActiveId = localStorage.getItem('activeAccountId');
        const accountToActivate = fetchedAccounts.find(acc => acc.id === lastActiveId) || fetchedAccounts[0] || null;
        setActiveAccount(accountToActivate);

      } catch (error) {
        console.error("Failed to fetch broker accounts", error);
        setAccounts([]);
        setActiveAccount(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setAccounts([]);
      setActiveAccount(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  const switchAccount = (id: string) => {
    const newActiveAccount = accounts.find(acc => acc.id === id);
    if (newActiveAccount) {
      setActiveAccount(newActiveAccount);
      localStorage.setItem('activeAccountId', id);
    }
  };
  
  const createAccount = async (data: Omit<BrokerAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentBalance'>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.createAccount(data, accessToken);
    await refreshAccounts();
  };

  const updateAccount = async (id: string, data: Partial<BrokerAccount>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateAccount(id, data, accessToken);
    await refreshAccounts();
  };
  
  const deleteAccount = async (id: string) => {
     if (!accessToken) throw new Error("Not authenticated");
     await api.deleteAccount(id, accessToken);
     await refreshAccounts();
  };

  const value = {
    accounts,
    activeAccount,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    switchAccount,
    refreshAccounts,
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
