import { resolveEntitlement } from './entitlement';

describe('resolveEntitlement', () => {
  const now = new Date('2026-06-25T00:00:00Z');
  const future = new Date('2026-12-01T00:00:00Z');
  const past = new Date('2026-01-01T00:00:00Z');

  it('grants for lifetime access regardless of other fields', () => {
    expect(resolveEntitlement({ isLifetimeAccess: true, subscriptionStatus: 'CANCELED' }, now).hasPro).toBe(true);
  });

  it('grants for ACTIVE and TRIALING subscriptions', () => {
    expect(resolveEntitlement({ subscriptionStatus: 'ACTIVE' }, now).hasPro).toBe(true);
    expect(resolveEntitlement({ subscriptionStatus: 'TRIALING' }, now).hasPro).toBe(true);
  });

  it('grants while a pro grant window is still open, denies once it lapses', () => {
    expect(resolveEntitlement({ subscriptionStatus: 'CANCELED', proAccessExpiresAt: future }, now).hasPro).toBe(true);
    expect(resolveEntitlement({ subscriptionStatus: 'CANCELED', proAccessExpiresAt: past }, now).hasPro).toBe(false);
  });

  it('grants while a trial is open, denies once expired', () => {
    expect(resolveEntitlement({ trialEndsAt: future }, now).hasPro).toBe(true);
    expect(resolveEntitlement({ trialEndsAt: past }, now).hasPro).toBe(false);
  });

  it('denies a free/expired user (INACTIVE, no windows)', () => {
    expect(resolveEntitlement({ subscriptionStatus: 'INACTIVE' }, now).hasPro).toBe(false);
    expect(resolveEntitlement({}, now).hasPro).toBe(false);
  });

  it('PAST_DUE keeps access only within the grant window (billing grace)', () => {
    expect(resolveEntitlement({ subscriptionStatus: 'PAST_DUE', proAccessExpiresAt: future }, now).hasPro).toBe(true);
    expect(resolveEntitlement({ subscriptionStatus: 'PAST_DUE', proAccessExpiresAt: past }, now).hasPro).toBe(false);
  });
});
