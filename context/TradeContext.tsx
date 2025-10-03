// @refresh full
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import api from '../services/api';
import { Trade, TradeJournal } from '../types';
import { useAuth } from './AuthContext';
import { useAccount } from './AccountContext';

interface TradeContextType {
  trades: Trade[];
  liveTrades: Trade[];
  pendingTrades: Trade[];
  closedTrades: Trade[];
  isLoading: boolean;
  createTrade: (data: Partial<Trade>) => Promise<void>;
  updateTrade: (id: string, data: Partial<Trade>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  activatePendingOrder: (id: string) => Promise<void>;
  analyzeTrade: (tradeId: string) => Promise<void>;
  createOrUpdateJournal: (tradeId: string, journalData: Omit<TradeJournal, 'id' | 'tradeId'>) => Promise<void>;
  refreshTrades: () => Promise<void>;
  bulkImportTrades: (data: { brokerAccountId: string; playbookId: string; trades: any[] }) => Promise<{ imported: number; skipped: number }>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const TradeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken } = useAuth();
  const { activeAccount, refreshAccounts, refreshObjectives, refreshSmartLimitsProgress } = useAccount();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAllProgress = useCallback(async () => {
    // Refresh account first to update balance, then refresh dependent progress
    await refreshAccounts();
    await refreshObjectives();
    await refreshSmartLimitsProgress();
  }, [refreshAccounts, refreshObjectives, refreshSmartLimitsProgress]);

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
    // On initial load, just refresh the trades. The AccountContext is already
    // handling the initial fetch of account data. Objectives and Smart Limits
    // will be refreshed by the useEffect in AccountContext when the active account changes.
    // This prevents a "Too Many Requests" error from multiple simultaneous calls.
    refreshTrades();
  }, [refreshTrades]);
  
  const { liveTrades, pendingTrades, closedTrades } = useMemo(() => {
    const pending = allTrades.filter(t => t.isPendingOrder);
    const closed = allTrades.filter(t => !t.isPendingOrder && t.result);
    const live = allTrades.filter(t => !t.isPendingOrder && !t.result);
    return { liveTrades: live, pendingTrades: pending, closedTrades: closed };
  }, [allTrades]);


  const createTrade = async (data: Partial<Trade>) => {
    if (!accessToken || !activeAccount) throw new Error("Not authenticated or no active account");
    await api.createTrade({ ...data, brokerAccountId: activeAccount.id }, accessToken);
    await refreshTrades();
    await refreshAllProgress();
  };

  const updateTrade = async (id: string, data: Partial<Trade>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateTrade(id, data, accessToken);
    await refreshTrades();
    await refreshAllProgress();
  };
  
  const activatePendingOrder = async (id: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateTrade(id, { isPendingOrder: false, entryDate: new Date().toISOString() }, accessToken);
    await refreshTrades();
    await refreshAllProgress();
  };

  const deleteTrade = async (id: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.deleteTrade(id, accessToken);
    await refreshTrades();
    await refreshAllProgress();
  };

  const analyzeTrade = async (tradeId: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    
    // Call the secure backend endpoint to perform the analysis
    await api.analyzeTrade(tradeId, accessToken);
    
    // Refresh the trades to get the new analysis data
    await refreshTrades();
  };

  const createOrUpdateJournal = async (tradeId: string, journalData: Omit<TradeJournal, 'id' | 'tradeId'>) => {
    if (!accessToken) throw new Error("Not authenticated");
    const trade = allTrades.find(t => t.id === tradeId);
    if (!trade) throw new Error("Trade not found");
    
    if (trade.tradeJournal) {
      await api.updateTradeJournal(trade.tradeJournal.id, journalData, accessToken);
    } else {
      await api.createTradeJournal(tradeId, journalData, accessToken);
    }
    await refreshTrades();
  }

  const bulkImportTrades = async (data: { brokerAccountId: string; playbookId: string; trades: any[] }) => {
    if (!accessToken) throw new Error("Not authenticated");
    const result = await api.bulkImportTrades(data, accessToken);
    await refreshTrades();
    await refreshAllProgress();
    return result;
  };

  const value = {
    trades: allTrades,
    liveTrades,
    pendingTrades,
    closedTrades,
    isLoading,
    createTrade,
    updateTrade,
    deleteTrade,
    activatePendingOrder,
    analyzeTrade,
    createOrUpdateJournal,
    refreshTrades,
    bulkImportTrades,
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
