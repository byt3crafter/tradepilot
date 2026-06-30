import { BillingService } from './billing.service';

/**
 * Regression tests for the Paddle webhook handler.
 *
 * The original bug: handleWebhookEvent read snake_case fields (data.customer_id,
 * next_billed_at, billing_cycle, unit_price) off the SDK's camelCase EventEntity,
 * so customerId was always undefined and EVERY event early-returned without
 * granting access. These tests pin the camelCase contract.
 */
describe('BillingService.handleWebhookEvent', () => {
  let service: BillingService;
  let prisma: any;

  const config = {
    // Constructor needs a Paddle API key; CLERK_SECRET_KEY left undefined so
    // updateClerkMetadata short-circuits (no network call) during the test.
    get: (key: string, def?: any) => {
      const vals: Record<string, string> = {
        PADDLE_API_KEY: 'test_key',
        PADDLE_ENV: 'sandbox',
      };
      return vals[key] ?? def;
    },
  };

  const baseUser = {
    id: 'user_1',
    email: 'jordan@example.com',
    paddleCustomerId: 'ctm_123',
    subscriptionStatus: 'TRIALING',
    referredByUserId: null,
    hasRewardedReferrer: false,
    proAccessExpiresAt: null,
    isEarlySupporter: false,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ ...baseUser }),
        findUnique: jest.fn().mockResolvedValue({ ...baseUser, subscriptionStatus: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ ...baseUser }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      processedWebhookEvent: {
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      promoCode: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new BillingService(prisma as any, config as any);
  });

  it('maps camelCase subscription.activated fields onto the user update', async () => {
    await service.handleWebhookEvent({
      eventType: 'subscription.activated',
      data: {
        id: 'sub_999',
        customerId: 'ctm_123',
        status: 'active',
        nextBilledAt: '2026-07-25T00:00:00Z',
        billingCycle: { interval: 'month' },
        items: [{ price: { unitPrice: { amount: '2900', currencyCode: 'USD' } } }],
      },
    });

    expect(prisma.user.update).toHaveBeenCalled();
    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'user_1' });
    expect(arg.data.subscriptionStatus).toBe('ACTIVE');
    expect(arg.data.paddleSubscriptionId).toBe('sub_999');
    expect(arg.data.proAccessExpiresAt).toBe(new Date('2026-07-25T00:00:00Z').toISOString());
    expect(arg.data.planInterval).toBe('month');
    expect(arg.data.subscriptionPrice).toBe(2900);
    expect(arg.data.subscriptionCurrency).toBe('USD');
  });

  it('still drops snake_case payloads (proves the old shape no longer "works")', async () => {
    await service.handleWebhookEvent({
      eventType: 'subscription.activated',
      data: {
        id: 'sub_999',
        customer_id: 'ctm_123', // legacy snake_case — must NOT be honored
        status: 'active',
        next_billed_at: '2026-07-25T00:00:00Z',
      },
    });
    // No camelCase customerId => handler can't resolve the customer => no update.
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not grant the referral reward twice (atomic claim)', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...baseUser,
      referredByUserId: 'referrer_1',
    });
    // Simulate the row already claimed by a concurrent delivery: updateMany matches 0.
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await service.handleWebhookEvent({
      eventType: 'subscription.activated',
      data: { id: 'sub_1', customerId: 'ctm_123', status: 'active' },
    });

    // findUnique for the referrer must NOT be called when the claim was lost.
    const referrerLookup = prisma.user.findUnique.mock.calls.find(
      (c: any[]) => c[0]?.where?.id === 'referrer_1',
    );
    expect(referrerLookup).toBeUndefined();
  });

  it('claims the event id FIRST and skips a duplicate delivery (P2002), guarding the promo increment', async () => {
    // Simulate the claim row already existing (unique violation) -> already processed.
    prisma.processedWebhookEvent.create.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    );

    await service.handleWebhookEvent({
      eventId: 'evt_dup',
      eventType: 'transaction.completed',
      data: { customerId: 'ctm_123', customData: { promo_code: 'SAVE10' } },
    });

    // Duplicate => we returned before any effect: no user lookup, no promo increment.
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.promoCode.updateMany).not.toHaveBeenCalled();
  });

  it('claims before processing on the first delivery (insert happens up-front)', async () => {
    await service.handleWebhookEvent({
      eventId: 'evt_new',
      eventType: 'subscription.activated',
      data: { id: 'sub_1', customerId: 'ctm_123', status: 'active' },
    });
    expect(prisma.processedWebhookEvent.create).toHaveBeenCalledWith({
      data: { eventId: 'evt_new', type: 'subscription.activated' },
    });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('maps an unknown Paddle status to a NON-entitling status (CANCELED), never TRIALING', async () => {
    await service.handleWebhookEvent({
      eventType: 'subscription.updated',
      data: { id: 'sub_x', customerId: 'ctm_123', status: 'some_new_paddle_status' },
    });
    const call = prisma.user.update.mock.calls.find(
      (c: any[]) => c[0]?.data?.subscriptionStatus !== undefined,
    );
    expect(call).toBeDefined();
    expect(call[0].data.subscriptionStatus).toBe('CANCELED');
  });
});
