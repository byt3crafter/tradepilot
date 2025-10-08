// @refresh full
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Notification } from '../types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isFeatureEnabled = user?.featureFlags?.analysisTrackerEnabled;

  const refreshNotifications = useCallback(async () => {
    if (accessToken && isFeatureEnabled) {
      setIsLoading(true);
      try {
        const fetchedNotifications = await api.getNotifications(accessToken);
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setNotifications([]);
      setIsLoading(false);
    }
  }, [accessToken, isFeatureEnabled]);

  useEffect(() => {
    refreshNotifications();
    // Set up polling every 5 minutes
    const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = async (id: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    await api.markNotificationAsRead(id, accessToken);
    await refreshNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const value = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    refreshNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
