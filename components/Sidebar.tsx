import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardView } from '../pages/DashboardPage';
import { useClerk } from '@clerk/clerk-react';
import { useAccount } from '../context/AccountContext';
import { useView } from '../context/ViewContext';
import { useUI } from '../context/UIContext';
import { PlusIcon } from './icons/PlusIcon';
import Button from './ui/Button';

// ─── Icon set (minimal inline SVGs matching the comp) ─────────────────────────

const JournalSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <rect x="3" y="2" width="10" height="12" rx="1.5" />
    <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
    <line x1="5.5" y1="8" x2="10.5" y2="8" />
    <line x1="5.5" y1="10.5" x2="8.5" y2="10.5" />
  </svg>
);

const DashboardSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

const NotebookSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <rect x="3" y="2" width="10" height="12" rx="1.5" />
    <line x1="6" y1="2" x2="6" y2="14" strokeLinecap="round" />
    <line x1="8.5" y1="5.5" x2="11" y2="5.5" strokeLinecap="round" />
    <line x1="8.5" y1="8" x2="11" y2="8" strokeLinecap="round" />
    <line x1="8.5" y1="10.5" x2="10" y2="10.5" strokeLinecap="round" />
  </svg>
);

const AnalyticsSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <polyline points="2,12 5,8 8,10 11,5 14,7" />
  </svg>
);

const QuantSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="3" />
    <path d="M8 8L13 4" strokeLinecap="round" />
    <circle cx="8" cy="8" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

const PlaybookSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M3 3h10v2H3zM3 7h7v2H3zM3 11h5v2H3z" strokeLinejoin="round" />
  </svg>
);

const SettingsSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1" strokeLinecap="round" />
  </svg>
);

const AdminSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path d="M8 2L3 4.5v4c0 2.9 2.2 5.4 5 6 2.8-.6 5-3.1 5-6v-4L8 2z" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const BotSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <rect x="2" y="5" width="12" height="8" rx="2" />
    <circle cx="5.5" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="9" r="1" fill="currentColor" stroke="none" />
    <line x1="5.5" y1="12" x2="10.5" y2="12" strokeLinecap="round" />
    <path d="M8 5V3" strokeLinecap="round" />
    <circle cx="8" cy="2.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const LogoutSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
    <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" strokeLinecap="round" />
    <polyline points="10,5 13,8 10,11" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="7" y1="8" x2="13" y2="8" strokeLinecap="round" />
  </svg>
);

const ManageAccountSvg = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
    <circle cx="8" cy="5" r="2.5" />
    <path d="M3 13c0-2.761 2.239-5 5-5s5 2.239 5 5" strokeLinecap="round" />
  </svg>
);

