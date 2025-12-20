# ✅ PayU Live Verification - S2S Webhooks & Cross-Verification Guide

**Purpose:** Verify both success and failure payments across ALL verification points  
**Status:** Critical pre-production step  
**Date:** December 20, 2025

---

## 🎯 Overview: Three-Point Verification System

Your PayU integration uses three independent verification methods. ALL THREE must align for a valid transaction:

```
1. RETURN URLs (surl/furl)
   └─ Browser redirect after payment
   └─ User sees: Success/Failure page
   └─ FAST but NOT 100% reliable (user might close browser)

2. SERVER-TO-SERVER WEBHOOK (S2S Callback)  ⭐ MOST RELIABLE
   └─ PayU POSTs result directly to your API
   └─ Your code updates database
   └─ MUST happen for every transaction
   └─ Happens regardless of browser behavior

3. PAYPAL DASHBOARD VERIFICATION
   └─ Log in to merchant dashboard
   └─ Verify transaction details match your records
   └─ FINAL source of truth
   └─ Shows all transactions ever processed
```

---

## 📍 RETURN URLs (surl/furl) Verification

### What Happens

1. User completes payment on PayU
2. PayU redirects browser to: `surl` (success) or `furl` (failure)
3. Your page displays result to user

### Your Configuration

**File:** `app/api/payments/payu/initiate/route.ts` (Lines 346-352)

```typescript
const callbackBase = `${baseUrl}/api/payments/payu/callback`;
const callbackUrl = `${callbackBase}?success=${encodeURIComponent(successTarget)}&failure=${encodeURIComponent(failureTarget)}`;

// Both surl and furl point to same callback route
const payuParams: PayUParams & { service_provider: string } = {
  // ...
  surl: callbackUrl,      // ← Success redirect URL
  furl: callbackUrl,      // ← Failure redirect URL
  // ...
};
```

### How It Works in Your System

```
REDIRECT FLOW:
────────────────────────────────────────────────────────────

1. User submits payment → /api/payments/payu/initiate
   ├─ Creates Order in database (status: "pending")
   ├─ Generates hash
   └─ Returns: { paymentUrl: "https://secure.payu.in/_payment", params: {...} }

2. Browser redirects to PayU with form data
   └─ Includes: surl, furl parameters

3. User completes/fails payment on PayU

4. PayU redirects browser to your callback URL
   ├─ surl (success): /api/payments/payu/callback?success=...&failure=...
   └─ furl (failure): /api/payments/payu/callback?success=...&failure=...
   └─ PayU includes: POST data with payment result

5. Your callback route (/api/payments/payu/callback)
   ├─ Verifies hash
   ├─ Updates Order status
   ├─ Decrements workshop seats (if success)
   └─ Redirects to: /payment-successful OR /payment-failed

6. User sees success/failure page in browser
```

### Test Return URLs (surl/furl)

```bash
# 1. Start server with debug logging
DEBUG_PAYU=1 npm run dev

# 2. Open http://localhost:3000/checkout

# 3. Fill form & click "Proceed to Payment"

# 4. On PayU page, complete payment (use test card)

# 5. VERIFY - Browser should redirect
   Success: http://localhost:3000/payment-successful?status=success&orderId=...
   Failure: http://localhost:3000/payment-failed?status=failure&error=...

# 6. Check server logs
   Look for: "Redirecting user to success/failure page"
```

### Expected Behavior

| Scenario | Browser Redirect | Page Displayed | Error Message |
|----------|-----------------|----------------|---|
| **Success Card** | `/payment-successful?status=success` | ✅ Success page | (none) |
| **Failed Card** | `/payment-failed?status=failure` | ❌ Error page | "Bank declined" |
| **Pending** | `/payment-failed?status=pending` | ⏳ Pending page | "Verifying..." |
| **Invalid Hash** | `/payment-failed?status=failure` | ❌ Error page | "Verification failed" |

---

## 🔗 SERVER-TO-SERVER WEBHOOK (S2S) Verification ⭐

### What It Is

**Server-to-Server (S2S) Webhook:** PayU sends payment result directly to your backend API, independent of user's browser.

```
PayU Server → Your API Endpoint (/api/payments/payu/callback)
(HTTPS POST with payment data)
```

**Why It's Critical:**
- Works even if user closes browser
- Works even if connection drops
- Only way to reliably update database
- Required for production

