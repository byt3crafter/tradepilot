import React from 'react';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';

const ResetPasswordPage: React.FC = () => {
  // Legacy page: functionality moved to Clerk hosted pages or components.
  return (
    <AuthCard title="Reset Password">
      <div className="text-center">
        <p className="text-future-gray mb-6">
          Please use the 'Forgot Password' link on the Login page.
        </p>
        <div className="mt-6">
          <Button onClick={() => window.location.href = '/login'}>
            Back to Log In
          </Button>
        </div>
      </div>
    </AuthCard>
  );
};

export default ResetPasswordPage;