const ChevronSvg = ({ open }: { open?: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
  >
    <polyline points="4,6 8,10 12,6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Account Switcher ────────────────────────────────────────────────────────

const AccountSwitcher: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const { accounts, activeAccount, switchAccount } = useAccount();
  const { navigateTo } = useView();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { isSubscribed } = useAuth();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const tag = activeAccount
    ? activeAccount.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : '';

  if (!activeAccount) {
    return (
      <Button
        variant="link"
        disabled={!isSubscribed}
        onClick={() => (isSubscribed ? navigateTo('settings', 'accounts') : navigateTo('pricing'))}
        className={`w-full text-jtp-xs text-center border border-dashed border-jtp-border rounded-jtp-2xl py-2 ${
          isSubscribed
            ? 'text-jtp-textDim hover:border-jtp-borderFocus hover:text-jtp-textMuted'
            : 'text-jtp-textDisabled cursor-not-allowed opacity-50'
        }`}
      >
        <PlusIcon className="w-3 h-3 inline mr-1" /> Add Account
      </Button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-[10px] px-[10px] py-[9px] bg-jtp-active border border-jtp-borderStrong rounded-jtp-2xl cursor-pointer text-left hover:bg-[#191d23] transition-colors"
      >
        {/* Account tag */}
        <div className="w-[26px] h-[26px] rounded-jtp-lg bg-jtp-accountTag flex items-center justify-center flex-shrink-0">
          <span className="text-jtp-sm-minus font-semibold text-jtp-textMuted">{tag}</span>
        </div>

        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-jtp-base-minus font-semibold text-jtp-text truncate">
                {activeAccount.name}
              </div>
              <div className="font-mono text-jtp-xs-plus text-jtp-textDim">
                ${activeAccount.currentBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
            <ChevronSvg open={isOpen} />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 bg-jtp-panel border border-jtp-borderStrong rounded-jtp-2xl shadow-jtp-drawer p-1 w-56 ${
            isCollapsed ? 'left-full ml-2 top-0' : 'top-full mt-1 left-0'
          }`}
        >
          <div className="max-h-60 overflow-y-auto">
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => { switchAccount(acc.id); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 text-jtp-base-minus rounded-jtp-xl transition-colors ${
                  acc.id === activeAccount.id
                    ? 'text-jtp-blue bg-[rgba(232,162,61,0.1)]'
                    : 'text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text'
                }`}
              >
                {acc.name}
              </button>
            ))}
          </div>
          <div className="border-t border-jtp-border mt-1 pt-1">
            <button
              disabled={!isSubscribed}
              onClick={() => {
                if (isSubscribed) { navigateTo('settings', 'accounts'); setIsOpen(false); }
                else { navigateTo('pricing'); setIsOpen(false); }
              }}
              className={`w-full text-left px-3 py-2 text-jtp-xs flex items-center gap-2 rounded-jtp-xl transition-colors ${
                isSubscribed
                  ? 'text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text'
                  : 'text-jtp-textDisabled cursor-not-allowed opacity-50'
              }`}
            >
              <PlusIcon className="w-3 h-3" /> Create Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Nav item ───────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, badge, isActive, isCollapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-[11px] px-[10px] py-[8px] rounded-jtp-xl border-none cursor-pointer text-left text-jtp-md font-medium transition-colors ${
      isActive
        ? 'text-jtp-blue'
        : 'bg-transparent text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text'
    } ${isCollapsed ? 'justify-center' : ''}`}
    title={isCollapsed ? label : undefined}
    aria-current={isActive ? 'page' : undefined}
    /* Left rail accent via inset box-shadow — stays within border-radius */
    style={isActive ? { boxShadow: 'inset 3px 0 0 #e8a23d', backgroundColor: 'rgba(232,162,61,0.08)' } : undefined}
  >
    <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{icon}</span>
    {!isCollapsed && (
      <>
        <span className="flex-1">{label}</span>
        {badge !== undefined && (
          <span className="font-mono text-jtp-xs text-jtp-textDim">{badge}</span>
        )}
      </>
    )}
  </button>
);

// ─── Main Sidebar ────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isSubscribed, logout, botEnabled, quantEnabled } = useAuth();
  const { currentView, navigateTo } = useView();
  const { isSidebarCollapsed } = useUI();
  const { activeAccount } = useAccount();
  const { openUserProfile } = useClerk();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNav = (view: DashboardView) => {
    if (window.location.pathname !== '/dashboard' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    navigateTo(view);
    onClose();
  };

  const initials = user?.fullName
    ? user.fullName.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';

  const accountSubtitle = (() => {
    const tier = isSubscribed ? 'Pro' : 'Free';
    const accType = activeAccount?.type === 'PROP_FIRM' ? 'Prop' : activeAccount?.type === 'DEMO' ? 'Demo' : activeAccount ? 'Live' : null;
    return accType ? `${accType} · ${tier}` : tier;
  })();

  if (!user) return null;

  const sidebarWidth = isSidebarCollapsed ? 'md:w-16' : 'md:w-[228px]';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-[28px] left-0 bg-jtp-shell border-r border-jtp-border flex-shrink-0 flex flex-col z-40 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] w-[228px] ${sidebarWidth} ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* ── Brand block (52 px) ── */}
        <div
          className="flex-shrink-0 flex items-center border-b border-jtp-border"
          style={{ height: '52px', padding: '0 16px', gap: '10px' }}
        >
          {/* Brand mark — JTP app icon */}
          <img
            src="/JTP_logo.png"
            alt="JTradePilot"
            className="flex-shrink-0"
            style={{ width: '24px', height: '24px' }}
          />

          {!isSidebarCollapsed && (
            <div className="flex flex-col leading-none">
              <span
                className="text-jtp-lg font-semibold text-jtp-text"
                style={{ letterSpacing: '-0.2px' }}
              >
                JTradePilot
              </span>
              <span
                className="font-mono text-jtp-2xs text-jtp-textDim uppercase tracking-[0.08em]"
                style={{ marginTop: '2px' }}
              >
                PRO TRADING TERMINAL
              </span>
            </div>
          )}
        </div>

        {/* ── Account switcher ── */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2">
          <AccountSwitcher isCollapsed={isSidebarCollapsed} />
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-[6px] flex flex-col gap-[2px] overflow-y-auto">
          {isSubscribed && (
            <>
              <NavItem
                icon={<DashboardSvg />}
                label="Dashboard"
                isActive={currentView === 'dashboard'}
                isCollapsed={isSidebarCollapsed}
                onClick={() => handleNav('dashboard')}
              />
              <NavItem
                icon={<JournalSvg />}
                label="Journal"
                isActive={currentView === 'journal'}
                isCollapsed={isSidebarCollapsed}
                onClick={() => handleNav('journal')}
              />
              <NavItem
                icon={<NotebookSvg />}
                label="Notebook"
                isActive={currentView === 'notebook'}
                isCollapsed={isSidebarCollapsed}
                onClick={() => handleNav('notebook')}
              />
              <NavItem
                icon={<AnalyticsSvg />}
                label="Analytics"
                isActive={currentView === 'analytics'}
                isCollapsed={isSidebarCollapsed}
                onClick={() => handleNav('analytics')}
              />
              <NavItem
                icon={<PlaybookSvg />}
                label="Playbooks"
                isActive={currentView === 'playbooks'}
                isCollapsed={isSidebarCollapsed}
                onClick={() => handleNav('playbooks')}
              />
              {quantEnabled && (
                <NavItem
                  icon={<QuantSvg />}
                  label="Quant"
                  isActive={currentView === 'quant'}
                  isCollapsed={isSidebarCollapsed}
                  onClick={() => handleNav('quant')}
                />
              )}
              {botEnabled && (
                <NavItem
                  icon={<BotSvg />}
                  label="Bot"
                  isActive={currentView === 'bot'}
                  isCollapsed={isSidebarCollapsed}
                  onClick={() => handleNav('bot')}
                />
              )}
            </>
          )}

          <NavItem
            icon={<SettingsSvg />}
            label="Settings"
            isActive={currentView === 'settings'}
            isCollapsed={isSidebarCollapsed}
            onClick={() => handleNav('settings')}
          />

          {user?.role === 'ADMIN' && (
            <NavItem
              icon={<AdminSvg />}
              label="Admin"
              isActive={false}
              isCollapsed={isSidebarCollapsed}
              onClick={() => { window.location.hash = '#/admin-panel'; onClose(); }}
            />
          )}

          {!isSubscribed && (
            <NavItem
              icon={<span className="text-jtp-profit text-xs">↑</span>}
              label="Upgrade to Pro"
              isActive={currentView === 'subscription' || currentView === 'pricing'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => handleNav('pricing')}
            />
          )}
        </nav>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-jtp-border px-[14px] py-[10px] flex flex-col gap-[10px]">
          {/* User block */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`w-full flex items-center gap-[9px] hover:bg-jtp-hover rounded-jtp-xl px-1 py-1 transition-colors text-left ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: '26px',
                  height: '26px',
                  background: '#222933',
                }}
              >
                <span className="text-jtp-sm-minus font-semibold text-jtp-textMuted">
                  {initials}
                </span>
              </div>

              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-jtp-base-minus font-medium text-jtp-text truncate">
                    {user.fullName}
                  </div>
                  <div className="text-jtp-xs text-jtp-textDim truncate">{accountSubtitle}</div>
                </div>
              )}
            </button>

            {/* Profile popup */}
            {isProfileOpen && (
              <div
                className={`absolute z-50 bg-jtp-panel border border-jtp-borderStrong rounded-jtp-2xl shadow-jtp-drawer p-1 w-48 ${
                  isSidebarCollapsed ? 'left-full ml-2 bottom-0' : 'bottom-full mb-2 left-0 w-full'
                }`}
              >
                <button
                  onClick={() => { openUserProfile(); setIsProfileOpen(false); }}
                  className="w-full text-left px-3 py-2 text-jtp-xs text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text rounded-jtp-xl transition-colors flex items-center gap-2"
                >
                  <ManageAccountSvg /> Manage Account
                </button>
                {user?.role === 'ADMIN' && (
                  <>
                    <div className="border-t border-jtp-border my-1" />
                    <button
                      onClick={() => { window.location.hash = '#/admin-panel'; setIsProfileOpen(false); }}
                      className="w-full text-left px-3 py-2 text-jtp-xs text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text rounded-jtp-xl transition-colors flex items-center gap-2"
                    >
                      <AdminSvg /> Admin
                    </button>
                  </>
                )}
                <div className="border-t border-jtp-border my-1" />
                <button
                  onClick={() => { logout(); setIsProfileOpen(false); }}
                  className="w-full text-left px-3 py-2 text-jtp-xs text-jtp-loss hover:bg-[rgba(229,99,95,0.1)] rounded-jtp-xl transition-colors flex items-center gap-2"
                >
                  <LogoutSvg /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
