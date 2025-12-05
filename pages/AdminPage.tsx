import React, { useState, useEffect } from 'react';
import StatCard from '../components/admin/StatCard';
import UserManagementTable from '../components/admin/UserManagementTable';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { AdminStats, AdminUser, PropFirmTemplate } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import GrantProAccessModal from '../components/admin/GrantProAccessModal';
import TemplatesManagement from '../components/admin/TemplatesManagement';
import TemplateFormModal from '../components/admin/TemplateFormModal';

type AdminView = 'dashboard' | 'users' | 'templates';

const AdminPage: React.FC = () => {
  const { accessToken, logout } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [templates, setTemplates] = useState<PropFirmTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PropFirmTemplate | null>(null);

  const fetchUsers = async () => {
    if (!accessToken) return;
    try {
      const usersData = await api.getAdminUsers(accessToken);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh users.');
    }
  };

  const fetchTemplates = async () => {
    if (!accessToken) return;
    try {
      const templatesData = await api.getAllPropFirmTemplates(accessToken);
      setTemplates(templatesData);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh templates.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      setError('');
      try {
        const [statsData, usersData, templatesData] = await Promise.all([
          api.getAdminStats(accessToken),
          api.getAdminUsers(accessToken),
          api.getAllPropFirmTemplates(accessToken),
        ]);
        setStats(statsData);
        setUsers(usersData);
        setTemplates(templatesData);
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

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: PropFirmTemplate) => {
    setSelectedTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setSelectedTemplate(null);
    setIsTemplateModalOpen(false);
  };

  const handleTemplateSuccess = async () => {
    handleCloseTemplateModal();
    await fetchTemplates();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!accessToken) return;
    await api.deletePropFirmTemplate(accessToken, id);
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

    if (currentView === 'templates') {
      return (
        <TemplatesManagement
          templates={templates}
          onRefresh={fetchTemplates}
          onEdit={handleEditTemplate}
          onCreate={handleCreateTemplate}
          onDelete={handleDeleteTemplate}
        />
      );
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-future-dark text-future-light flex overflow-hidden">
      <AdminSidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isCollapsed={false}
      />

      {/* Main content area - flex column layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed header - no scroll */}
        <header className="flex-shrink-0 h-16 border-b border-white/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <span className="font-orbitron text-lg text-secondary">
              {currentView === 'dashboard' ? 'Dashboard' : currentView === 'users' ? 'Users' : 'Templates'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleBackToApp} variant="link">Back to App</Button>
            <Button onClick={logout} className="w-auto">Logout</Button>
          </div>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 animate-fade-in-up">
          {renderContent()}
        </main>
      </div>

      {isModalOpen && selectedUser && (
        <Modal title={`Manage Pro Access for ${selectedUser.fullName}`} onClose={handleCloseModal}>
          <GrantProAccessModal user={selectedUser} onSuccess={handleSuccess} />
        </Modal>
      )}

      {isTemplateModalOpen && (
        <Modal
          title={selectedTemplate ? 'Edit Template' : 'Create Template'}
          onClose={handleCloseTemplateModal}
        >
          <TemplateFormModal template={selectedTemplate} onSuccess={handleTemplateSuccess} />
        </Modal>
      )}
    </div>
  );
};

export default AdminPage;