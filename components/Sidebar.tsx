
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DashboardView, SettingsSubView } from '../pages/DashboardPage';
import AuthLogo from './auth/AuthLogo';
import AuthMark from './auth/AuthMark';
import { JournalIcon } from './icons/JournalIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { UserButton } from '@clerk/clerk-react';
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
import { TrackerIcon } from './icons/TrackerIcon';

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

  const navItemClasses = `relative flex items-center w-full px-3 py-2.5 my-1 rounded-lg transition-all duration-200 group ${
    isActive ? 'text-white bg-white/5' : 'text-secondary hover:text-white hover:bg-white/5'
  } ${isCollapsed ? 'justify-center' : ''}`;

  const content = (
    <Element href={href} onClick={onClick} className={navItemClasses}>
      {isActive && (
        <span className={`absolute left-0 w-1 h-6 bg-white rounded-r-full transition-all duration-300 ${isCollapsed ? 'left-[-4px]' : 'left-[-8px]'}`} />
      )}

      <div className={`flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
      </div>

      {!isCollapsed && <span className="ml-4 font-medium text-sm tracking-wide">{label}</span>}
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
            className="w-full h-10 flex items-center justify-center text-secondary border border-dashed border-white/20 rounded-lg hover:bg-white/5 hover:text-white"
          >
            <PlusIcon className="w-5 h-5" />
          </Button>
        </Tooltip>
      );
    }
    return (
      <Button
        variant="link"
        onClick={() => navigateTo('settings', 'accounts')}
        className="w-full text-sm text-center text-secondary border border-dashed border-white/20 rounded-lg hover:bg-white/5 hover:text-white p-2"
      >
        + Add Account
      </Button>
    );
  }

  return (
    <div className="relative" ref={switcherRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-left hover:bg-white/5 transition-colors group"
      >
        {isCollapsed ? (
          <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center mx-auto border border-white/10 group-hover:border-white/30 transition-colors">
            <span className="font-orbitron text-xs text-white">{initials}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center border border-white/10 shrink-0">
                    <span className="font-orbitron text-xs text-white">{initials}</span>
                </div>
                <div className="overflow-hidden">
                    <p className="font-semibold text-sm text-white truncate">{activeAccount.name}</p>
                    <p className="text-[10px] text-secondary truncate uppercase tracking-wider">{activeAccount.type.replace('_', ' ')}</p>
                </div>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 text-secondary group-hover:text-white transition-transform flex-shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>
      {isOpen && (
        <div
          className={`absolute top-0 mt-0 bg-surface border border-white/10 rounded-lg shadow-xl p-1 z-50 w-56 ${
            isCollapsed ? 'left-full ml-2' : 'top-full mt-2 w-full left-0'
          }`}
        >
          <div className="max-h-60 overflow-y-auto sidebar-scrollbar">
            {accounts.map((account) => (
                <button
                key={account.id}
                onClick={() => {
                    switchAccount(account.id);
                    setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md text-secondary hover:bg-white/5 hover:text-white transition-colors"
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
                className="w-full text-left px-3 py-2 text-sm rounded-md text-secondary hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
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
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed top-0 left-0 h-full bg-void/95 backdrop-blur-md border-r border-white/5 flex-shrink-0 flex flex-col pt-6 pb-4 z-40 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          isSidebarCollapsed ? 'w-20 px-2' : 'w-64 px-4'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl`}
      >
        {/* BRAND */}
        <div className={`mb-8 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start px-2'}`}>
            {isSidebarCollapsed ? (
              <AuthMark size={24} />
            ) : (
              <AuthLogo />
            )}
        </div>

        <div className="mb-6">
          <AccountSwitcher isCollapsed={isSidebarCollapsed} />
        </div>

        <div className="flex-1 flex flex-col gap-1 overflow-y-auto sidebar-scrollbar">
          <NavItem
            icon={<DashboardIcon className="w-5 h-5" />}
            label="Dashboard"
            isActive={currentView === 'dashboard'}
            onClick={() => handleSetView('dashboard')}
            isCollapsed={isSidebarCollapsed}
          />
          {user.featureFlags?.analysisTrackerEnabled && (
            <NavItem
              icon={<TrackerIcon className="w-5 h-5" />}
              label="Tracker"
              isActive={currentView === 'analysis-tracker'}
              onClick={() => handleSetView('analysis-tracker')}
              isCollapsed={isSidebarCollapsed}
            />
          )}
          <NavItem
            icon={<JournalIcon className="w-5 h-5" />}
            label="Journal"
            isActive={currentView === 'journal'}
            onClick={() => handleSetView('journal')}
            isCollapsed={isSidebarCollapsed}
          />
          <NavItem
            icon={<PlaybookIcon className="w-5 h-5" />}
            label="Playbooks"
            isActive={currentView === 'playbooks'}
            onClick={() => handleSetView('playbooks')}
            isCollapsed={isSidebarCollapsed}
          />
           <NavItem
            icon={<AnalyticsIcon className="w-5 h-5" />}
            label="Analytics"
            isActive={currentView === 'analytics'}
            onClick={() => handleSetView('analytics')}
            isCollapsed={isSidebarCollapsed}
          />
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
            <NavItem
                icon={<SettingsIcon className="w-5 h-5" />}
                label="Settings"
                isActive={currentView === 'settings'}
                onClick={() => handleSetView('settings')}
                isCollapsed={isSidebarCollapsed}
            />
            
            <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center p-2 mt-2 text-secondary hover:text-white transition-colors"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
            <ChevronDoubleLeftIcon
                className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
            />
            </button>

            <div className={`mt-4 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : 'px-2'}`}>
                <UserButton 
                    appearance={{
                        elements: {
                            avatarBox: "w-8 h-8 rounded-full border border-white/10",
                            userButtonPopoverCard: "bg-surface border border-white/10 shadow-xl",
                            userButtonPopoverFooter: "hidden"
                        }
                    }}
                />
                {!isSidebarCollapsed && (
                    <div className="overflow-hidden flex-1">
                        <p className="text-xs font-semibold text-white truncate">{user.fullName}</p>
                        <p className="text-[10px] text-secondary truncate">JTradePilot Pro</p>
                    </div>
                )}
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
