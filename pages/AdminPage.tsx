import React, { useState, useEffect } from 'react';
import StatCard from '../components/admin/StatCard';
import UserManagementTable from '../components/admin/UserManagementTable';
import { useAuth } from '../context/AuthContext';
import { AdminStats, AdminUser } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';
import AuthLogo from '../components/auth/AuthLogo';

const AdminPage: React.FC = () => {
  const { accessToken, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      setError('');
      try {
        const [statsData, usersData] = await Promise.all([
          api.getAdminStats(accessToken),
          api.getAdminUsers(accessToken),
        ]);
        setStats(statsData);
        setUsers(usersData);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [accessToken]);
  
  const handleBackToApp = () => {
    window.location.href = '/';
  };

  const renderContent = () => {
      if (isLoading) {
        return (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        );
      }

      if (error) {
        return <p className="text-risk-high text-center">{error}</p>;
      }
      
      return (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={stats?.totalUsers ?? 0} />
                <StatCard title="Active Subscriptions" value={stats?.activeSubscriptions ?? 0} />
                <StatCard title="Users in Trial" value={stats?.trialUsers ?? 0} />
                <StatCard title="MRR" value={`$${stats?.mrr.toFixed(2) ?? '0.00'}`} />
            </div>
            
            {/* User Management Table */}
            <UserManagementTable users={users} />
        </>
      );
  }

  return (
    <div className="min-h-screen w-full bg-future-dark text-future-light p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <AuthLogo />
                <span className="font-orbitron text-2xl text-future-gray">/ Admin</span>
            </div>
            <div className="flex items-center gap-4">
                <Button onClick={handleBackToApp} variant="link">Back to App</Button>
                <Button onClick={logout} className="w-auto">Logout</Button>
            </div>
        </header>

        <main className="space-y-8 animate-fade-in-up">
            {renderContent()}
        </main>
    </div>
  );
};

export default AdminPage;
