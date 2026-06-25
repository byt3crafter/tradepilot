// ─────────────────────────────────────────────────────────────────────────
// DEV-ONLY auth bypass — lets a developer (or a headless Playwright/Chromium
// run) render the authenticated app locally WITHOUT a real Clerk login.
//
// Safety: this is active ONLY when BOTH are true:
//   1. import.meta.env.DEV  — statically `false` in production builds, so this
//      whole branch is dead-code-eliminated from the prod bundle.
//   2. VITE_DEV_AUTH_BYPASS === 'true' — an explicit local env opt-in.
// It therefore CANNOT ship to or activate in production.
// The matching backend guard adds the same NODE_ENV !== 'production' gate.
// ─────────────────────────────────────────────────────────────────────────
import type { User } from '../types';

const env: any = (import.meta as any).env || {};

export const DEV_AUTH_BYPASS: boolean =
  !!env.DEV && env.VITE_DEV_AUTH_BYPASS === 'true';

export const DEV_AUTH_TOKEN = 'dev-bypass-token';

export const DEV_MOCK_USER: User = {
  id: env.VITE_DEV_USER_ID || 'dev-user',
  email: 'dev@local',
  fullName: 'Dev Bypass',
  isEmailVerified: true,
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  role: 'ADMIN',
  subscriptionStatus: 'ACTIVE',
  trialEndsAt: null,
  proAccessExpiresAt: null,
  featureFlags: { analysisTrackerEnabled: true },
  gravatarUrl: '',
  preferences: { useGravatar: false },
  isLifetimeAccess: true,
} as unknown as User;
