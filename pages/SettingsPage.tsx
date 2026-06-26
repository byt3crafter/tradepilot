
import React from 'react';
import AccountManager from '../components/accounts/AccountManager';
import ChecklistManager from '../components/checklist/ChecklistManager';
import Card from '../components/Card';
import SelectInput from '../components/ui/SelectInput';
import Button from '../components/ui/Button';
import { useView } from '../context/ViewContext';
import { SettingsSubView } from './DashboardPage';
import AssetManager from '../components/assets/AssetManager';
import BillingSettings from '../components/settings/BillingSettings';
import ProfileSettings from '../components/settings/ProfileSettings';
import AiSettings from '../components/settings/AiSettings';
import { useClerk } from '@clerk/clerk-react';

const SecuritySettings: React.FC = () => {
  const { openUserProfile } = useClerk();

  return (
    <Card>
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
            <p className="text-jtp-sm text-jtp-textDim mt-0.5">
              Change your password, enable two-factor authentication, and manage your connected accounts from your Clerk profile.
            </p>
          </div>
        </div>
        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={() => openUserProfile()}
            className="w-auto"
          >
            Open Security Settings
          </Button>
        </div>
      </div>
    </Card>
  );
};

const SettingsPage: React.FC = () => {
  const { currentSubView, navigateTo } = useView();

  const renderContent = () => {
    switch (currentSubView) {
      case 'profile':
        return <ProfileSettings />;
      case 'accounts':
        return <Card><AccountManager /></Card>;
      case 'checklist':
        return <Card><ChecklistManager /></Card>;
      case 'assets':
        return <Card><AssetManager /></Card>;
      case 'security':
        return <SecuritySettings />;
      case 'billing':
        return <BillingSettings />;
      case 'ai':
        return <AiSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  const NavButton: React.FC<{ tab: SettingsSubView; label: string }> = ({ tab, label }) => (
    <button
      onClick={() => navigateTo('settings', tab)}
      className={`px-3 py-2 text-jtp-md rounded-jtp-md transition-colors w-full text-left font-medium ${
        currentSubView === tab
          ? 'bg-jtp-active text-jtp-text'
          : 'text-jtp-textMuted hover:bg-jtp-hover hover:text-jtp-textSoft'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-jtp-3xl font-semibold text-jtp-text">Settings</h1>
        <p className="text-jtp-md text-jtp-textDim mt-1">Manage your account preferences and integrations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="flex-shrink-0 md:w-44">
          {/* Mobile Dropdown */}
          <div className="md:hidden mb-4">
            <SelectInput
              id="settings-nav"
              value={currentSubView}
              onChange={(e) => navigateTo('settings', e.target.value as SettingsSubView)}
              options={[
                { value: 'profile', label: 'Profile' },
                { value: 'accounts', label: 'Accounts' },
                { value: 'checklist', label: 'Checklist' },
                { value: 'assets', label: 'Assets' },
                { value: 'ai', label: 'AI' },
                { value: 'billing', label: 'Billing' },
                { value: 'security', label: 'Security' },
              ]}
            />
          </div>

          {/* Desktop Vertical List */}
          <div className="hidden md:flex flex-col gap-0.5 p-1.5 bg-jtp-shell border border-jtp-border rounded-jtp-panel">
            <NavButton tab="profile" label="Profile" />
            <NavButton tab="accounts" label="Accounts" />
            <NavButton tab="checklist" label="Checklist" />
            <NavButton tab="assets" label="Assets" />
            <NavButton tab="ai" label="AI" />
            <NavButton tab="billing" label="Billing" />
            <NavButton tab="security" label="Security" />
          </div>
        </nav>
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
