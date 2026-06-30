import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import MaintenancePage from './pages/MaintenancePage'; // Import
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';
import api from './services/api'; // Import
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
import { dark } from '@clerk/themes';
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
import FeaturesPage from './pages/FeaturesPage';
import { DEV_AUTH_BYPASS } from './utils/devAuth';
import { getSurface, redirectToApp, redirectToMarketing, type Surface } from './utils/subdomain';

// Computed once when the module first loads — hostname is stable for the page lifetime.
const SURFACE: Surface = getSurface();

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
  if (currentPath === '/features') {
    return <FeaturesPage />;
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

// ---------------------------------------------------------------------------
// LandingSurface — rendered on jtradepilot.com (apex / www).
// Serves the same public pages as UnauthenticatedApp but overrides every
// login/signup action to hard-redirect to app.jtradepilot.com so that the
// authenticated app never mounts on the marketing domain.
// ---------------------------------------------------------------------------
const LandingSurface: React.FC = () => {
  const { currentPath, replace } = usePublicRouter();

  // Auth paths → hard-redirect to the app. subdomain
  if (currentPath === '/login') {
    redirectToApp('/login');
    return null;
  }
  if (currentPath === '/signup') {
    redirectToApp('/signup');
    return null;
  }
  if (['/forgot-password', '/reset-password', '/verify-email'].includes(currentPath)) {
    redirectToApp('/login');
    return null;
  }

  // Static public pages — render in place (same as UnauthenticatedApp)
  if (currentPath === '/privacy') return <PrivacyPolicyPage />;
  if (currentPath === '/terms') return <TermsOfServicePage />;
  if (currentPath === '/risk-disclaimer') return <RiskDisclaimerPage />;
  if (currentPath === '/about') { replace('/about-us'); return null; }
  if (currentPath === '/about-us') return <AboutUsPage />;
  if (currentPath === '/faq') return <FAQPage />;
  if (currentPath === '/pricing') return <PublicPricingPage />;
  if (currentPath === '/refund-policy') return <RefundPolicyPage />;
  if (currentPath === '/features') return <FeaturesPage />;

  // Invite links — pass the referral code as a URL param (localStorage is
  // origin-specific and won't cross subdomains, so use the query string).
  if (currentPath.startsWith('/invite/')) {
    const referralCode = currentPath.split('/invite/')[1];
    if (referralCode) {
      redirectToApp(`/signup?ref=${encodeURIComponent(referralCode)}`);
      return null;
    }
  }

  // Default: landing page with CTAs overridden to redirect to app. subdomain
  const handleCtaNavigate = (page: AuthPage) => {
    redirectToApp(page === 'login' ? '/login' : '/signup');
  };

  return <LandingPage navigate={handleCtaNavigate} />;
};

// ---------------------------------------------------------------------------
// OpsRedirect — briefly shown when a non-admin reaches ops. while signed in.
// Redirects them to the main app.
// ---------------------------------------------------------------------------
const OpsRedirect: React.FC = () => {
  React.useEffect(() => {
    redirectToApp('/');
  }, []);
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-void text-white">
      <Spinner />
    </div>
  );
};

// ---------------------------------------------------------------------------
// OpsContent — rendered on ops.jtradepilot.com.
// SignedIn + ADMIN → AdminPage; SignedIn non-admin → redirectToApp;
// SignedOut → LoginPage (after sign-in, Clerk redirects back to ops. which
// re-evaluates and shows AdminPage for admins).
// ---------------------------------------------------------------------------
const OpsContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <>
      <SignedIn>
        {user?.role === 'ADMIN' ? <AdminPage /> : <OpsRedirect />}
      </SignedIn>
      <SignedOut>
        <LoginPage />
      </SignedOut>
    </>
  );
};

