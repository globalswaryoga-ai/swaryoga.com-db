# PayU Merchant Settings Update - Step by Step Guide

## Quick Summary
**Error**: "Too many Requests" for 10 days  
**Root Cause**: PayU merchant account still has localhost:3000 in callback URLs  
**Solution**: Update PayU dashboard settings (5 minutes)  
**Result**: Payments will work immediately after update  

---

## Step 1: Access PayU Merchant Dashboard

### Option A: Direct Link
1. Open: **https://merchant.payu.in/**
2. Login with your credentials

### Option B: Via PayU Main Site
1. Go to: https://www.payu.in/
2. Click: "Merchant Login" or "Dashboard"
3. Enter your credentials

---

## Step 2: Navigate to Settings

Once logged in, look for one of these:

### Path 1: Account Settings
```
Top Menu → Account Settings → Merchant Configuration
```

### Path 2: Profile/Settings
```
Top Menu → Settings → Return URLs
```

### Path 3: Dashboard Menu
```
Left Sidebar → Settings → Merchant Details
```

### Path 4: Direct URL (Try this first)
```
https://dashboard.payu.in/settings
```

---

## Step 3: Find "Return URLs" or "Callback URLs"

You're looking for a form that has these fields:

```
┌─────────────────────────────────────────┐
│  PAYMENT GATEWAY SETTINGS               │
├─────────────────────────────────────────┤
│                                         │
│  Success Return URL:                    │
│  [_________________________________]    │
│                                         │
│  Failure Return URL:                    │
│  [_________________________________]    │
│                                         │
│  Notification/Callback URL:             │
│  [_________________________________]    │
│                                         │
│  [SAVE]  [CANCEL]                       │
│                                         │
└─────────────────────────────────────────┘
```

---

## Step 4: Update Each URL Field

### Field 1: Success Return URL
**Current (Wrong)**:
```
http://localhost:3000/payment-successful
```

**Change To**:
```
https://swaryoga.com/payment-successful
```

---

### Field 2: Failure Return URL
**Current (Wrong)**:
```
http://localhost:3000/payment-failed
```

**Change To**:
```
https://swaryoga.com/payment-failed
```

---

### Field 3: Notification/Callback URL
**Current (Wrong)**:
```
http://localhost:3000/api/payments/payu/callback
```

**Change To**:
```
https://swaryoga.com/api/payments/payu/callback
```

---

### Field 4: Base URL (if present)
**Current (Wrong)**:
```
http://localhost:3000
```

**Change To**:
```
https://swaryoga.com
```

---

## Step 5: Save Changes

1. After updating all fields, click: **[SAVE]** or **[UPDATE]**
2. Wait for confirmation message (usually green checkmark or notification)
3. Look for message like: "Settings updated successfully" or "Changes saved"

---

## Step 6: Verify Settings Were Saved

After saving:
1. Refresh the page (F5 or Cmd+R)
2. Check that all URLs show your domain (not localhost)
3. If fields are blank or show old values, something went wrong - try again

---

## Step 7: Test Payments

### Clear Your Browser Cache First
- **Chrome**: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- **Firefox**: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- **Safari**: Cmd+Option+E (Mac)

### Test Payment Flow
1. Go to: https://swaryoga.com/checkout
2. Fill in form with test data
3. Click: "Pay Now"
4. **Expected**: Should redirect to `https://secure.payu.in/_payment` ✅

### What You Should See
```
✅ PayU logo and payment form loads
✅ URL shows: https://secure.payu.in/_payment
✅ No error messages
✅ Can fill in payment details
```

### What You Should NOT See
```
❌ "Too many Requests" error
❌ "localhost:3000" in URL
❌ "Connection refused" error
❌ "Unable to process payment" from our app
```

---

## Troubleshooting

### Issue: Settings page not found
**Solution**: Try these URLs directly:
- https://dashboard.payu.in/settings
- https://merchant.payu.in/app/settings
- https://merchant.payu.in/app/configuration

