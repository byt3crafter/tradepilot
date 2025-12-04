import React, { createContext, useContext, useMemo, ReactNode, useState, useEffect } from 'react';
import { User } from '../types';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTrialing: boolean;
  isSubscribed: boolean;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  logout: () => void;
  refreshUser: () => Promise<User | undefined>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  // Adapter to map Clerk user to our app's User type
  const appUser: User | null = useMemo(() => {
    if (!clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      fullName: clerkUser.fullName || '',
      isEmailVerified: true, 
      createdAt: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
      lastLoginAt: clerkUser.lastSignInAt?.toISOString() || new Date().toISOString(),
      role: (clerkUser.publicMetadata?.role as any) || 'USER',
      subscriptionStatus: (clerkUser.publicMetadata?.subscriptionStatus as any) || 'TRIALING',
      trialEndsAt: (clerkUser.publicMetadata?.trialEndsAt as string) || null,
      proAccessExpiresAt: (clerkUser.publicMetadata?.proAccessExpiresAt as string) || null,
      featureFlags: {
          analysisTrackerEnabled: true 
      }
    };
  }, [clerkUser]);

  const logout = () => { signOut(); };
  
  const refreshUser = async () => { 
      await clerkUser?.reload();
      return appUser || undefined; 
  };

  const subscriptionState = useMemo(() => {
    // hasGiftedAccess = true ONLY if proAccessExpiresAt is set AND in the future
    const hasGiftedAccess = appUser?.proAccessExpiresAt && new Date(appUser.proAccessExpiresAt) > new Date();
    const isSubscribed = appUser?.subscriptionStatus === 'ACTIVE' || hasGiftedAccess;
    const isTrialing = appUser?.subscriptionStatus === 'TRIALING' && !hasGiftedAccess;

    // Calculate trial days remaining from trialEndsAt (from Clerk JWT public_metadata)
    let trialDaysRemaining = 14;
    let isTrialExpired = false;

    if (appUser?.trialEndsAt) {
      try {
        const now = new Date();
        const trialEnd = new Date(appUser.trialEndsAt);

        // Only calculate if trialEndsAt is a valid date
        if (!isNaN(trialEnd.getTime())) {
          const diffMs = trialEnd.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          trialDaysRemaining = Math.max(0, diffDays);
          isTrialExpired = diffDays <= 0;
        }
      } catch (e) {
        // If date parsing fails, use defaults
        console.warn('Failed to parse trialEndsAt:', appUser.trialEndsAt);
      }
    }

    return { isTrialing, isSubscribed, trialDaysRemaining, isTrialExpired };
  }, [appUser]);

  const value = {
    user: appUser,
    accessToken, 
    isAuthenticated: !!isSignedIn,
    isLoading: !isUserLoaded,
    ...subscriptionState,
    logout,
    refreshUser,
    getToken,
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