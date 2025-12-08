import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardView, SettingsSubView } from '../pages/DashboardPage';
import AuthLogo from './auth/AuthLogo';
import AuthMark from './auth/AuthMark';
import { JournalIcon } from './icons/JournalIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { useClerk } from '@clerk/clerk-react';
import { useAccount } from '../context/AccountContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlaybookIcon } from './icons/PlaybookIcon';
import { useView } from '../context/ViewContext';
import { DashboardIcon } from './icons/DashboardIcon';
import Button from './ui/Button';
import { useUI } from '../context/UIContext';
import Tooltip from './ui/Tooltip';
import { ChevronDoubleLeftIcon } from './icons/ChevronDoubleLeftIcon';
import { PlusIcon } from './icons/PlusIcon';
import { AnalyticsIcon } from './icons/AnalyticsIcon';
import { UsersIcon } from './icons/UsersIcon';
import { LogoutIcon } from './icons/LogoutIcon';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  href?: string;
}> = ({ icon, label, isActive, isCollapsed, onClick, href }) => {
  const Element: any = href ? 'a' : 'button';

  // Aesthetic: Clean, sharp edges, distinct active state text color
  const navItemClasses = `relative flex items-center w-full px-4 py-2 my-0.5 transition-all duration-200 group ${isActive
    ? 'text-white bg-white/[0.03] border-r-2 border-white'
    : 'text-secondary hover:text-white hover:bg-white/[0.02]'
    } ${isCollapsed ? 'justify-center px-2' : ''}`;

  const content = (
    <Element href={href} onClick={onClick} className={navItemClasses}>
      <div className={`flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:opacity-80'}`}>
        {icon}
      </div>

      <span className={`ml-3 text-xs font-normal uppercase tracking-widest ${isCollapsed ? 'hidden md:hidden' : ''} md:block`}>
        {label}
      </span>
      {/* Mobile override: Always show text on mobile even if isCollapsed is true (though we try to prevent that) */}
      <span className={`ml-3 text-xs font-normal uppercase tracking-widest md:hidden ${!isCollapsed ? 'hidden' : 'block'}`}>
        {label}
      </span>
    </Element>
  );

  if (isCollapsed) {
    // On mobile, we don't want the tooltip, we want the text.
    // But Tooltip wrapper might interfere.
    // Let's rely on the parent passing the correct isCollapsed state.
    return <Tooltip text={label}>{content}</Tooltip>;
  }

  return content;
};

