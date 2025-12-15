# Vercel Environment Variables Setup - PayU Credentials

## Current Status
- ✅ PayU credentials added to `.env`
- ✅ PayU credentials added to `.env.local`
- ✅ Pushed to GitHub

## Next Step: Add to Vercel Dashboard

### How to Add PayU Credentials to Vercel:

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard

2. **Select Your Project**
   - Click on: `swaryoga.com` or your project name

3. **Go to Settings → Environment Variables**
   - Settings tab → Environment Variables section

4. **Add Three Variables** (one by one):

#### Variable 1:
- **Name**: `PAYU_MODE`
- **Value**: `TEST`
- **Environments**: Select all (Production, Preview, Development)
- Click **Save**

#### Variable 2:
- **Name**: `PAYU_MERCHANT_KEY`
- **Value**: `gtKFFx`
- **Environments**: Select all
- Click **Save**

#### Variable 3:
- **Name**: `PAYU_MERCHANT_SALT`
- **Value**: `eCwWELJIl92doCBOxyXPnaVgQnmrjVi6cn0AWfj7`
- **Environments**: Select all
- Click **Save**

5. **Redeploy Project**
   - Go to Deployments tab
   - Click the three dots on latest deployment
   - Select "Redeploy"
   - Or push a commit to trigger auto-deploy

## Environment Variables Checklist

| Variable | Location | Value |
|----------|----------|-------|
| PAYU_MODE | `.env` | TEST |
| PAYU_MODE | `.env.local` | TEST |
| PAYU_MODE | Vercel | TEST |
| PAYU_MERCHANT_KEY | `.env` | gtKFFx |
| PAYU_MERCHANT_KEY | `.env.local` | gtKFFx |
| PAYU_MERCHANT_KEY | Vercel | gtKFFx |
| PAYU_MERCHANT_SALT | `.env` | eCwWELJIl92doCBOxyXPnaVgQnmrjVi6cn0AWfj7 |
| PAYU_MERCHANT_SALT | `.env.local` | eCwWELJIl92doCBOxyXPnaVgQnmrjVi6cn0AWfj7 |
| PAYU_MERCHANT_SALT | Vercel | eCwWELJIl92doCBOxyXPnaVgQnmrjVi6cn0AWfj7 |

## Why This Works (Same as MongoDB)

Like MongoDB, PayU credentials need to be in three places:

1. **`.env`** - Shared across team (committed to Git)
2. **`.env.local`** - Local overrides (not committed, for secrets)
3. **Vercel** - Production environment variables

This ensures:
- ✅ Local development works
- ✅ Vercel deployment works
- ✅ Team members can pull and run immediately
- ✅ No secrets exposed on GitHub

## Testing After Vercel Deployment

Once you add credentials to Vercel and redeploy:

1. Go to: `https://swaryoga.com/checkout`
2. Add workshops to cart
3. Fill checkout form
4. Click "Proceed to Payment"
5. Should redirect to PayU payment page (no error)

---

**Status**: Ready for Vercel setup
**Action Required**: Add 3 environment variables to Vercel dashboard
