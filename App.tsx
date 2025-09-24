import React, { useState, useEffect } from 'react';
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
import { PlaybookProvider } from './context/PlaybookContext';
import { ChecklistProvider } from './context/ChecklistContext';
import { SettingsProvider } from './context/SettingsContext';
import { TradeProvider } from './context/TradeContext';
import AdminPage from './pages/AdminPage';
import { UIProvider } from './context/UIContext';
import { AssetProvider } from './context/AssetContext';

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
    <UIProvider>
      <ViewProvider>
        <PaddleProvider>
          <SubscriptionProvider>
            <AssetProvider>
              <AccountProvider>
                <PlaybookProvider>
                  <ChecklistProvider>
                    <SettingsProvider>
                      <TradeProvider>
                        <DashboardPage />
                      </TradeProvider>
                    </SettingsProvider>
                  </ChecklistProvider>
                </PlaybookProvider>
              </AccountProvider>
            </AssetProvider>
          </SubscriptionProvider>
        </PaddleProvider>
      </ViewProvider>
    </UIProvider>
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
  const [locationHash, setLocationHash] = useState(window.location.hash);

  useEffect(() => {
      const handleHashChange = () => {
          setLocationHash(window.location.hash);
      };
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const path = window.location.pathname;
  
  // Redirect legacy /admin-panel path to new hash-based route.
  // This helps if the user has it bookmarked and works in local dev.
  if (path.startsWith('/admin-panel')) {
      window.location.href = '/#/admin-panel';
      return (
          <div className="min-h-screen w-full flex items-center justify-center">
              <Spinner />
          </div>
      );
  }
  
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

  // Authenticated routing using hash
  if (locationHash.startsWith('#/admin-panel')) {
      if (user?.role === 'ADMIN') {
          return <AdminApp />;
      } else {
          // If a non-admin tries to access, redirect them to the dashboard.
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