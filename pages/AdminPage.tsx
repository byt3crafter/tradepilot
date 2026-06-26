import React, { useState, useEffect } from 'react';
import StatCard from '../components/admin/StatCard';
import UserManagementTable from '../components/admin/UserManagementTable';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { AdminStats, AdminUser, PropFirmTemplate, SystemConfig } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import GrantProAccessModal from '../components/admin/GrantProAccessModal';
import TemplatesManagement from '../components/admin/TemplatesManagement';
import TemplateFormModal from '../components/admin/TemplateFormModal';
import PlaybooksManagement from '../components/admin/PlaybooksManagement';
import ReferralDashboard from '../components/admin/ReferralDashboard';
import PromoCodesManagement from '../components/admin/PromoCodesManagement';
import AdminPricingPlans from '../components/admin/AdminPricingPlans';
import { MenuIcon } from '../components/icons/MenuIcon';

type AdminView = 'dashboard' | 'users' | 'templates' | 'playbooks' | 'referrals' | 'promo_codes' | 'pricing_plans';

const VIEW_LABELS: Record<AdminView, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  templates: 'Prop Firm Templates',
  playbooks: 'Community Playbooks',
  referrals: 'Referral Program',
  promo_codes: 'Promo Codes',
  pricing_plans: 'Pricing Plans',
};

/** Jtp-themed toggle row for system controls */
const SystemToggleRow: React.FC<{
  label: string;
  description?: string;
  isEnabled: boolean;
  isLoading: boolean;
  onToggle: () => void;
}> = ({ label, description, isEnabled, isLoading, onToggle }) => (
  <div className="flex items-start justify-between gap-6 py-4">
    <div className="min-w-0">
      <p className="text-jtp-md text-jtp-text font-medium">{label}</p>
      {description && (
        <p className="text-jtp-xs text-jtp-textDim mt-0.5">{description}</p>
      )}
    </div>
    <div className="flex items-center gap-3 flex-shrink-0">
      <span className={`text-jtp-xs font-medium ${isEnabled ? 'text-jtp-profit' : 'text-jtp-textDim'}`}>
        {isEnabled ? 'Enabled' : 'Disabled'}
      </span>
      <Button
        onClick={onToggle}
        variant={isEnabled ? 'danger' : 'secondary'}
        isLoading={isLoading}
        className="h-7 px-3 text-jtp-xs"
      >
        {isEnabled ? 'Disable' : 'Enable'}
      </Button>
    </div>
  </div>
);

const AdminPage: React.FC = () => {
  const { accessToken, logout } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [templates, setTemplates] = useState<PropFirmTemplate[]>([]);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isTogglingFreeMode, setIsTogglingFreeMode] = useState(false);
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

  const fetchPlaybooks = async () => {
    if (!accessToken) return;
    try {
      const playbooksData = await api.getCommunityPlaybooks(accessToken);
      setPlaybooks(playbooksData);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh playbooks.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      setError('');
      try {
        const [statsData, usersData, templatesData, playbooksData, configData] = await Promise.all([
          api.getAdminStats(accessToken),
          api.getAdminUsers(accessToken),
          api.getAllPropFirmTemplates(accessToken),
          api.getCommunityPlaybooks(accessToken),
          api.getSystemConfig(accessToken),
        ]);
        setStats(statsData);
        setUsers(usersData);
        setTemplates(templatesData);
        setPlaybooks(playbooksData);
        setSystemConfig(configData);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [accessToken]);

  const handleBackToDashboard = () => {
    // Clear the admin-panel hash — the App's hashchange listener will re-render
    // DashboardPage, which defaults to the 'dashboard' view.
    window.location.hash = '';
  };

  const handleToggleMaintenance = async () => {
    if (!accessToken || !systemConfig) return;
    setIsToggling(true);
    try {
      const newConfig = await api.toggleMaintenance(!systemConfig.isMaintenanceMode, accessToken);
      setSystemConfig(newConfig);
    } catch (err) {
      console.error(err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleFreeMode = async () => {
    if (!accessToken || !systemConfig) return;
    setIsTogglingFreeMode(true);
    try {
      const newConfig = await api.setFreeMode(!systemConfig.freeMode, accessToken);
      setSystemConfig(newConfig);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingFreeMode(false);
    }
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

  const handleDeletePlaybook = async (id: string) => {
    if (!accessToken) return;
    await api.deletePlaybook(id, accessToken);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Spinner />
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-jtp-loss/10 border border-jtp-loss/20 rounded-jtp-panel p-4 text-jtp-loss text-jtp-sm text-center">
          {error}
        </div>
      );
    }

    if (currentView === 'dashboard') {
      return (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={stats?.totalUsers ?? 0} />
            <StatCard title="Online Users" value={stats?.onlineUsers ?? 0} accent="blue" />
            <StatCard title="Active Subscriptions" value={stats?.activeSubscriptions ?? 0} accent="profit" />
            <StatCard
              title="MRR"
              value={`$${stats?.mrr.toFixed(2) ?? '0.00'}`}
              accent="profit"
            />
          </div>

          {/* System Controls */}
          <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-jtp-border">
              <h2 className="text-jtp-lg font-semibold text-jtp-text tracking-tight">System Controls</h2>
            </div>
            <div className="px-5 divide-y divide-jtp-borderSubtle max-w-2xl">
              <SystemToggleRow
                label="Maintenance Mode"
                isEnabled={!!systemConfig?.isMaintenanceMode}
                isLoading={isToggling}
                onToggle={handleToggleMaintenance}
              />
              <SystemToggleRow
                label="Free Mode"
                description="Grants every user full Pro access. Hides upgrade prompts app-wide."
                isEnabled={!!systemConfig?.freeMode}
                isLoading={isTogglingFreeMode}
                onToggle={handleToggleFreeMode}
              />
            </div>
          </div>
        </div>
      );
    }

    if (currentView === 'users') {
      return (
        <UserManagementTable
          users={users}
          onGrantPro={handleOpenGrantModal}
          onRefresh={fetchUsers}
        />
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

    if (currentView === 'playbooks') {
      return (
        <PlaybooksManagement
          playbooks={playbooks}
          onRefresh={fetchPlaybooks}
          onDelete={handleDeletePlaybook}
        />
      );
    }

    if (currentView === 'referrals') {
      return <ReferralDashboard />;
    }

    if (currentView === 'promo_codes') {
      return <PromoCodesManagement />;
    }

    if (currentView === 'pricing_plans') {
      return <AdminPricingPlans />;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-jtp-bg text-jtp-text flex overflow-hidden font-sans">
      <AdminSidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isCollapsed={false}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-56 transition-all duration-300">
        {/* Topbar */}
        <header className="flex-shrink-0 h-topbar border-b border-jtp-border flex items-center justify-between px-5 bg-jtp-shell">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-jtp-textDim hover:text-jtp-text transition-colors p-1"
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="text-jtp-sm font-medium text-jtp-textMuted">
              {VIEW_LABELS[currentView]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBackToDashboard}
              variant="link"
              className="hidden md:flex text-jtp-sm"
            >
              &larr; Back to Dashboard
            </Button>
            <Button
              onClick={logout}
              variant="secondary"
              className="h-7 px-3 text-jtp-xs"
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 animate-jtp-fade-in">
          {renderContent()}
        </main>
      </div>

      {isModalOpen && selectedUser && (
        <Modal title={`Manage Pro Access — ${selectedUser.fullName}`} onClose={handleCloseModal}>
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
