# Production Paddle Setup Guide

If you're getting **"Could not create checkout session"** error on production, it's because the Paddle environment variables aren't configured.

---

## Required Environment Variables

You need to set these 4 variables in your production environment:

### 1. `PADDLE_API_KEY` (Required)
- **Description**: Your Paddle API key for server-side operations
- **Where to get it**:
  - Go to Paddle Dashboard → Developer → API Keys
  - Copy your **Server-side API Key** (starts with `pdl_`)
- **Example**: `pdl_8a5c6f9e7b3d1a4c2f9e8b7d6c5a4f3e`
- **Used for**: Creating customers, transactions, processing webhooks

### 2. `PADDLE_CLIENT_SIDE_TOKEN` (Required)
- **Description**: Client-side token for frontend Paddle.js SDK
- **Where to get it**:
  - Go to Paddle Dashboard → Developer → API Keys
  - Copy your **Client-side Token** (starts with `ctk_`)
- **Example**: `ctk_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c`
- **Used for**: Initialize Paddle SDK on frontend for checkout

### 3. `PADDLE_PRICE_ID` (Required)
- **Description**: The product price ID to charge
- **Where to get it**:
  - Go to Paddle Dashboard → Products & Prices
  - Find your "TradePilot Pro" product
  - Click on the price you want to use
  - Copy the **Price ID** (format: `pri_xxxxx`)
- **Example**: `pri_01hp5zkyqt69ewvb0ev3c65gm9`
- **Used for**: Determines what gets billed when user upgrades

### 4. `PADDLE_ENV` (Optional, defaults to 'production')
- **Description**: Environment - 'sandbox' for testing, 'production' for real
- **Options**: `sandbox` or `production`
- **Default**: `production` (if not set)
- **Used for**: Switch between test and real Paddle environment

---

## Where to Set These Variables

### Option 1: Environment File (.env)
```bash
# On your production server, create/edit your .env file:
PADDLE_API_KEY=pdl_8a5c6f9e7b3d1a4c2f9e8b7d6c5a4f3e
PADDLE_CLIENT_SIDE_TOKEN=ctk_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c
PADDLE_PRICE_ID=pri_01hp5zkyqt69ewvb0ev3c65gm9
PADDLE_ENV=production
```

### Option 2: Docker Environment Variables
If using Docker:
```dockerfile
ENV PADDLE_API_KEY=pdl_...
ENV PADDLE_CLIENT_SIDE_TOKEN=ctk_...
ENV PADDLE_PRICE_ID=pri_...
ENV PADDLE_ENV=production
```

### Option 3: Platform-Specific (Render, Heroku, etc.)
- **Render.com**: Project → Environment
- **Heroku**: Settings → Config Vars
- **AWS**: Secrets Manager or Parameter Store
- **Vercel/Next.js**: Project → Settings → Environment Variables

---

## How to Get Each Variable from Paddle Dashboard

### Getting API Keys
1. Log in to [Paddle Dashboard](https://dashboard.paddle.com)
2. Go to **Developer** (left sidebar)
3. Click **API Keys**
4. You'll see:
   - **Server-side API Key**: Copy this for `PADDLE_API_KEY`
   - **Client-side Token**: Copy this for `PADDLE_CLIENT_SIDE_TOKEN`

### Getting Price ID
1. Go to **Products & Prices** (left sidebar)
2. Click your **TradePilot Pro** product
3. Under **Prices**, find the price you want (monthly/yearly)
4. Click on it to expand details
5. Copy the **Price ID** for `PADDLE_PRICE_ID`

---

## Testing Production Variables

After setting environment variables:

### 1. Restart Backend
```bash
# Rebuild and restart your backend service
npm run build
npm start
```

### 2. Test the Endpoint
```bash
curl -X POST https://jtradepilot.com/api/billing/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Should return:
```json
{
  "clientSideToken": "ctk_..."
}
```

If you get a 500 error, check:
- Are all 4 variables set?
- Are the values correct?
- Is backend restarted?

### 3. Test Upgrade Flow
1. Go to Settings → Billing
2. Click "Upgrade to Pro"
3. Should open Paddle checkout (NOT show error)
4. Payment should process without "Could not create checkout session" error

---

## Troubleshooting

### Error: "Could not create checkout session"

**Cause 1: Missing PADDLE_API_KEY**
- Backend can't authenticate with Paddle
- Fix: Set `PADDLE_API_KEY` to your real API key

**Cause 2: Missing PADDLE_PRICE_ID**
- Backend doesn't know what to charge
- Fix: Set `PADDLE_PRICE_ID` to your product's price ID

**Cause 3: Invalid API Key**
- Using sandbox key in production or expired key
- Fix: Get fresh key from Paddle Dashboard → Developer → API Keys

**Cause 4: Wrong Environment**
- Using sandbox key with `PADDLE_ENV=production` or vice versa
- Fix: Match environment (`sandbox` key + sandbox, `production` key + production)

### Check Backend Logs
```bash
# If using Docker or cloud logs
docker logs your-backend-container
# or
tail -f /var/log/your-app/error.log

# Look for:
# ✓ "[Billing] Paddle SDK initialized in production mode"
# ✗ "[Billing] PADDLE_API_KEY is missing"
# ✗ "[Billing] Paddle error..."
```

---

## Switching Between Sandbox and Production

### For Testing (Sandbox)
```env
PADDLE_API_KEY=pdl_sandbox_xxxxx
PADDLE_CLIENT_SIDE_TOKEN=ctk_sandbox_xxxxx
PADDLE_PRICE_ID=pri_sandbox_xxxxx
PADDLE_ENV=sandbox
```

### For Real Transactions (Production)
```env
PADDLE_API_KEY=pdl_live_xxxxx
PADDLE_CLIENT_SIDE_TOKEN=ctk_live_xxxxx
PADDLE_PRICE_ID=pri_live_xxxxx
PADDLE_ENV=production
```

---

## Complete Checklist

Before going live:

- [ ] Created Paddle account at https://paddle.com
- [ ] Created "TradePilot Pro" product in Paddle
- [ ] Created a price/plan (monthly or annual)
- [ ] Copied Server-side API Key to `PADDLE_API_KEY`
- [ ] Copied Client-side Token to `PADDLE_CLIENT_SIDE_TOKEN`
- [ ] Copied Price ID to `PADDLE_PRICE_ID`
- [ ] Set `PADDLE_ENV=production`
- [ ] Set webhook URL in Paddle: `https://jtradepilot.com/api/billing/webhook`
- [ ] Restarted backend service
- [ ] Tested checkout flow end-to-end
- [ ] Tested payment with real card
- [ ] Verified webhook fires and user upgrades
- [ ] Confirmed Clerk JWT updates with new subscription status

---

## Real Card Testing in Production

Use real test cards:
```
Visa: 4111 1111 1111 1111
Mastercard: 5555 5555 5554 4444
American Express: 378282246310005
```

For expiry: Use any future date (e.g., 12/26)
For CVC: Use any 3 digits (e.g., 123)

**Note**: Paddle won't charge real money on these test cards. They'll show as test transactions in your Paddle dashboard.

---

## Additional Resources

- **Paddle Docs**: https://developer.paddle.com
- **Paddle API Reference**: https://developer.paddle.com/api-reference
- **Paddle Dashboard**: https://dashboard.paddle.com

---

**Status**: Follow this guide to enable Paddle billing on production.

Last updated: 2025-12-04
