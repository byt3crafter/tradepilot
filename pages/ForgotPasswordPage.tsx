

import React, { useState } from 'react';
import { AuthPage } from '../App';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

interface ForgotPasswordPageProps {
  navigate: (page: AuthPage) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ navigate }) => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await forgotPassword(email);
      setSuccessMessage("If an account with that email exists, a password reset link has been sent.");
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (successMessage) {
    return (
      <AuthCard title="Check Your Email">
        <div className="text-center text-future-gray">
          <p>{successMessage}</p>
          <div className="mt-8">
            <Button variant="link" onClick={() => navigate('login')}>
              Back to Log In
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset Password">
      <p className="text-center text-future-gray mb-6 text-sm">
        Enter your email and we'll send you a link to get back into your account.
      </p>
      <form onSubmit={handleSubmit}>
        <AuthInput
          label="Email"
          id="email"
          type="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        
        {error && <p className="text-risk-high text-sm text-center mb-4">{error}</p>}
        
        <div className="mt-6">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Spinner /> : 'Send Reset Link'}
          </Button>
        </div>
      </form>
      <div className="mt-6 text-center">
        <Button variant="link" onClick={() => navigate('login')} disabled={isLoading}>
          Back to Log In
        </Button>
      </div>
    </AuthCard>
  );
};

export default ForgotPasswordPage;