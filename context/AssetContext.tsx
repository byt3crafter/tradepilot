import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { AssetSpecification } from '../types';
import { useAuth } from './AuthContext';

interface AssetContextType {
  specs: AssetSpecification[];
  isLoading: boolean;
  findSpec: (symbol: string) => AssetSpecification | undefined;
  createAsset: (data: Omit<AssetSpecification, 'id'>) => Promise<void>;
  updateAsset: (id: string, data: Partial<Omit<AssetSpecification, 'id'>>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  refreshSpecs: () => Promise<void>;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export const AssetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [specs, setSpecs] = useState<AssetSpecification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSpecs = useCallback(async () => {
    if (isAuthenticated && accessToken) {
      setIsLoading(true);
      try {
        const fetchedSpecs = await api.getAssetSpecs(accessToken);
        setSpecs(fetchedSpecs);
      } catch (error) {
        console.error("Failed to fetch asset specifications", error);
        setSpecs([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSpecs([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    refreshSpecs();
  }, [refreshSpecs]);

  const findSpec = (symbol: string) => {
    if (!symbol) return undefined;
    return specs.find(s => s.symbol.toLowerCase() === symbol.toLowerCase());
  };

  const createAsset = async (data: Omit<AssetSpecification, 'id'>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.createAssetSpec(data, accessToken);
    await refreshSpecs();
  };

  const updateAsset = async (id: string, data: Partial<Omit<AssetSpecification, 'id'>>) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.updateAssetSpec(id, data, accessToken);
    await refreshSpecs();
  };
  
  const deleteAsset = async (id: string) => {
     if (!accessToken) throw new Error("Not authenticated");
     await api.deleteAssetSpec(id, accessToken);
     await refreshSpecs();
  };

  const value = {
    specs,
    isLoading,
    findSpec,
    createAsset,
    updateAsset,
    deleteAsset,
    refreshSpecs,
  };

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
};

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
};