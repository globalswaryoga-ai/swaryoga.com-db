# Payment Settings Cleanup Guide

## Issue
The payment page is redirecting to **localhost:3000** instead of your production domain. This is because **PayU's merchant account callback URLs are configured to point to localhost:3000**.

## Root Cause
✅ **Code is correct** - The payment code uses dynamic URL generation and is production-ready.  
❌ **PayU Merchant Account has wrong URLs** - The callback/return URLs in PayU dashboard are still pointing to localhost:3000.

---

## Solution

### Step 1: Update PayU Merchant Account Settings

**Go to PayU Merchant Portal:**

1. Open [https://merchant.payu.in](https://merchant.payu.in)
2. Log in with your merchant credentials
3. Navigate to: **Settings** → **Return URLs** (or **Webhook Settings**)

**Update these URLs:**

| URL Type | Current (Wrong) | New (Correct) |
|----------|-----------------|---------------|
| Success URL | `http://localhost:3000/payment-successful` | `https://swaryoga.com/payment-successful` |
| Failure URL | `http://localhost:3000/payment-failed` | `https://swaryoga.com/payment-failed` |
| Callback URL | `http://localhost:3000/api/payments/payu/callback` | `https://swaryoga.com/api/payments/payu/callback` |

**Note:** Replace `swaryoga.com` with your actual production domain (could be a Vercel domain like `swar-yoga-web-mohan.vercel.app`).

4. **Save** the changes
5. **Verify** the changes are reflected in the dashboard

### Step 2: Clear Browser Cache & Cooldown Timer

**In browser DevTools Console (F12):**

```javascript
// Remove the payment cooldown timer
localStorage.removeItem('payuCooldownUntilMs');

// Verify it's removed
console.log(localStorage.getItem('payuCooldownUntilMs')); // Should return null
```

### Step 3: Test Payment Flow

1. Open your site in **incognito mode** (fresh session)
2. Navigate to checkout page
3. Try to initiate a payment
4. Verify the redirect goes to PayU's secure payment page (https://secure.payu.in or https://test.payu.in)
5. After payment, verify the callback comes from your production domain

---

## Verification Checklist

- [ ] PayU merchant portal updated with production URLs
- [ ] Browser localStorage cleared (`payuCooldownUntilMs` removed)
- [ ] Tested payment flow in incognito mode
- [ ] Verified redirect to PayU domain (not localhost)
- [ ] Confirmed callback redirect to production domain (not localhost)

---

## Code Reference

### Payment Initiation
- **File:** [app/api/payments/payu/initiate/route.ts](app/api/payments/payu/initiate/route.ts)
- **Status:** ✅ Clean - No hardcoded URLs, uses request host

### Callback Handler  
- **File:** [app/api/payments/payu/callback/route.ts](app/api/payments/payu/callback/route.ts)
- **Status:** ✅ Clean - Dynamic redirect based on request host

### Environment Variables
- **File:** [.env.local](.env.local)
- **Status:** ✅ Clean - No localhost URLs configured

---

## If Issues Persist

### Check PayU Test Mode vs Production
```bash
# Verify your environment is using production PayU
echo $PAYU_MODE  # Should be "PRODUCTION" or "PROD"
```

### Debug Endpoint
Visit: `https://your-domain.com/api/debug/env-check`

This will show:
- Current PayU mode
- Configured URLs
- Environment variables

---

## Production Domain Options

If you're on Vercel, your domain will be one of:
- **Production:** `https://swaryoga.com` (custom domain)
- **Preview:** `https://swar-yoga-web-mohan.vercel.app`
- **Branch:** `https://swar-yoga-web-mohan-{branch}.vercel.app`

Use the actual domain where your app is deployed.

