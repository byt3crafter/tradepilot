// @refresh full
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Playbook } from '../types';
import { useAuth } from './AuthContext';

interface PlaybookContextType {
  playbooks: Playbook[];
  isLoading: boolean;
  createPlaybook: (data: Partial<Playbook>) => Promise<void>;
  updatePlaybook: (id: string, data: Partial<Playbook>) => Promise<void>;
  deletePlaybook: (id: string) => Promise<void>;
  refreshPlaybooks: () => Promise<void>;
}

const PlaybookContext = createContext<PlaybookContextType | undefined>(undefined);

export const PlaybookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlaybooks = useCallback(async () => {
    if (isAuthenticated && accessToken) {
      setIsLoading(true);
      try {
        const fetchedPlaybooks = await api.getPlaybooks(accessToken);
        setPlaybooks(fetchedPlaybooks);
      } catch (error) {
        console.error("Failed to fetch playbooks", error);
        setPlaybooks([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setPlaybooks([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    refreshPlaybooks();
  }, [refreshPlaybooks]);

  const createPlaybook = async (data: Partial<Playbook>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.createPlaybook(data, accessToken);
    await refreshPlaybooks();
  };

  const updatePlaybook = async (id: string, data: Partial<Playbook>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updatePlaybook(id, data, accessToken);
    await refreshPlaybooks();
  };
  
  const deletePlaybook = async (id: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.deletePlaybook(id, accessToken);
    await refreshPlaybooks();
  };

  const value = {
    playbooks,
    isLoading,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
    refreshPlaybooks,
  };

  return <PlaybookContext.Provider value={value}>{children}</PlaybookContext.Provider>;
};

export const usePlaybook = () => {
  const context = useContext(PlaybookContext);
  if (context === undefined) {
    throw new Error('usePlaybook must be used within a PlaybookProvider');
  }
  return context;
};
