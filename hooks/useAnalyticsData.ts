import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { AccountAnalytics } from '../types';
import api from '../services/api';

const useAnalyticsData = () => {
  const { accessToken } = useAuth();
  const { activeAccount } = useAccount();
  const [data, setData] = useState<AccountAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!accessToken || !activeAccount) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const analyticsData = await api.getAnalytics(activeAccount.id, accessToken);
      setData(analyticsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, activeAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
};

export default useAnalyticsData;