### Your S2S Configuration

**Endpoint:** `app/api/payments/payu/callback/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payuData = Object.fromEntries(formData) as Record<string, string>;

    // ✅ STEP 1: Verify hash (security check)
    if (!verifyPayUResponseHash(payuData)) {
      console.error('❌ CRITICAL: Invalid PayU hash');
      return NextResponse.redirect(...);
    }

    // ✅ STEP 2: Extract payment data
    const status = (payuData.status || '').toLowerCase();
    const orderId = payuData.txnid;

    // ✅ STEP 3: Find & update order
    const order = await Order.findOne({ payuTxnId }).exec();
    if (!order) return NextResponse.redirect(...);

    // ✅ STEP 4: Update based on status
    if (status === 'success') {
      order.status = 'completed';
      order.paymentStatus = 'completed';
      // Decrement seats
    } else if (status === 'failure') {
      order.status = 'failed';
      order.failureReason = payuData.error_Message;
    }

    // ✅ STEP 5: Save to database
    await order.save();

    // ✅ STEP 6: Redirect user
    return NextResponse.redirect(...)
  }
}
```

### S2S Webhook Test Flow

```bash
# 1. Start server with detailed logging
DEBUG_PAYU=1 npm run dev

# 2. Make a test payment in browser
#    Navigate to http://localhost:3000/checkout
#    Complete payment flow with test card

# 3. VERIFY S2S webhook was received
#    Check server logs for:
```

**Server logs you should see:**

```
[POST /api/payments/payu/callback]

PayU Response: {
  txnid: "TXN_abc123",
  amount: "103.30",
  status: "success",
  mihpayid: "403993715531077182",
  email: "test@example.com",
  hash: "a1b2c3d4e5f6...",
  ...
}

🔐 PayU Response Hash String: 
  2H8k***|success|...|test@example.com|Test User|...|suVl***

🔐 Calculated Hash: a1b2c3d4e5f6...
🔐 Received Hash:   a1b2c3d4e5f6...
🔐 Match: true ✅

[Database Update]
Order found: 507f1f77bcf86cd799439011
Updating status: pending → completed
Decrementing seats: workshop_xyz (qty: 1)

✅ Payment success: {
  orderId: "507f1f77bcf86cd799439011",
  txnid: "TXN_abc123",
  status: "success"
}

[Redirect]
Redirecting user to: /payment-successful?status=success&orderId=...
```

### How to Confirm S2S Webhook is Working

**Method 1: Check Server Logs**

```bash
# Look for this exact line after payment:
"Payment success:" or "Payment failure:"

# If you see it → ✅ Webhook received and processed
# If you don't → ❌ Webhook not reaching your server
```

**Method 2: Check Database**

```javascript
// Connect to MongoDB and run:
db.orders.findOne({ 
  payuTxnId: "TXN_abc123" 
})

// Expected output:
{
  _id: ObjectId("..."),
  status: "completed",           // ← Changed from "pending"
  paymentStatus: "completed",    // ← Changed from "pending"
  transactionId: "403993715531077182",  // ← Populated from PayU
  total: 103.30,
  createdAt: ISODate("2025-12-20T10:15:00Z"),
  updatedAt: ISODate("2025-12-20T10:15:05Z")  // ← NEWER than createdAt
}
```

**Key indicators:**
- `status` changed from `pending` → `completed` or `failed`
- `updatedAt` is newer than `createdAt` (proves it was updated)
- `transactionId` is populated (came from PayU response)

**Method 3: HTTP Response Verification**

Simulate PayU sending S2S webhook:

```bash
# Create test webhook
curl -X POST http://localhost:3000/api/payments/payu/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "txnid=TXN_test_$(date +%s)" \
  -d "status=success" \
  -d "amount=100.00" \
  -d "productinfo=Test" \
  -d "firstname=Test" \
  -d "email=test@example.com" \
  -d "hash=0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" \
  -v

# Check response:
# - Should return: 302 (redirect) or 200
# - Should have: Location header with success/failure page
```

---

## 📊 Cross-Verify in PayU Dashboard

### Access PayU Merchant Dashboard

```
1. Go to: https://dashboard.payu.in/
2. Log in with merchant credentials
3. Ensure you're in LIVE MODE (toggle at top)
4. Navigate to: Transactions → All Transactions
```