### Issue: Can't find "Return URLs" section
**Solution**: May be labeled as:
- Redirect URLs
- Callback Configuration
- Payment Settings
- Webhook URLs
- Notification URLs

### Issue: Settings show old values after refresh
**Solution**: 
1. Wait 5-10 minutes (settings may take time to sync)
2. Logout and login again
3. Clear browser cache and try again
4. Try different browser

### Issue: Still getting "Too many Requests" after updating
**Solution**:
1. Wait 1 hour (PayU's rate limit may take time to reset)
2. Contact PayU support: care@payu.in
3. Ask them to verify your callback URLs are correct
4. Ask them to reset your merchant account rate limit

---

## What PayU Settings Look Like

### Example 1: PayU Dashboard Interface
```
Settings → Merchant Configuration

General Settings
├─ Merchant Name: Swar Yoga
├─ Merchant Key: a0qFQP
├─ Merchant Salt: LRBR0ZsXTLuXsQTY4xgHx8HgeYuKy2Jk

Return URLs Configuration
├─ Success URL: https://swaryoga.com/payment-successful
├─ Failure URL: https://swaryoga.com/payment-failed
├─ Notification URL: https://swaryoga.com/api/payments/payu/callback
└─ [SAVE CHANGES]
```

### Example 2: What You're Changing
```
BEFORE:
├─ Success URL: http://localhost:3000/payment-successful  ❌
├─ Failure URL: http://localhost:3000/payment-failed      ❌
└─ Notification URL: http://localhost:3000/api/...        ❌

AFTER:
├─ Success URL: https://swaryoga.com/payment-successful   ✅
├─ Failure URL: https://swaryoga.com/payment-failed       ✅
└─ Notification URL: https://swaryoga.com/api/...         ✅
```

---

## Timeline After Update

```
Update PayU Settings
       ↓
       (immediately)
       ↓
Clear Browser Cache
       ↓
       (1-2 minutes)
       ↓
Test Payment (Go to checkout)
       ↓
       (should work!)
       ↓
✅ Redirects to PayU secure page
✅ No "Too many Requests" error
✅ Payments start working!
```

---

## Contact PayU Support (If You Get Stuck)

**Email**: care@payu.in

**Sample Message**:
```
Subject: Help updating callback URLs - Merchant Key a0qFQP

Hello,

I need to update my merchant account callback URLs from localhost:3000 
to my production domain https://swaryoga.com

Can you help me verify these settings are correct?

Success URL: https://swaryoga.com/payment-successful
Failure URL: https://swaryoga.com/payment-failed
Callback URL: https://swaryoga.com/api/payments/payu/callback

Also, I've been getting "Too many Requests" errors. Can you reset 
my merchant account rate limit?

Merchant Key: a0qFQP
Thank you,
[Your Name]
```

---

## Success Indicators

After updating PayU settings, you should see:

1. ✅ Settings saved confirmation in PayU dashboard
2. ✅ Checkout page loads without errors
3. ✅ Payment button is clickable
4. ✅ Clicking "Pay Now" redirects to secure.payu.in
5. ✅ No "Too many Requests" errors
6. ✅ PayU payment form appears
7. ✅ Can enter test payment details
8. ✅ Payment processes (success or test decline)
9. ✅ Callback received and order updated

---

## Key Points to Remember

- **localhost URLs don't work in production** - Always use your actual domain
- **PayU merchant dashboard** is separate from our application code
- **Update takes effect immediately** (no redeployment needed)
- **Rate limit reset takes 1-2 hours** (be patient after updating)
- **Test thoroughly** - Try multiple payment attempts to ensure it works

---

## You're Almost There! 🎉

Everything on our side is perfect. Just update the PayU merchant settings and payments will work perfectly!

Once you complete the 7 steps above, let me know and I can help verify everything is working correctly.
