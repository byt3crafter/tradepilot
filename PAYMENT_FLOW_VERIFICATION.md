# Payment Flow Verification Guide

## Complete Flow Ready for Testing

All components are now properly integrated. Here's how to verify the entire payment flow works end-to-end.

---

## 1. Trial Banner (Always Shows on Dashboard)

**Location**: Top of dashboard when logged in
**Status**: ✅ Complete

The minimal banner shows:
- **Active Trial**: `"5 days left in your trial"` (or actual days remaining)
- **Expired Trial**: `"Your trial has ended. Upgrade to continue."`

**Features**:
- Subtle design (not stressful) - `bg-white/5` background
- "Upgrade" button navigates to Settings → Billing
- Dismiss button (×) to close banner

---

## 2. Settings → Billing Page

**Location**: Settings page → Billing tab
**Status**: ✅ Complete

Displays:
- **Current Status**: Shows "Trial" or "Active"
- **Trial End Date**: Format: "January 20, 2025"
- **Days Remaining**: "5 days remaining" (or "Trial expired")
- **Upgrade Button**: "Upgrade to Pro" button (opens Paddle checkout)
- **FAQ Section**: 3 billing questions

**Important**: Button is disabled while Paddle is loading (`isPaddleLoading` state)

---

## 3. Paddle Checkout Flow

**What Happens**:
1. User clicks "Upgrade to Pro" button
2. Backend `/api/billing/checkout` endpoint is called
3. Paddle customer is created (if doesn't exist)
4. Paddle transaction is created and returns `transactionId`
5. Frontend opens Paddle checkout modal with the transaction ID
6. User sees Paddle's payment form (with "Test Mode" label in sandbox)

**Test Card** (Sandbox Environment):
```
Card Number: 4111 1111 1111 1111
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
```

**Success Response**:
- Payment processes successfully
- Paddle webhook fires (backend handles `subscription.created` event)
- User's `subscriptionStatus` updates to `ACTIVE`
- User's `proAccessExpiresAt` is set
- Trial banner disappears on next page reload/refresh

---

## 4. Complete Testing Checklist

### Prerequisites
- [ ] Logged into the app with a user account
- [ ] User has `subscriptionStatus: 'TRIALING'`
- [ ] User has `trialEndsAt` set to a future date

### Test Sequence

#### Step 1: Verify Trial Banner
- [ ] Open dashboard
- [ ] Trial banner appears at top
- [ ] Shows correct number of days remaining
- [ ] "Upgrade" button is visible

#### Step 2: Test Banner Navigation
- [ ] Click "Upgrade" button in banner
- [ ] Navigated to Settings → Billing tab
- [ ] Billing section visible with status info

#### Step 3: Verify Billing Settings Page
- [ ] "Current Status" shows "Trial"
- [ ] "Trial Ends" date is displayed correctly
- [ ] Days remaining shown (matches banner)
- [ ] "Upgrade to Pro" button visible and enabled

#### Step 4: Test Paddle Checkout Modal
- [ ] Click "Upgrade to Pro" button
- [ ] Wait for Paddle to initialize (should be quick)
- [ ] Paddle checkout modal opens (NOT Clerk page)
- [ ] Modal shows "Test Mode" label (confirms sandbox)
- [ ] Payment form visible with field inputs

#### Step 5: Complete Test Payment
- [ ] Enter test card: `4111 1111 1111 1111`
- [ ] Enter any future expiry date
- [ ] Enter any 3-digit CVC
- [ ] Click "Pay Now"
- [ ] Payment processes successfully
- [ ] Modal closes or shows confirmation

#### Step 6: Verify User Status Updated
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Log out and log back in
- [ ] Check that:
  - [ ] Trial banner is GONE
  - [ ] Settings → Billing shows "Active" status
  - [ ] `proAccessExpiresAt` date is visible
  - [ ] Data loads correctly (no "new user" error)

---

## 5. Troubleshooting

### Paddle Checkout Not Opening

**Symptom**: Clicking "Upgrade" opens Clerk page instead of Paddle modal

**Fixes**:
1. Hard refresh: Ctrl+Shift+R (clear cache)
2. Check browser console (F12):
   - Should see: `[Paddle] v2 initialized` (green text)
   - Should NOT see CSP error
3. Verify CSP meta tag in `index.html`:
   ```html
   <meta http-equiv="Content-Security-Policy" content="frame-ancestors 'self' https://sandbox-buy.paddle.com ...">
   ```

### Trial Days Not Calculating

**Symptom**: Banner shows wrong number of days or always shows 14 days

**Check**:
1. Verify `trialEndsAt` is set in Clerk public_metadata
2. Check Clerk JWT template includes `"trialEndsAt": "{{user.public_metadata.trialEndsAt}}"`
3. Log out and log back in to get fresh token

### User Data Shows as "New User"

**Symptom**: After payment, user appears to have no data or subscription status is wrong

**Check**:
1. Verify JWT template is correctly set up (see CLERK_JWT_FIX_NOW.md)
2. Verify backend updated `subscriptionStatus` in database
3. Check browser console for errors (F12 → Console tab)
4. Verify `hasGiftedAccess` logic in AuthContext.tsx (line 85-86)

### Payment Completes But Status Doesn't Update

**Symptom**: Paddle says payment succeeded but user still shows "Trial"

**Check**:
1. Backend webhook might not have fired
2. Check backend logs for `webhook` entries
3. Verify `PADDLE_API_KEY` environment variable is set correctly
4. Manually hard refresh page to pull latest data from Clerk

---

## 6. Production Deployment Checklist

Before moving to production Paddle environment:

- [ ] Test complete flow in sandbox (above checklist)
- [ ] Update `PaddleContext.tsx` to use production CDN:
  ```typescript
  // Change from:
  s.src = "https://sandbox-cdn.paddle.com/paddle/v2/paddle.js";
  // To:
  s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
  ```
- [ ] Update `PaddleContext.tsx` environment setting:
  ```typescript
  // Change from:
  p.Environment.set("sandbox");
  // To:
  p.Environment.set("production");
  ```
- [ ] Set backend environment variables:
  ```
  PADDLE_ENV=production
  PADDLE_API_KEY=<YOUR_PRODUCTION_KEY>
  PADDLE_CLIENT_SIDE_TOKEN=<YOUR_PRODUCTION_CLIENT_TOKEN>
  PADDLE_PRICE_ID=<YOUR_PRODUCTION_PRICE_ID>
  ```
- [ ] Remove/hide "Test Mode" label from Paddle form
- [ ] Test with real credit card (small amount)

---

## 7. Key Code Locations

### Frontend Components
- **Trial Banner**: `components/billing/TrialBanner.tsx`
- **Billing Settings**: `components/settings/BillingSettings.tsx`
- **Paddle Context**: `context/PaddleContext.tsx`
- **Auth Context** (trial logic): `context/AuthContext.tsx`

### Backend Endpoints
- **Checkout**: `POST /api/billing/checkout` (creates transaction)
- **Config**: `GET /api/billing/config` (gets Paddle client token)
- **Webhook**: `POST /api/billing/webhook` (handles Paddle events)

### Configuration
- **CSP Policy**: `index.html` line 7
- **Paddle v2 SDK**: Loaded from sandbox CDN in `PaddleContext.tsx`

---

## 8. Metrics

- **Build**: ✅ Passing (no errors)
- **Code**: ✅ All features implemented
- **Tests**: ✅ Manual testing checklist provided
- **Design**: ✅ Minimal, non-stressful UI

**Status**: 🟢 **Ready for User Testing**

---

Last updated: Session 2025-12-04
Build version: `eefaaed` (CSP meta tag added)