### Verify Successful Payment in Dashboard

```
Dashboard Columns:
├─ Transaction ID (mihpayid)
├─ Your TXN ID (txnid)
├─ Amount
├─ Status
├─ Timestamp
├─ User Email
└─ (click row for details)

Expected for SUCCESS:
├─ Status: ✅ SUCCESS or COMPLETED
├─ Amount: 103.30 (or your amount)
├─ Your TXN ID: Matches your system (e.g., TXN_abc123)
└─ Transaction ID: Populated with PayU's ID
```

### Verify Failed Payment in Dashboard

```
Expected for FAILURE:
├─ Status: ❌ FAILED
├─ Amount: Same as submitted
├─ Your TXN ID: Still matches
├─ Error Code: 5 (or other PayU failure code)
└─ Error Message: "Bank declined" or similar
```

### Click on Transaction Details

When you click a transaction, PayU shows:

```
Transaction Details Page:
├─ Basic Info
│  ├─ Transaction ID: 403993715531077182
│  ├─ Your ID: TXN_abc123
│  ├─ Amount: 103.30
│  ├─ Currency: INR
│  └─ Status: SUCCESS
│
├─ Customer Info
│  ├─ Name: Test User
│  ├─ Email: test@example.com
│  ├─ Phone: 919876543210
│  └─ Address: (if provided)
│
├─ Payment Method
│  ├─ Card: 5123 **** **** 6
│  ├─ Card Type: Debit Card
│  └─ Bank: HDFC Bank
│
├─ Webhook Status
│  ├─ Callback Sent: ✅ Yes
│  ├─ Callback Received: ✅ Yes
│  └─ Response: 200 OK
│
└─ Timeline
   ├─ Payment Initiated: 10:15:00
   ├─ User Redirected: 10:15:05
   ├─ Callback Sent: 10:15:07
   └─ Transaction Complete: 10:15:10
```

### Cross-Check With Your Database

**Comparison Table:**

| Field | PayU Dashboard | Your Database | Status |
|-------|----------------|---------------|--------|
| **TXN ID** | 403993715531077182 | order.transactionId | ✅ Match |
| **Your ID** | TXN_abc123 | order.payuTxnId | ✅ Match |
| **Amount** | 103.30 | order.total | ✅ Match |
| **Status** | SUCCESS | order.status: "completed" | ✅ Match |
| **Email** | test@example.com | order.shippingAddress.email | ✅ Match |
| **Timestamp** | 2025-12-20 10:15:00 | order.updatedAt | ✅ Close match |

If ALL fields match → ✅ **Transaction verified successfully**

---

## 🔍 Complete Verification Checklist (Success Payment)

### PART 1: Browser Verification (Immediate)

- [ ] Checkout form filled completely
- [ ] Clicked "Proceed to Payment"
- [ ] Redirected to `https://secure.payu.in/_payment`
- [ ] Saw PayU payment page (not test.payu.in - verify URL)
- [ ] Selected payment method (credit card, UPI, etc.)
- [ ] Entered payment details
- [ ] Clicked "Pay Now" / "Submit"
- [ ] User authentication completed (OTP, 3D Secure, etc.)
- [ ] Redirected back to your site
- [ ] Browser URL changed to: `/payment-successful?status=success&orderId=...`
- [ ] Page displays: "Payment Successful" message
- [ ] Shows transaction details (amount, transaction ID, etc.)

### PART 2: Server-to-Server Webhook Verification (Within 30 seconds)

**Check Server Logs:**

```bash
# Terminal logs should show:
grep "Payment success:" server.log | tail -1

# Expected output:
✅ Payment success: {
  orderId: "507f1f77bcf86cd799439011",
  txnid: "TXN_abc123",
  transactionId: "403993715531077182",
  amount: 103.30,
  email: "test@example.com",
  status: "success"
}
```

Checklist:
- [ ] Server logs show "Payment success:" message
- [ ] Hash verification passed: "Match: true ✅"
- [ ] Order found in database: "Order found by payuTxnId"
- [ ] Status updated: "Updating status: pending → completed"
- [ ] Seats decremented (if workshop): "Decrementing seats: workshop_xyz"
- [ ] No error messages in logs
- [ ] Callback completed within 30 seconds

