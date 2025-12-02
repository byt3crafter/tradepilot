import React from 'react';
import { AuthPage } from '../App';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';

interface ForgotPasswordPageProps {
  navigate: (page: AuthPage) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ navigate }) => {
  // Legacy page: functionality moved to Clerk hosted pages or components.
  return (
    <AuthCard title="Reset Password">
      <div className="text-center">
        <p className="text-future-gray mb-6">
          Please use the 'Forgot Password' link on the Login page.
        </p>
        <Button onClick={() => navigate('login')}>
          Back to Log In
        </Button>
      </div>
    </AuthCard>
  );
};

export default ForgotPasswordPage;