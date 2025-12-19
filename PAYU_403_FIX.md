# PayU 403 Error - Quick Fix Guide

## 🔴 Error: 403 Forbidden from PayU

PayU 403 errors typically mean **authentication failed**. Common causes:

### **Quick Diagnosis**

1. **Check Credentials in Dashboard**
   ```bash
   # Your current credentials:
   PAYU_MERCHANT_KEY = gtKFFx  
   PAYU_MERCHANT_SALT = eCwWELJIl92doCBOxyXPnaVgQnmrjVi6cn0AWfj7
   PAYU_MODE = PRODUCTION ✅
   ```

2. **Run Diagnostic**
   ```bash
   node diagnose-payu-403.js
   ```

---

## 🔧 Most Common Fixes

### **1. Hash Calculation Error** (Most Common)

The 403 often means PayU rejected your hash. Check:

```typescript
// ✅ CORRECT format (from lib/payments/payu.ts):
const hashString = [
  key,              // Merchant Key
  txnid,            // Transaction ID
  amount,           // Total amount
  productinfo,      
  firstname,
  email,
  udf1 || '',       // User Defined Fields
  udf2 || '',
  udf3 || '',
  udf4 || '',
  udf5 || '',
  '',               // Empty pipes for udf6-10
  '',
  '',
  '',
  '',
  SALT              // Merchant Salt at END
].join('|');

// Generate SHA512
const hash = crypto.createHash('sha512').update(hashString).digest('hex');
```

### **2. Phone Number Issue**

PayU requires phone in specific format. Fix in `app/api/payments/payu/initiate/route.ts`:

```typescript
// Add phone validation before sending
const sanitizePhone = (phone: string): string => {
  // Remove any non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume India and prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  // Ensure it's 12 digits (91 + 10 digits for India)
  if (cleaned.length !== 12) {
    throw new Error('Invalid phone format. Must be 10 digits (will auto-add country code)');
  }
  
  return cleaned;
};
```

### **3. Amount Formatting**

PayU expects specific amount format:

```typescript
// ✅ CORRECT - Exactly 2 decimal places
amount: totalAmount.toFixed(2)  // "100.00"

// ❌ WRONG - Too many decimals or missing trailing zero
amount: "100"        // Missing decimals
amount: "100.000"    // Too many decimals
```

### **4. Account Restrictions**

Check PayU Account Status:
- [ ] Account is active (not suspended)
- [ ] Account is approved for payments
- [ ] No IP whitelist restrictions
- [ ] Merchant Key hasn't been regenerated (would invalidate old key)

---

## 🔍 Advanced Debugging

### **Enable Detailed Logging**

Add to `lib/payments/payu.ts`:

```typescript
export function generatePayUHash(params: PayUParams): string {
  const key = (params.key || PAYU_MERCHANT_KEY).toString().trim();
  
  const hashString = [
    key, params.txnid, params.amount, params.productinfo, params.firstname,
    params.email, params.udf1 || '', params.udf2 || '', params.udf3 || '',
    params.udf4 || '', params.udf5 || '', '', '', '', '', '', PAYU_MERCHANT_SALT
  ].join('|');

  console.log('🔐 FULL Hash String:', hashString);  // ← ADD THIS
  console.log('🔐 Hash Components:', {
    key: key.substring(0, 3) + '***',
    txnid: params.txnid,
    amount: params.amount,
    productinfo: params.productinfo,
    email: params.email
  });

  const hash = crypto.createHash('sha512').update(hashString).digest('hex');
  console.log('🔐 SHA512:', hash);

  return hash;
}
```

Then check server logs when you get 403.

### **Test with PayU Test Mode**

```bash
# Temporarily switch to TEST mode
PAYU_MODE=TEST  # Uses https://test.payu.in (not production)

# Get test credentials from PayU sandbox
# Then retry transaction
```

---

## 📋 Verification Checklist

Use this to identify the exact issue:

- [ ] Merchant Key matches PayU dashboard exactly (no spaces)
- [ ] Merchant Salt matches exactly
- [ ] Phone number is 10 digits (will auto-add country code)
- [ ] Amount has exactly 2 decimal places (e.g., "100.00")
- [ ] Email is valid format
- [ ] First name is not empty
- [ ] Transaction ID is <= 25 characters (using ObjectId works perfectly)
- [ ] Mode matches account (PRODUCTION vs TEST)
- [ ] Hash is SHA512 of correct pipe-delimited string
- [ ] Account is active and approved

---

## 🚀 Resolution Steps

1. **Run diagnostic:**
   ```bash
   node diagnose-payu-403.js
   ```

2. **Enable detailed logging** (see Advanced Debugging)

3. **Attempt test transaction:**
   - Go to checkout
   - Fill all fields carefully
   - Try with small amount (₹1)
   - Check server logs for hash details

4. **If still failing:**
   - Check PayU dashboard settings
   - Verify account approval status
   - Contact PayU support with error details

5. **To disable PayU temporarily:**
   ```typescript
   // In app/checkout/page.tsx, comment out PayU option
   // or show error message to users
   ```

---

## 📞 PayU Support

If credentials and hash are correct but still getting 403:

**Contact PayU Support:**
- Email: care@payu.in
- Include: Merchant Key, error message, timestamp of failed transaction

**Provide:**
- Exact error from browser console
- Exact error from server logs
- Test transaction details
- Screenshots of PayU account settings

---

## ✅ Working Configuration Template

```env
# .env.local
PAYU_MERCHANT_KEY=your_actual_key_from_dashboard
PAYU_MERCHANT_SALT=your_actual_salt_from_dashboard
PAYU_MODE=PRODUCTION
```

**Never use placeholder values!** Get actual credentials from your PayU dashboard.

---

Last Updated: Dec 19, 2025
