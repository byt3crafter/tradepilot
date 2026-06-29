/**
 * AdminPage — Operator Console: admin area root.
 *
 * Houses the sidebar navigation, topbar, and content area. Each view is
 * rendered by its own component. Dashboard uses StatTile + Panel from the
 * kit; system controls use inline toggles styled from the design system.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Panel, StatTile, Skeleton, Button, Badge, SegmentedControl } from '../components/ui';
import UserManagementTable from '../components/admin/UserManagementTable';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { AdminStats, AdminUser, PropFirmTemplate, SystemConfig, ExchangeStatusMap } from '../types';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import GrantProAccessModal from '../components/admin/GrantProAccessModal';
import TemplatesManagement from '../components/admin/TemplatesManagement';
import TemplateFormModal from '../components/admin/TemplateFormModal';
import PlaybooksManagement from '../components/admin/PlaybooksManagement';
import ReferralDashboard from '../components/admin/ReferralDashboard';
import PromoCodesManagement from '../components/admin/PromoCodesManagement';
import AdminPricingPlans from '../components/admin/AdminPricingPlans';
import { MenuIcon } from '../components/icons/MenuIcon';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type AdminView =
  | 'dashboard'
  | 'users'
  | 'templates'
  | 'playbooks'
  | 'referrals'
  | 'promo_codes'
  | 'pricing_plans'
  | 'exchange_keys';

const VIEW_LABELS: Record<AdminView, string> = {
  dashboard:     'Dashboard',
  users:         'User Management',
  templates:     'Prop Firm Templates',
  playbooks:     'Community Playbooks',
  referrals:     'Referral Program',
  promo_codes:   'Promo Codes',
  pricing_plans: 'Pricing Plans',
  exchange_keys: 'Exchange API Keys',
};

/* ─── System-controls toggle row ─────────────────────────────────────────── */
const SystemToggleRow: React.FC<{
  label: string;
  description?: string;
  isEnabled: boolean;
  isLoading: boolean;
  onToggle: () => void;
}> = ({ label, description, isEnabled, isLoading, onToggle }) => (
  <div className="flex items-start justify-between gap-8 py-4">
    {/* Text side */}
    <div className="flex-1 min-w-0">
      <p className="text-jtp-lg text-jtp-text font-medium leading-snug">{label}</p>
      {description && (
        <p className="text-jtp-md text-jtp-textMuted mt-1 leading-snug">{description}</p>
      )}
    </div>

    {/* Toggle side */}
    <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
      <span
        className={`font-mono text-jtp-xs font-semibold ${
          isEnabled ? 'text-jtp-profit' : 'text-jtp-textDim'
        }`}
      >
        {isEnabled ? 'ON' : 'OFF'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-label={`Toggle ${label}`}
        onClick={() => !isLoading && onToggle()}
        disabled={isLoading}
        className={[
          'relative inline-flex items-center rounded-full transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-jtp-panel focus:ring-jtp-blue',
          'disabled:opacity-50 cursor-pointer',
          isEnabled
            ? 'bg-jtp-blue'
            : 'bg-jtp-control border border-jtp-borderStrong',
        ].join(' ')}
        style={{ width: '36px', height: '20px' }}
      >
        <span className="sr-only">{isEnabled ? 'On' : 'Off'}</span>
        <span
          className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-150 shadow-sm ${
            isEnabled ? 'left-[18px]' : 'left-[3px]'
          }`}
        />
      </button>
    </div>
  </div>
);

/* ─── Exchange API Keys Panel ────────────────────────────────────────────── */

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M2 2l12 12" strokeLinecap="round" />
    <path d="M6.5 6.5A2.5 2.5 0 0111 8" strokeLinecap="round" />
    <path d="M3 5C1.5 6 1 8 1 8s2 4 7 4c1.2 0 2.2-.3 3.1-.7" strokeLinecap="round" />
    <path d="M13 11c1-1 2-3 2-3s-2-4-7-4c-.7 0-1.3.1-1.9.2" strokeLinecap="round" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M1 8s2-5 7-5 7 5 7 5-2 5-7 5-7-5-7-5z" />
    <circle cx="8" cy="8" r="2.5" />
  </svg>
);

interface ExchangeKeysPanelProps {
  token: string | null;
}

const ExchangeKeysPanel: React.FC<ExchangeKeysPanelProps> = ({ token }) => {
  const [exchanges, setExchanges] = useState<string[]>(['binance']);
  const [selectedExchange, setSelectedExchange] = useState('binance');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [testnet, setTestnet] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [status, setStatus] = useState<ExchangeStatusMap | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadExchanges = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.exchangesList(token);
      if (r.exchanges?.length) {
        setExchanges(r.exchanges);
        setSelectedExchange(r.exchanges[0]);
      }
    } catch { /* keep default */ }
  }, [token]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    setStatusLoading(true);
    try {
      setStatus(await api.exchangesStatus(token));
    } catch { /* ignore */ }
    finally { setStatusLoading(false); }
  }, [token]);

  useEffect(() => {
    loadExchanges();
    loadStatus();
  }, [loadExchanges, loadStatus]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !apiKey.trim() || !apiSecret.trim()) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await api.exchangesSetKeys(
        { exchange: selectedExchange, apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), testnet },
        token,
      );
      setSaveResult({ ok: true, msg: 'Keys saved successfully.' });
      setApiKey('');
      setApiSecret('');
      await loadStatus();
    } catch (err: any) {
      setSaveResult({ ok: false, msg: err.message || 'Failed to save keys.' });
    } finally {
      setSaving(false);
    }
  };

  const exchangeSegments = exchanges.map(e => ({
    value: e,
    label: e.charAt(0).toUpperCase() + e.slice(1),
  }));

  const currentExchangeStatus = status?.[selectedExchange];

  return (
    <Panel label="EXCHANGE API KEYS">
      <div className="space-y-6 max-w-lg">
        {/* Current status */}
        {statusLoading ? (
          <Skeleton variant="panel" className="h-14" />
        ) : currentExchangeStatus ? (
          <div className="flex items-center gap-3 p-3 bg-jtp-raised border border-jtp-border rounded-[2px]">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                currentExchangeStatus.configured ? 'bg-[#3ddc84]' : 'bg-jtp-textDim/40'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-jtp-sm font-semibold text-jtp-textMuted uppercase">
                  {selectedExchange}
                </span>
                <Badge variant={currentExchangeStatus.configured ? 'profit' : 'neutral'} size="xs">
                  {currentExchangeStatus.configured ? 'CONFIGURED' : 'NOT SET'}
                </Badge>
                <Badge variant={currentExchangeStatus.testnet ? 'warning' : 'info'} size="xs">
                  {currentExchangeStatus.testnet ? 'TESTNET' : 'LIVE'}
                </Badge>
              </div>
              {currentExchangeStatus.keyMask && (
                <p className="font-mono text-jtp-xs text-jtp-textDim mt-1">
                  key: {currentExchangeStatus.keyMask}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Exchange picker */}
          <div>
            <label className="block font-mono text-jtp-xs text-jtp-textDim uppercase tracking-[0.1em] mb-2">
              Exchange
            </label>
            <SegmentedControl
              segments={exchangeSegments}
              value={selectedExchange}
              onChange={setSelectedExchange}
              size="sm"
            />
          </div>

          {/* API Key */}
          <div>
            <label
              htmlFor="admin-api-key"
              className="block font-mono text-jtp-xs text-jtp-textDim uppercase tracking-[0.1em] mb-1.5"
            >
              API Key
            </label>
            <input
              id="admin-api-key"
              type="text"
              autoComplete="off"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste API key..."
              className="w-full bg-jtp-control border border-jtp-borderStrong rounded-[2px] px-3 py-2 font-mono text-jtp-sm text-jtp-text placeholder:text-jtp-textDim/50 focus:outline-none focus:border-jtp-borderFocus transition-colors"
            />
          </div>

          {/* API Secret */}
          <div>
            <label
              htmlFor="admin-api-secret"
              className="block font-mono text-jtp-xs text-jtp-textDim uppercase tracking-[0.1em] mb-1.5"
            >
              API Secret
            </label>
            <div className="relative">
              <input
                id="admin-api-secret"
                type={showSecret ? 'text' : 'password'}
                autoComplete="new-password"
                value={apiSecret}
                onChange={e => setApiSecret(e.target.value)}
                placeholder="Paste API secret..."
                className="w-full bg-jtp-control border border-jtp-borderStrong rounded-[2px] px-3 py-2 pr-10 font-mono text-jtp-sm text-jtp-text placeholder:text-jtp-textDim/50 focus:outline-none focus:border-jtp-borderFocus transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-jtp-textDim hover:text-jtp-textMuted transition-colors"
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret
                  ? <EyeOffIcon className="w-3.5 h-3.5" />
                  : <EyeIcon className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          </div>

          {/* Testnet toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={testnet}
              onClick={() => setTestnet(v => !v)}
              className={[
                'relative inline-flex items-center rounded-full transition-colors duration-150 focus:outline-none',
                testnet ? 'bg-jtp-amber' : 'bg-jtp-control border border-jtp-borderStrong',
              ].join(' ')}
              style={{ width: '36px', height: '20px' }}
            >
              <span className="sr-only">Testnet</span>
              <span
                className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-150 ${
                  testnet ? 'left-[18px]' : 'left-[3px]'
                }`}
              />
            </button>
            <div>
              <span className="text-jtp-sm text-jtp-textMuted font-medium">Testnet mode</span>
              <span className="ml-2 font-mono text-jtp-xs text-jtp-textDim">
                {testnet ? '(sandbox / paper trading)' : '(LIVE — real funds)'}
              </span>
            </div>
          </div>

          {/* Result message */}
          {saveResult && (
            <p className={`font-mono text-jtp-xs ${saveResult.ok ? 'text-[#3ddc84]' : 'text-jtp-loss'}`}>
              {saveResult.ok ? '✓' : '✗'} {saveResult.msg}
            </p>
          )}

          {/* Save button */}
          <Button
            type="submit"
            variant="primary"
            disabled={saving || !apiKey.trim() || !apiSecret.trim()}
            className="h-8 px-5 font-mono text-jtp-xs tracking-wider"
          >
            {saving ? 'Saving...' : 'Save Keys'}
          </Button>
        </form>

        <p className="font-mono text-jtp-xs text-jtp-textDim leading-relaxed">
          Keys are stored encrypted. Only a masked preview is shown after saving.
          Use read + trade permissions; never enable withdrawals.
          Start with testnet until live performance is confirmed.
        </p>
      </div>
    </Panel>
  );
};

