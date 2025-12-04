
import React from 'react';
import AccountManager from '../components/accounts/AccountManager';
import ChecklistManager from '../components/checklist/ChecklistManager';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../services/api';
import { useView } from '../context/ViewContext';
import { SettingsSubView } from './DashboardPage';
import AssetManager from '../components/assets/AssetManager';
import BillingSettings from '../components/settings/BillingSettings';
import ProfileSettings from '../components/settings/ProfileSettings';

const SecuritySettings: React.FC = () => {
    const { accessToken } = useAuth();
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [passwordIsLoading, setPasswordIsLoading] = React.useState(false);
    const [passwordError, setPasswordError] = React.useState('');
    const [passwordSuccess, setPasswordSuccess] = React.useState('');

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordIsLoading(true);
        setPasswordError('');
        setPasswordSuccess('');
        try {
            await api.patch('/api/auth/change-password', { currentPassword, newPassword }, accessToken!);
            setPasswordSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err: any) {
            setPasswordError(err.message);
        } finally {
            setPasswordIsLoading(false);
        }
    };

    return (
        <Card>
            <h2 className="text-xl font-orbitron text-photonic-blue mb-4">Security</h2>
            <form onSubmit={handlePasswordSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Current Password"
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        disabled={passwordIsLoading}
                        placeholder="••••••••"
                    />
                    <Input
                        label="New Password"
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        disabled={passwordIsLoading}
                        placeholder="Minimum 8 characters"
                    />
                </div>
                {passwordError && <p className="text-sm text-risk-high mt-2">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-momentum-green mt-2">{passwordSuccess}</p>}
                <div className="mt-4">
                    <Button type="submit" isLoading={passwordIsLoading}>
                        Update Password
                    </Button>
                </div>
            </form>
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
            default:
                return <ProfileSettings />;
        }
    };

    const NavButton: React.FC<{ tab: SettingsSubView; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => navigateTo('settings', tab)}
            className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors w-full text-left ${currentSubView === tab ? 'bg-white/10 text-white' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-3xl font-orbitron text-future-light">Settings</h1>
                <p className="text-future-gray">Manage your account and security preferences.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <nav className="flex-shrink-0 md:w-48">
                    <div className="flex flex-row md:flex-col gap-2 p-2 bg-surface border border-white/5 rounded-lg">
                        <NavButton tab="profile" label="Profile" />
                        <NavButton tab="accounts" label="Accounts" />
                        <NavButton tab="checklist" label="Checklist" />
                        <NavButton tab="assets" label="Assets" />
                        <NavButton tab="billing" label="Billing" />
                        <NavButton tab="security" label="Security" />
                    </div>
                </nav>
                <div className="flex-1">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