### PART 3: Database Verification (Verify immediately after payment)

```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/database"

# Query the order
db.orders.findOne({ 
  email: "test@example.com" 
}, { sort: { createdAt: -1 } })
```

Expected output:

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  userId: ObjectId("..."),
  
  // ✅ Payment status fields
  status: "completed",              // Changed from "pending"
  paymentStatus: "completed",       // Changed from "pending"
  paymentMethod: "payu",
  
  // ✅ PayU transaction IDs
  payuTxnId: "TXN_abc123",          // Your transaction ID
  transactionId: "403993715531077182",  // PayU's transaction ID
  
  // ✅ Amount and currency
  total: 103.30,
  currency: "INR",
  
  // ✅ Customer details
  shippingAddress: {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    phone: "919876543210",
    city: "Bangalore"
  },
  
  // ✅ Timestamps
  createdAt: ISODate("2025-12-20T10:15:00Z"),
  updatedAt: ISODate("2025-12-20T10:15:05Z"),  // NEWER
  
  // ✅ Workshop details (if applicable)
  items: [{
    kind: "workshop",
    workshopSlug: "yoga-basics",
    scheduleId: ObjectId("..."),
    name: "Yoga Basics",
    price: 100,
    quantity: 1
  }],
  seatInventoryAdjusted: true       // Seats were decremented
}
```

Verification checklist:
- [ ] `_id` exists (order was created)
- [ ] `status` is `"completed"` (not "pending")
- [ ] `paymentStatus` is `"completed"` (not "pending")
- [ ] `transactionId` is populated (from PayU webhook)
- [ ] `payuTxnId` matches what you submitted
- [ ] `total` matches payment amount
- [ ] `updatedAt` is newer than `createdAt`
- [ ] `seatInventoryAdjusted: true` (if workshop payment)
- [ ] No `failureReason` field
- [ ] Customer info matches form submission

### PART 4: PayU Dashboard Verification (Within 1 hour)

1. **Log in to PayU Dashboard**
   - [ ] Go to: https://dashboard.payu.in/
   - [ ] Verify you're in LIVE mode (toggle at top)

2. **Navigate to Transactions**
   - [ ] Transactions → All Transactions
   - [ ] Look for your test transaction

3. **Verify Transaction Details**
   - [ ] Transaction ID visible: e.g., `403993715531077182`
   - [ ] Your TXN ID matches: `TXN_abc123`
   - [ ] Status shows: `SUCCESS`
   - [ ] Amount matches: `103.30`
   - [ ] Email matches: `test@example.com`
   - [ ] Payment method shows: Credit Card / Debit Card / UPI

4. **Click on Transaction for Details**
   - [ ] Details page opens
   - [ ] Callback Status: "Sent ✅"
   - [ ] Response: "200 OK"
   - [ ] All amounts and IDs match your database

5. **Compare with Your Database**
   - [ ] All fields in comparison table match
   - [ ] Timestamps are approximately aligned (within 1 minute)
   - [ ] No discrepancies in amounts or IDs

---

## 🔍 Complete Verification Checklist (Failed Payment)

### PART 1: Browser Verification

- [ ] Checkout form filled
- [ ] Clicked "Proceed to Payment"
- [ ] Redirected to PayU
- [ ] Entered FAILING card: `5123456789012340`
- [ ] Clicked "Pay Now"
- [ ] Card declined (PayU shows error)
- [ ] Redirected back to your site
- [ ] URL shows: `/payment-failed?status=failure&error=...`
- [ ] Page displays: "Payment Failed" message
- [ ] Shows error reason: "Bank declined" or similar
- [ ] Shows transaction ID
- [ ] Has "Retry" or "Try Another Card" button

### PART 2: Server Webhook Verification

```bash
# Check logs for failure handling
grep "Payment failure:" server.log | tail -1

# Expected:
❌ Payment failure: {
  orderId: "507f1f77bcf86cd799439011",
  txnid: "TXN_abc123",
  transactionId: "403993715531077183",
  amount: 103.30,
  email: "test@example.com",
  failureReason: "Bank was unable to authenticate"
}
```

Checklist:
- [ ] "Payment failure:" message in logs
- [ ] Hash verification passed
- [ ] Order found
- [ ] Status updated to "failed"
- [ ] `failureReason` populated with error message

### PART 3: Database Verification

```javascript
db.orders.findOne({ 
  email: "test@example.com", 
  payuTxnId: "TXN_abc123"
})

