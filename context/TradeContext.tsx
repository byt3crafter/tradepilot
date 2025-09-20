import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Trade } from '../types';
import { useAuth } from './AuthContext';
import { useAccount } from './AccountContext';

interface TradeContextType {
  trades: Trade[];
  pendingTrades: Trade[];
  isLoading: boolean;
  createTrade: (data: Partial<Trade>) => Promise<void>;
  updateTrade: (id: string, data: Partial<Trade>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  analyzeTrade: (tradeId: string) => Promise<void>;
  refreshTrades: () => Promise<void>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const TradeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken } = useAuth();
  const { activeAccount } = useAccount();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTrades = useCallback(async () => {
    if (activeAccount && accessToken) {
      setIsLoading(true);
      try {
        const fetchedTrades = await api.getTrades(activeAccount.id, accessToken);
        setAllTrades(fetchedTrades);
      } catch (error) {
        console.error("Failed to fetch trades", error);
        setAllTrades([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setAllTrades([]);
      setIsLoading(false);
    }
  }, [activeAccount, accessToken]);

  useEffect(() => {
    refreshTrades();
  }, [refreshTrades]);

  const createTrade = async (data: Partial<Trade>) => {
    if (!accessToken || !activeAccount) throw new Error("Not authenticated or no active account");
    await api.createTrade({ ...data, brokerAccountId: activeAccount.id, tradeDate: new Date().toISOString() }, accessToken);
    await refreshTrades();
  };

  const updateTrade = async (id: string, data: Partial<Trade>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateTrade(id, data, accessToken);
    await refreshTrades();
  };

  const deleteTrade = async (id: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.deleteTrade(id, accessToken);
    await refreshTrades();
  };

  const analyzeTrade = async (tradeId: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    
    // Call the secure backend endpoint to perform the analysis
    await api.analyzeTrade(tradeId, accessToken);
    
    // Refresh the trades to get the new analysis data
    await refreshTrades();
  };

  const trades = allTrades.filter(t => !t.isPendingOrder);
  const pendingTrades = allTrades.filter(t => t.isPendingOrder);

  const value = {
    trades,
    pendingTrades,
    isLoading,
    createTrade,
    updateTrade,
    deleteTrade,
    analyzeTrade,
    refreshTrades,
  };

  return <TradeContext.Provider value={value}>{children}</TradeContext.Provider>;
};

export const useTrade = () => {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error('useTrade must be used within a TradeProvider');
  }
  return context;
};