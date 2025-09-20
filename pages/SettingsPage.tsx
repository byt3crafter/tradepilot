import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import AuthInput from '../components/auth/AuthInput';
import Button from '../components/ui/Button';
import Spinner from '../components/Spinner';
import api from '../services/api';
import AccountManager from '../components/accounts/AccountManager';
import ChecklistManager from '../components/checklist/ChecklistManager';

const SettingsPage: React.FC = () => {
  const { accessToken } = useAuth();
  
  // States for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordIsLoading, setPasswordIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordIsLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
        await api.patch('/auth/change-password', { currentPassword, newPassword }, accessToken!);
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
    } catch(err: any) {
        setPasswordError(err.message);
    } finally {
        setPasswordIsLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron text-future-light">Settings</h1>
        <p className="text-future-gray">Manage your account security and settings.</p>
      </div>

      {/* Manage Accounts Card */}
      <Card>
        <AccountManager />
      </Card>

      {/* Pre-Flight Checklist Card */}
      <Card>
        <ChecklistManager />
      </Card>
      
      {/* Security Card */}
      <Card>
        <h2 className="text-xl font-orbitron text-photonic-blue mb-4">Security</h2>
         <form onSubmit={handlePasswordSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <AuthInput 
                    label="Current Password" 
                    id="currentPassword" 
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    disabled={passwordIsLoading}
                    placeholder="••••••••"
                />
                 <AuthInput 
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
                <Button type="submit" className="w-full sm:w-auto" disabled={passwordIsLoading}>
                    {passwordIsLoading ? <Spinner /> : 'Update Password'}
                </Button>
            </div>
        </form>
      </Card>
    </div>
  );
};

export default SettingsPage;
