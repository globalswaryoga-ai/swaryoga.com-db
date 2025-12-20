# PayU Integration Testing Guide

**Project:** Swar Yoga Web (Next.js + PayU)  
**Last Updated:** December 20, 2025  
**Status:** Ready for Testing

---

## 📋 Pre-Testing Checklist

- [ ] `.env.local` has `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_MODE`
- [ ] You are logged in to the application
- [ ] Cart has at least one item added
- [ ] `npm run dev` is running (http://localhost:3000)
- [ ] Browser console is open (DevTools → F12)

---

## 🧪 Test Scenario 1: Successful Card Payment (RECOMMENDED START)

### Step 1: Add Items to Cart
1. Navigate to any product page (workshops, courses, etc.)
2. Click "Add to Cart"
3. Verify item appears in cart badge (top-right)

### Step 2: Go to Checkout
1. Click on cart icon or navigate to `/checkout`
2. Enter shipping details:
   - **First Name:** Test User
   - **Last Name:** Demo
   - **Email:** test@example.com
   - **Phone:** 9876543210
   - **City:** Mumbai
3. Verify total amount is displayed

### Step 3: Select Payment Method
1. Select **India** or **International** (PayU)
2. Click **"Proceed to Payment"** button
3. **Expected:** Redirected to PayU payment page

### Step 4: Monitor Server Logs
Watch your terminal for debug logs:
```
PayU payment initiated: {
  orderId: "xxxxx",
  txnid: "TXN_xxx",
  amount: xxx.xx,
  email: "test@example.com",
  country: "india",
  mode: "PRODUCTION" or "TEST"
}
```

### Step 5: Complete Test Card Payment
On the PayU page:
1. Select **Credit Card** as payment method
2. Enter test card details:
   - **Card Number:** 5123456789012346
   - **Expiry:** 12/2030
   - **CVV:** 123
   - **Cardholder Name:** Test User
3. Click **"Pay Now"**
4. Enter OTP: **123456** (simulated bank)
5. Click **"Submit"**

### Step 6: Verify Success Page
- **Expected:** Redirected to `/payment-successful`
- **Visible:** Order ID, Amount, Transaction ID (mihpayid)
- **Database:** Order status should be `completed`

### Step 7: Check Server Logs
```
✅ Payment successful:
  orderId: "xxxxx",
  txnid: "TXN_xxx",
  transactionId: "403993715531077182",
  amount: xxx.xx,
  email: "test@example.com"
```

---

## 🧪 Test Scenario 2: Successful UPI Payment

### Step 1-3: Same as above (up to Payment Method Selection)

### Step 4: Select UPI
On the PayU page:
1. Select **UPI** as payment method
2. Enter test UPI ID: **9999999999@payu**
3. Click **"Verify"** then **"Pay Now"**
4. Simulate UPI success on dummy screen

### Step 5: Verify Success
- Same as Scenario 1, Step 6-7

---

## 🧪 Test Scenario 3: Failed Payment (Error Handling)

### Step 1-3: Same as above

### Step 4: Trigger Failure
On the PayU page:
1. Select **Credit Card**
2. Use any **invalid/expired card**: 
   - 4111111111111111 (generic test, will fail)
3. Click **"Pay Now"**

### Step 5: Expected Failure Redirect
- **Redirected:** `/payment-failed`
- **Displayed:** Error message, Transaction details
- **Database:** Order status should be `failed` with error reason

### Step 6: Check Server Logs
```
❌ Payment failed:
  status: "failure",
  failureReason: "Bank was unable to authenticate",
  error_Message: "...specific error..."
```

---

## 🧪 Test Scenario 4: Validation Error (Missing Fields)

### Step 1: Go to Checkout
Navigate to `/checkout`

### Step 2: Skip Form Validation
1. Leave **Email** field empty
2. Click **"Proceed to Payment"**

### Step 3: Expected Client Error
- **Alert:** "Please fill in all required fields"
- **No API call made**

### Step 4: Server-Side Validation Test
If you want to test server validation:
1. Open DevTools → Network tab
2. Fill form correctly
3. Click "Proceed to Payment"
4. Intercept the request (or check logs)
5. **Expected server logs:**
   ```
   ❌ PayU validation error: Mandatory fields missing or empty: [...]
   ```

---

## 🧪 Test Scenario 5: Nepal QR Payment

### Step 1-2: Same as above

### Step 3: Select Payment Method
1. Select **Nepal**
2. Click **"Proceed to Payment"**

### Step 4: Expected QR Display
- **Modal:** Shows QR code for manual payment
- **Info:** Amount in NPR, bank details
- **Database:** Order created with `paymentStatus: pending_manual`

### Step 5: Manual Verification
- User scans QR or transfers manually
- Admin/Dashboard shows pending order
- Once payment verified externally, order marked as paid

---

## 🔧 Debugging Common Issues

### ❌ Issue: "Payment initiation failed" / Not Redirecting to PayU

**Causes:**
1. **Missing token** → User not logged in
   - **Fix:** Log in again at `/signin`

2. **Invalid form fields** → Empty/invalid email, phone, etc.
   - **Fix:** Fill all required fields correctly
   - **Check logs:** Look for `PayU validation error`

3. **PayU credentials not configured** → PAYU_MERCHANT_KEY or PAYU_MERCHANT_SALT missing
   - **Fix:** Set in `.env.local`:
     ```env
     PAYU_MERCHANT_KEY=your_key
     PAYU_MERCHANT_SALT=your_salt
     PAYU_MODE=TEST or PRODUCTION
     ```
   - **Verify:** Run `node diagnose-payu-403.js`

4. **Mode mismatch** → Using production endpoint with test credentials
   - **Fix:** Set `PAYU_MODE=TEST` in `.env.local` for testing

### ❌ Issue: Form Submitted but Blank / No Data on PayU Page

**Cause:** Hash calculation error or missing parameters

**Debug:**
1. Enable debug logging:
   ```bash
   DEBUG_PAYU=1 npm run dev
   ```

2. Check server logs for:
   ```
   🔐 ========== PayU Hash Generation Debug ==========
   📋 Parameters (in order):
   [00] key: ...
   [01] txnid: ...
   ...
   📝 Full hash string:
   ```

3. Verify hash string matches PayU docs format

### ❌ Issue: "Checksum failed" on Redirect

**Cause:** Response hash verification failure

**Debug:**
1. Check server logs after payment:
   ```
   ❌ CRITICAL: Invalid PayU hash - Checksum verification failed
   ```

2. Possible causes:
   - PAYU_MERCHANT_SALT mismatch
   - PayU response tampered with
   - Hash calculation order incorrect

3. **Verify:** Run diagnostic script
   ```bash
   node debug-payu-advanced.js
   ```

### ❌ Issue: Payment Successful but Order Not Updated

**Cause:** Callback not processing correctly

**Debug:**
1. Check if callback route is being called:
   - Verify in server logs for POST to `/api/payments/payu/callback`

2. Check MongoDB:
   ```javascript
   // In MongoDB Compass or mongo shell
   db.orders.findOne({ payuTxnId: "TXN_xxx" })
   // Check paymentStatus field
   ```

3. Check database connection:
   ```bash
   node test-mongodb.js
   ```

---

## 📊 Test Data Reference

### Test Cards (Credit/Debit)

| Scenario | Card Number | Expiry | CVV | Result |
|----------|-------------|--------|-----|--------|
| Success | 5123456789012346 | 12/2030 | 123 | ✅ Success |
| Failure | 4111111111111111 | 12/2030 | 123 | ❌ Decline |

**OTP for 3D Secure:** `123456`

### Test UPI IDs

| Provider | Test UPI ID | Result |
|----------|-----------|--------|
| Generic | 9999999999@payu | ✅ Success |
| Simulate Decline | (Use invalid format) | ❌ Decline |

### Test Amounts

- **₹1.00** - Minimum (with 3.3% fee = ₹1.03)
- **₹100.00** - Standard (with 3.3% fee = ₹103.30)
- **₹10,000.00** - High value (tests large transactions)

---

## 📝 Test Log Checklist

After each test, verify these logs appear:

### Payment Initiation
```
✅ Check:
  - "PayU payment initiated" log
  - Order created in MongoDB
  - Correct amount with 3.3% fee applied
  - Hash generated successfully
```

### Success Response
```
✅ Check:
  - "Payment successful" log
  - Order status changed to "completed"
  - mihpayid stored
  - Redirect to /payment-successful
```

### Failure Response
```
✅ Check:
  - "Payment failure" log (NOT an error, expected)
  - Order status changed to "failed"
  - failureReason stored
  - Redirect to /payment-failed
```

---

## 🚀 Testing Timeline

**Recommended sequence:**
1. **Day 1:** Test Scenario 1 (Card Success) → Verify end-to-end
2. **Day 1:** Test Scenario 3 (Card Failure) → Verify error handling
3. **Day 2:** Test Scenario 2 (UPI) → Verify alternative payment method
4. **Day 2:** Test Scenario 4 (Validation) → Verify input validation
5. **Day 3:** Test Scenario 5 (Nepal) → Verify regional handling
6. **Day 3:** Stress test with multiple transactions → Load testing
7. **Day 4:** Full user flow testing (real user journey)
8. **Day 5:** Production mode switch (PAYU_MODE=PRODUCTION)

---

## ✅ Production Readiness Checklist

- [ ] All 5 test scenarios passed
- [ ] No error logs with DEBUG_PAYU=1
- [ ] Database entries created and updated correctly
- [ ] Redirect URLs point to correct pages
- [ ] Email notifications sent (if configured)
- [ ] PAYU_MODE=PRODUCTION in production `.env`
- [ ] PAYU_MERCHANT_KEY/SALT are real production credentials
- [ ] SSL certificate valid (https required for production)
- [ ] Callback URL accessible from internet
- [ ] Error pages have proper branding and support contact info

---

## 📞 Support Resources

**PayU Documentation:** https://www.payumoney.com/dev-api/payment-gateway  
**PayU Support Email:** care@payu.in  
**Your Diagnostic Tools:**
- `node diagnose-payu-403.js` - Quick credentials check
- `node debug-payu-advanced.js` - Deep hash analysis
- `node test-mongodb.js` - Database connectivity

---

**Last tested:** December 20, 2025  
**Status:** ✅ Ready for Testing
