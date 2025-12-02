import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { BrokerAccount, ObjectiveProgress, SmartLimitProgress } from '../types';
import { useAuth } from './AuthContext';

interface AccountContextType {
  accounts: BrokerAccount[];
  activeAccount: BrokerAccount | null;
  objectivesProgress: ObjectiveProgress[] | null;
  smartLimitsProgress: SmartLimitProgress | null;
  isLoading: boolean;
  isServerOffline: boolean;
  createAccount: (data: Partial<BrokerAccount>) => Promise<void>;
  updateAccount: (id: string, data: Partial<BrokerAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  switchAccount: (id: string) => void;
  refreshAccounts: () => Promise<void>;
  refreshObjectives: () => Promise<void>;
  refreshSmartLimitsProgress: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, getToken } = useAuth();
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<BrokerAccount | null>(null);
  const [objectivesProgress, setObjectivesProgress] = useState<ObjectiveProgress[] | null>(null);
  const [smartLimitsProgress, setSmartLimitsProgress] = useState<SmartLimitProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isServerOffline, setIsServerOffline] = useState(false);

  const refreshObjectives = useCallback(async () => {
    const token = await getToken();
    if (activeAccount && activeAccount.objectives?.isEnabled && token) {
        try {
            const progress = await api.getObjectivesProgress(activeAccount.id, token);
            setObjectivesProgress(progress);
        } catch (error) {
            console.error("Failed to fetch objectives progress", error);
            setObjectivesProgress(null);
        }
    } else {
        setObjectivesProgress(null);
    }
  }, [activeAccount, getToken]);

  const refreshSmartLimitsProgress = useCallback(async () => {
    const token = await getToken();
    if (activeAccount && activeAccount.smartLimits?.isEnabled && token) {
        try {
            const progress = await api.getSmartLimitsProgress(activeAccount.id, token);
            setSmartLimitsProgress(progress);
        } catch (error) {
            console.error("Failed to fetch smart limits progress", error);
            setSmartLimitsProgress(null);
        }
    } else {
        setSmartLimitsProgress(null);
    }
  }, [activeAccount, getToken]);

  const refreshAccounts = useCallback(async () => {
    if (isAuthenticated) {
      setIsLoading(true);
      setIsServerOffline(false);
      try {
        const token = await getToken();
        if (!token) {
            setAccounts([]);
            setActiveAccount(null);
            setIsLoading(false);
            return;
        }
        
        const fetchedAccounts = await api.getAccounts(token);
        setAccounts(fetchedAccounts);
        
        const lastActiveId = localStorage.getItem('activeAccountId');
        const accountToActivate = fetchedAccounts.find(acc => acc.id === lastActiveId) || fetchedAccounts[0] || null;
        setActiveAccount(accountToActivate);

      } catch (error: any) {
        console.error("Failed to fetch broker accounts", error);
        setAccounts([]);
        setActiveAccount(null);
        // Check for network error / connection refused
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network request failed'))) {
            setIsServerOffline(true);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setAccounts([]);
      setActiveAccount(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, getToken]);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);
  
  useEffect(() => {
    refreshObjectives();
    refreshSmartLimitsProgress();
  }, [activeAccount, refreshObjectives, refreshSmartLimitsProgress]);

  const switchAccount = (id: string) => {
    const newActiveAccount = accounts.find(acc => acc.id === id);
    if (newActiveAccount) {
      setActiveAccount(newActiveAccount);
      localStorage.setItem('activeAccountId', id);
    }
  };
  
  const createAccount = async (data: Partial<BrokerAccount>) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.createAccount(data, token);
    await refreshAccounts();
  };

  const updateAccount = async (id: string, data: Partial<BrokerAccount>) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.updateAccount(id, data, token);
    await refreshAccounts();
  };
  
  const deleteAccount = async (id: string) => {
     const token = await getToken();
     if (!token) throw new Error("Not authenticated");
     await api.deleteAccount(id, token);
     await refreshAccounts();
  };

  const value = {
    accounts,
    activeAccount,
    objectivesProgress,
    smartLimitsProgress,
    isLoading,
    isServerOffline,
    createAccount,
    updateAccount,
    deleteAccount,
    switchAccount,
    refreshAccounts,
    refreshObjectives,
    refreshSmartLimitsProgress,
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