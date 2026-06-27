/**
 * AdminSidebar — Operator Console navigation for the admin area.
 *
 * Design: matches the main app Sidebar in structure but carries
 * "ADMIN CONSOLE" branding. Active item uses the left-rail accent
 * (inset box-shadow) from the design system.
 */
import React from 'react';
import AuthLogo from '../auth/AuthLogo';
import AuthMark from '../auth/AuthMark';
import { AdminIcon } from '../icons/AdminIcon';
import { UserIcon } from '../icons/UserIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { PlaybookIcon } from '../icons/PlaybookIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';

type AdminView =
  | 'dashboard'
  | 'users'
  | 'templates'
  | 'playbooks'
  | 'referrals'
  | 'promo_codes'
  | 'pricing_plans';

interface AdminSidebarProps {
  currentView: AdminView;
  onNavigate: (view: AdminView) => void;
  isCollapsed: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const AdminNavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}) => (
  <button
    onClick={onClick}
    aria-current={isActive ? 'page' : undefined}
    title={isCollapsed ? label : undefined}
    className={[
      'relative flex items-center w-full my-0.5 transition-all duration-150 group',
      'rounded-jtp-md focus:outline-none focus:ring-1 focus:ring-jtp-blue/40',
      isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
      isActive
        ? 'bg-[rgba(232,162,61,0.10)] text-jtp-blue'
        : 'text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-text',
    ].join(' ')}
    style={isActive ? { boxShadow: 'inset 2px 0 0 #e8a23d' } : undefined}
  >
    {/* Icon */}
    <span
      className={`flex-shrink-0 ${
        isActive
          ? 'text-jtp-blue'
          : 'text-jtp-textDim group-hover:text-jtp-textMuted'
      }`}
    >
      {icon}
    </span>

    {/* Label */}
    {!isCollapsed && (
      <span
        className={`ml-3 text-jtp-md font-medium tracking-tight ${
          isActive ? 'text-jtp-blue' : ''
        }`}
      >
        {label}
      </span>
    )}
  </button>
);

const NAV_ITEMS: Array<{
  view: AdminView;
  label: string;
  icon: (cls: string) => React.ReactNode;
}> = [
  { view: 'dashboard',     label: 'Dashboard',      icon: (c) => <AdminIcon className={c} /> },
  { view: 'users',         label: 'Users',           icon: (c) => <UserIcon className={c} /> },
  { view: 'templates',     label: 'Templates',       icon: (c) => <SettingsIcon className={c} /> },
  { view: 'playbooks',     label: 'Playbooks',       icon: (c) => <PlaybookIcon className={c} /> },
  { view: 'pricing_plans', label: 'Pricing',         icon: (c) => <CreditCardIcon className={c} /> },
  { view: 'referrals',     label: 'Referrals',       icon: (c) => <UsersIcon className={c} /> },
  { view: 'promo_codes',   label: 'Promo Codes',     icon: (c) => <SparklesIcon className={c} /> },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed,
  isOpen = false,
  onClose,
}) => (
  <>
    {/* Mobile backdrop */}
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
      aria-hidden="true"
    />

    <aside
      className={[
        'fixed top-0 left-0 h-full bg-jtp-shell border-r border-jtp-border',
        'flex-shrink-0 flex flex-col z-50 transition-all duration-300 overflow-y-auto',
        isCollapsed ? 'md:w-16' : 'md:w-56',
        'w-56',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >
      {/* Brand */}
      <div
        className={`h-topbar flex items-center border-b border-jtp-border flex-shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'px-5'
        }`}
      >
        <a href="/" className="hover:opacity-80 transition-opacity" aria-label="JTradePilot home">
          {isCollapsed ? <AuthMark size={18} /> : <AuthLogo />}
        </a>
      </div>

      {/* Admin Console badge */}
      <div
        className={`px-3 py-3 border-b border-jtp-border ${
          isCollapsed ? 'flex justify-center' : ''
        }`}
      >
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-jtp-md bg-jtp-blue/10 border border-jtp-blue/20 flex items-center justify-center flex-shrink-0">
            <AdminIcon className="w-3.5 h-3.5 text-jtp-blue" />
          </div>
          {!isCollapsed && (
            <div>
              <p className="font-mono text-[10px] font-semibold text-jtp-blue uppercase tracking-[0.12em] leading-none">
                Admin Console
              </p>
              <p className="text-jtp-xs text-jtp-textDim mt-0.5 leading-none">
                System Management
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col px-2 py-3 gap-0" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ view, label, icon }) => (
          <AdminNavItem
            key={view}
            icon={icon('w-4 h-4')}
            label={label}
            isActive={currentView === view}
            isCollapsed={isCollapsed}
            onClick={() => { onNavigate(view); onClose?.(); }}
          />
        ))}
      </nav>
    </aside>
  </>
);

export default AdminSidebar;
