// @refresh full
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Analysis } from '../types';
import { useAuth } from './AuthContext';
import { useAccount } from './AccountContext';

interface AnalysisContextType {
  analyses: Analysis[];
  isLoading: boolean;
  createAnalysis: (data: Partial<Omit<Analysis, 'id' | 'userId' | 'brokerId'>>) => Promise<void>;
  updateAnalysis: (id: string, data: Partial<Analysis>) => Promise<void>;
  deleteAnalysis: (id: string) => Promise<void>;
  refreshAnalyses: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuth();
  const { activeAccount } = useAccount();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isFeatureEnabled = user?.featureFlags?.analysisTrackerEnabled;

  const refreshAnalyses = useCallback(async () => {
    if (activeAccount && accessToken && isFeatureEnabled) {
      setIsLoading(true);
      try {
        const fetchedAnalyses = await api.getAnalyses(activeAccount.id, accessToken);
        setAnalyses(fetchedAnalyses);
      } catch (error) {
        console.error("Failed to fetch analyses", error);
        setAnalyses([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setAnalyses([]);
      setIsLoading(false);
    }
  }, [activeAccount, accessToken, isFeatureEnabled]);

  useEffect(() => {
    refreshAnalyses();
  }, [refreshAnalyses]);

  const createAnalysis = async (data: Partial<Omit<Analysis, 'id' | 'userId' | 'brokerId'>>) => {
    if (!accessToken || !activeAccount) throw new Error("Not authenticated or no active account");
    await api.createAnalysis({ ...data, brokerId: activeAccount.id }, accessToken);
    await refreshAnalyses();
  };
  
  const updateAnalysis = async (id: string, data: Partial<Analysis>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateAnalysis(id, data, accessToken);
    await refreshAnalyses();
  };

  const deleteAnalysis = async (id: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.deleteAnalysis(id, accessToken);
    await refreshAnalyses();
  };

  const value = {
    analyses,
    isLoading,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
    refreshAnalyses,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