/* ─── AdminPage ──────────────────────────────────────────────────────────── */
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

  /* ── Data fetchers ───────────────────────────────────────────────────── */
  const fetchUsers = async () => {
    if (!accessToken) return;
    try {
      setUsers(await api.getAdminUsers(accessToken));
    } catch (err: any) {
      setError(err.message || 'Failed to refresh users.');
    }
  };

  const fetchTemplates = async () => {
    if (!accessToken) return;
    try {
      setTemplates(await api.getAllPropFirmTemplates(accessToken));
    } catch (err: any) {
      setError(err.message || 'Failed to refresh templates.');
    }
  };

  const fetchPlaybooks = async () => {
    if (!accessToken) return;
    try {
      setPlaybooks(await api.getCommunityPlaybooks(accessToken));
    } catch (err: any) {
      setError(err.message || 'Failed to refresh playbooks.');
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      setError('');
      try {
        const [statsData, usersData, templatesData, playbooksData, configData] =
          await Promise.all([
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
    fetchAll();
  }, [accessToken]);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleBackToDashboard = () => { window.location.hash = ''; };

  const handleToggleMaintenance = async () => {
    if (!accessToken || !systemConfig) return;
    setIsToggling(true);
    try {
      setSystemConfig(await api.toggleMaintenance(!systemConfig.isMaintenanceMode, accessToken));
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
      setSystemConfig(await api.setFreeMode(!systemConfig.freeMode, accessToken));
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
  const handleCloseModal = () => { setSelectedUser(null); setIsModalOpen(false); };
  const handleSuccess = async () => { handleCloseModal(); await fetchUsers(); };
  const handleCreateTemplate = () => { setSelectedTemplate(null); setIsTemplateModalOpen(true); };
  const handleEditTemplate = (t: PropFirmTemplate) => { setSelectedTemplate(t); setIsTemplateModalOpen(true); };
  const handleCloseTemplateModal = () => { setSelectedTemplate(null); setIsTemplateModalOpen(false); };
  const handleTemplateSuccess = async () => { handleCloseTemplateModal(); await fetchTemplates(); };
  const handleDeleteTemplate = async (id: string) => {
    if (!accessToken) return;
    await api.deletePropFirmTemplate(accessToken, id);
  };
  const handleDeletePlaybook = async (id: string) => {
    if (!accessToken) return;
    await api.deletePlaybook(id, accessToken);
  };

  /* ── Content renderer ────────────────────────────────────────────────── */
  const renderContent = () => {
    /* Loading skeleton */
    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Skeleton variant="stat" />
            <Skeleton variant="stat" />
            <Skeleton variant="stat" />
            <Skeleton variant="stat" />
          </div>
          <Skeleton variant="panel" className="h-44" />
        </div>
      );
    }

    /* Error */
    if (error) {
      return (
        <div className="bg-jtp-loss/10 border border-jtp-loss/20 rounded-[2px] px-5 py-6 text-center">
          <p className="text-jtp-lg text-jtp-loss font-medium">{error}</p>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            className="mt-4 text-jtp-sm"
          >
            Retry
          </Button>
        </div>
      );
    }

    /* ── Dashboard ────────────────────────────────────────────────────── */
    if (currentView === 'dashboard') {
      return (
        <div className="space-y-4">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatTile
              label="TOTAL USERS"
              value={String(stats?.totalUsers ?? 0)}
            />
            <StatTile
              label="ONLINE NOW"
              value={String(stats?.onlineUsers ?? 0)}
              valueColor="text-jtp-blue"
            />
            <StatTile
              label="ACTIVE SUBS"
              value={String(stats?.activeSubscriptions ?? 0)}
              valueColor="text-jtp-profit"
            />
            <StatTile
              label="MRR"
              value={`$${(stats?.mrr ?? 0).toFixed(2)}`}
              valueColor="text-jtp-profit"
            />
          </div>

          {/* System controls */}
          <Panel label="SYSTEM CONTROLS">
            <div className="divide-y divide-jtp-borderSubtle max-w-2xl">
              <SystemToggleRow
                label="Maintenance Mode"
                description="Blocks all non-admin access and shows a maintenance page."
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
          </Panel>
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

    if (currentView === 'exchange_keys') {
      return <ExchangeKeysPanel token={accessToken} />;
    }

    return null;
  };

  /* ── Layout ──────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 w-full h-full bg-jtp-bg text-jtp-text flex overflow-hidden font-sans">
      {/* Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isCollapsed={false}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-56 transition-all duration-300">
        {/* Topbar */}
        <header className="flex-shrink-0 h-topbar border-b border-jtp-border flex items-center justify-between px-5 bg-jtp-shell">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-jtp-textDim hover:text-jtp-text transition-colors p-1 rounded-jtp-sm focus:outline-none focus:ring-1 focus:ring-jtp-blue"
              aria-label="Open admin sidebar"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-jtp-xs text-jtp-textDim uppercase tracking-[0.1em]">
                Admin
              </span>
              <span className="text-jtp-textDim text-jtp-xs">/</span>
              <span className="text-jtp-md font-medium text-jtp-textMuted">
                {VIEW_LABELS[currentView]}
              </span>
            </div>
          </div>

          {/* Topbar actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBackToDashboard}
              variant="link"
              className="hidden md:flex text-jtp-md text-jtp-textMuted hover:text-jtp-text"
            >
              &larr; Dashboard
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
        <main
          className="flex-1 overflow-y-auto px-5 py-[18px] pb-10 animate-jtp-fade-in"
          role="main"
          aria-label={`Admin ${VIEW_LABELS[currentView]}`}
        >
          {renderContent()}
        </main>
      </div>

      {/* Grant Pro Access modal */}
      {isModalOpen && selectedUser && (
        <Modal
          title={`Manage Pro Access — ${selectedUser.fullName}`}
          onClose={handleCloseModal}
          size="md"
        >
          <GrantProAccessModal user={selectedUser} onSuccess={handleSuccess} />
        </Modal>
      )}

      {/* Template create / edit modal */}
      {isTemplateModalOpen && (
        <Modal
          title={selectedTemplate ? 'Edit Template' : 'Create Template'}
          onClose={handleCloseTemplateModal}
        >
          <TemplateFormModal
            template={selectedTemplate}
            onSuccess={handleTemplateSuccess}
          />
        </Modal>
      )}
    </div>
  );
};

export default AdminPage;
