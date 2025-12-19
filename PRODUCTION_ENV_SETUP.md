# Production Environment Setup - Complete Checklist

**Status:** Moving from TEST to PRODUCTION  
**Date:** December 19, 2025  
**Target:** swaryoga.com on Vercel

---

## 📋 All Required Environment Variables

### 1. PayU Payment Gateway (CRITICAL)
```
PAYU_MERCHANT_KEY=YOUR_PRODUCTION_KEY
PAYU_MERCHANT_SALT=YOUR_PRODUCTION_SALT
PAYU_MODE=PRODUCTION
```
**Where to Get:**
- Go to: https://payubiz.in → Settings → API Keys
- Copy **Production** credentials (NOT test ones)
- Key example: `gtKFFx` (your actual key)
- Salt example: `4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW` (your actual salt)

### 2. Database (MongoDB)
```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DBNAME?retryWrites=true&w=majority
```
**Status:** ✅ Already configured (production database)

### 3. JWT Authentication
```
JWT_SECRET=YOUR_SECRET_KEY_MIN_32_CHARS
```
**Status:** ✅ Should already exist  
**Where to Get:** Check your `.env.local` file

### 4. Next.js Public URL
```
NEXT_PUBLIC_API_URL=https://swaryoga.com
```
**Note:** Must be https (not http)

### 5. OAuth Providers (Optional but Recommended)
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
NEXT_PUBLIC_FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
```
**Status:** ⏳ Need to configure if using social login

### 6. Email Service (Optional)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```
**Status:** Optional (only if sending emails)

### 7. Third-Party APIs (Optional)
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```
**Status:** Optional

---

## 🚀 Steps to Deploy to Production

### Step 1: Collect Credentials
- [ ] PayU Merchant Key (Production)
- [ ] PayU Merchant Salt (Production)
- [ ] JWT Secret (from .env.local)
- [ ] Google OAuth Client ID (if using)
- [ ] Facebook App ID (if using)

### Step 2: Add to Vercel
1. Go to: https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan
2. Click **Settings** → **Environment Variables**
3. **IMPORTANT:** Select **Production** environment (not Preview)
4. Add each variable with value
5. Click Save/Add

### Step 3: Verify Configuration
1. Go to Vercel → Deployments
2. Click **Redeploy** on latest deployment
3. Wait for build to complete
4. Check logs for: `🔐 PayU Configuration: { mode: 'PRODUCTION', baseUrl: 'https://secure.payu.in' }`

### Step 4: Test on Production
1. Visit https://swaryoga.com
2. Go through payment flow
3. Verify redirects to secure.payu.in (not test.payu.in)
4. Test a small payment

---

## ✅ Environment Variables Checklist

### Database
- [x] MONGODB_URI (production database) - Already set

### Authentication
- [x] JWT_SECRET - Already set

### PayU Gateway (PRIMARY)
- [ ] PAYU_MERCHANT_KEY - **NEED TO SET**
- [ ] PAYU_MERCHANT_SALT - **NEED TO SET**
- [ ] PAYU_MODE - **NEED TO SET TO: PRODUCTION**

### API Configuration
- [x] NEXT_PUBLIC_API_URL - Should be set to https://swaryoga.com

### OAuth (Optional)
- [ ] NEXT_PUBLIC_GOOGLE_CLIENT_ID - Optional
- [ ] NEXT_PUBLIC_FACEBOOK_APP_ID - Optional

---

## 📊 Current vs. Target Status

| Variable | Current | Target | Status |
|----------|---------|--------|--------|
| PAYU_MODE | TEST | PRODUCTION | ❌ Need to change |
| PAYU_MERCHANT_KEY | test_key | prod_key | ❌ Need to change |
| PAYU_MERCHANT_SALT | test_salt | prod_salt | ❌ Need to change |
| MONGODB_URI | prod_db | prod_db | ✅ Good |
| JWT_SECRET | exists | exists | ✅ Good |
| NEXT_PUBLIC_API_URL | vercel_url | https://swaryoga.com | ✅ Good |

---

## 🔒 Security Notes

1. **Never** use test credentials in production
2. **Always** use HTTPS URLs in production
3. **Keep** JWT_SECRET secret (minimum 32 characters)
4. **Store** PayU credentials safely (don't commit to git)
5. **Use** Vercel's environment variables (not .env files)

---

## 📞 PayU Production Credentials

**Your Current Production Credentials (from error message):**
```
Merchant Key: a0q*** (confirm with PayU)
Merchant Salt: *** (confirm with PayU)
```

**Get them here:**
1. Log in to: https://payubiz.in
2. Click: **Settings** → **API Keys**
3. Copy: **Production** Merchant Key and Salt
4. (Do NOT use Test credentials)

---

## 🛠️ How to Configure Vercel

### Option 1: Via Web Dashboard (Recommended)
1. Go to: https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan/settings/environment-variables
2. Click "Add New"
3. **Environment:** Select "Production"
4. **Name:** `PAYU_MERCHANT_KEY`
5. **Value:** Your production key
6. Click "Save"
7. Repeat for SALT and MODE

### Option 2: Via CLI (Advanced)
```bash
vercel env add PAYU_MERCHANT_KEY
vercel env add PAYU_MERCHANT_SALT
vercel env add PAYU_MODE PRODUCTION
```

---

## ✨ Verification Steps

After deploying, verify:

1. ✅ Payment page loads
2. ✅ Amount calculates correctly
3. ✅ Redirects to `secure.payu.in` (NOT `test.payu.in`)
4. ✅ Hash calculation is correct (no "incorrectly calculated hash" errors)
5. ✅ Payment processes successfully
6. ✅ Callback updates order status

---

## 🚨 Common Issues & Fixes

### Issue: "Oops, Page Not Found" on PayU
- **Cause:** Wrong base URL (using test instead of prod)
- **Fix:** Verify `PAYU_MODE=PRODUCTION` is set

### Issue: "Transaction failed due to incorrectly calculated hash"
- **Cause:** Wrong salt or key being used
- **Fix:** Verify you're using production credentials

### Issue: Payments work locally but fail on production
- **Cause:** Environment variables not set in Vercel
- **Fix:** Check Vercel settings, redeploy after adding vars

### Issue: Old payment is still showing "test.payu.in"
- **Cause:** Browser cache or old deployment
- **Fix:** Hard refresh (Cmd+Shift+R) or clear cache

---

## 📝 Next Steps

1. **Collect** all production credentials from PayU
2. **Add** all variables to Vercel (Production environment)
3. **Redeploy** to production
4. **Test** with small payment
5. **Monitor** logs for any errors
6. **Announce** to users that production is ready

---

## 📞 Support

For issues:
- PayU Support: https://payubiz.in/support
- Vercel Support: https://vercel.com/support
- Documentation: See VERCEL_PAYU_PRODUCTION_SETUP.md

**Ready to go live!** 🚀
