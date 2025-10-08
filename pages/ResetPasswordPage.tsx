import React, { useState, useEffect } from 'react';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const ResetPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Invalid or missing password reset token.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('No reset token found.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await resetPassword(token, newPassword);
      setSuccessMessage("Your password has been reset successfully. You can now log in with your new password.");
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (successMessage) {
    return (
      <AuthCard title="Password Reset">
        <div className="text-center text-future-gray">
          <p className="text-momentum-green">{successMessage}</p>
          <div className="mt-8">
            <Button onClick={() => window.location.href = '/'}>
              Proceed to Log In
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset Your Password">
      <p className="text-center text-future-gray mb-6 text-sm">
        Enter your new password below.
      </p>
      <form onSubmit={handleSubmit}>
        <AuthInput
          label="New Password"
          id="newPassword"
          type="password"
          placeholder="••••••••"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading || !token}
        />
        <AuthInput
          label="Confirm New Password"
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading || !token}
        />
        
        {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
        
        <div className="mt-6">
          <Button type="submit" disabled={isLoading || !token}>
            {isLoading ? <Spinner /> : 'Reset Password'}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
};

export default ResetPasswordPage;