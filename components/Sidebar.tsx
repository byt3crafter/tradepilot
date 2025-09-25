import React, { useState, useEffect, useRef } from 'react';
import md5 from 'md5';
import { useAuth } from '../context/AuthContext';
import { DashboardView, SettingsSubView } from '../pages/DashboardPage';
import AuthLogo from './auth/AuthLogo';
import AuthMark from './auth/AuthMark'; // ← NEW
import { JournalIcon } from './icons/JournalIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserIcon } from './icons/UserIcon';
import { useAccount } from '../context/AccountContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlaybookIcon } from './icons/PlaybookIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { AdminIcon } from './icons/AdminIcon';
import { useView } from '../context/ViewContext';
import { User } from '../types';
import { DashboardIcon } from './icons/DashboardIcon';
import Button from './ui/Button';
import { useUI } from '../context/UIContext';
import Tooltip from './ui/Tooltip';
import { ChevronDoubleLeftIcon } from './icons/ChevronDoubleLeftIcon';
import { PlusIcon } from './icons/PlusIcon';

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

  const navItemClasses = `relative flex items-center w-full px-3 py-2.5 rounded-lg transition-colors duration-200 ${
    isActive ? 'text-photonic-blue' : 'text-future-gray hover:bg-future-panel hover:text-future-light'
  } ${isCollapsed ? 'justify-center' : ''}`;

  const content = (
    <Element href={href} onClick={onClick} className={navItemClasses}>
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-0 h-full w-1 bg-photonic-blue rounded-r-sm" />
      )}

      <div className="flex-shrink-0">{icon}</div>

      {!isCollapsed && <span className="ml-4 font-medium transition-opacity duration-200">{label}</span>}
    </Element>
  );

  if (isCollapsed) {
    return <Tooltip text={label}>{content}</Tooltip>;
  }

  return content;
};

