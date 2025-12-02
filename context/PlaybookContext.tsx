// @refresh full
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Playbook, CommunityPlaybook } from '../types';
import { useAuth } from './AuthContext';

interface PlaybookContextType {
  playbooks: Playbook[];
  communityPlaybooks: CommunityPlaybook[];
  isLoading: boolean;
  createPlaybook: (data: Partial<Playbook>) => Promise<void>;
  updatePlaybook: (id: string, data: Partial<Playbook>) => Promise<void>;
  deletePlaybook: (id: string) => Promise<void>;
  refreshPlaybooks: () => Promise<void>;
}

const PlaybookContext = createContext<PlaybookContextType | undefined>(undefined);

export const PlaybookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, getToken } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [communityPlaybooks, setCommunityPlaybooks] = useState<CommunityPlaybook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlaybooks = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const token = await getToken();
        if (!token) {
            setPlaybooks([]);
            return;
        }
        const fetchedPlaybooks = await api.getPlaybooks(token);
        setPlaybooks(fetchedPlaybooks);
      } catch (error) {
        console.error("Failed to fetch playbooks", error);
        setPlaybooks([]);
      }
    } else {
      setPlaybooks([]);
    }
  }, [isAuthenticated, getToken]);

  const refreshCommunityPlaybooks = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const token = await getToken();
        if (!token) {
            setCommunityPlaybooks([]);
            return;
        }
        const fetched = await api.getCommunityPlaybooks(token);
        setCommunityPlaybooks(fetched);
      } catch (error) {
        console.error("Failed to fetch community playbooks", error);
        setCommunityPlaybooks([]);
      }
    } else {
      setCommunityPlaybooks([]);
    }
  }, [isAuthenticated, getToken]);

  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        setIsLoading(true);
        await Promise.all([refreshPlaybooks(), refreshCommunityPlaybooks()]);
        setIsLoading(false);
      } else {
        setPlaybooks([]);
        setCommunityPlaybooks([]);
        setIsLoading(false);
      }
    };
    loadData();
  }, [isAuthenticated, refreshPlaybooks, refreshCommunityPlaybooks]);

  const createPlaybook = async (data: Partial<Playbook>) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.createPlaybook(data, token);
    await refreshPlaybooks();
  };

  const updatePlaybook = async (id: string, data: Partial<Playbook>) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.updatePlaybook(id, data, token);
    await refreshPlaybooks();
  };
  
  const deletePlaybook = async (id: string) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    await api.deletePlaybook(id, token);
    await refreshPlaybooks();
  };

  const value = {
    playbooks,
    communityPlaybooks,
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