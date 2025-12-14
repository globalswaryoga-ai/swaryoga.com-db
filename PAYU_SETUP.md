# PayU Payment Gateway Setup Guide

## Overview
This document explains how to configure and troubleshoot PayU payment integration in the Swar Yoga application.

## Prerequisites
- PayU merchant account: https://merchant.payu.in
- Merchant Key and Salt from PayU dashboard

## Configuration Steps

### 1. Get PayU Credentials

1. Login to https://merchant.payu.in
2. Navigate to **Settings** → **Key & Salt**
3. Copy your:
   - **Merchant Key** (e.g., `XXXXX`)
   - **Merchant Salt** (e.g., `XXXXX`)

### 2. Set Environment Variables

Add to `.env.local`:

```dotenv
# PayU Configuration
PAYU_MODE=TEST                           # Use TEST for development, PRODUCTION for live
PAYU_MERCHANT_KEY=your-merchant-key
PAYU_MERCHANT_SALT=your-merchant-salt
```

### 3. Verify Configuration

**For Development (TEST mode):**
- Use test merchant credentials
- Test card: `5123456789012346` (any future date, any CVV)
- Amount can be any value

**For Production (PRODUCTION/LIVE mode):**
- Use live merchant credentials
- Real payment processing enabled
- Update `PAYU_MODE=PRODUCTION`

## Common Issues & Solutions

### ❌ "PayU credentials not configured"

**Problem:** Error message when trying to initiate payment
```
PayU credentials not configured. 
Please set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in environment variables.
```

**Solution:**
1. Check `.env.local` has both keys set:
   ```bash
   grep PAYU_ .env.local
   ```
2. Keys should NOT be empty:
   ```dotenv
   PAYU_MERCHANT_KEY=your-actual-key      # ✅ Correct
   PAYU_MERCHANT_KEY=                     # ❌ Wrong
   ```
3. Restart the development server:
   ```bash
   npm run dev
   ```

### ❌ "Missing or invalid required fields"

**Problem:** Fields validation fails
```
Missing or invalid required fields
```

**Solution:** Verify in checkout form:
- First Name: required
- Email: valid email format required
- Phone: required (10+ digits)
- Amount: must be > 0
- Product Info: required

### ❌ "Failed to initiate payment"

**Problem:** Generic error during payment processing
```
Failed to initiate payment
```

**Solution:**
1. Check server logs:
   ```bash
   npm run dev    # Check console output
   ```
2. Verify database connection:
   ```bash
   curl http://localhost:3000/api/health
   ```
3. Test with test credentials in TEST mode

### ❌ Hash Mismatch Error

**Problem:** PayU returns "Hash mismatch" error
```
Hash Verification Failed
```

**Solution:**
1. Verify Salt is correct (copy-paste carefully)
2. Check hash generation in [lib/payments/payu.ts](../lib/payments/payu.ts)
3. Ensure no trailing/leading spaces in credentials

## Payment Flow

```
User fills checkout form
         ↓
Clicks "Pay Now"
         ↓
POST /api/payments/payu/initiate
         ↓
Creates Order record in MongoDB
Generates PayU hash
         ↓
Returns payment form data
         ↓
Browser submits form to PayU
         ↓
User completes payment on PayU gateway
         ↓
PayU redirects to callback URL
         ↓
POST /api/payments/payu/callback
         ↓
Updates Order payment status
Redirects to success/failure page
```

## Testing Checklist

- [ ] PayU credentials set in `.env.local`
- [ ] Development server restarted after env changes
- [ ] Form validation passes (all required fields filled)
- [ ] Database connection working
- [ ] Check browser console for errors
- [ ] Check server logs (terminal where `npm run dev` runs)
- [ ] Test with test credentials first
- [ ] Verify callback URL is accessible

## Vercel Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - Go to Project → Settings → Environment Variables
   - Add: `PAYU_MERCHANT_KEY`
   - Add: `PAYU_MERCHANT_SALT`
   - Add: `PAYU_MODE` (set to `PRODUCTION` for live)

2. Ensure callback URL is correct:
   - Update `callbackUrl` in checkout to use production domain
   - Example: `https://swaryoga.com/api/payments/payu/callback`

## API References

### POST /api/payments/payu/initiate

**Request:**
```json
{
  "amount": 999.00,
  "productInfo": "Swar Yoga Workshop",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zip": "400001",
  "items": [...],
  "successUrl": "http://localhost:3000/api/payments/payu/callback",
  "failureUrl": "http://localhost:3000/api/payments/payu/callback"
}
```

**Response (Success):**
```json
{
  "success": true,
  "orderId": "507f1f77bcf86cd799439011",
  "paymentUrl": "https://test.payu.in/_payment",
  "params": {
    "key": "merchant-key",
    "txnid": "507f1f77bcf86cd799439011",
    "amount": "999.00",
    "hash": "...",
    ...
  }
}
```

**Response (Error):**
```json
{
  "error": "PayU credentials not configured",
  "details": "Please set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in environment variables"
}
```

## Monitoring

Monitor payments with database queries:

```javascript
// Check pending payments
db.orders.find({ paymentStatus: "pending" })

// Check completed payments
db.orders.find({ paymentStatus: "completed" })

// Get payment summary
db.orders.aggregate([
  { $match: { paymentStatus: "completed" } },
  { $group: { _id: null, total: { $sum: "$total" } } }
])
```

## Support

For PayU issues, contact:
- PayU Support: https://support.payu.in
- Merchant Dashboard: https://merchant.payu.in

For app-specific issues, check:
- Server logs: Terminal output from `npm run dev`
- Browser console: Browser DevTools (F12)
- Database: Check Order records in MongoDB
