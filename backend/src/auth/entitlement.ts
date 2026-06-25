/**
 * Single source of truth for "does this user have paid (pro) access?".
 *
 * Before this existed, entitlement was computed only on the frontend from Clerk
 * metadata and NO backend endpoint enforced it — any logged-in user (expired
 * trial, canceled sub, free signup) could call paid/AI-cost endpoints.
 *
 * A user is entitled if ANY of:
 *  - lifetime access, or
 *  - subscription is ACTIVE or TRIALING, or
 *  - a granted pro window is still open (proAccessExpiresAt in the future), or
 *  - a trial window is still open (trialEndsAt in the future).
 *
 * PAST_DUE/CANCELED users keep access only while proAccessExpiresAt is still in
 * the future (natural billing grace), then lapse — so we never grant access
 * without a valid basis, and never cut off a still-valid window.
 */
export interface EntitlementInput {
  subscriptionStatus?: string | null;
  proAccessExpiresAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
  isLifetimeAccess?: boolean | null;
}

export interface EntitlementResult {
  hasPro: boolean;
  reasons: {
    lifetime: boolean;
    subscriptionActive: boolean;
    grantWindowOpen: boolean;
    trialWindowOpen: boolean;
  };
}

const inFuture = (d?: Date | string | null, now = new Date()): boolean =>
  !!d && new Date(d).getTime() > now.getTime();

export function resolveEntitlement(
  user: EntitlementInput,
  now: Date = new Date(),
): EntitlementResult {
  const lifetime = !!user.isLifetimeAccess;
  const subscriptionActive =
    user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING';
  const grantWindowOpen = inFuture(user.proAccessExpiresAt, now);
  const trialWindowOpen = inFuture(user.trialEndsAt, now);

  return {
    hasPro: lifetime || subscriptionActive || grantWindowOpen || trialWindowOpen,
    reasons: { lifetime, subscriptionActive, grantWindowOpen, trialWindowOpen },
  };
}
