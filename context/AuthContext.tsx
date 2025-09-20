
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (accessToken) {
        try {
          const userData = await api.get<User>('/users/me', accessToken);
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user, logging out.', error);
          setAccessToken(null);
          localStorage.removeItem('accessToken');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [accessToken]);

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

  const logout = () => {
    // We can call the backend logout endpoint here to invalidate the refresh token
    if(accessToken) {
        api.post('/auth/logout', {}, accessToken).catch(err => console.error("Logout failed on backend", err));
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    resendVerification,
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
