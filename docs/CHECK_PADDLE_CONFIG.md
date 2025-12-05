# Quick Paddle Configuration Check

Your backend is running fine, but the checkout is still failing with 500 error.

## Check Backend Logs for Paddle Config

When the backend starts, look for these logs in your production console:

```
[Config] PADDLE_ENV: sandbox
[Config] PADDLE_API_KEY: ✓ Set (or ✗ MISSING)
[Config] PADDLE_PRICE_ID: ✓ Set (or ✗ MISSING)
[Config] PADDLE_CLIENT_SIDE_TOKEN: ✓ Set (or ✗ MISSING)
✓ Paddle SDK initialized in "sandbox" mode.
```

## What Each Variable Needs to Be

### PADDLE_ENV
```bash
PADDLE_ENV=sandbox
```
✓ Correct

### PADDLE_API_KEY
Should look like:
```
pdl_sdbx_xxxxxxxxxxxxx  (for sandbox)
or
pdl_live_xxxxxxxxxxxxx  (for production)
```

Not:
```
test_xxxx  ✗ WRONG
```

### PADDLE_CLIENT_SIDE_TOKEN
Should look like:
```
ctk_xxxxxxxxxxxxxx  (for sandbox or production)
```

Not:
```
test_xxxx  ✗ WRONG
```

### PADDLE_PRICE_ID
Should look like:
```
pri_01hp5zkyqt69ewvb0ev3c65gm9
```

## Check Your .env File

Run this command on your production server:

```bash
cat /path/to/.env | grep PADDLE
```

It should show all 4 variables with proper format:
```
PADDLE_ENV=sandbox
PADDLE_API_KEY=pdl_sdbx_...
PADDLE_CLIENT_SIDE_TOKEN=ctk_...
PADDLE_PRICE_ID=pri_...
```

## If Any Are Missing or Wrong

1. **Stop backend**
   ```bash
   docker stop your-backend
   # or
   systemctl stop your-backend-service
   ```

2. **Fix the .env file**
   ```bash
   nano /path/to/.env
   # Add/update the 4 PADDLE variables
   ```

3. **Restart backend**
   ```bash
   docker start your-backend
   # or
   systemctl start your-backend-service
   ```

4. **Check logs again**
   ```bash
   docker logs -f your-backend
   # or
   journalctl -u your-backend-service -f
   ```

5. **Try checkout again**

## Backend Logs When Click "Upgrade to Pro"

You should see:
```
[Billing] Creating transaction with priceId: pri_xxx, customerId: ctm_xxx
[Billing] ✓ Successfully created Paddle transaction ...
```

Or if error:
```
[Billing] ✗ Paddle error (transactions.create) status=400 message=Invalid price ID
[Billing] Full error object: {...}
```

The error message will tell you exactly what's wrong!

## Quick Paddle Dashboard Check

1. Log into https://dashboard.paddle.com
2. Go to Developer → API Keys
3. You should see both keys:
   - Server-side API Key (starts with `pdl_`)
   - Client-side Token (starts with `ctk_`)
4. Go to Products & Prices
5. You should have a product with a price (gets you the `pri_` ID)

All 3 should be in your `.env` file.

---

Once you verify the config and restart backend, the checkout should work!
