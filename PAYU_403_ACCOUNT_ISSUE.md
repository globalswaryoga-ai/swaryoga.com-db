# PayU 403 - Account Verification & Workarounds

## 🔴 Your Situation
- ✅ Credentials are correctly formatted
- ✅ Hash calculation is correct  
- ✅ All required fields present
- ❌ Still getting 403 Forbidden

**This indicates an ACCOUNT-LEVEL issue, not a code issue.**

---

## 🔍 Root Causes for 403 Despite Correct Credentials

### **1. PayU Account Not Approved (Most Common)**
```
Issue: Your PayU merchant account hasn't been approved for live payments
Fix: Contact PayU at care@payu.in for account approval
```

### **2. Merchant Key Regenerated**
```
Issue: Your PayU account regenerated the key, old credentials don't work
Fix: 
  1. Log in to PayU dashboard
  2. Go to Settings → Security or API Settings
  3. Copy the LATEST Merchant Key & Salt
  4. Update .env and Vercel environment variables
```

### **3. IP Whitelist Restriction**
```
Issue: Your PayU account has IP restrictions enabled
Fix:
  1. Log in to PayU dashboard
  2. Check Settings → IP Whitelist
  3. Add your server's IP address:
     - Vercel deployments: Dynamic (check Vercel logs)
     - Local testing: Your home/office IP
  4. Contact PayU to disable if unsure
```

### **4. Account Suspended/Inactive**
```
Issue: Your PayU account has payment restrictions
Fix:
  1. Log in to your PayU account
  2. Check if account is ACTIVE
  3. Look for any notifications/warnings
  4. Contact PayU if account is suspended
```

### **5. Wrong Credentials (Fresh Install)**
```
Issue: Using demo/sample credentials instead of real ones
Fix:
  1. Verify current key: gtKFFx
  2. Go to PayU Dashboard → Settings
  3. Copy YOUR ACTUAL Merchant Key
  4. Update environment variables
```

---

## ✅ Verification Steps

### **Step 1: Verify Your Credentials**
```bash
# Current credentials in system:
PAYU_MERCHANT_KEY = gtKFFx
PAYU_MERCHANT_SALT = eCwWELJIl92doCBOxyXPnaVgQnmrjVi6cn0AWfj7
PAYU_MODE = PRODUCTION
```

**ACTION REQUIRED:**
1. Log in to https://www.payu.in
2. Go to Dashboard → Integration → API Keys
3. Copy the Merchant Key shown there
4. Check if it matches `gtKFFx`
   - ✅ If matches: Credentials are correct, continue to Step 2
   - ❌ If different: Update credentials (see next section)

### **Step 2: Check Account Status**
1. Log in to PayU dashboard
2. Look for account status indicator
3. Check for notifications/warnings
4. Verify account type is set to "Payment Processing"

### **Step 3: Test with Simpler Request**
Use this minimal curl to test:
```bash
curl -X POST https://secure.payu.in/_xclick \
  -d "key=gtKFFx" \
  -d "txnid=TEST$(date +%s)" \
  -d "amount=1.00" \
  -d "productinfo=test" \
  -d "firstname=test" \
  -d "email=test@test.com" \
  -d "phone=1234567890" \
  -d "surl=http://localhost:3000" \
  -d "furl=http://localhost:3000" \
  -d "hash=abc123" \
  -v 2>&1 | grep -E "403|500|400|200"
```

---

## 🔧 Fix: Update Credentials

### **If credentials changed:**

```bash
# 1. Update .env.local
PAYU_MERCHANT_KEY=<your_new_key>
PAYU_MERCHANT_SALT=<your_new_salt>

# 2. Update Vercel Environment
# Go to: https://vercel.com/globalswaryoga-ai/swar-yoga-web-mohan/settings/environment-variables
# Set:
# - PAYU_MERCHANT_KEY = <new_key>
# - PAYU_MERCHANT_SALT = <new_salt>

# 3. Redeploy
git add .env.local
git commit -m "fix: Update PayU credentials"
git push origin main  # Vercel auto-deploys

# 4. Test
# Go to https://www.swaryoga.com/checkout
# Try payment again
```

---

## 🛡️ Temporary Workaround

Until you resolve the PayU account issue, disable PayU payments:

### **Option A: Show Manual Payment Instructions**

Edit `app/checkout/page.tsx`:
```typescript
// Temporarily disable PayU
if (paymentMethod === 'payu') {
  setError('PayU payments are temporarily unavailable. Please try again later or use alternative payment methods.');
  return;
}
```

### **Option B: Redirect to QR Payment**

```typescript
if (paymentMethod === 'payu') {
  // Show UPI QR code instead
  window.location.href = '/payment/qr-code?amount=' + totalAmount;
}
```

### **Option C: Use Manual Bank Transfer**

```typescript
if (paymentMethod === 'payu') {
  // Show bank account details
  const bankDetails = {
    accountName: 'Swar Yoga',
    accountNumber: '****1234',
    ifscCode: 'SBIN0001234',
    amount: totalAmount
  };
  // Display for manual payment
}
```

---

## 📞 Contact PayU Support

**Email**: care@payu.in  
**Phone**: +91-20-6728-8888

**Provide them:**
```
Subject: 403 Forbidden Error - PayU Payment Integration

Details:
- Merchant Key: gtKFFx
- Error: 403 Forbidden from PayU API
- Endpoint: https://secure.payu.in/_xclick
- Time: [timestamp of error]
- Request: POST with correct hash

Question: Is there any account restriction preventing payments?
```

---

## 🚀 Alternative: Use Razorpay Instead

If PayU continues to fail, consider Razorpay (popular in India):

```typescript
// Install
npm install razorpay

// Use instead of PayU
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

---

## 📋 Diagnosis Checklist

Use this to identify the exact issue:

- [ ] Credentials match PayU dashboard (gtKFFx?)
- [ ] PayU account is ACTIVE
- [ ] PayU account is APPROVED for payments
- [ ] No IP whitelist blocking
- [ ] No account restrictions/suspension
- [ ] Merchant Key hasn't been regenerated
- [ ] You're using PRODUCTION credentials (not TEST)
- [ ] Amount is formatted as "100.00" (2 decimals)
- [ ] Phone is valid (10+ digits)
- [ ] Email is valid format

**If all checked but still 403:** Contact PayU support

---

## 🔍 Server Logging

Enhanced logging has been added to see exactly what's being sent:

```typescript
// Added to app/api/payments/payu/initiate/route.ts

console.log('📤 COMPLETE PayU Request:', {
  endpoint: 'https://secure.payu.in/_xclick',
  params: { /* all parameters */ }
});
```

**To view logs:**
1. Local: `npm run dev` → See console
2. Production: Vercel Dashboard → Logs → Functions

---

## ✅ Resolution Timeline

1. **Today**: Verify credentials and account status
2. **Day 1**: Contact PayU if needed
3. **Day 2-3**: PayU investigates and resolves
4. **Day 3-4**: Payments should work
5. **Fallback**: Use workaround or alternative gateway

---

**Last Updated**: December 19, 2025