const ProfileMenu: React.FC<{
  user: User;
  logout: () => void;
  closeMenu: () => void;
}> = ({ user, logout, closeMenu }) => {
  const { navigateTo } = useView();

  const handleNavigation = (view: DashboardView, subView?: SettingsSubView) => {
    navigateTo(view, subView);
    closeMenu();
  };

  return (
    <div className="absolute bottom-full mb-3 w-56 bg-future-panel border border-photonic-blue/20 rounded-lg shadow-lg p-2 animate-fade-in-up origin-bottom">
      <button
        onClick={() => handleNavigation('personalisation')}
        className="flex items-center w-full px-3 py-2 text-sm rounded-md text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
      >
        <UserIcon className="w-5 h-5 mr-3" />
        <span>Personalisation</span>
      </button>
      <button
        onClick={() => handleNavigation('settings', 'accounts')}
        className="flex items-center w-full px-3 py-2 text-sm rounded-md text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
      >
        <SettingsIcon className="w-5 h-5 mr-3" />
        <span>Settings</span>
      </button>
      <button
        onClick={() => handleNavigation('subscription')}
        className="flex items-center w-full px-3 py-2 text-sm rounded-md text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
      >
        <CreditCardIcon className="w-5 h-5 mr-3" />
        <span>Subscription</span>
      </button>
      {user.role === 'ADMIN' && (
        <a
          href="/#/admin-panel"
          className="flex items-center w-full px-3 py-2 text-sm rounded-md text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
        >
          <AdminIcon className="w-5 h-5 mr-3" />
          <span>Admin Panel</span>
        </a>
      )}
      <div className="my-1 border-t border-photonic-blue/10"></div>
      <button
        onClick={logout}
        className="flex items-center w-full px-3 py-2 text-sm rounded-md text-future-gray hover:bg-risk-high/10 hover:text-risk-high transition-colors"
      >
        <LogoutIcon className="w-5 h-5 mr-3" />
        <span>Log off</span>
      </button>
    </div>
  );
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
            className="w-full h-12 flex items-center justify-center text-future-gray border border-dashed border-photonic-blue/20 rounded-lg hover:bg-photonic-blue/5 hover:text-future-light"
          >
            <PlusIcon className="w-6 h-6" />
          </Button>
        </Tooltip>
      );
    }
    return (
      <Button
        variant="link"
        onClick={() => navigateTo('settings', 'accounts')}
        className="w-full text-sm text-center text-future-gray border border-dashed border-photonic-blue/20 rounded-lg hover:bg-photonic-blue/5 hover:text-future-light p-3"
      >
        Create an account to begin.
      </Button>
    );
  }

  return (
    <div className="relative" ref={switcherRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-future-dark/50 border border-photonic-blue/20 rounded-lg text-left hover:bg-future-panel transition-colors h-14"
      >
        {isCollapsed ? (
          <div className="w-full text-center">
            <span className="font-orbitron text-photonic-blue">{initials}</span>
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-future-light truncate">{activeAccount.name}</p>
              <p className="text-xs text-future-gray truncate">{activeAccount.type.replace('_', ' ')}</p>
            </div>
            <ChevronDownIcon
              className={`w-5 h-5 text-future-gray transition-transform flex-shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>
      {isOpen && (
        <div
          className={`absolute top-0 mt-0 bg-future-panel border border-photonic-blue/20 rounded-lg shadow-lg p-1 z-10 animate-fade-in-up ${
            isCollapsed ? 'left-full ml-2 w-56' : 'top-full mt-2 w-full'
          }`}
        >
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                switchAccount(account.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm rounded-md text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
            >
              {account.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { currentView, navigateTo } = useView();
  const { isSidebarCollapsed, toggleSidebar } = useUI();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSetView = (view: DashboardView) => {
    navigateTo(view);
    onClose();
  };

  if (!user) return null;

  const gravatarHash = md5(user.email.trim().toLowerCase());
  const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?d=identicon&s=100`;

  return (
    <>
      <div
        className={`fixed inset-0 bg-future-dark/60 z-30 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed top-0 left-0 h-full bg-future-panel/90 backdrop-blur-md border-r border-photonic-blue/10 flex-shrink-0 flex flex-col p-4 z-40 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-56'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* BRAND — always visible, swaps between full logo and mini mark */}
        <div className={`mb-6 transition-all duration-300 ${isSidebarCollapsed ? 'px-0 text-center' : 'px-2'}`}>
          <button
            onClick={() => handleSetView('dashboard')}
            className={`${
              isSidebarCollapsed ? 'w-12 h-12 mx-auto grid place-items-center' : 'w-full'
            } rounded-lg focus:outline-none focus:ring-1 focus:ring-photonic-blue/40`}
            aria-label="TradePilot Home"
          >
            {isSidebarCollapsed ? (
              <AuthMark size={22} />
            ) : (
              <AuthLogo />
            )}
          </button>
        </div>

        <div className="mb-6">
          <AccountSwitcher isCollapsed={isSidebarCollapsed} />
        </div>

        <nav className="flex-1 flex flex-col">
          <NavItem
            icon={<DashboardIcon className="w-6 h-6" />}
            label="Dashboard"
            isActive={currentView === 'dashboard'}
            onClick={() => handleSetView('dashboard')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<JournalIcon className="w-6 h-6" />}
            label="Trade Journal"
            isActive={currentView === 'journal'}
            onClick={() => handleSetView('journal')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<PlaybookIcon className="w-6 h-6" />}
            label="Playbooks"
            isActive={currentView === 'playbooks'}
            onClick={() => handleSetView('playbooks')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<SettingsIcon className="w-6 h-6" />}
            label="Settings"
            isActive={currentView === 'settings'}
            onClick={() => handleSetView('settings')}
            isCollapsed={isSidebarCollapsed}
          />
        </nav>

        <div className="mt-auto" ref={menuRef}>
          <div className={`border-t border-photonic-blue/10 pt-4 transition-all duration-300`}>
            <div className="relative">
              {isMenuOpen && !isSidebarCollapsed && (
                <ProfileMenu user={user} logout={logout} closeMenu={() => setIsMenuOpen(false)} />
              )}
              <button
                onClick={() => !isSidebarCollapsed && setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-3 w-full text-left rounded-lg p-2 transition-colors ${
                  !isSidebarCollapsed ? 'hover:bg-future-panel' : ''
                } ${isSidebarCollapsed ? 'justify-center' : 'px-2'}`}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                <img
                  src={gravatarUrl}
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full border-2 border-photonic-blue/50 flex-shrink-0"
                />
                {!isSidebarCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-future-light text-sm truncate">{user.fullName}</p>
                    <p className="text-future-gray text-xs truncate">{user.email}</p>
                  </div>
                )}
              </button>
            </div>
          </div>
          <div className={`mt-2 border-t border-photonic-blue/10 pt-2`}>
            <Tooltip text={isSidebarCollapsed ? 'Expand' : 'Collapse'}>
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center p-2 rounded-lg text-future-gray hover:bg-future-panel hover:text-future-light transition-colors"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronDoubleLeftIcon
                  className={`w-5 h-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
                />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
