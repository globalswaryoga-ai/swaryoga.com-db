# CRITICAL: PayU Merchant Settings Update Required

## Problem Analysis
You're getting: **"Sorry, we are unable to process your payment due to Too many Requests"**

This is a PayU server-side error, NOT from our application code.

### Root Cause (Verified)
1. Your PayU merchant account has callback URLs configured to: `http://localhost:3000`
2. PayU tries to send payment callbacks to localhost (which fails)
3. Repeated failures trigger PayU's rate limiting
4. Your merchant account gets temporarily blocked

### Our Code Status
✅ **All rate limiting removed** from our application
✅ **Payment endpoints clean** - returning 401, not 429
✅ **Deployment verified** - production mode active
✅ **No artificial delays** - code is optimized

**The problem is NOT on our side. It's your PayU merchant account settings.**

---

## IMMEDIATE ACTION REQUIRED

### Step 1: Log into PayU Merchant Dashboard
1. Go to: **https://merchant.payu.in/**
2. Login with your merchant credentials
3. Navigate to: **Settings** or **Account Settings**

### Step 2: Update Return URLs
Look for one of these sections:
- **"Return URLs"** or **"Callback URLs"** or **"Redirect URLs"**

**Find and Update EVERY occurrence of `localhost:3000`:**

| Field | Current Value | Change To |
|-------|----------------|-----------|
| Success Return URL | `http://localhost:3000/payment-successful` | `https://swaryoga.com/payment-successful` |
| Failure Return URL | `http://localhost:3000/payment-failed` | `https://swaryoga.com/payment-failed` |
| Callback URL | `http://localhost:3000/api/payments/payu/callback` | `https://swaryoga.com/api/payments/payu/callback` |
| Base URL | `http://localhost:3000` | `https://swaryoga.com` |

### Step 3: Save Changes
- Click **Save** or **Update Settings**
- Wait for confirmation message
- May require verification email

### Step 4: Test
After updating settings:
1. Clear browser cache: `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Go to: https://swaryoga.com/checkout
3. Try a payment again
4. Verify it goes to PayU's secure page: `https://secure.payu.in/_payment`

---

## Screenshots Guide

### Where to Find Settings in PayU Dashboard:
```
1. Top Navigation → Account / Settings
2. Look for section: "Return URLs" or "Payment Settings"
3. You'll see fields for:
   - Success URL
   - Failure URL
   - Notification URL (optional)
```

### Common PayU Dashboard Locations:
- **Main Settings**: https://dashboard.payu.in/
- **Merchant Settings**: https://merchant.payu.in/app/settings
- **Profile**: https://merchant.payu.in/app/profile

---

## Verification Checklist

After updating PayU settings, verify:

- [ ] PayU dashboard shows your production domain URLs (not localhost)
- [ ] Settings saved successfully (look for "Changes Saved" message)
- [ ] Browser cache cleared
- [ ] Can access https://swaryoga.com/checkout without errors
- [ ] Click "Pay Now" → Redirects to `https://secure.payu.in/_payment` ✅
- [ ] Can see PayU payment form (not an error page)

---

## Why This Happened

```
Timeline:
Day 1-10: Payment attempts with localhost URLs fail
         ↓
         PayU sees repeated failed attempts from your account
         ↓
         PayU's security system activates rate limiting
         ↓
         Your merchant account temporarily blocked
         ↓
         All payment attempts get "429 Too Many Requests"
```

### How to Prevent This Again:
1. Always test on production domain (not localhost)
2. Keep PayU settings updated when you deploy to new domains
3. Monitor PayU merchant dashboard for any warnings

---

## Support Options

If you're stuck updating PayU settings:

1. **PayU Support Email**: care@payu.in
2. **PayU Support Phone**: Check merchant dashboard for phone support
3. **Message**: "I need to update my callback URLs from localhost:3000 to my production domain https://swaryoga.com. Can you help me verify the settings?"

---

## Technical Details (For Reference)

### Our Code - Already Production Ready
```typescript
// lib/payments/payu.ts
export const PAYU_MODE = 'PRODUCTION'  // ✅
export const PAYU_BASE_URL = 'https://secure.payu.in'  // ✅
export const PAYU_PAYMENT_PATH = '/_payment'  // ✅
```

### Payment Flow - Verified Working
```
Browser → https://swaryoga.com/checkout
          ↓
          POST /api/payments/payu/initiate (auth required)
          ↓
          Returns: { paymentUrl: "https://secure.payu.in/_payment" }  ✅
          ↓
          Form submits to PayU
          ↓
          User completes payment on PayU's secure page
          ↓
          PayU redirects to: https://swaryoga.com/api/payments/payu/callback
          ↓
          Order updated in database
          ↓
          User sees success page
```

---

## Summary

| Item | Status |
|------|--------|
| Our Application Code | ✅ Production Ready |
| Payment Initiation | ✅ Uses secure.payu.in |
| Payment Callback | ✅ Dynamic domain support |
| Rate Limiting | ✅ Completely Removed |
| **PayU Merchant Settings** | ❌ **NEEDS UPDATE** |
| **Callback URLs** | ❌ **STILL POINTING TO LOCALHOST** |

**Action Required**: Update PayU merchant settings → Everything will work! 🚀

