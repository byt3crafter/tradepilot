# Clerk JWT Template Setup - CRITICAL

Your data is missing because Clerk JWT tokens don't include the `public_metadata` field with subscription info.

## The Problem

When you log in, the JWT token Clerk creates is missing:
- `subscriptionStatus` (TRIALING, ACTIVE, etc.)
- `trialEndsAt` (when trial expires)
- `proAccessExpiresAt` (Pro access expiration)
- `role` (USER or ADMIN)

This causes the frontend to show you as a "new user" with no data.

## Solution: Update Clerk JWT Template

### Step 1: Go to Clerk Dashboard

1. Open: https://dashboard.clerk.com
2. Select your application
3. Go to: **Settings → JWT Templates** (in left sidebar under "Configure")

### Step 2: Find or Create a JWT Template

If you have a custom template:
- Click on it to edit
- Or delete it and create a new one

If you don't have one:
- Click "Create Template"
- Select "Custom" as the provider

### Step 3: Update the JWT Template Code

**Replace the entire template with this:**

```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "fullName": "{{user.first_name}} {{user.last_name}}",
  "isEmailVerified": "{{user.email_verified}}",
  "createdAt": "{{user.created_at}}",
  "lastLoginAt": "{{user.last_sign_in_at}}",
  "role": "{{user.public_metadata.role}}",
  "subscriptionStatus": "{{user.public_metadata.subscriptionStatus}}",
  "trialEndsAt": "{{user.public_metadata.trialEndsAt}}",
  "proAccessExpiresAt": "{{user.public_metadata.proAccessExpiresAt}}"
}
```

### Step 4: Click Save

The template is now active and will be used for all new JWT tokens.

### Step 5: Test It

1. Log out completely
2. Clear browser cache/cookies (or use incognito)
3. Log back in
4. Check backend logs - should now show public_metadata with values

## Verification

After updating, your backend logs should show:

```
✅ JWT VALIDATION SUCCESS - Returning user object: {"sub":"user_...", ...}
```

Instead of:

```
📞 Calling validateClerkUser with public_metadata: undefined
```

## If It Still Shows "New User"

1. **Clear Clerk Cache**
   - In Clerk Dashboard → Click your profile icon → Sessions
   - Delete all active sessions
   - Sign out and sign back in

2. **Force Token Refresh**
   - Hard refresh browser (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
   - Open Developer Tools → Application → Cookies
   - Delete all cookies starting with `__session` or `clerk`

3. **Check Database**
   ```sql
   SELECT id, email, "subscriptionStatus", "trialEndsAt" FROM "User"
   WHERE email = 'your-email@example.com';
   ```
   - Verify data exists in database

4. **Update Clerk Public Metadata Manually**
   - If user record in Clerk is empty, update it:
   - Clerk Dashboard → Users → Click user
   - Click "Edit" under User Metadata
   - Add to "Public Metadata":
     ```json
     {
       "subscriptionStatus": "TRIALING",
       "trialEndsAt": "2025-01-20T00:00:00Z",
       "role": "USER"
     }
     ```

## Complete Setup Checklist

- [ ] Went to Clerk Dashboard
- [ ] Found JWT Templates section
- [ ] Updated template with public_metadata fields
- [ ] Clicked Save
- [ ] Logged out completely
- [ ] Cleared browser cache
- [ ] Logged back in
- [ ] Verified backend logs show public_metadata
- [ ] Checked that subscription data loads
- [ ] Confirmed trial countdown appears

## Why This Happens

Clerk has two types of metadata:
1. **Private Metadata** - Server-only, never sent to frontend
2. **Public Metadata** - Sent to frontend in JWT token

Our app needs to sync user data from database to Clerk's public_metadata so the JWT includes it.

## Next: Auto-Sync User Data to Clerk

After fixing the JWT template, you should update the auth service to sync user data to Clerk when user logs in or subscribes:

```typescript
// In backend/src/auth/auth.service.ts
async syncUserDataToClerk(clerkUserId: string, userData: any) {
  const user = clerkClient.users.getUser(clerkUserId);
  await clerkClient.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      subscriptionStatus: userData.subscriptionStatus,
      trialEndsAt: userData.trialEndsAt,
      proAccessExpiresAt: userData.proAccessExpiresAt,
      role: userData.role
    }
  });
}
```

This should be called after:
- User signs up (set initial trial)
- Webhook updates subscription (user upgrades)
- Admin changes user role

## Support

If it still doesn't work:
1. Check Clerk logs in dashboard
2. Check backend logs for JWT payload
3. Verify user metadata exists in Clerk Dashboard

---

**Important**: This is a one-time setup. After updating the JWT template, all new logins will include the metadata automatically.
