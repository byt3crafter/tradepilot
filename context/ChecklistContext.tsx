import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { ChecklistRule } from '../types';
import { useAuth } from './AuthContext';

interface ChecklistContextType {
  rules: ChecklistRule[];
  isLoading: boolean;
  createRule: (data: { rule: string }) => Promise<void>;
  updateRule: (id: string, data: { rule: string }) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  refreshRules: () => Promise<void>;
}

const ChecklistContext = createContext<ChecklistContextType | undefined>(undefined);

export const ChecklistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [rules, setRules] = useState<ChecklistRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRules = useCallback(async () => {
    if (isAuthenticated && accessToken) {
      setIsLoading(true);
      try {
        const fetchedRules = await api.getChecklistRules(accessToken);
        setRules(fetchedRules);
      } catch (error) {
        console.error("Failed to fetch checklist rules", error);
        setRules([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setRules([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    refreshRules();
  }, [refreshRules]);

  const createRule = async (data: { rule: string }) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.createChecklistRule(data, accessToken);
    await refreshRules();
  };
  
  const updateRule = async (id: string, data: { rule: string }) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateChecklistRule(id, data, accessToken);
    await refreshRules();
  };

  const deleteRule = async (id: string) => {
     if (!accessToken) throw new Error("Not authenticated");
     await api.deleteChecklistRule(id, accessToken);
     await refreshRules();
  };

  const value = {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    refreshRules,
  };

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
};

export const useChecklist = () => {
  const context = useContext(ChecklistContext);
  if (context === undefined) {
    throw new Error('useChecklist must be used within a ChecklistProvider');
  }
  return context;
};
