

import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';
import VerifyEmailPage from './pages/VerifyEmailPage';

export type AuthPage = 'landing' | 'login' | 'signup' | 'forgot-password';

const AuthNavigator: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AuthPage>('landing');

  const navigate = (page: AuthPage) => {
    setCurrentPage(page);
  };

  switch (currentPage) {
    case 'login':
      return <LoginPage navigate={navigate} />;
    case 'signup':
      return <SignupPage navigate={navigate} />;
    case 'forgot-password':
      return <ForgotPasswordPage navigate={navigate} />;
    case 'landing':
    default:
      return <LandingPage navigate={navigate} />;
  }
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Simple path-based routing
  const path = window.location.pathname;
  if (path === '/verify-email') {
    return (
       <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <VerifyEmailPage />
      </div>
    );
  }
  
  return (
    <>
      {isAuthenticated ? <DashboardPage /> : <div className="min-h-screen w-full flex flex-col items-center justify-center p-4"><AuthNavigator /></div>}
    </>
  );
};

export default App;
