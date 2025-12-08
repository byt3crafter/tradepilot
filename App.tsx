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
import { PublicRouterProvider, usePublicRouter } from './context/PublicRouterContext';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import RiskDisclaimerPage from './pages/RiskDisclaimerPage';
import AboutUsPage from './pages/AboutUsPage';
import FAQPage from './pages/FAQPage';
import PublicPricingPage from './pages/PublicPricingPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import ReferralPage from './pages/ReferralPage';
import PricingPage from './pages/PricingPage';
import InviteLandingPage from './pages/InviteLandingPage';

// NOTE: using import.meta.env for Vite. Cast to any to avoid TS error if types are missing.
const CLERK_PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_PLACEHOLDER_KEY_HERE';

const AuthenticatedApp: React.FC = () => {
  const { isLoading } = useAuth();
  const { currentPath } = usePublicRouter();

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
                          {currentPath === '/referral' ? (
                            <ReferralPage />
                          ) : currentPath === '/pricing' ? (
                            <PricingPage />
                          ) : (
                            <DashboardPage />
                          )}
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
  const { currentPath, navigate, replace } = usePublicRouter();

  // Load animated background only on landing page
  useEffect(() => {
    if (currentPath === '/') {
      // Landing page - load UnicornStudio
      (window as any).loadUnicornStudio?.();
      (window as any).showAnimatedBackground?.(true);
    } else {
      // Other pages - hide background
      (window as any).showAnimatedBackground?.(false);
    }
  }, [currentPath]);

  if (currentPath === '/login') {
    return <LoginPage />;
  }
  if (currentPath === '/signup') {
    return <SignupPage />;
  }
  if (currentPath === '/privacy') {
    return <PrivacyPolicyPage />;
  }
  if (currentPath === '/terms') {
    return <TermsOfServicePage />;
  }
  if (currentPath === '/risk-disclaimer') {
    return <RiskDisclaimerPage />;
  }
  if (currentPath === '/about') {
    replace('/about-us');
    return null;
  }
  if (currentPath === '/about-us') {
    return <AboutUsPage />;
  }
  if (currentPath === '/faq') {
    return <FAQPage />;
  }
  if (currentPath === '/pricing') {
    return <PublicPricingPage />;
  }
  if (currentPath === '/refund-policy') {
    return <RefundPolicyPage />;
  }

  // Handle Referral Invite Links
  if (currentPath.startsWith('/invite/')) {
    const referralCode = currentPath.split('/invite/')[1];
    if (referralCode) {
      localStorage.setItem('referralCode', referralCode);
      // Redirect to signup with the code in query param as backup/for tracking
      replace(`/signup?ref=${referralCode}`);
      return null;
    }
  }

  // Redirect legacy routes to home or login
  if (['/forgot-password', '/reset-password', '/verify-email'].includes(currentPath)) {
    replace('/login');
    return null;
  }

  return <LandingPage navigate={(page) => navigate(`/${page}`)} />;
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
        <PublicRouterProvider>
          <AppContent />
        </PublicRouterProvider>
      </AuthProvider>
    </ClerkProvider>
  );
};

export default App;