import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTrialing: boolean;
  isSubscribed: boolean;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  resendVerification: (email: string) => Promise<void>;
  refreshUser: () => Promise<User | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    if(accessToken) {
        api.post('/auth/logout', {}, accessToken).catch(err => console.error("Logout failed on backend", err));
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
  }, [accessToken]);


  const refreshUser = useCallback(async (): Promise<User | undefined> => {
    const currentToken = localStorage.getItem('accessToken');
    if (!currentToken) {
      setUser(null);
      return undefined;
    }
    try {
      const userData = await api.get<User>('/users/me', currentToken);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to fetch user, logging out.', error);
      logout();
      return undefined;
    }
  }, [logout]);


  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    loadUser();
  }, [refreshUser]);
  
  useEffect(() => {
    const handleTokenRefresh = (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('[AuthContext] Token refreshed event received, updating state.');
        setAccessToken(customEvent.detail);
    };

    const handleLogoutEvent = () => {
        console.log('[AuthContext] Logout event received from API service.');
        logout();
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    window.addEventListener('logout', handleLogoutEvent);

    return () => {
        window.removeEventListener('tokenRefreshed', handleTokenRefresh);
        window.removeEventListener('logout', handleLogoutEvent);
    };
  }, [logout]);


  const login = async (email: string, password: string) => {
    const { user, accessToken: newAccessToken } = await api.post<{ user: User, accessToken: string }>('/auth/login', { email, password });
    setUser(user);
    setAccessToken(newAccessToken);
    localStorage.setItem('accessToken', newAccessToken);
  };
  
  const register = async (email: string, password: string, fullName: string) => {
    await api.post('/auth/register', { email, password, fullName });
  };

  const resendVerification = async (email: string) => {
    await api.post('/auth/resend-verification', { email });
  }

  const subscriptionState = useMemo(() => {
    const hasGiftedAccess = user?.proAccessExpiresAt === null || (user?.proAccessExpiresAt && new Date(user.proAccessExpiresAt) > new Date());
    
    const isSubscribed = user?.subscriptionStatus === 'ACTIVE' || hasGiftedAccess;
    const isTrialing = user?.subscriptionStatus === 'TRIALING' && !hasGiftedAccess;
    
    const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const trialDaysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const isTrialExpired = isTrialing && trialDaysRemaining === 0;

    return { isTrialing, isSubscribed, trialDaysRemaining, isTrialExpired };
  }, [user]);

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    ...subscriptionState,
    login,
    register,
    logout,
    resendVerification,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};