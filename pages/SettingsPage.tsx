import React from 'react';
import AccountManager from '../components/accounts/AccountManager';
import ChecklistManager from '../components/checklist/ChecklistManager';
import AssetManager from '../components/assets/AssetManager';
import BillingSettings from '../components/settings/BillingSettings';
import ProfileSettings from '../components/settings/ProfileSettings';
import AiSettings from '../components/settings/AiSettings';
import { Panel, SelectInput, Button } from '../components/ui';
import { useView } from '../context/ViewContext';
import { SettingsSubView } from './DashboardPage';
import { useClerk } from '@clerk/clerk-react';

const NAV_ITEMS: { tab: SettingsSubView; label: string }[] = [
  { tab: 'profile',   label: 'Profile' },
  { tab: 'accounts',  label: 'Accounts' },
  { tab: 'checklist', label: 'Checklist' },
  { tab: 'assets',    label: 'Assets' },
  { tab: 'ai',        label: 'AI' },
  { tab: 'billing',   label: 'Billing' },
  { tab: 'security',  label: 'Security' },
];

const SecuritySettings: React.FC = () => {
  const { openUserProfile } = useClerk();
  return (
    <Panel label="SECURITY">
      <h2 className="text-jtp-xl font-semibold text-jtp-text mb-1">Security</h2>
      <p className="text-jtp-md text-jtp-textDim mb-6">
        Password and security settings are managed securely via Clerk.
      </p>
      <div className="bg-jtp-raised border border-jtp-border rounded-jtp-lg p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-8 h-8 rounded-jtp-md bg-jtp-blue/10 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-jtp-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-jtp-md font-medium text-jtp-text">Password &amp; Two-Factor Authentication</p>
            <p className="text-jtp-md text-jtp-textDim mt-0.5">
              Change your password, enable two-factor authentication, and manage your connected accounts from your Clerk profile.
            </p>
          </div>
        </div>
        <div className="pt-2">
          <Button variant="secondary" onClick={() => openUserProfile()} className="w-auto">
            Open Security Settings
          </Button>
        </div>
      </div>
    </Panel>
  );
};

const SettingsPage: React.FC = () => {
  const { currentSubView, navigateTo } = useView();

  const renderContent = () => {
    switch (currentSubView) {
      case 'profile':   return <ProfileSettings />;
      case 'accounts':  return <Panel label="ACCOUNTS"><AccountManager /></Panel>;
      case 'checklist': return <Panel label="CHECKLIST"><ChecklistManager /></Panel>;
      case 'assets':    return <Panel label="ASSETS"><AssetManager /></Panel>;
      case 'security':  return <SecuritySettings />;
      case 'billing':   return <BillingSettings />;
      case 'ai':        return <AiSettings />;
      default:          return <ProfileSettings />;
    }
  };

  const NavButton: React.FC<{ tab: SettingsSubView; label: string }> = ({ tab, label }) => {
    const isActive = currentSubView === tab;
    return (
      <button
        onClick={() => navigateTo('settings', tab)}
        aria-current={isActive ? 'page' : undefined}
        style={isActive ? { boxShadow: 'inset 2px 0 0 #5b8def' } : undefined}
        className={`px-3 py-[7px] text-jtp-md rounded-jtp-md transition-colors w-full text-left font-medium ${
          isActive
            ? 'bg-[rgba(91,141,239,0.10)] text-jtp-blue'
            : 'text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-textSoft'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-jtp-3xl font-semibold text-jtp-text">Settings</h1>
        <p className="text-jtp-md text-jtp-textDim mt-1">Manage your account preferences and integrations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="flex-shrink-0 md:w-44">
          {/* Mobile: select dropdown */}
          <div className="md:hidden mb-4">
            <SelectInput
              id="settings-nav"
              value={currentSubView}
              onChange={(e) => navigateTo('settings', e.target.value as SettingsSubView)}
              options={NAV_ITEMS.map(({ tab, label }) => ({ value: tab, label }))}
            />
          </div>

          {/* Desktop: sidebar nav panel */}
          <div className="hidden md:block bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
            <div className="px-4 py-[10px] border-b border-jtp-border">
              <span className="jtp-label select-none">NAVIGATION</span>
            </div>
            <div className="flex flex-col p-1.5 gap-0.5">
              {NAV_ITEMS.map(({ tab, label }) => (
                <NavButton key={tab} tab={tab} label={label} />
              ))}
            </div>
          </div>
        </nav>

        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </div>
  );
};

export default SettingsPage;