// On the real app subdomain (app.jtradepilot.com), signed-out visitors must NOT see marketing —
// bounce them to jtradepilot.com. The only signed-out pages allowed here are the auth pages
// (users arrive at app./login from the landing's Sign-in CTA). On dev (localhost) keep the full
// UnauthenticatedApp (landing included) for local testing.
const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
const AppSignedOut: React.FC = () => {
  const { currentPath } = usePublicRouter();
  if (SURFACE === 'app' && !AUTH_PATHS.includes(currentPath)) {
    redirectToMarketing('/');
    return null;
  }
  return <UnauthenticatedApp />;
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { currentPath } = usePublicRouter();
  const [maintenance, setMaintenance] = useState(false);
  const [locationHash, setLocationHash] = useState(window.location.hash);

  useEffect(() => {
    // Check maintenance status
    const checkStatus = () => {
      api.getSystemStatus()
        .then(res => setMaintenance(res.maintenance))
        .catch(() => { });
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);

    const handleHashChange = () => {
      setLocationHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      clearInterval(interval);
    };
  }, []);

  // DEV-ONLY: render the authenticated app directly, skipping Clerk's SignedIn
  // gate (see utils/devAuth). Dead-code-eliminated from production builds.
  if (DEV_AUTH_BYPASS) {
    // Still honor the admin route in dev bypass so admins can reach the panel.
    if (locationHash.startsWith('#/admin-panel') && user?.role === 'ADMIN') {
      return <AdminPage />;
    }
    return <AuthenticatedApp />;
  }

  // Maintenance Check
  if (maintenance && user?.role !== 'ADMIN') {
    // Allow login page so admins can sign in
    // also allow admin panel hash (which redirects to login if needed)
    if (currentPath !== '/login' && !locationHash.includes('admin')) {
      return <MaintenancePage />;
    }
  }

  // Handle Admin Route specially — only ADMIN role users may access it
  if (locationHash.startsWith('#/admin-panel')) {
    if (user?.role === 'ADMIN') {
      return (
        <SignedIn>
          <AdminPage />
        </SignedIn>
      );
    }
    // Signed-in non-admin or still loading: render the normal app
    return (
      <>
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
        <SignedOut>
          <AppSignedOut />
        </SignedOut>
      </>
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

  const clerkConfig = {
    publishableKey: CLERK_PUBLISHABLE_KEY,
    appearance: {
      baseTheme: dark,
      variables: {
        colorPrimary: '#00D1FF', // Photonic Blue match
        colorBackground: '#08090A', // Future Dark match
        colorText: '#FFFFFF',
        colorTextSecondary: '#888888',
        colorInputBackground: '#141414',
        colorInputText: '#FFFFFF',
        borderRadius: '0.5rem',
      }
    }
  } as const;

  // ── Landing surface: jtradepilot.com (apex / www) ─────────────────────────
  // Public marketing pages only. No authenticated app, no admin panel.
  // Login/signup CTAs redirect to app.jtradepilot.com.
  if (SURFACE === 'landing') {
    return (
      <ClerkProvider {...clerkConfig}>
        <PublicRouterProvider>
          <LandingSurface />
        </PublicRouterProvider>
      </ClerkProvider>
    );
  }

  // ── Ops surface: ops.jtradepilot.com ─────────────────────────────────────
  // Admin panel only. SignedIn+ADMIN → AdminPage; else redirect to app.
  if (SURFACE === 'ops') {
    return (
      <ClerkProvider {...clerkConfig}>
        <AuthProvider>
          <OpsContent />
        </AuthProvider>
      </ClerkProvider>
    );
  }

  // ── App surface (app.jtradepilot.com) and dev (localhost / previews) ─────
  // Current full-app behavior — unchanged. Includes the #/admin-panel hash
  // route for backward compat in dev.
  return (
    <ClerkProvider {...clerkConfig}>
      <AuthProvider>
        <PublicRouterProvider>
          <AppContent />
        </PublicRouterProvider>
      </AuthProvider>
    </ClerkProvider>
  );
};

export default App;