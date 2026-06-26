import React, { createContext, useContext, useMemo, ReactNode, useState, useEffect } from 'react';
import { User } from '../types';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import md5 from 'md5';
import { DEV_AUTH_BYPASS, DEV_AUTH_TOKEN, DEV_MOCK_USER } from '../utils/devAuth';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTrialing: boolean;
  isSubscribed: boolean;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  /** True when the system-wide free mode flag is active — everyone gets full Pro access. */
  freeMode: boolean;
  /** True when the current user has the trading bot enabled (from DB via /me). */
  botEnabled: boolean;
  logout: () => void;
  refreshUser: () => Promise<User | undefined>;
  updateUserPreferences: (prefs: { useGravatar?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);
  // DB-sourced overrides fetched from /me — null means "not yet loaded"
  const [meRole, setMeRole] = useState<'USER' | 'ADMIN' | null>(null);
  const [meBotEnabled, setMeBotEnabled] = useState(false);

  // Keep the access token fresh in the context state
  useEffect(() => {
    let intervalId: any;

    const fetchToken = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          setAccessToken(token);
        } catch (e) {
          console.error("Failed to fetch access token", e);
          setAccessToken(null);
        }
      } else {
        setAccessToken(null);
      }
    };

    fetchToken();

    if (isSignedIn) {
      // Refresh token periodically to ensure it doesn't expire in the state
      // Clerk handles the actual rotation, we just need to pull the latest valid one
      intervalId = setInterval(fetchToken, 50 * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSignedIn, getToken]);

  // Fetch backend feature flags (freeMode, role, botEnabled) whenever the token changes.
  useEffect(() => {
    if (!accessToken) {
      setFreeMode(false);
      setMeRole(null);
      setMeBotEnabled(false);
      return;
    }
    let cancelled = false;
    api.getMe(accessToken)
      .then(me => {
        if (cancelled) return;
        setFreeMode(me.featureFlags?.freeMode ?? false);
        // Override Clerk-derived role with the authoritative DB value
        if (me.role === 'ADMIN' || me.role === 'USER') {
          setMeRole(me.role);
        }
        setMeBotEnabled((me as any).botEnabled ?? false);
      })
      .catch(() => {
        if (cancelled) return;
        setFreeMode(false);
        setMeRole(null);
        setMeBotEnabled(false);
      });
    return () => { cancelled = true; };
  }, [accessToken]);

  // Adapter to map Clerk user to our app's User type.
  // `role` and `botEnabled` are overridden with DB-authoritative values from /me
  // (stored in meRole / meBotEnabled) once the /me response arrives.
  const appUser: User | null = useMemo(() => {
    if (!clerkUser) return null;
    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const clerkRole = (clerkUser.publicMetadata?.role as 'USER' | 'ADMIN') || 'USER';
    return {
      id: clerkUser.id,
      email: email,
      fullName: clerkUser.fullName || '',
      isEmailVerified: true,
      createdAt: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
      lastLoginAt: clerkUser.lastSignInAt?.toISOString() || new Date().toISOString(),
      // Use the DB role when available; fall back to Clerk metadata
      role: meRole ?? clerkRole,
      subscriptionStatus: (clerkUser.publicMetadata?.subscriptionStatus as any) || 'TRIALING',
      trialEndsAt: (clerkUser.publicMetadata?.trialEndsAt as string) || null,
      proAccessExpiresAt: (clerkUser.publicMetadata?.proAccessExpiresAt as string) || null,
      featureFlags: {
        analysisTrackerEnabled: true
      },
      gravatarUrl: `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=mp`,
      preferences: (clerkUser.unsafeMetadata?.preferences as any) || { useGravatar: false },
      isLifetimeAccess: (clerkUser.publicMetadata?.isLifetimeAccess as boolean) || false,
      botEnabled: meBotEnabled,
    };
  }, [clerkUser, meRole, meBotEnabled]);

  const logout = () => { signOut(); };

  const refreshUser = async () => {
    await clerkUser?.reload();
    return appUser || undefined;
  };

  const updateUserPreferences = async (prefs: { useGravatar?: boolean }) => {
    if (!clerkUser) return;
    try {
      await clerkUser.update({
        unsafeMetadata: {
          ...clerkUser.unsafeMetadata,
          preferences: {
            ...(clerkUser.unsafeMetadata?.preferences as any),
            ...prefs
          }
        }
      });
    } catch (err) {
      console.error('Failed to update user preferences:', err);
      throw err;
    }
  };

  // Retroactive Referral Sync:
  // If user is signed in, has a referral code in localStorage, but NOT in their metadata,
  // we update it now. This handles the "Login with Google" flow where metadata was missed.
  useEffect(() => {
    const syncReferralCode = async () => {
      if (!clerkUser || !isUserLoaded) return;

      const storedRef = localStorage.getItem('referralCode');
      const existingRef = clerkUser.unsafeMetadata?.referralCode;

      if (storedRef && !existingRef) {
        console.log('[AuthContext] Syncing missing referral code from storage:', storedRef);
        try {
          await clerkUser.update({
            unsafeMetadata: {
              ...clerkUser.unsafeMetadata,
              referralCode: storedRef
            }
          });
          // Clear it so we don't try again repeatedly (though the check above handles that)
          localStorage.removeItem('referralCode');
        } catch (err) {
          console.error('[AuthContext] Failed to sync referral code:', err);
        }
      }
    };

    syncReferralCode();
  }, [clerkUser, isUserLoaded]);

  const subscriptionState = useMemo(() => {
    // hasGiftedAccess = true ONLY if proAccessExpiresAt is set AND in the future
    const hasGiftedAccess = appUser?.proAccessExpiresAt && new Date(appUser.proAccessExpiresAt) > new Date();

    // Grant access if: Free Mode (system-wide) OR Active Sub OR Gifted Time OR Admin Role OR Lifetime Flag
    const isSubscribed =
      freeMode ||
      appUser?.subscriptionStatus === 'ACTIVE' ||
      hasGiftedAccess ||
      appUser?.role === 'ADMIN' ||
      appUser?.isLifetimeAccess;

    // Trial is completely disabled now.
    const isTrialing = false;
    const trialDaysRemaining = 0;
    const isTrialExpired = false;

    return { isTrialing, isSubscribed, trialDaysRemaining, isTrialExpired };
  }, [appUser, freeMode]);

  // DEV-ONLY: short-circuit to a mock authenticated session (see utils/devAuth).
  // Dead-code-eliminated from production builds.
  if (DEV_AUTH_BYPASS) {
    const devValue: any = {
      user: DEV_MOCK_USER,
      accessToken: DEV_AUTH_TOKEN,
      isAuthenticated: true,
      isLoading: false,
      isTrialing: false,
      isSubscribed: true,
      trialDaysRemaining: 0,
      isTrialExpired: false,
      freeMode: false,
      botEnabled: true,
      logout: () => {},
      refreshUser: async () => DEV_MOCK_USER,
      getToken: async () => DEV_AUTH_TOKEN,
      updateUserPreferences: async () => {},
    };
    return <AuthContext.Provider value={devValue}>{children}</AuthContext.Provider>;
  }

  const value = {
    user: appUser,
    accessToken,
    isAuthenticated: !!isSignedIn,
    isLoading: !isUserLoaded,
    ...subscriptionState,
    freeMode,
    botEnabled: meBotEnabled,
    logout,
    refreshUser,
    getToken,
    updateUserPreferences,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};