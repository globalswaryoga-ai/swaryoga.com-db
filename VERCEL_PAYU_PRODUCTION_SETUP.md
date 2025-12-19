# Setting PayU to PRODUCTION Mode on Vercel

## Problem
The production website (swaryoga.com) is currently using PayU in **TEST mode** instead of **PRODUCTION mode**. This means:
- Test payment gateway: `https://test.payu.in`
- Real payments are NOT being processed
- Users see test transactions, not live ones

## Solution: Configure Environment Variables in Vercel

### Step 1: Get Your PayU Production Credentials
1. Log in to PayU Business Account: https://payubiz.in/
2. Navigate to **Settings → API Keys**
3. Find and copy:
   - **Production Merchant Key** (looks like: `gtKFFx` or similar)
   - **Production Merchant Salt** (looks like: `4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW` or similar)

### Step 2: Add Environment Variables to Vercel
1. Go to: https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan
2. Click **Settings** → **Environment Variables**
3. Add the following variables for **Production** environment:

```
PAYU_MERCHANT_KEY = gtKFFx (your production key)
PAYU_MERCHANT_SALT = 4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW (your production salt)
PAYU_MODE = PRODUCTION
```

**IMPORTANT:** Make sure to:
- ✅ Select **Production** environment (not Preview/Development)
- ✅ Use your PRODUCTION credentials from PayU, not test ones
- ✅ Set `PAYU_MODE = PRODUCTION` (must be all caps)

### Step 3: Deploy to Production
After adding the environment variables:
1. Go to: https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan/deployments
2. Click **Redeploy** on the latest production deployment
3. Or run from terminal:
   ```bash
   vercel --prod --yes
   ```

### Step 4: Verify Production Mode is Active
1. Try a test payment on production site
2. Check server logs in Vercel (Deployments → Runtime Logs)
3. Look for: `🔐 PayU Configuration: { mode: 'PRODUCTION', baseUrl: 'https://secure.payu.in', ... }`

## Environment Variables Summary

| Variable | Test Value | Production Value |
|----------|-----------|-----------------|
| `PAYU_MERCHANT_KEY` | gtKFFx | YOUR_PROD_KEY |
| `PAYU_MERCHANT_SALT` | 4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW | YOUR_PROD_SALT |
| `PAYU_MODE` | TEST (default) | PRODUCTION |

## Code Logic

The code checks `PAYU_MODE` environment variable:
```typescript
const rawPayuMode = (process.env.PAYU_MODE || 'TEST').toString().trim().toUpperCase();
const isProductionMode = productionTokens.some((token) => rawPayuMode.includes(token));

export const PAYU_BASE_URL = isProductionMode
  ? 'https://secure.payu.in'  // ✅ Real payments
  : 'https://test.payu.in';   // ❌ Test payments
```

If `PAYU_MODE` is missing or not set, it defaults to TEST mode.

## Current Status

- ❌ swaryoga.com is using TEST mode
- ✅ Code is configured to support PRODUCTION mode
- ⏳ Need to add environment variables to Vercel

## Next Steps

1. **Collect Production Credentials**: Get `PAYU_MERCHANT_KEY` and `PAYU_MERCHANT_SALT` from PayU account
2. **Update Vercel Settings**: Add 3 environment variables (PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, PAYU_MODE)
3. **Redeploy**: Trigger a new deployment to production
4. **Test**: Verify with a small test payment on the live site

---

**Questions?** Check your PayU account credentials or contact PayU support if credentials are incorrect.
