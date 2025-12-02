
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
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

  // Adapter to map Clerk user to our app's User type
  const appUser: User | null = useMemo(() => {
    if (!clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      fullName: clerkUser.fullName || '',
      isEmailVerified: true, // Clerk handles this
      createdAt: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
      lastLoginAt: clerkUser.lastSignInAt?.toISOString() || new Date().toISOString(),
      role: (clerkUser.publicMetadata?.role as any) || 'USER',
      subscriptionStatus: (clerkUser.publicMetadata?.subscriptionStatus as any) || 'TRIALING',
      trialEndsAt: (clerkUser.publicMetadata?.trialEndsAt as string) || null,
      proAccessExpiresAt: (clerkUser.publicMetadata?.proAccessExpiresAt as string) || null,
      featureFlags: {
          analysisTrackerEnabled: true // Default enabled for now
      }
    };
  }, [clerkUser]);

  const logout = () => { signOut(); };
  
  const refreshUser = async () => { 
      // Clerk handles user sync automatically via sockets, but we can expose this for manual triggers if needed
      await clerkUser?.reload();
      return appUser || undefined; 
  };

  const subscriptionState = useMemo(() => {
    const hasGiftedAccess = appUser?.proAccessExpiresAt === null || (appUser?.proAccessExpiresAt && new Date(appUser.proAccessExpiresAt) > new Date());
    const isSubscribed = appUser?.subscriptionStatus === 'ACTIVE' || hasGiftedAccess;
    const isTrialing = appUser?.subscriptionStatus === 'TRIALING' && !hasGiftedAccess;
    
    // Default trial logic if metadata missing (fallback)
    const trialDaysRemaining = 14; 
    const isTrialExpired = false;

    return { isTrialing, isSubscribed, trialDaysRemaining, isTrialExpired };
  }, [appUser]);

  const value = {
    user: appUser,
    accessToken: null, // We use getToken() async now
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
