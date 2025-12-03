import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { AccountAnalytics } from '../types';
import api from '../services/api';

const useAnalyticsData = () => {
  const { accessToken, getToken, isLoading: authLoading } = useAuth();
  const { activeAccount } = useAccount();
  const [data, setData] = useState<AccountAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchData = useCallback(async () => {
    if (authLoading) {
      // Wait for auth to finish loading
      return;
    }

    if (!activeAccount) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get a fresh token to ensure it's valid
      const token = await getToken();

      if (!token) {
        throw new Error('No access token available');
      }

      const analyticsData = await api.getAnalytics(activeAccount.id, token);
      setData(analyticsData);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err: any) {
      console.error('Analytics fetch error:', err);

      // If it's a 401 error and we haven't exceeded retries, try again
      if (err.message?.includes('Session expired') && retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Retrying analytics fetch (attempt ${retryCountRef.current}/${maxRetries})...`);

        // Wait a bit before retrying to allow token refresh
        setTimeout(() => {
          fetchData();
        }, 1000 * retryCountRef.current); // Exponential backoff
        return;
      }

      setError(err.message || 'Failed to fetch analytics data.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, getToken, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
};

export default useAnalyticsData;
