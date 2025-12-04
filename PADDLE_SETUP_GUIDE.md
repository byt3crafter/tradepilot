# Paddle Billing Setup Guide

This guide explains how to set up Paddle for sandbox testing and production deployment.

## Overview

TradePilot uses Paddle v2 for subscription billing. The integration includes:
- Frontend checkout with Paddle v2 SDK (sandbox CDN)
- Backend transaction creation with Paddle API
- Webhook handling for subscription updates
- Automatic user subscription status synchronization

## Environment Variables

Both frontend and backend require Paddle configuration:

### Frontend Environment Variables

```env
# Frontend uses Paddle v2 via PaddleContext
# No explicit env var needed - uses PADDLE_CLIENT_SIDE_TOKEN from backend /api/billing/config
```

### Backend Environment Variables

```env
# Backend .env file
PADDLE_ENV=sandbox                          # 'sandbox' or 'production'
PADDLE_API_KEY=your_api_key_here           # Paddle API key (secret)
PADDLE_CLIENT_SIDE_TOKEN=your_token_here   # Paddle client token (public)
PADDLE_PRICE_ID=your_price_id_here         # Your Pro plan price ID
```

## Sandbox Setup

### 1. Get Sandbox Credentials

1. Create a Paddle account at https://dashboard.paddle.com
2. Switch to **Sandbox** environment (toggle in top-right)
3. Go to **Settings → API Keys**
4. Copy your **API Key** (starts with `test_`)
5. Go to **Settings → Authentication**
6. Create a client-side token and copy it
7. Create a product and price for your Pro plan
8. Copy the **Price ID** (format: `pri_...`)

### 2. Configure Environment Variables

Create `.env` file in the backend root:

```env
PADDLE_ENV=sandbox
PADDLE_API_KEY=test_abc123...your_api_key_here
PADDLE_CLIENT_SIDE_TOKEN=test_...your_client_token
PADDLE_PRICE_ID=pri_123456789
```

### 3. Test Sandbox Checkout

1. Start the development server
2. Navigate to Settings → Billing
3. Click "Upgrade to Pro" (if on trial)
4. Use Paddle test card: **4111 1111 1111 1111** (expires: any future date, CVC: any 3 digits)
5. Complete the checkout flow
6. Verify webhook received and user subscription updated to 'ACTIVE'

## Production Setup

### 1. Get Production Credentials

1. Log into Paddle dashboard
2. Switch to **Production** environment
3. Repeat the steps from Sandbox Setup (API Keys, client token, price ID)
4. Note: Production credentials start with `live_` instead of `test_`

### 2. Update Environment Variables

Update `.env` file in the backend:

```env
PADDLE_ENV=production
PADDLE_API_KEY=live_abc123...your_production_api_key
PADDLE_CLIENT_SIDE_TOKEN=live_...your_production_client_token
PADDLE_PRICE_ID=pri_123456789_production
```

### 3. Update Frontend Paddle Script URL

The frontend PaddleContext currently loads from sandbox CDN. To switch to production:

**File: `context/PaddleContext.tsx` (line 71)**

```typescript
// Change from:
s.src = "https://sandbox-cdn.paddle.com/paddle/v2/paddle.js";

// To:
s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
```

Also update in `PaddleProvider` (line 111):

```typescript
// Change from:
p.Environment.set("sandbox");

// To:
p.Environment.set("production");
```

### 4. Configure Webhook

**IMPORTANT**: Set up webhook handling in Paddle dashboard to notify your backend of subscription events.

1. Go to **Dashboards → Notifications**
2. Add endpoint: `https://yourdomain.com/api/billing/webhook`
3. Select events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.resumed`
   - `subscription.activated`
   - `subscription.paused`
   - `subscription.canceled`
4. Save and test webhook

### 5. Test Production Checkout

1. Redeploy backend with updated credentials
2. In browser, clear all caches and cookies
3. Navigate to Settings → Billing
4. Click "Upgrade to Pro"
5. Use real payment card to complete checkout
6. Verify webhook received and subscription updated

## Testing Checklist

### Sandbox Tests
- [ ] Trial user can see "Upgrade to Pro" button
- [ ] Trial countdown displays correct days remaining
- [ ] Clicking "Upgrade to Pro" opens Paddle checkout
- [ ] Test card payment completes successfully
- [ ] Webhook updates user to 'ACTIVE' subscription
- [ ] Settings → Billing shows "Active" status
- [ ] Trial banner disappears after upgrade

### Production Tests
- [ ] All sandbox tests pass with production credentials
- [ ] Real payment card works for checkout
- [ ] Webhook verified signature in Paddle dashboard
- [ ] Email receipts sent by Paddle
- [ ] User can access pro features after payment

## Troubleshooting

### Issue: "Payment system is not ready"
**Solution**: Paddle context is still initializing. Ensure:
1. `PADDLE_CLIENT_SIDE_TOKEN` is set in backend
2. Backend `/api/billing/config` endpoint is accessible
3. Browser console shows "[Paddle] v2 initialized" message

### Issue: Checkout doesn't open
**Solution**: Check browser console for errors:
1. Verify `paddle` object is not null
2. Ensure `paddle.Checkout.open()` is being called with valid `transactionId`
3. Check Paddle script loaded from correct CDN

### Issue: Webhook not updating subscription
**Solution**:
1. Verify webhook endpoint in Paddle dashboard
2. Check backend logs for webhook events
3. Ensure webhook signature verification is enabled (currently: TODO in billing.controller.ts)
4. Check user's `paddleCustomerId` exists in database

### Issue: Different prices in sandbox vs production
**Solution**: Each environment has separate price IDs. Ensure correct `PADDLE_PRICE_ID` for environment.

## Important Security Notes

1. **Never commit secrets**: Keep API keys in `.env` file (ignored by git)
2. **Webhook verification**: Enable webhook signature verification in production (line 40 in billing.controller.ts)
3. **Rate limiting**: Consider adding rate limiting to `/api/billing/checkout` endpoint
4. **PCI Compliance**: Paddle handles all PCI compliance - don't store card data

## References

- [Paddle v2 Documentation](https://developer.paddle.com/)
- [Paddle v2 API Reference](https://developer.paddle.com/api-reference)
- [Paddle Webhook Events](https://developer.paddle.com/webhooks/overview)
- [Paddle SDK npm Package](https://www.npmjs.com/package/@paddle/paddle-node-sdk)

## Next Steps

After setting up Paddle:

1. Test sandbox environment thoroughly
2. Deploy to staging with sandbox credentials
3. Get Paddle production credentials
4. Update all environment variables
5. Deploy to production
6. Monitor webhook logs for issues
7. Test with real payment cards

---

**Last Updated**: 2024
**Paddle API Version**: v2
**Status**: Ready for sandbox testing, production setup pending
