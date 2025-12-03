import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardView, SettingsSubView } from '../pages/DashboardPage';
import AuthLogo from './auth/AuthLogo';
import AuthMark from './auth/AuthMark';
import { JournalIcon } from './icons/JournalIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { UserButton } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
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

      {!isCollapsed && (
        <span className="ml-3 text-xs font-normal uppercase tracking-widest">{label}</span>
      )}
    </Element>
  );

  if (isCollapsed) {
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
  const { user } = useAuth();
  const { currentView, navigateTo } = useView();
  const { isSidebarCollapsed, toggleSidebar } = useUI();

  const handleSetView = (view: DashboardView) => {
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
        className={`fixed top-0 left-0 h-screen bg-[#08090A] border-r border-white/10 flex-shrink-0 flex flex-col z-40 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${isSidebarCollapsed ? 'w-16' : 'w-64'
          } ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* BRAND */}
        <div className={`h-16 flex items-center border-b border-white/10 ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
          {isSidebarCollapsed ? (
            <AuthMark size={18} />
          ) : (
            <AuthLogo />
          )}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="text-secondary hover:text-white transition-colors"
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
        </div>

        <div className="mt-auto p-4 border-t border-white/10">
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

          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <UserButton
              appearance={{
                baseTheme: dark,
                elements: {
                  avatarBox: "w-8 h-8 rounded-full border border-white/10",
                  userButtonPopoverCard: "bg-[#08090A] border border-white/10 shadow-xl",
                  userButtonPopoverFooter: "hidden",
                  userButtonTrigger: "focus:shadow-none"
                }
              }}
            />
            {!isSidebarCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-medium text-white truncate">{user.fullName}</p>
                <p className="text-[9px] text-secondary truncate uppercase tracking-wider">JTradePilot Pro</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;