// Expected:
{
  status: "failed",                 // ✅ Changed to failed
  paymentStatus: "failed",          // ✅ Changed to failed
  failureReason: "Bank was unable to authenticate",  // ✅ Populated
  transactionId: "403993715531077183",    // ✅ Still populated
  seatInventoryAdjusted: false      // ✅ Seats NOT decremented
}
```

Checklist:
- [ ] `status` is `"failed"`
- [ ] `paymentStatus` is `"failed"`
- [ ] `failureReason` has error message
- [ ] `seatInventoryAdjusted` is `false`
- [ ] `transactionId` is still populated
- [ ] `updatedAt` is newer than `createdAt`

### PART 4: PayU Dashboard Verification

- [ ] Transaction appears in dashboard
- [ ] Status shows: `FAILED`
- [ ] Error code visible: usually `5` or `6`
- [ ] Error message matches database
- [ ] Amount still shows correctly
- [ ] Callback was still sent and received
- [ ] Response code: `200 OK`

---

## 🛡️ Security Verification

### Hash Verification Deep Dive

**Why Hash Verification Matters:**
- Ensures data came from PayU (not forged)
- Ensures data wasn't modified in transit
- Uses your secret salt (only you and PayU know it)

**How Your System Verifies:**

Your code in `lib/payments/payu.ts`:

```typescript
export function verifyPayUResponseHash(data: Record<string, string>): boolean {
  const hashString = [
    PAYU_MERCHANT_SALT,
    status,
    udf10, udf9, udf8, udf7, udf6, udf5, udf4, udf3, udf2, udf1,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    PAYU_MERCHANT_KEY,
  ].join('|');

  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  
  return calculatedHash.toLowerCase() === hash.toLowerCase();
}
```

**In callback route** (line 63-89):

```typescript
if (!verifyPayUResponseHash(payuData)) {
  console.error('❌ CRITICAL: Invalid PayU hash - Checksum verification failed');
  // REJECT payment - don't update database
  return NextResponse.redirect(failureUrl);
}
```

### Verify Hash is Working

```bash
# Check logs during payment
DEBUG_PAYU=1 npm run dev

# After payment, look for:
🔐 PayU Response Hash String: 2H8k***|success|...|suVl***
🔐 Calculated Hash: a1b2c3d4e5f6g7h8i9j0...
🔐 Received Hash:   a1b2c3d4e5f6g7h8i9j0...
🔐 Match: true ✅

# If Match says false → Hash mismatch
# Causes: Wrong salt, parameters reordered, or data modified
```

---

## 📋 Final Verification Summary

### Success Flow Complete Checklist

```
✅ Browser Redirect: /payment-successful
✅ S2S Webhook Received: Logs show "Payment success:"
✅ Database Updated: status changed to "completed"
✅ PayU Dashboard: Transaction shows "SUCCESS"
✅ Hash Verified: Match = true
✅ Amount Matches: Order total = PayU amount
✅ IDs Match: payuTxnId and transactionId align
✅ Timestamps Match: Within 1 minute across systems
✅ Seats Decremented: (if workshop) seatInventoryAdjusted = true
```

### Failure Flow Complete Checklist

```
✅ Browser Redirect: /payment-failed
✅ S2S Webhook Received: Logs show "Payment failure:"
✅ Database Updated: status changed to "failed"
✅ Error Reason Stored: failureReason populated
✅ PayU Dashboard: Transaction shows "FAILED"
✅ Hash Verified: Match = true
✅ Seats NOT Decremented: seatInventoryAdjusted = false
```

---

## 🚀 Ready for Production?

Before going live, perform BOTH test sequences:

1. **Test Success Payment** (use card 5123456789012346)
   - [ ] Complete all 4 verification parts
   - [ ] All checks pass
   - [ ] No errors or warnings

2. **Test Failure Payment** (use card 5123456789012340)
   - [ ] Complete all 4 verification parts
   - [ ] Failure handled gracefully
   - [ ] No errors or warnings

**Only proceed to production after BOTH tests pass completely.**

---

**Status:** 🟢 **VERIFICATION GUIDE COMPLETE**  
**Next Step:** Test both success and failure payments using this guide, then proceed to production setup.

