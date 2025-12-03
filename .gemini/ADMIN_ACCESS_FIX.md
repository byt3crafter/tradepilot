# Fixing Admin Panel Access - Clerk JWT Configuration

## Problem
You're getting a CORS error (204 status) when trying to access the admin panel because the backend can't verify your ADMIN role from the Clerk JWT token.

## Solution

### Step 1: Configure Clerk JWT Template

You need to update your Clerk JWT template to include the `role` from `public_metadata` in the token claims.

1. Go to your **Clerk Dashboard** (https://dashboard.clerk.com)
2. Navigate to **Configure → Sessions → JWT Templates**
3. Find or create your JWT template (the one you're using for your app)
4. Edit the template and add the following claims:

```json
{
  "metadata": "{{user.public_metadata}}",
  "role": "{{user.public_metadata.role}}"
}
```

Or more specifically:

```json
{
  "metadata": {
    "role": "{{user.public_metadata.role}}"
  }
}
```

This will ensure that the `role` field from your user's `public_metadata` is included in the JWT token.

### Step 2: Verify User Public Metadata

Make sure your user has the ADMIN role set in public metadata (which you've already done):

```json
{
  "public_metadata": {
    "role": "ADMIN"
  }
}
```

### Step 3: Backend Changes (Already Applied)

I've updated the JWT strategy (`backend/src/auth/strategies/jwt-access.strategy.ts`) to:
1. Extract the role from the Clerk token's metadata
2. Log the payload for debugging
3. Use the role from the token (falling back to database role if not present)

The updated code now checks:
```typescript
const roleFromToken = payload.metadata?.role || payload.role || user.role;
```

This will try:
1. First: `payload.metadata.role` (from the JWT template with `metadata.role`)
2. Second: `payload.role` (from the JWT template with direct `role`)
3. Fallback: `user.role` (from database)

### Step 4: Restart Backend

The backend server needs to be restarted to pick up the code changes. Since you have `pnpm run dev` running, it should auto-reload, but if it doesn't:

```bash
# In the backend directory
pnpm run dev
```

Wait for the server to restart completely.

### Step 5: Get a Fresh Token

After updating the Clerk JWT template:
1. **Log out** of your application
2. **Clear browser cache/cookies** (or use incognito mode)
3. **Log back in**

This ensures you get a fresh JWT token with the new claims including the `role` field.

### Step 6: Verify the JWT Token

To debug and verify the token is correct, you can:

1. **Check browser console** - Look for the debug logs showing the JWT payload
2. **Use jwt.io** - Copy your JWT token (from browser DevTools → Network → any API call → Request Headers → Authorization) and paste it into https://jwt.io to decode and inspect the claims

The decoded token should include:
```json
{
  "sub": "user_xxxxx",
  "email": "your@email.com",
  "metadata": {
    "role": "ADMIN"
  },
  "role": "ADMIN"
}
```

### Step 7: Test Admin Access

Now try accessing the admin panel again. It should work!

## Quick Checklist

- [ ] JWT template updated in Clerk Dashboard to include role
- [ ] User public_metadata has `"role": "ADMIN"`
- [ ] Backend has restarted and loaded the new code
- [ ] Logged out and back in to get fresh token
- [ ] Token verified (via jwt.io or browser console logs)
- [ ] Admin panel accessible

## Still Having Issues?

If you're still getting a 204 or CORS error:

1. **Check backend logs** - Look for the debug logs showing the JWT payload
2. **Verify CORS is enabled** - The backend should log: "CORS is not configured with specific origins. Enabling ALL origins for development."
3. **Check network tab** - Ensure the Authorization header is being sent
4. **Verify Clerk issuer URL** - Make sure `CLERK_ISSUER_URL` in backend env is correct

## Example Clerk JWT Template

Here's a complete example of what your JWT template should look like:

```json
{
  "email": "{{user.primary_email_address.email_address}}",
  "username": "{{user.username}}",
  "firstName": "{{user.first_name}}",
  "lastName": "{{user.last_name}}",
  "fullName": "{{user.full_name}}",
  "role": "{{user.public_metadata.role}}",
  "metadata": "{{user.public_metadata}}"
}
```

Save the template and try again!
