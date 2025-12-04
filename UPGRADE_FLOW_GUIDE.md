# Trial to Payment Flow Guide

Complete walkthrough of how users see the trial countdown and upgrade to Pro.

## 📊 Trial Timeline

### Days 14-8: Normal Trial Period
```
┌─────────────────────────────────────────────────┐
│ TrialBanner (Blue)                              │
│ "You have 10 days left in your trial."          │
│ [Upgrade Now] [×]                               │
└─────────────────────────────────────────────────┘
Dashboard appears normally below banner
```

### Days 7-1: Warning Period
```
┌─────────────────────────────────────────────────┐
│ TrialBanner (Blue) - Same message               │
│ "You have 3 days left in your trial."           │
│ [Upgrade Now] [×]                               │
└─────────────────────────────────────────────────┘

Also in Settings → Billing:
┌─────────────────────────────────────────────────┐
│ Current Status: Trial (Blue)                    │
│ Trial Ends: Jan 5, 2025                         │
│ 3 days remaining                                │
│                                                 │
│ ⚠️ WARNING: Your trial is ending soon. Upgrade  │
│    now to maintain access to your account.      │
│                                                 │
│ [Upgrade to Pro] (button enabled)               │
└─────────────────────────────────────────────────┘
```

### Day 0: Trial Expired
```
┌─────────────────────────────────────────────────┐
│ TrialBanner (Red/Risk-High)                     │
│ "Your free trial has ended. Please upgrade to   │
│  continue logging trades."                      │
│ [Upgrade Now] [×]                               │
└─────────────────────────────────────────────────┘

Settings → Billing shows:
┌─────────────────────────────────────────────────┐
│ Current Status: Trial (Blue)                    │
│ Trial Ends: Jan 2, 2025 (Past date)             │
│ 0 days remaining                                │
│                                                 │
│ "Trial expired - upgrade now to keep trading"  │
│                                                 │
│ [Upgrade to Pro] (button enabled, prominent)    │
└─────────────────────────────────────────────────┘
```

---

## 💳 Upgrade Flow - Step by Step

### Step 1: User Sees Trial Banner
**Location**: Top of dashboard (on all pages)
**Trigger**: User is logged in AND subscriptionStatus = 'TRIALING'

```
User sees banner with countdown:
┌─────────────────────────────────────────────────┐
│ You have 5 days left in your trial. [Upgrade Now]
└─────────────────────────────────────────────────┘
```

**Code**: `components/billing/TrialBanner.tsx`

### Step 2: User Clicks "Upgrade Now"
**Action**: navigateTo('settings', 'billing')

User is taken to Settings → Billing tab

### Step 3: Settings → Billing Shows Payment Options
**Location**: Dashboard → Settings → Billing

User sees:
```
┌──────────────────────────────────────────────────┐
│ Subscription Status                              │
│                                                  │
│ Current Status: Trial (blue)                     │
│ Trial Ends: Jan 5, 2025                          │
│ 3 days remaining                                 │
│                                                  │
│ [Upgrade to Pro] ← MAIN BUTTON TO CLICK         │
│                                                  │
│ Billing FAQ                                      │
│ Q: What happens when my trial ends?             │
│ Q: Can I cancel anytime?                        │
│ Q: Do you offer refunds?                        │
└──────────────────────────────────────────────────┘
```

**Code**: `components/settings/BillingSettings.tsx`

### Step 4: Click "Upgrade to Pro" Button
**Action**: Creates Paddle checkout transaction

```
Button handler:
1. Creates transaction via POST /api/billing/checkout
2. Backend creates Paddle transaction for user
3. Returns transactionId
4. Opens Paddle.Checkout.open({ transactionId })
```

### Step 5: Paddle Checkout Opens
**Modal appears with payment form**

```
┌──────────────────────────────────────────────────┐
│  TradePilot Pro - Monthly                        │
│  $29.99/month                                    │
│                                                  │
│  Card Number: [4111 1111 1111 1111] ← For testing
│  Expiry: [MM/YY]                                │
│  CVC: [123]                                     │
│                                                  │
│  [Pay Now]                                      │
└──────────────────────────────────────────────────┘
```

### Step 6: Payment Processing
**Paddle processes card**

For sandbox testing:
- Card: `4111 1111 1111 1111`
- Any future expiry date (MM/YY)
- Any 3-digit CVC

### Step 7: Webhook Updates Subscription
**Backend receives Paddle webhook**

```
Paddle sends: subscription.created event
{
  "event_type": "subscription.created",
  "data": {
    "id": "sub_...",
    "customer_id": "ctm_...",
    "status": "active"
  }
}

Backend:
1. Finds user by paddleCustomerId
2. Updates user.subscriptionStatus = 'ACTIVE'
3. Sets user.paddleSubscriptionId
```

**Code**: `backend/src/billing/billing.service.ts` (line 152-163)

### Step 8: User Sees Confirmation
**On next load/refresh**

