
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
import { UIProvider } from './context/UIContext';

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
    </UIProvider>
  );
};

// FIX: Add main App component to handle routing based on authentication state and provide a default export.
const App: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-future-dark">
        <Spinner />
      </div>
    );
  }

  // Handle specific routes like email verification which can be accessed without being logged in
  if (window.location.pathname === '/verify-email' && new URLSearchParams(window.location.search).has('token')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-future-dark via-future-dark to-photonic-blue/20 p-4">
        <VerifyEmailPage />
      </div>
    );
  }
  
  if (isAuthenticated && user) {
    // If authenticated but email not verified, show the verification page.
    if (!user.isEmailVerified) {
      return (
         <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-future-dark via-future-dark to-photonic-blue/20 p-4">
           <VerifyEmailPage />
         </div>
       );
    }

    // Handle admin route
    if (user.role === 'ADMIN' && window.location.pathname.startsWith('/admin')) {
      return <AdminPage />;
    }

    // Default authenticated app view
    return <AuthenticatedApp />;
  }
  
  // Default to authentication flow (login, signup, etc.)
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-future-dark via-future-dark to-photonic-blue/20 p-4">
      <AuthNavigator />
    </div>
  );
};

export default App;