const AccountSwitcher: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const { accounts, activeAccount, switchAccount } = useAccount();
  const { navigateTo } = useView();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const initials = activeAccount
    ? activeAccount.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
    : '';

  if (!activeAccount) {
    if (isCollapsed) {
      return (
        <Tooltip text="Create an account">
          <Button
            variant="link"
            onClick={() => navigateTo('settings', 'accounts')}
            className="w-full h-8 flex items-center justify-center text-secondary border border-dashed border-white/10 rounded hover:bg-white/5 hover:text-white"
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        </Tooltip>
      );
    }
    return (
      <Button
        variant="link"
        onClick={() => navigateTo('settings', 'accounts')}
        className="w-full text-xs text-center text-secondary border border-dashed border-white/10 rounded hover:bg-white/5 hover:text-white py-2 uppercase tracking-wide"
      >
        + Add Account
      </Button>
    );
  }

  return (
    <div className="relative" ref={switcherRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-white/10 rounded bg-white/[0.01] hover:bg-white/[0.03] transition-colors group"
      >
        {isCollapsed ? (
          <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center mx-auto border border-white/10">
            <span className="font-mono text-[10px] text-white">{initials}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center border border-white/10 shrink-0">
                <span className="font-mono text-[10px] text-white">{initials}</span>
              </div>
              <div className="overflow-hidden text-left">
                <p className="font-medium text-xs text-white truncate">{activeAccount.name}</p>
                <p className="text-[9px] text-secondary truncate uppercase tracking-wider">{activeAccount.type.replace('_', ' ')}</p>
              </div>
            </div>
            <ChevronDownIcon
              className={`w-3 h-3 text-secondary group-hover:text-white transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''
                }`}
            />
          </>
        )}
      </button>
      {isOpen && (
        <div
          className={`absolute top-0 mt-0 bg-[#08090A] border border-white/10 rounded shadow-2xl p-1 z-50 w-56 ${isCollapsed ? 'left-full ml-2' : 'top-full mt-2 w-full left-0'
            }`}
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  switchAccount(account.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-white/5 hover:text-white transition-colors"
              >
                {account.name}
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 mt-1 pt-1">
            <button
              onClick={() => {
                navigateTo('settings', 'accounts');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2 uppercase tracking-wide"
            >
              <PlusIcon className="w-3 h-3" /> Create Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isTrialing, isSubscribed, logout } = useAuth();
  const { currentView, navigateTo } = useView();
  const { isSidebarCollapsed, toggleSidebar } = useUI();
  const { openUserProfile } = useClerk();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Determine user tier/role display
  const getUserTierDisplay = (): { label: string; color: string } => {
    if (user?.role === 'ADMIN') {
      return { label: 'Admin', color: 'text-risk-high' };
    }
    if (isSubscribed) {
      return { label: 'Pro', color: 'text-momentum-green' };
    }
    if (isTrialing) {
      return { label: 'Trial', color: 'text-photonic-blue' };
    }
    return { label: 'Free', color: 'text-secondary' };
  };

  const handleSetView = (view: DashboardView) => {
    if (window.location.pathname !== '/dashboard' && window.location.pathname !== '/') {
      // If on a standalone page (like /referral), we need to navigate back to dashboard
      // App.tsx listens to popstate, so we push state and dispatch the event
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    navigateTo(view);
    onClose();
  };

  if (!user) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed top-0 left-0 h-screen bg-[#08090A] border-r border-white/10 flex-shrink-0 flex flex-col z-40 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] w-64 ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
          } ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* BRAND */}
        <div className={`h-16 flex items-center border-b border-white/10 ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
          {isSidebarCollapsed ? (
            <AuthMark size={18} />
          ) : (
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/JTP_logo.png" alt="JTP Logo" className="h-6 w-auto" />
              <span className="px-2 py-1 bg-photonic-blue/20 border border-photonic-blue/50 rounded text-xs font-bold text-photonic-blue uppercase tracking-wider">
                BETA
              </span>
            </a>
          )}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="hidden md:block text-secondary hover:text-white transition-colors"
            >
              <ChevronDoubleLeftIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-4 border-b border-white/10">
          <AccountSwitcher isCollapsed={isSidebarCollapsed} />
        </div>

        <div className={`flex-1 flex flex-col py-4 gap-1 ${!isSidebarCollapsed ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <NavItem
            icon={<DashboardIcon className="w-4 h-4" />}
            label="Dashboard"
            isActive={currentView === 'dashboard'}
            onClick={() => handleSetView('dashboard')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<JournalIcon className="w-4 h-4" />}
            label="Journal"
            isActive={currentView === 'journal'}
            onClick={() => handleSetView('journal')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<PlaybookIcon className="w-4 h-4" />}
            label="Playbooks"
            isActive={currentView === 'playbooks'}
            onClick={() => handleSetView('playbooks')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<AnalyticsIcon className="w-4 h-4" />}
            label="Analytics"
            isActive={currentView === 'analytics'}
            onClick={() => handleSetView('analytics')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<SettingsIcon className="w-4 h-4" />}
            label="Settings"
            isActive={currentView === 'settings'}
            onClick={() => handleSetView('settings')}
            isCollapsed={isSidebarCollapsed}
          />

          <div className="my-2 border-t border-white/10 mx-4" />

          <NavItem
            icon={<UsersIcon className="w-4 h-4 text-momentum-green" />}
            label="Refer & Earn"
            isActive={window.location.pathname === '/referral'}
            onClick={() => {
              if (window.location.pathname !== '/referral') {
                window.history.pushState({}, '', '/referral');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
              onClose();
            }}
            isCollapsed={isSidebarCollapsed}
          />
        </div>

        <div className="mt-auto p-4 border-t border-white/10 pb-8 md:pb-4">
          {isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 mb-4 text-secondary hover:text-white transition-colors"
            >
              <ChevronDoubleLeftIcon
                className="w-4 h-4 rotate-180"
              />
            </button>
          )}

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`hidden md:flex items-center gap-3 w-full hover:bg-white/5 p-2 rounded-lg transition-colors text-left group ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                {user.preferences?.useGravatar ? (
                  <>
                    <img
                      src={user.gravatarUrl}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full border border-white/10 group-hover:border-white/30 transition-colors"
                      onError={(e) => {
                        // Fallback to initials if image fails
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {user.fullName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user.fullName.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {!isSidebarCollapsed && (
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-medium text-white truncate">{user.fullName}</p>
                  <p className={`text-[9px] truncate uppercase tracking-wider ${getUserTierDisplay().color}`}>
                    JTradePilot {getUserTierDisplay().label}
                  </p>
                  {user.isEarlySupporter && (
                    <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded bg-momentum-green/10 border border-momentum-green/20">
                      <span className="text-[8px] font-bold text-momentum-green uppercase tracking-wider leading-none">
                        Early Supporter
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>

            {isProfileOpen && (
              <div
                className={`absolute bottom-full mb-2 bg-[#08090A] border border-white/10 rounded shadow-2xl p-1 z-50 w-56 ${isSidebarCollapsed ? 'left-full ml-2 bottom-0' : 'left-0 w-full'
                  }`}
              >
                <button
                  onClick={() => {
                    openUserProfile();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                >
                  <UsersIcon className="w-3 h-3" /> Manage Account
                </button>
                <div className="border-t border-white/10 my-1"></div>
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-risk-high hover:bg-risk-high/10 transition-colors flex items-center gap-2"
                >
                  <LogoutIcon className="w-3 h-3" /> Log Out
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