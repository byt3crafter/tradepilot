import React, { useState, useEffect } from 'react';
import StatCard from '../components/admin/StatCard';
import UserManagementTable from '../components/admin/UserManagementTable';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { AdminStats, AdminUser } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import GrantProAccessModal from '../components/admin/GrantProAccessModal';

type AdminView = 'dashboard' | 'users';

const AdminPage: React.FC = () => {
  const { accessToken, logout } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const fetchUsers = async () => {
    if (!accessToken) return;
    try {
      const usersData = await api.getAdminUsers(accessToken);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh users.');
    }
  };

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

  const handleOpenGrantModal = (user: AdminUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleSuccess = async () => {
    handleCloseModal();
    await fetchUsers();
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

    if (currentView === 'dashboard') {
      return (
        <>
          <h1 className="text-2xl font-orbitron text-white mb-6">Admin Dashboard</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={stats?.totalUsers ?? 0} />
            <StatCard title="Active Subscriptions" value={stats?.activeSubscriptions ?? 0} />
            <StatCard title="Users in Trial" value={stats?.trialUsers ?? 0} />
            <StatCard title="MRR" value={`$${stats?.mrr.toFixed(2) ?? '0.00'}`} />
          </div>
        </>
      );
    }

    if (currentView === 'users') {
      return (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-orbitron text-white">User Management</h1>
          </div>
          <UserManagementTable
            users={users}
            onGrantPro={handleOpenGrantModal}
            onRefresh={fetchUsers}
          />
        </>
      );
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-future-dark text-future-light">
      <AdminSidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isCollapsed={false}
      />

      <div className="flex-1 ml-64">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <span className="font-orbitron text-lg text-secondary">
              {currentView === 'dashboard' ? 'Dashboard' : 'Users'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleBackToApp} variant="link">Back to App</Button>
            <Button onClick={logout} className="w-auto">Logout</Button>
          </div>
        </header>

        <main className="p-6 space-y-8 animate-fade-in-up">
          {renderContent()}
        </main>
      </div>

      {isModalOpen && selectedUser && (
        <Modal title={`Manage Pro Access for ${selectedUser.fullName}`} onClose={handleCloseModal}>
          <GrantProAccessModal user={selectedUser} onSuccess={handleSuccess} />
        </Modal>
      )}
    </div>
  );
};

export default AdminPage;