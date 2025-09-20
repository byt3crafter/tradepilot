import React, { useState, useEffect, useRef } from 'react';
import md5 from 'md5';
import { useAuth } from '../context/AuthContext';
import { DashboardView } from '../pages/DashboardPage';
import AuthLogo from './auth/AuthLogo';
import { JournalIcon } from './icons/JournalIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserIcon } from './icons/UserIcon';
import { useAccount } from '../context/AccountContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { StrategyIcon } from './icons/StrategyIcon';

interface SidebarProps {
  currentView: DashboardView;
  setView: (view: DashboardView) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-photonic-blue/10 text-photonic-blue'
        : 'text-future-gray hover:bg-future-panel hover:text-future-light'
    }`}
  >
    <div className="w-6 h-6 mr-4">{icon}</div>
    <span className="font-semibold">{label}</span>
  </button>
);

const ProfileMenu: React.FC<{
  setView: (view: DashboardView) => void;
  logout: () => void;
  closeMenu: () => void;
}> = ({ setView, logout, closeMenu }) => {
  const handleNavigation = (view: DashboardView) => {
    setView(view);
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
        onClick={() => handleNavigation('settings')}
        className="flex items-center w-full px-3 py-2 text-sm rounded-md text-future-gray hover:bg-photonic-blue/10 hover:text-future-light transition-colors"
      >
        <SettingsIcon className="w-5 h-5 mr-3" />
        <span>Settings</span>
      </button>
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

const AccountSwitcher: React.FC = () => {
  const { accounts, activeAccount, switchAccount } = useAccount();
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

  if (!activeAccount) {
    return (
       <div className="px-3 py-2 text-sm text-center text-future-gray border border-dashed border-photonic-blue/20 rounded-lg">
         Create an account to begin.
       </div>
    );
  }

  return (
    <div className="relative" ref={switcherRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-future-dark/50 border border-photonic-blue/20 rounded-lg text-left hover:bg-future-panel transition-colors"
      >
        <div>
          <p className="font-semibold text-sm text-future-light">{activeAccount.name}</p>
          <p className="text-xs text-future-gray">{activeAccount.type.replace('_', ' ')}</p>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-future-gray transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-future-panel border border-photonic-blue/20 rounded-lg shadow-lg p-1 z-10 animate-fade-in-up">
          {accounts.map(account => (
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


const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose }) => {
  const { user, logout } = useAuth();
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
    setView(view);
    onClose(); // Close sidebar on mobile after navigation
  };

  const handleProfileMenuNavigation = (view: DashboardView) => {
      handleSetView(view);
      setIsMenuOpen(false);
  };

  if (!user) return null;

  const gravatarHash = md5(user.email.trim().toLowerCase());
  const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?d=identicon&s=100`;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-future-dark/60 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <aside className={`fixed top-0 left-0 h-full w-64 bg-future-panel/90 backdrop-blur-md border-r border-photonic-blue/10 flex-shrink-0 flex flex-col p-4 z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-2 mb-6">
          <AuthLogo />
        </div>

        <div className="mb-6">
          <AccountSwitcher />
        </div>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto sidebar-scrollbar pr-2">
          <NavItem
            icon={<JournalIcon />}
            label="Trade Journal"
            isActive={currentView === 'journal'}
            onClick={() => handleSetView('journal')}
          />
          <NavItem
            icon={<StrategyIcon />}
            label="Strategies"
            isActive={currentView === 'strategies'}
            onClick={() => handleSetView('strategies')}
          />
        </nav>

        <div className="mt-auto" ref={menuRef}>
          <div className="border-t border-photonic-blue/10 pt-4 relative">
            {isMenuOpen && <ProfileMenu setView={handleProfileMenuNavigation} logout={logout} closeMenu={() => setIsMenuOpen(false)} />}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-3 px-2 w-full text-left rounded-lg hover:bg-future-panel p-2 transition-colors"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
            >
              <img src={gravatarUrl} alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-photonic-blue/50" />
              <div>
                <p className="font-semibold text-future-light text-sm">{user.fullName}</p>
                <p className="text-future-gray text-xs truncate">{user.email}</p>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;