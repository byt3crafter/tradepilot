import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';
import VerifyEmailPage from './pages/VerifyEmailPage';
import { ViewProvider } from './context/ViewContext';
import { PaddleProvider } from './context/PaddleContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { AccountProvider } from './context/AccountContext';
import { StrategyProvider } from './context/StrategyContext';
import { ChecklistProvider } from './context/ChecklistContext';
import { SettingsProvider } from './context/SettingsContext';
import { TradeProvider } from './context/TradeContext';
import AdminPage from './pages/AdminPage';

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

const AuthenticatedApp: React.FC = () => {
  console.log('[App] Rendering AuthenticatedApp with all providers.');
  return (
    <ViewProvider>
      <PaddleProvider>
        <SubscriptionProvider>
          <AccountProvider>
            <StrategyProvider>
              <ChecklistProvider>
                <SettingsProvider>
                  <TradeProvider>
                    <DashboardPage />
                  </TradeProvider>
                </SettingsProvider>
              </ChecklistProvider>
            </StrategyProvider>
          </AccountProvider>
        </SubscriptionProvider>
      </PaddleProvider>
    </ViewProvider>
  );
};

const AdminApp: React.FC = () => {
    return (
        // Admin page may not need all providers, but AuthProvider is already top-level.
        // Add other providers here if AdminPage starts using their contexts.
        <AdminPage />
    );
};


const App: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const path = window.location.pathname;
  if (path === '/verify-email') {
    return (
       <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <VerifyEmailPage />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
            <AuthNavigator />
        </div>
    );
  }

  // Authenticated routing
  if (path.startsWith('/admin')) {
      if (user?.role === 'ADMIN') {
          return <AdminApp />;
      } else {
          // If a non-admin tries to access /admin, redirect them to the dashboard.
          window.location.href = '/';
          return ( // Render a spinner during the brief moment of redirection
            <div className="min-h-screen w-full flex items-center justify-center">
                <Spinner />
            </div>
          );
      }
  }

  // Default to the main authenticated app
  return <AuthenticatedApp />;
};

export default App;
