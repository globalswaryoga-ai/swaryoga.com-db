# PayU Payment Error - Technical Analysis

## Error Screenshot Details
- **Error Text:** "Pardon, Some Problem Occurred"
- **Error Code:** 1069236_69407e8109658_69407e8109adc
- **URL:** https://test.payu.in/
- **Root Cause:** Missing PayU merchant credentials in environment variables

---

## Code Flow & Where It Breaks

### 1. **User Initiates Payment** (❌ Point of Failure)
📍 Location: `app/checkout/page.tsx` (lines 1-150)

```typescript
// User clicks "Proceed to Payment" button
// Frontend calls: POST /api/payments/payu/initiate
const response = await fetch('/api/payments/payu/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: totalPrice,
    productInfo: cartItems.map(item => item.name).join(','),
    firstName: formData.firstName,
    email: formData.email,
    phone: formData.phone,
    successUrl: `${NEXT_PUBLIC_API_URL}/payment-successful`,
    failureUrl: `${NEXT_PUBLIC_API_URL}/payment-failed`
  })
});
```

### 2. **Payment Initiation API** (❌ FAILS HERE)
📍 Location: `app/api/payments/payu/initiate/route.ts` (lines 68-74)

```typescript
// ⚠️ CREDENTIAL VALIDATION - THIS IS WHERE IT FAILS
if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
  return NextResponse.json(
    { error: 'PayU credentials not configured. Please set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in environment variables.' },
    { status: 500 }
  );
}
```

**Currently happening:**
- `PAYU_MERCHANT_KEY` = `undefined` (not in .env)
- `PAYU_MERCHANT_SALT` = `undefined` (not in .env)
- API returns **500 error**
- Frontend receives error response
- PayU form submission **never happens**
- User sees "Some Problem Occurred"

### 3. **Hash Generation** (Never reached)
📍 Location: `lib/payments/payu.ts` (lines 1-150)

```typescript
// Never reaches here due to credential check failure
const payuHash = generatePayUHash({
  txnid: order._id.toString(),
  amount: amount,
  productinfo: productInfo,
  firstname: firstName,
  email: email,
  salt: PAYU_MERCHANT_SALT
});

// Hash is: SHA512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|...|udf10|salt)
```

### 4. **Submit to PayU** (Never reaches)
```typescript
// This form submission never happens because API fails first
<form action="https://test.payu.in/pay" method="POST">
  <input name="key" value={PAYU_MERCHANT_KEY} />
  <input name="txnid" value={txnid} />
  <input name="amount" value={amount} />
  <input name="hash" value={payuHash} />
  {/* ... other fields ... */}
</form>
```

---

## Current Environment Status

### .env File Contents (❌ INCOMPLETE)
```dotenv
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
ADMIN_PANEL_TOKEN=...

# ❌ MISSING THESE:
# PAYU_MODE=TEST
# PAYU_MERCHANT_KEY=...
# PAYU_MERCHANT_SALT=...
```

### What Environment Variables Look Like When Set ✅
```dotenv
# Correct setup:
PAYU_MODE=TEST
PAYU_MERCHANT_KEY=<your_key>                       # Merchant key from PayU dashboard
PAYU_MERCHANT_SALT=<your_salt>                     # Merchant salt from PayU dashboard
```

---

## Error Flow Diagram

```
User Clicks "Proceed to Payment"
         ↓
checkout/page.tsx sends request
         ↓
/api/payments/payu/initiate/route.ts
         ↓
Check: if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT)
         ↓
❌ CONDITION IS TRUE (both are undefined)
         ↓
Return 500 error: "PayU credentials not configured"
         ↓
Frontend receives error response
         ↓
User sees browser error or is redirected to error page
         ↓
Or PayU receives incomplete form data → Shows "Some Problem Occurred"
```

---

## Solution Summary

| Component | Current | Required | Status |
|-----------|---------|----------|--------|
| PAYU_MODE | ❌ Not set | `TEST` or `PRODUCTION` | ❌ MISSING |
| PAYU_MERCHANT_KEY | ❌ Not set | From PayU dashboard | ❌ MISSING |
| PAYU_MERCHANT_SALT | ❌ Not set | From PayU dashboard | ❌ MISSING |
| .env file | ✅ Exists | Update with 3 fields above | ⏳ NEEDS UPDATE |
| Code implementation | ✅ Correct | No changes needed | ✅ READY |
| Hash generation | ✅ Correct | SHA512 format correct | ✅ READY |
| API endpoint | ✅ Correct | Validates & initiates | ✅ READY |

---

## Quick Fix Checklist

```bash
# 1. Open .env.local (or create it)
nano .env.local

# 2. Add these lines:
PAYU_MODE=TEST
PAYU_MERCHANT_KEY=your_key_from_payu_dashboard
PAYU_MERCHANT_SALT=your_salt_from_payu_dashboard

# 3. Save file (Ctrl+X → Y → Enter)

# 4. Restart server
npm run dev

# 5. Test payment flow
# Go to http://localhost:3000/workshops
# Add item to cart → Checkout → Test payment
```

---

## Verification Commands

```bash
# Check credentials are set
grep PAYU_ .env.local

# Should output all three:
# PAYU_MODE=TEST
# PAYU_MERCHANT_KEY=...
# PAYU_MERCHANT_SALT=...

# If empty or missing, environment variables are not loaded
```

---

## Related Files

| File | Purpose | Status |
|------|---------|--------|
| `app/api/payments/payu/initiate/route.ts` | Payment initiation endpoint | ✅ Code OK, waiting for env vars |
| `lib/payments/payu.ts` | PayU utilities & hash generation | ✅ Code OK |
| `app/checkout/page.tsx` | Checkout form | ✅ Code OK |
| `.env` | Environment variables | ❌ MISSING PayU config |
| `.env.local` | Local overrides | ❌ DOES NOT EXIST |

---

## Important Notes

1. **Server must be restarted** after adding .env variables
2. **Use .env.local** for local development (don't edit .env)
3. **Test credentials** work in TEST mode only
4. **Production credentials** different from TEST credentials
5. **Hash mismatch** occurs if key/salt are wrong

**See PAYU_FIX_GUIDE.md for step-by-step setup instructions.**
