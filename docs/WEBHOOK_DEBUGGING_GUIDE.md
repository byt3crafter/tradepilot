# Webhook Debugging Guide

The Paddle webhook should be firing correctly now. Here's how to verify it's working end-to-end.

## What Should Happen After Payment

1. **Payment Completes in Paddle**
2. **Paddle Sends Webhook** → `POST https://jtradepilot.com/api/billing/webhook`
3. **Backend Receives Event** → Logs it, processes it
4. **User Status Updates** → From TRIALING → ACTIVE in database
5. **User Sees Changes**:
   - Trial banner disappears
   - Sidebar shows "JTRADEPILOT PRO" (green)
   - Settings → Billing shows "Active" status

---

## Verification Steps

### 1. Check Webhook is Registered (✅ Done)
In Paddle Dashboard → Webhooks:
- URL: `https://jtradepilot.com/api/billing/webhook`
- Status: Active
- Events received: 9+

### 2. Verify Webhook Request Payload
The webhook sends a JSON like:
```json
{
  "event_id": "evt_01km49j742pgcz2mrysjy39d5",
  "event_type": "subscription.activated",
  "occurred_at": "2025-12-04T07:31:13.348657Z",
  "notification_id": "ntf_01kbm49jtbeyxspppcx35jqlqd",
  "data": {
    "id": "sub_01km49hzpwnsyrevxt05bwccq",
    "status": "active",
    "customer_id": "ctm_xxxxx",
    "next_billed_at": "2026-01-04T00:00:00Z",
    ...
  }
}
```

### 3. Check Backend Logs
When webhook is received, you should see:
```
[Billing] Received Paddle webhook: subscription.activated
[Billing] User {userId} subscription activated - no longer in trial
[Billing] Updated subscription for user {userId} to active
```

### 4. Verify Database Updated
Check that user record was updated:
- `subscriptionStatus` = `ACTIVE`
- `paddleSubscriptionId` = subscription ID from Paddle
- `proAccessExpiresAt` = next billing date

### 5. Test User Experience

**Before Payment:**
- Sidebar shows: "JTRADEPILOT TRIAL" (blue)
- Trial banner shows countdown
- Settings → Billing shows: "Current Status: Trial"

**After Payment:**
1. Refresh page (Ctrl+Shift+R)
2. Sidebar should show: "JTRADEPILOT PRO" (green)
3. Trial banner should be GONE
4. Settings → Billing should show: "Current Status: Active"
5. Pro access expiration date visible

---

## If Webhook Fails (405 Error)

The 405 "Method Not Allowed" error was caused by improper response. This is now fixed:

**What was wrong:**
- Webhook endpoint returning `void` instead of response
- Paddle expects HTTP 200 with valid response

**What changed:**
- Now returns `{ success: true }`
- Better error handling with try-catch
- Logs all webhook events for debugging

**To verify it's fixed:**
1. In Paddle Dashboard → Webhooks
2. Click the webhook row
3. Look at recent events
4. Click on a `subscription.activated` event
5. Check the Response section:
   - Should show HTTP 200
   - Response body should be: `{"success":true}`
   - Status: "Completed"

---

## Common Issues & Fixes

### Issue 1: Webhook Shows 405 Error
**Status**: FIXED ✅
- Now returns proper JSON response
- Webhook handler improved with error handling

### Issue 2: Webhook Received But User Not Updated
**Check**:
1. Backend logs - is the event being processed?
2. Database - was `subscriptionStatus` updated to ACTIVE?
3. Paddle webhook data - is `customer_id` correct?

**Fix**:
- Ensure `paddleCustomerId` is set when customer created
- Verify webhook contains correct `customer_id` in data
- Check database has the correct Paddle customer ID stored

### Issue 3: User Sees Changes But Needs Page Refresh
This is normal. Clerk JWT token needs to refresh. Options:
1. Hard refresh page (Ctrl+Shift+R)
2. Log out and log back in
3. Wait ~1 minute for token auto-refresh

### Issue 4: Trial Banner Still Showing After Payment
**Check**:
1. Did webhook fire? (Check Paddle dashboard)
2. Was database updated? (Check user record)
3. Is JWT token updated? (Log out/in to get fresh token)

---

## Testing with Paddle Sandbox

**Test Card:**
```
Number: 4111 1111 1111 1111
Expiry: Any future date (12/26)
CVC: Any 3 digits (123)
```

**Test Flow:**
1. Go to Settings → Billing
2. Click "Upgrade to Pro"
3. Enter test card details
4. Click "Pay Now"
5. Paddle shows "Test Mode" badge
6. Payment processes successfully
7. Modal closes
8. Wait 2-3 seconds for webhook to fire
9. Refresh page
10. Verify user is now PRO

---

## Real Endpoint URLs

**Development (localhost):**
- API: `http://localhost:8080`
- Billing endpoint: `http://localhost:8080/api/billing/webhook`
- Webhook registration: Manual with ngrok or similar

**Production:**
- API: `https://jtradepilot.com`
- Billing endpoint: `https://jtradepilot.com/api/billing/webhook`
- Webhook registration: Paddle Dashboard

---

## Webhook Implementation Details

### Backend Endpoint
Location: `backend/src/billing/billing.controller.ts` (Line 38-50)

```typescript
@Post('webhook')
@HttpCode(HttpStatus.OK)
async handlePaddleWebhook(
  @Headers('paddle-signature') signature: string,
  @Body() body: any
) {
  // Logs event
  // Calls billing service to process
  // Returns { success: true }
}
```

### Service Handler
Location: `backend/src/billing/billing.service.ts` (Line 139-196)

Processes these events:
- `subscription.created` → Create subscription
- `subscription.updated` → Update subscription details
- `subscription.resumed` → Resume after pause
- `subscription.activated` → Activate after payment
- `subscription.paused` → Pause subscription
- `subscription.canceled` → Cancel subscription

---

## Next: Production Webhook Setup

When moving to production:

1. **Update Webhook URL** in Paddle Dashboard:
   - From sandbox: `https://sandbox-buy.paddle.com`
   - To production: `https://buy.paddle.com`
   - URL: `https://jtradepilot.com/api/billing/webhook`

2. **Enable Signature Verification** (Security):
   ```typescript
   // In billing.controller.ts
   // Verify paddle-signature header matches webhook secret
   const isValid = verifyPaddleSignature(signature, body, secret);
   if (!isValid) throw new UnauthorizedException();
   ```

3. **Test with Real API Keys**:
   - `PADDLE_API_KEY` = production key
   - `PADDLE_CLIENT_SIDE_TOKEN` = production token
   - `PADDLE_PRICE_ID` = production price ID

---

**Status**: ✅ Webhook handling fixed and ready for testing

Last updated: 2025-12-04
