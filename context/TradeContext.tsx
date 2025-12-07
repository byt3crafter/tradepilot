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
  isTradesSynced: boolean;
  createTrade: (data: Partial<Trade>) => Promise<void>;
  updateTrade: (id: string, data: Partial<Trade>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  bulkDeleteTrades: (tradeIds: string[]) => Promise<void>;
  activatePendingOrder: (id: string) => Promise<void>;
  analyzeTrade: (tradeId: string) => Promise<void>;
  createOrUpdateJournal: (tradeId: string, journalData: Omit<TradeJournal, 'id' | 'tradeId'>) => Promise<void>;
  refreshTrades: () => Promise<void>;
  bulkImportTrades: (data: { brokerAccountId: string; playbookId: string; trades: any[] }) => Promise<{ imported: number; skipped: number }>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const TradeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();
  const { activeAccount, refreshAccounts, refreshObjectives, refreshSmartLimitsProgress } = useAccount();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initializedAccountId, setInitializedAccountId] = useState<string | null>(null);

  const refreshAllProgress = useCallback(async () => {
    // Refresh account first to update balance, then refresh dependent progress
    await refreshAccounts();
    await refreshObjectives();
    await refreshSmartLimitsProgress();
  }, [refreshAccounts, refreshObjectives, refreshSmartLimitsProgress]);

  const fetchTrades = useCallback(async (showLoading = false) => {
    const token = await getToken();
    if (!activeAccount || !token) {
      if (activeAccount === null) {
        setAllTrades([]);
        setInitializedAccountId(null);
        setIsLoading(false);
      }
      return;
    }

    if (showLoading) setIsLoading(true);

    try {
      const fetchedTrades = await api.getTrades(activeAccount.id, token);
      setAllTrades(fetchedTrades);
      setInitializedAccountId(activeAccount.id);
    } catch (error) {
      console.error("Failed to fetch trades", error);
      // Even on error, we mark as initialized so we don't get stuck loading
      setInitializedAccountId(activeAccount.id);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [activeAccount, getToken]);

  const refreshTrades = useCallback(async () => {
    await fetchTrades(false);
  }, [fetchTrades]);

  useEffect(() => {
    if (activeAccount) {
      // If we switched accounts, show loading immediately
      if (activeAccount.id !== initializedAccountId) {
        fetchTrades(true);
      } else {
        // Just a refresh (e.g. token change?), silent
        fetchTrades(false);
      }
    } else {
      setAllTrades([]);
      setInitializedAccountId(null);
      setIsLoading(false);
    }
  }, [activeAccount, fetchTrades, initializedAccountId]);

  const isTradesSynced = activeAccount ? activeAccount.id === initializedAccountId : true;

  const { liveTrades, pendingTrades, closedTrades } = useMemo(() => {
    const pending = allTrades.filter(t => t.isPendingOrder);
    const closed = allTrades.filter(t => !t.isPendingOrder && t.result);
    const live = allTrades.filter(t => !t.isPendingOrder && !t.result);
    return { liveTrades: live, pendingTrades: pending, closedTrades: closed };
  }, [allTrades]);


  const createTrade = async (data: Partial<Trade>) => {
    const token = await getToken();
    if (!token || !activeAccount) throw new Error("Not authenticated or no active account");
    await api.createTrade({ ...data, brokerAccountId: activeAccount.id }, token);
    await refreshTrades();
    await refreshAllProgress();
  };

  const updateTrade = async (id: string, data: Partial<Trade>) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.updateTrade(id, data, token);
    await refreshTrades();
    await refreshAllProgress();
  };

  const activatePendingOrder = async (id: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.updateTrade(id, { isPendingOrder: false, entryDate: new Date().toISOString() }, token);
    await refreshTrades();
    await refreshAllProgress();
  };

  const deleteTrade = async (id: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.deleteTrade(id, token);
    await refreshTrades();
    await refreshAllProgress();
  };

  const bulkDeleteTrades = async (tradeIds: string[]) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.bulkDeleteTrades(tradeIds, token);
    await refreshTrades();
    await refreshAllProgress();
  };

  const analyzeTrade = async (tradeId: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");

    // Call the secure backend endpoint to perform the analysis
    await api.analyzeTrade(tradeId, token);

    // Refresh the trades to get the new analysis data
    await refreshTrades();
  };

  const createOrUpdateJournal = async (tradeId: string, journalData: Omit<TradeJournal, 'id' | 'tradeId'>) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const trade = allTrades.find(t => t.id === tradeId);
    if (!trade) throw new Error("Trade not found");

    if (trade.tradeJournal) {
      await api.updateTradeJournal(trade.tradeJournal.id, journalData, token);
    } else {
      await api.createTradeJournal(tradeId, journalData, token);
    }
    await refreshTrades();
  }

  const bulkImportTrades = async (data: { brokerAccountId: string; playbookId: string; trades: any[] }) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const result = await api.bulkImportTrades(data, token);
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
    isTradesSynced,
    createTrade,
    updateTrade,
    deleteTrade,
    bulkDeleteTrades,
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