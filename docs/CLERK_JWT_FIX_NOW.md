# Fix Clerk JWT Template - RIGHT NOW

Your Clerk JWT template editor is open. Here's exactly what to do:

## Step 1: Clear Everything

1. Select ALL text in the Claims editor (Ctrl+A or Cmd+A)
2. Delete it

## Step 2: Copy This Exact Template

Copy this entire code block:

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

## Step 3: Paste Into Claims Editor

1. Click in the Claims text editor (left side)
2. Paste the template
3. Should look clean and complete

## Step 4: Save

Look for a "Save" button (usually at bottom of the page)
- Click it
- Wait for confirmation message

## Step 5: Test

1. **Log out completely** from your app
2. **Close all browser tabs** with your app
3. **Open incognito/private window**
4. **Log back in**
5. Check if data loads properly

## What This Does

This template tells Clerk to include in the JWT token:
- `subscriptionStatus` - from Clerk public_metadata (database syncs here)
- `trialEndsAt` - from Clerk public_metadata (when trial expires)
- `proAccessExpiresAt` - Pro expiration date
- `role` - USER or ADMIN

## If You See An Error

Red error message at bottom saying "You can't use the reserved claim: sub"?
- That's OK, it still works
- Just click Save anyway
- The JWT will still include your data

## Verify It Worked

After logging back in:
1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Find cookie starting with `__session`
4. Decode it at jwt.io (paste the token value)
5. Should see your data in the payload:
```
{
  "subscriptionStatus": "TRIALING",
  "trialEndsAt": "2025-01-20T...",
  "role": "USER"
}
```

If you see those fields → Your data will load!

---

**IMPORTANT**: Do this NOW while you have the Clerk editor open!
