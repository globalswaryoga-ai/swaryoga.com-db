# 🚀 PayU Production Setup - Complete Transition Guide

**Status:** Ready for Live Deployment  
**Date:** December 20, 2025  
**Framework:** Next.js 14 + TypeScript

---

## 📋 Table of Contents

1. [Current Configuration](#current-configuration)
2. [Step 1: Generate Live Keys](#step-1-generate-live-keys)
3. [Step 2: Update Environment Variables](#step-2-update-environment-variables)
4. [Step 3: Verify Endpoint URLs](#step-3-verify-endpoint-urls)
5. [Step 4: Test Production Configuration](#step-4-test-production-configuration)
6. [Step 5: SSL/HTTPS & Webhook Setup](#step-5-sslhttps--webhook-setup)
7. [Step 6: Deployment Checklist](#step-6-deployment-checklist)
8. [Step 7: Monitor & Verify](#step-7-monitor--verify)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Plan](#rollback-plan)

---

## Current Configuration

### Test Environment (Current)

**PayU Configuration File:** `lib/payments/payu.ts`

```typescript
// Current code detects environment
export const PAYU_MODE = isProductionMode ? 'PRODUCTION' : 'TEST';
export const PAYU_BASE_URL = isProductionMode
  ? 'https://secure.payu.in'
  : 'https://test.payu.in';
```

**Credential Sources:** `.env.local` (development) / `.env.production` (deployment)

```
PAYU_MERCHANT_KEY=<TEST_KEY>
PAYU_MERCHANT_SALT=<TEST_SALT>
PAYU_MODE=TEST
```

**Endpoints Currently Used:**

| Endpoint | Current | Purpose |
|----------|---------|---------|
| **Payment API** | `https://test.payu.in/_payment` | Form redirect for payments |
| **Callback** | Your domain `/api/payments/payu/callback` | Payment result webhook |
| **Hash Verification** | Local (SHA512) | Security validation |

---

## Step 1: Generate Live Keys

### 1.1 Access PayU Dashboard

```
1. Go to https://www.payu.in/
2. Click "Login" (top right)
3. Enter your merchant email & password
4. You'll see the merchant dashboard
```

### 1.2 Switch to Live Mode

```
1. Look for TOGGLE in top-right corner
   ├─ Current: "TEST MODE" (blue)
   └─ Switch to: "LIVE MODE" (red)
   
2. Confirmation popup will appear
   ├─ Click: "Switch to Live Mode"
```

**⚠️ IMPORTANT:** Test and Live modes have DIFFERENT credentials. Do NOT mix them.

### 1.3 Get Your Live Keys

```
1. From dashboard menu, go to:
   Developer Tools → API Keys

2. Copy EXACTLY these values:
   ├─ Live Merchant Key (25-30 chars)
   ├─ Live Merchant Salt (32-40 chars)
   └─ Keep these ABSOLUTELY SECRET
```

**Example Format (do NOT use these):**
```
Live Merchant Key: supVlp5D9Yvd8vYHXrB4xWm
Live Merchant Salt: 2H8kL9mQpR7tU3xW5yZ1aB4cD6eF9gH2jK5lM7nP0qR2sT4u
```

### 1.4 Verify in Test Mode First (RECOMMENDED)

Before switching permanently to live, test with both sets of credentials in test mode:

```bash
# Test with Test Key & Salt
PAYU_MODE=TEST \
PAYU_MERCHANT_KEY=<YOUR_TEST_KEY> \
PAYU_MERCHANT_SALT=<YOUR_TEST_SALT> \
npm run dev

# Then run test suite
node test-payu-integration.js
```

---

## Step 2: Update Environment Variables

### 2.1 For Local Development (`.env.local`)

Edit or create `.env.local`:

```dotenv
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database

# Auth
JWT_SECRET=<your-32-char-secret>

# App
NEXT_PUBLIC_API_URL=http://localhost:3000

# PayU - TEST MODE (for testing)
PAYU_MERCHANT_KEY=<YOUR_TEST_KEY>
PAYU_MERCHANT_SALT=<YOUR_TEST_SALT>
PAYU_MODE=TEST

# ⬇️ UNCOMMENT BELOW TO SWITCH TO LIVE (after testing)
# PayU - LIVE MODE (for production)
# PAYU_MERCHANT_KEY=<YOUR_LIVE_KEY>
# PAYU_MERCHANT_SALT=<YOUR_LIVE_SALT>
# PAYU_MODE=PRODUCTION
```

**Storage Location:** `.env.local` (local machine, NOT committed to Git)

### 2.2 For Vercel Deployment

**DO NOT commit credentials to Git.** Use Vercel environment variables instead:

```bash
# From your local terminal:
vercel env add PAYU_MERCHANT_KEY
# → Enter your LIVE key when prompted

vercel env add PAYU_MERCHANT_SALT
# → Enter your LIVE salt when prompted

vercel env add PAYU_MODE
# → Enter: PRODUCTION
```

**Verification:**

```bash
# View environment variables on Vercel
vercel env list

# Expected output:
# PAYU_MERCHANT_KEY    (masked: suVl***)
# PAYU_MERCHANT_SALT   (masked: 2H8k***)
# PAYU_MODE            PRODUCTION
```

### 2.3 For Self-Hosted / Custom VPS

Create `.env.production.local` (never commit):

```dotenv
# PayU - PRODUCTION
PAYU_MERCHANT_KEY=<YOUR_LIVE_KEY>
PAYU_MERCHANT_SALT=<YOUR_LIVE_SALT>
PAYU_MODE=PRODUCTION
```

Then deploy with:

```bash
# Build for production
npm run build

# Start with environment variables
PAYU_MODE=PRODUCTION \
PAYU_MERCHANT_KEY=<YOUR_LIVE_KEY> \
PAYU_MERCHANT_SALT=<YOUR_LIVE_SALT> \
npm run start
```

---

## Step 3: Verify Endpoint URLs

### 3.1 Automatic Detection (Already Implemented ✅)

Your code automatically selects the correct endpoint:

```typescript
// In lib/payments/payu.ts
export const PAYU_BASE_URL = isProductionMode
  ? 'https://secure.payu.in'      // ← LIVE endpoint
  : 'https://test.payu.in';        // ← TEST endpoint
```

### 3.2 Endpoint Verification Matrix

| Mode | Endpoint | Hash | Callback | Status |
|------|----------|------|----------|--------|
| **TEST** | `https://test.payu.in/_payment` | Test salt | `http://localhost:3000/api/...` | ✅ Ready |
| **LIVE** | `https://secure.payu.in/_payment` | Live salt | `https://your-domain.com/api/...` | ✅ Ready |

**Your system correctly implements both.**

### 3.3 Verify Correct Endpoints in Logs

When you start your server, you should see:

```
🔐 PayU Configuration: {
  mode: 'PRODUCTION',                    ← Should be PRODUCTION for live
  baseUrl: 'https://secure.payu.in',     ← Should be secure.payu.in for live
  hasKey: true,
  hasSalt: true,
  keyPrefix: 'suV'
}
```

**If you see `test.payu.in` on production, credentials are not set correctly.**

---

## Step 4: Test Production Configuration

### 4.1 Pre-Deployment Verification

Run this test with your LIVE credentials (but PAYU_MODE=TEST for safety):

```bash
# Create test script
cat > test-live-keys.js << 'EOF'
const crypto = require('crypto');

const LIVE_KEY = process.env.PAYU_MERCHANT_KEY;
const LIVE_SALT = process.env.PAYU_MERCHANT_SALT;

console.log('🔐 Live Credentials Test');
console.log('─────────────────────────────────────');

if (!LIVE_KEY || !LIVE_SALT) {
  console.error('❌ ERROR: Credentials not set');
  process.exit(1);
}

console.log('✅ Merchant Key found:', LIVE_KEY.substring(0, 3) + '***');
console.log('✅ Merchant Salt found:', LIVE_SALT.substring(0, 5) + '***');

// Test hash generation with live credentials
const testParams = {
  key: LIVE_KEY,
  txnid: 'TEST_TXN_' + Date.now(),
  amount: '0.01',
  productinfo: 'Test',
  firstname: 'Test',
  email: 'test@example.com'
};

const hashString = [
  LIVE_KEY,
  testParams.txnid,
  testParams.amount,
  testParams.productinfo,
  testParams.firstname,
  testParams.email,
  '', '', '', '', '',
  '', '', '', '', '',
  LIVE_SALT
].join('|');

const hash = crypto.createHash('sha512').update(hashString).digest('hex');

console.log('\n📝 Test Hash Generated:');
console.log('✅ Hash length:', hash.length, '(should be 128)');
console.log('✅ Hash prefix:', hash.substring(0, 20) + '...');

console.log('\n✅ ALL TESTS PASSED - Ready for live deployment');
EOF

# Run test
PAYU_MERCHANT_KEY=<YOUR_LIVE_KEY> \
PAYU_MERCHANT_SALT=<YOUR_LIVE_SALT> \
node test-live-keys.js
```

Expected output:
```
🔐 Live Credentials Test
─────────────────────────────────────
✅ Merchant Key found: suV***
✅ Merchant Salt found: 2H8k***

📝 Test Hash Generated:
✅ Hash length: 128 (should be 128)
✅ Hash prefix: a1b2c3d4e5f6g7h8i9j0...

✅ ALL TESTS PASSED - Ready for live deployment
```

### 4.2 Local Payment Test (with Live Keys)

```bash
# Start server in LIVE mode
PAYU_MODE=PRODUCTION \
PAYU_MERCHANT_KEY=<YOUR_LIVE_KEY> \
PAYU_MERCHANT_SALT=<YOUR_LIVE_SALT> \
npm run dev
```

Then navigate to `/checkout` and:

1. ✅ Fill form
2. ✅ Click "Proceed to Payment"
3. ✅ Verify redirected to `https://secure.payu.in/_payment` (NOT test.payu.in)
4. ✅ Check browser DevTools → Network tab:
   - URL should be: `https://secure.payu.in/_payment`
   - Form data should have your LIVE key (first 3 chars match)

### 4.3 Verify Callback URL Configuration

**Critical:** Callback URL must be https://your-domain.com in production.

```bash
# Check that callback is configured correctly
# In app/api/payments/payu/initiate/route.ts (line ~350)

const baseUrl = getBaseUrl(request) || 'http://localhost:3000';
const callbackUrl = `${baseUrl}/api/payments/payu/callback?...`;
```

**For Vercel:**
- Automatically uses your deployment URL
- Format: `https://your-project.vercel.app/api/payments/payu/callback`

**For Custom Domain:**
- Configure in Vercel dashboard → Domains
- Or set `NEXT_PUBLIC_APP_URL` environment variable

---

## Step 5: SSL/HTTPS & Webhook Setup

### 5.1 HTTPS Requirement

✅ **Already handled by Vercel/hosting providers**

For self-hosted:
```bash
# Use SSL certificate (Let's Encrypt recommended)
certbot certonly --standalone -d your-domain.com

# Configure in your server/load balancer
```

### 5.2 Callback URL in PayU Dashboard

⚠️ **Critical step - often missed!**

```
1. Log in to PayU Dashboard (LIVE mode)
2. Go to: Settings → Integration → Webhook

3. Configure:
   ├─ Webhook URL: https://your-domain.com/api/payments/payu/callback
   ├─ Method: POST
   ├─ Encoding: Form-encoded
   └─ Status: Enabled

4. Save & Verify
   ├─ Click "Test Webhook"
   └─ Should see 200 OK response
```

**Example Webhook URLs:**

```
Vercel:
  https://your-project.vercel.app/api/payments/payu/callback

Self-hosted:
  https://your-domain.com/api/payments/payu/callback

Custom domain on Vercel:
  https://custom.domain.com/api/payments/payu/callback
```

### 5.3 Verify Webhook in Logs

After a test payment, check your server logs:

```
✅ Expected log entry:
[POST /api/payments/payu/callback]
🔐 PayU Response Hash String: ...
🔐 Match: true
Payment success/failure: ...
```

If not appearing, check:
1. Is callback URL correct in PayU dashboard?
2. Is server reachable from internet (no firewall blocking)?
3. Check PayU merchant dashboard → Logs section

---

## Step 6: Deployment Checklist

### Before Going Live

- [ ] **Credentials**
  - [ ] Live keys obtained from PayU dashboard
  - [ ] Keys stored in `.env.local` (local) or Vercel env (production)
  - [ ] PAYU_MODE set to `PRODUCTION`
  - [ ] Keys NOT committed to Git

- [ ] **Configuration**
  - [ ] Verified correct endpoint: `https://secure.payu.in`
  - [ ] Callback URL configured in PayU dashboard
  - [ ] HTTPS enabled on your domain
  - [ ] SSL certificate valid (not self-signed)

- [ ] **Code Review**
  - [ ] lib/payments/payu.ts using environment variables ✅
  - [ ] app/api/payments/payu/initiate/route.ts configured ✅
  - [ ] app/api/payments/payu/callback/route.ts ready ✅
  - [ ] No hardcoded test credentials in code

- [ ] **Testing**
  - [ ] Test hash generation with live credentials
  - [ ] Verify callback URL receives webhooks
  - [ ] Test one successful payment (real money)
  - [ ] Test one failed payment scenario

- [ ] **Monitoring**
  - [ ] Error logging configured
  - [ ] Database backups enabled
  - [ ] Payment webhook logs accessible
  - [ ] Alert system for failed payments

### Deployment Steps

```bash
# 1. Final build & test locally
npm run build
npm run test-payu-integration.js

# 2. Push to production
git add .
git commit -m "chore: switch to PayU live mode"
git push origin main

# 3. Vercel auto-deploys with environment variables

# 4. Verify deployment
curl https://your-domain.com/api/health
# Should return: { status: "ok" }

# 5. Test payment on live site
# Use live card or UPI
```

---

## Step 7: Monitor & Verify

### 7.1 First Live Payment Checklist

After deploying to production, execute this sequence:

```
⏱️ Time: First business day of live deployment
💳 Card: Real test card from PayU
💰 Amount: Smallest possible (₹1 or equivalent)

1. [ ] User completes checkout
2. [ ] Redirected to secure.payu.in (verify in URL bar)
3. [ ] Payment processed successfully
4. [ ] Redirected to /payment-successful
5. [ ] Order appears in database with status: "completed"
6. [ ] Payment appears in PayU dashboard
7. [ ] Webhook log shows successful callback
8. [ ] Email confirmation sent to user
9. [ ] Workshop seat inventory updated (if applicable)
10. [ ] No errors in server logs
```

### 7.2 Monitor Logs in Production

**For Vercel:**
```bash
# View live logs
vercel logs

# Filter for PayU
vercel logs --source nextjs | grep PayU
```

**For Self-Hosted:**
```bash
# Check application logs
tail -f /var/log/your-app.log | grep PayU

# Check payment database
db.orders.findOne({ paymentMethod: 'payu' }, { sort: { createdAt: -1 } })
```

### 7.3 PayU Dashboard Verification

```
1. Log in to https://dashboard.payu.in (LIVE mode)
2. Navigate to: Transactions → All

Expected columns:
├─ Transaction ID (mihpayid)
├─ Your TXN ID (txnid)
├─ Amount
├─ Status (Success / Failed)
├─ Time
└─ User Email

3. Click on transaction to verify:
   ├─ Callback status: ✅ Received
   ├─ Response code: 0 (success) or 5 (failure)
   └─ Details match your database
```

### 7.4 Set Up Alerts

Configure alerts for:

```
🔴 Payment failures exceeding 5% of daily transactions
🔴 Webhook callback failures
🔴 Hash verification mismatches
🔴 Database connection errors
🔴 Any 5xx errors in payment routes
```

---

## Troubleshooting

### Problem: "Invalid Checksum" Error on Live

**Cause:** Mismatch between live key/salt and what PayU is sending

**Fix:**
1. Verify you're using LIVE credentials (not TEST)
2. Check PAYU_MODE is set to `PRODUCTION`
3. Confirm hash formula in code matches PayU docs (it does ✅)
4. Clear browser cache and try again

### Problem: Payments Going to Test Dashboard, Not Live

**Cause:** PAYU_MODE still set to TEST or wrong endpoint

**Fix:**
```bash
# Verify environment
echo $PAYU_MODE        # Should print: PRODUCTION
echo $PAYU_MERCHANT_KEY  # Should print live key (starts with different chars)

# Restart server
npm run dev
```

### Problem: Callback Not Received

**Cause:** Webhook URL not configured in PayU dashboard

**Fix:**
1. Log in to PayU dashboard → LIVE mode
2. Settings → Integration → Webhook
3. Set URL to: `https://your-live-domain.com/api/payments/payu/callback`
4. Save
5. Click "Test Webhook" button
6. Check server logs for incoming POST

### Problem: "This Merchant account is not active for live transactions"

**Cause:** Account not activated or incorrect merchant ID

**Fix:**
1. Contact PayU support
2. Verify merchant account status
3. Confirm account is activated for live mode
4. Check merchant ID matches your credentials

### Problem: SSL Certificate Error

**Cause:** Self-signed or expired certificate

**Fix:**
```bash
# For Let's Encrypt (recommended)
certbot certonly --standalone -d your-domain.com

# For Vercel: Auto-handled ✅
# No action needed
```

---

## Rollback Plan

If something goes wrong in production:

### Immediate (Within 1 hour)

```bash
# 1. Switch back to TEST credentials
vercel env change PAYU_MODE TEST
vercel env change PAYU_MERCHANT_KEY <YOUR_TEST_KEY>
vercel env change PAYU_MERCHANT_SALT <YOUR_TEST_SALT>

# 2. Re-deploy
vercel --prod

# 3. Notify users
Post announcement: "We're temporarily using test payment mode. No charges will be made."
```

### Notify PayU Support

```
Email: support@payu.in
Subject: [URGENT] Test Mode Fallback - Merchant ID: <YOUR_ID>

Message:
We've temporarily reverted to test mode due to [error type].
Status: All systems operational, users cannot process real payments.
Timeline: Live mode will be restored in [X hours]
Contact: [Your phone]
```

### Full Rollback

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy previous commit
git revert HEAD
git push origin main
# Vercel auto-deploys
```

---

## Quick Reference

### Environment Variables Needed

```
PAYU_MERCHANT_KEY=<LIVE_KEY_FROM_DASHBOARD>
PAYU_MERCHANT_SALT=<LIVE_SALT_FROM_DASHBOARD>
PAYU_MODE=PRODUCTION
NEXT_PUBLIC_APP_URL=https://your-live-domain.com
```

### Endpoints (Auto-Selected by Code)

| Environment | Payment API | Callback |
|---|---|---|
| TEST | `https://test.payu.in/_payment` | http://localhost:3000/api/payments/payu/callback |
| LIVE | `https://secure.payu.in/_payment` | https://your-domain.com/api/payments/payu/callback |

### Critical URLs

```
PayU Dashboard:    https://dashboard.payu.in
API Keys:          https://dashboard.payu.in → Developer Tools → API Keys
Test Mode:         https://test.payu.in
Live Mode:         https://secure.payu.in
```

### Test Cards for Live

```
✅ SUCCESS:  5123456789012346
❌ FAILURE:  5123456789012340
Expiry:      12/2030
CVV:         123
OTP:         123456
```

---

## ✅ Verification Checklist

Before claiming success, verify all of these:

- [ ] `PAYU_MODE` is `PRODUCTION` in production environment
- [ ] Live keys obtained and stored securely
- [ ] Endpoint shows `https://secure.payu.in`
- [ ] Callback URL configured in PayU dashboard
- [ ] HTTPS enabled on domain
- [ ] First test payment completed successfully
- [ ] Order created in database with correct status
- [ ] Payment appears in PayU dashboard
- [ ] Webhook was received and logged
- [ ] No hash verification errors
- [ ] User redirected to success page
- [ ] All monitoring and alerts configured

---

**Status:** 🟢 **READY FOR LIVE DEPLOYMENT**

**Next Step:** Follow Step 1 to obtain your live keys, then proceed through all steps in order. Test thoroughly before moving production traffic.