```
Settings → Billing now shows:
┌──────────────────────────────────────────────────┐
│ Subscription Status                              │
│                                                  │
│ Current Status: Active (green) ✓                │
│ Pro Access Expires: Jan 5, 2026                 │
│                                                  │
│ ✓ Your subscription is active. Thank you for    │
│   being a TradePilot user!                      │
│                                                  │
│ (No upgrade button shown)                       │
└──────────────────────────────────────────────────┘

TrialBanner disappears (isTrialing = false)
```

---

## 🔧 Where to Test

### Test Trial Expiration Locally

**Expire trial immediately**:
```sql
UPDATE "User"
SET "trialEndsAt" = NOW() - INTERVAL '1 day'
WHERE email = 'test@example.com';
```

**Expire in 3 days** (test warning):
```sql
UPDATE "User"
SET "trialEndsAt" = NOW() + INTERVAL '3 days'
WHERE email = 'test@example.com';
```

**Reset to 14 days**:
```sql
UPDATE "User"
SET "trialEndsAt" = NOW() + INTERVAL '14 days'
WHERE email = 'test@example.com';
```

### Manual Testing Checklist

- [ ] Login and see trial banner at top
- [ ] Trial countdown shows correct days
- [ ] "Upgrade Now" button navigates to Settings → Billing
- [ ] Settings → Billing shows trial info
- [ ] "Upgrade to Pro" button opens Paddle checkout
- [ ] Complete checkout with test card (4111...)
- [ ] See payment success
- [ ] Refresh page - subscription status shows "Active"
- [ ] Trial banner disappears after upgrade
- [ ] Expire trial with SQL and verify red banner

---

## 🔑 Key Code Changes

### 1. Trial Days Calculation (AuthContext)
**File**: `context/AuthContext.tsx` (lines 89-101)

```typescript
// OLD (hardcoded):
const trialDaysRemaining = 14;
const isTrialExpired = false;

// NEW (calculated):
if (appUser?.trialEndsAt) {
  const now = new Date();
  const trialEnd = new Date(appUser.trialEndsAt);
  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  trialDaysRemaining = Math.max(0, diffDays);
  isTrialExpired = diffDays <= 0;
}
```

### 2. Trial Banner Link (TrialBanner)
**File**: `components/billing/TrialBanner.tsx`

```typescript
// OLD:
onClick={requestUpgradeModal}  // Opened old subscription page

// NEW:
handleUpgrade = () => {
  navigateTo('settings', 'billing');  // Goes to Billing settings
}
```

### 3. Billing Payment Button (BillingSettings)
**File**: `components/settings/BillingSettings.tsx`

```typescript
const handleUpgrade = async () => {
  // 1. Create transaction on backend
  const { transactionId } = await api.post(
    '/api/billing/checkout',
    {},
    accessToken!
  );

  // 2. Open Paddle checkout
  paddle.Checkout.open({ transactionId });
}
```

---

## 📱 Mobile View

Trial banner is responsive and works on all screen sizes:

**Mobile** (< 768px):
```
┌─────────────────────────┐
│ You have 5 days left... │
│ [Upgrade Now] [×]       │
└─────────────────────────┘
```

**Tablet** (768px-1024px):
```
┌───────────────────────────────────────┐
│ You have 5 days left in trial. │
│ [Upgrade Now] [×]                   │
└───────────────────────────────────────┘
```

---

## 🚀 Production Setup

For production Paddle (not sandbox):

1. Update `.env`:
```env
PADDLE_ENV=production
PADDLE_API_KEY=live_... (from Paddle dashboard)
PADDLE_CLIENT_SIDE_TOKEN=live_...
PADDLE_PRICE_ID=pri_... (production price ID)
```

2. Update PaddleContext CDN:
```typescript
// Line 71 in context/PaddleContext.tsx
- s.src = "https://sandbox-cdn.paddle.com/paddle/v2/paddle.js";
+ s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";

// Line 111
- p.Environment.set("sandbox");
+ p.Environment.set("production");
```

3. Test with real payment card and webhook

---

## 🐛 Troubleshooting

### Issue: Paddle checkout not opening
**Solution**: Check browser console
```
1. "Paddle not initialized" → Refresh page
2. No transactionId → Check POST /api/billing/checkout response
3. Paddle undefined → Check CDN loaded correctly
```

### Issue: Subscription not updating after payment
**Solution**: Check webhook logs
```
1. Verify webhook endpoint in Paddle dashboard
2. Check backend logs for webhook events
3. Ensure user's paddleCustomerId matches
```

### Issue: Trial countdown shows 14 forever
**Solution**: Check trialEndsAt in database
```sql
SELECT email, "trialEndsAt", "subscriptionStatus"
FROM "User"
WHERE email = 'test@example.com';
```

Ensure `trialEndsAt` is in past/future, not NULL

---

**Status**: ✅ Ready for Testing
**Tested**: ✅ Build passing
**Deployment**: Ready for sandbox testing → production
