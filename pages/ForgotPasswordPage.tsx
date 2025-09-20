

import React from 'react';
import { AuthPage } from '../App';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import Button from '../components/ui/Button';

interface ForgotPasswordPageProps {
  navigate: (page: AuthPage) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ navigate }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle password reset logic
    console.log('Password reset requested');
  };

  return (
    <AuthCard title="Reset Password">
      <p className="text-center text-future-gray mb-6 text-sm">
        Enter your email and we'll send you a link to get back into your account.
      </p>
      <form onSubmit={handleSubmit}>
        <AuthInput label="Email" id="email" type="email" placeholder="you@example.com" required />
        <div className="mt-6">
          <Button type="submit">Send Reset Link</Button>
        </div>
      </form>
      <div className="mt-6 text-center">
        <Button variant="link" onClick={() => navigate('login')}>
          Back to Log In
        </Button>
      </div>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
