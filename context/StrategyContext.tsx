import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Strategy } from '../types';
import { useAuth } from './AuthContext';

interface StrategyContextType {
  strategies: Strategy[];
  isLoading: boolean;
  createStrategy: (data: { name: string; description?: string }) => Promise<void>;
  updateStrategy: (id: string, data: Partial<Strategy>) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  refreshStrategies: () => Promise<void>;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

export const StrategyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStrategies = useCallback(async () => {
    if (isAuthenticated && accessToken) {
      setIsLoading(true);
      try {
        const fetchedStrategies = await api.getStrategies(accessToken);
        setStrategies(fetchedStrategies);
      } catch (error) {
        console.error("Failed to fetch strategies", error);
        setStrategies([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setStrategies([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    refreshStrategies();
  }, [refreshStrategies]);

  const createStrategy = async (data: { name: string; description?: string }) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.createStrategy(data, accessToken);
    await refreshStrategies();
  };

  const updateStrategy = async (id: string, data: Partial<Strategy>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateStrategy(id, data, accessToken);
    await refreshStrategies();
  };
  
  const deleteStrategy = async (id: string) => {
     if (!accessToken) throw new Error("Not authenticated");
     await api.deleteStrategy(id, accessToken);
     await refreshStrategies();
  };

  const value = {
    strategies,
    isLoading,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    refreshStrategies,
  };

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
};

export const useStrategy = () => {
  const context = useContext(StrategyContext);
  if (context === undefined) {
    throw new Error('useStrategy must be used within a StrategyProvider');
  }
  return context;
};
