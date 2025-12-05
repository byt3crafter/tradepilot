# Trial Expiration Testing Guide

This guide explains how to manually expire a user's trial for testing purposes.

## Database Commands

### Option 1: Expire Trial Now (Development)

To immediately expire a user's trial, update their `trialEndsAt` field to a past date using this SQL command:

```sql
UPDATE "User"
SET "trialEndsAt" = NOW() - INTERVAL '1 day'
WHERE email = 'your-test-email@example.com';
```

### Option 2: Expire Trial in X Days (For Testing Warnings)

To set the trial to expire in 5 days (for testing the "trial expiring soon" warning):

```sql
UPDATE "User"
SET "trialEndsAt" = NOW() + INTERVAL '5 days'
WHERE email = 'your-test-email@example.com';
```

### Option 3: Reset Trial to 14 Days (For Re-testing)

To reset a user's trial back to 14 days from now:

```sql
UPDATE "User"
SET "trialEndsAt" = NOW() + INTERVAL '14 days'
WHERE email = 'your-test-email@example.com';
```

### Option 4: Check Current Trial Status

To view a user's current trial information:

```sql
SELECT
  email,
  "subscriptionStatus",
  "trialEndsAt",
  CASE
    WHEN "trialEndsAt" IS NULL THEN 'No trial date set'
    WHEN "trialEndsAt" < NOW() THEN 'Trial expired'
    ELSE 'Days remaining: ' || CEIL(EXTRACT(EPOCH FROM ("trialEndsAt" - NOW())) / 86400)::TEXT
  END as trial_status
FROM "User"
WHERE email = 'your-test-email@example.com';
```

## Testing Scenarios

### Scenario 1: Test Trial Expiration Flow

1. Set your test user's trial to expire now:
   ```sql
   UPDATE "User" SET "trialEndsAt" = NOW() - INTERVAL '1 day' WHERE email = 'test@example.com';
   ```

2. Log out and log back in, or refresh the page
3. Verify the Billing section in Settings shows "Trial expired - upgrade now to keep trading"
4. Verify the "Upgrade to Pro" button is displayed

### Scenario 2: Test Trial Expiration Warning

1. Set your test user's trial to expire in 3 days:
   ```sql
   UPDATE "User" SET "trialEndsAt" = NOW() + INTERVAL '3 days' WHERE email = 'test@example.com';
   ```

2. Log out and log back in
3. Navigate to Settings > Billing
4. Verify you see the warning: "Your trial is ending soon. Upgrade now..."
5. Verify it shows "3 days remaining"

### Scenario 3: Test Active Subscription

1. Set subscription status to ACTIVE:
   ```sql
   UPDATE "User"
   SET "subscriptionStatus" = 'ACTIVE',
       "proAccessExpiresAt" = NOW() + INTERVAL '30 days'
   WHERE email = 'test@example.com';
   ```

2. Navigate to Settings > Billing
3. Verify status shows "Active" in green
4. Verify "Pro Access Expires" date is displayed
5. Verify no upgrade button is shown

## Database Connection

To run these SQL commands, connect to your database using one of these methods:

### Using psql CLI:
```bash
psql $DATABASE_URL -c "UPDATE \"User\" SET \"trialEndsAt\" = NOW() - INTERVAL '1 day' WHERE email = 'test@example.com';"
```

### Using DBeaver or pgAdmin:
1. Open your SQL editor
2. Copy/paste the command above
3. Replace `test@example.com` with your test user's email
4. Execute the query

### Using Prisma CLI:
```bash
# Open Prisma Studio
npx prisma studio

# Then click on the User record and manually edit the trialEndsAt field
```

## Frontend Testing Checklist

After updating the trial date, verify:

- [ ] Billing section displays correct subscription status
- [ ] Trial countdown shows correct number of days
- [ ] Warning appears when trial has < 7 days remaining
- [ ] "Upgrade to Pro" button is displayed when appropriate
- [ ] Settings navigation includes "Billing" tab
- [ ] All text formatting is correct (colors, fonts, layout)

## Reset Test User

To reset a test user back to a fresh 14-day trial:

```sql
UPDATE "User"
SET
  "trialEndsAt" = NOW() + INTERVAL '14 days',
  "subscriptionStatus" = 'TRIALING',
  "proAccessExpiresAt" = NULL,
  "paddleCustomerId" = NULL,
  "paddleSubscriptionId" = NULL
WHERE email = 'test@example.com';
```

---

**Note**: These commands should only be used in development/staging environments. In production, use the Paddle dashboard to manage subscriptions.
