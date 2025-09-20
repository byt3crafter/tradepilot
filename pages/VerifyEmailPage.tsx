
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AuthCard from '../components/auth/AuthCard';
import Spinner from '../components/Spinner';
import Button from '../components/ui/Button';

type VerificationStatus = 'verifying' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token found in the URL.');
        return;
      }

      try {
        await api.verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'An unknown error occurred.');
      }
    };

    verifyToken();
  }, []);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center text-future-gray flex flex-col items-center gap-4">
            <Spinner />
            <p>Verifying your email address...</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-momentum-green mb-4">Verification Successful!</h3>
            <p className="text-future-gray mb-6">Your email address has been verified. You can now log in to your account.</p>
            <Button onClick={() => window.location.href = '/'}>Proceed to Log In</Button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
             <h3 className="text-xl font-semibold text-risk-high mb-4">Verification Failed</h3>
             <p className="text-future-gray mb-6">{errorMessage}</p>
             <p className="text-future-gray text-sm">Please try signing up again or contact support if the problem persists.</p>
             <div className="mt-6">
                <Button onClick={() => window.location.href = '/'}>Back to Homepage</Button>
             </div>
          </div>
        );
    }
  };

  return (
    <AuthCard title="Email Verification">
      <div className="p-4">
        {renderContent()}
      </div>
    </AuthCard>
  );
};

export default VerifyEmailPage;
