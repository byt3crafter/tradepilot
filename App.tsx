import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';
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
import { NotificationProvider } from './context/NotificationContext';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import RiskDisclaimerPage from './pages/RiskDisclaimerPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';

export type AuthPage = 'login' | 'signup';

// NOTE: using import.meta.env for Vite. Cast to any to avoid TS error if types are missing.
const CLERK_PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_PLACEHOLDER_KEY_HERE';

const AuthenticatedApp: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-void text-white">
        <Spinner />
      </div>
    );
  }

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
                        <NotificationProvider>
                          <DashboardPage />
                        </NotificationProvider>
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

const UnauthenticatedApp: React.FC = () => {
  const path = window.location.pathname;

  if (path === '/login') {
    return <LoginPage />;
  }
  if (path === '/signup') {
    return <SignupPage />;
  }
  if (path === '/privacy') {
    return <PrivacyPolicyPage />;
  }
  if (path === '/terms') {
    return <TermsOfServicePage />;
  }
  if (path === '/risk-disclaimer') {
    return <RiskDisclaimerPage />;
  }
  if (path === '/about') {
    return <AboutPage />;
  }
  if (path === '/faq') {
    return <FAQPage />;
  }

  // Redirect legacy routes to home or login
  if (['/forgot-password', '/reset-password', '/verify-email'].includes(path)) {
    window.location.href = '/login';
    return null;
  }

  return <LandingPage navigate={(page) => window.location.href = `/${page}`} />;
};

const AppContent: React.FC = () => {
  const [locationHash, setLocationHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setLocationHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle Admin Route specially (though ideally this is protected by Clerk too)
  if (locationHash.startsWith('#/admin-panel')) {
    return (
      <SignedIn>
        <AdminPage />
      </SignedIn>
    );
  }

  return (
    <>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
      <SignedOut>
        <UnauthenticatedApp />
      </SignedOut>
    </>
  );
};

const App: React.FC = () => {
  if (CLERK_PUBLISHABLE_KEY === 'pk_test_PLACEHOLDER_KEY_HERE') {
    console.warn("Clerk Publishable Key is missing. Please add VITE_CLERK_PUBLISHABLE_KEY to your environment.");
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ClerkProvider>
  );
};

export default App;