# PayU Webhooks Configuration Guide

## Overview

Your website now has three webhook handlers to receive payment notifications from PayU:

1. **Successful Payment Webhook** → `/api/webhooks/payu/successful`
2. **Failed Payment Webhook** → `/api/webhooks/payu/failed`
3. **Refund Webhook** → `/api/webhooks/payu/refund`

---

## 🔧 Update PayU Merchant Dashboard

Your webhooks are currently configured with client-facing URLs, but they should point to the API endpoints instead.

### Current Configuration (❌ Wrong)
```
✗ Successful: https://www.swaryoga.com/payment-successful
✗ Failed: https://www.swaryoga.com/payment-failed
✗ Refund: https://www.swaryoga.com/payment-refund
```

### Correct Configuration (✅ Right)
```
✓ Successful: https://www.swaryoga.com/api/webhooks/payu/successful
✓ Failed: https://www.swaryoga.com/api/webhooks/payu/failed
✓ Refund: https://www.swaryoga.com/api/webhooks/payu/refund
```

### Steps to Update:

1. **Log in to PayU Merchant Dashboard**
   - URL: https://merchant.payu.in

2. **Navigate to Webhooks**
   - Settings → Webhooks (or Integration → Webhooks)

3. **Update Each Webhook URL**

   **For Successful Payments:**
   - Event: `payments` → `successful`
   - URL: `https://www.swaryoga.com/api/webhooks/payu/successful`
   - Method: `POST`
   - Status: `Active` ✓

   **For Failed Payments:**
   - Event: `payments` → `failed`
   - URL: `https://www.swaryoga.com/api/webhooks/payu/failed`
   - Method: `POST`
   - Status: `Active` ✓

   **For Refunds:**
   - Event: `refunds` or `payments` → `refund`
   - URL: `https://www.swaryoga.com/api/webhooks/payu/refund`
   - Method: `POST`
   - Status: `Active` ✓

4. **Save Changes**
   - Click Save/Update for each webhook

---

## 📋 Webhook Handler Details

### 1. Successful Payment Handler
**Endpoint:** `POST /api/webhooks/payu/successful`

**What it does:**
- Receives PayU notification when payment succeeds
- Verifies PayU hash signature (security check)
- Updates Order status to `paid`
- Records transaction ID and payment details
- Returns success response to PayU

**Order Status Changes:**
```typescript
{
  status: 'paid',
  paymentStatus: 'completed',
  transactionId: <PayU transaction ID>,
  paymentMethod: 'payu',
  paymentDate: <timestamp>,
  paymentResponse: {
    status: 'success',
    mihpayid: <PayU transaction ID>,
    amount: <amount paid>,
    email: <customer email>,
    udf1: <custom field 1>,
    udf2: <custom field 2>
  }
}
```

### 2. Failed Payment Handler
**Endpoint:** `POST /api/webhooks/payu/failed`

**What it does:**
- Receives PayU notification when payment fails
- Verifies PayU hash signature
- Updates Order status to `payment_failed`
- Records error code and failure reason
- Returns response to PayU

**Order Status Changes:**
```typescript
{
  status: 'payment_failed',
  paymentStatus: 'failed',
  transactionId: <PayU transaction ID or N/A>,
  paymentMethod: 'payu',
  paymentFailureDate: <timestamp>,
  paymentError: {
    code: <PayU error code>,
    message: <PayU error message>,
    status: <failure>,
    email: <customer email>,
    udf1: <custom field 1>,
    udf2: <custom field 2>
  }
}
```

### 3. Refund Handler
**Endpoint:** `POST /api/webhooks/payu/refund`

**What it does:**
- Receives PayU notification when refund is processed
- Verifies PayU hash signature
- Updates Order status to `refunded`
- Records original amount and refund amount
- Returns response to PayU

**Order Status Changes:**
```typescript
{
  status: 'refunded',
  paymentStatus: 'refunded',
  transactionId: <PayU transaction ID>,
  refundDate: <timestamp>,
  refundDetails: {
    originalAmount: <original payment amount>,
    refundAmount: <refunded amount>,
    status: <refund status>,
    mihpayid: <PayU transaction ID>,
    email: <customer email>,
    reason: <refund reason>,
    udf1: <custom field 1>,
    udf2: <custom field 2>
  }
}
```

---

## 🧪 Testing Webhooks

### 1. Test with Postman/cURL

**Test Successful Payment:**
```bash
curl -X POST http://localhost:3000/api/webhooks/payu/successful \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "txnid=test123&status=success&amount=1000&email=test@example.com&mihpayid=123456789"
```

**Test Failed Payment:**
```bash
curl -X POST http://localhost:3000/api/webhooks/payu/failed \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "txnid=test456&status=failure&amount=1000&email=test@example.com&error=3&error_Message=User cancelled"
```

**Test Refund:**
```bash
curl -X POST http://localhost:3000/api/webhooks/payu/refund \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "txnid=test789&status=refund&amount=1000&refund_amount=1000&email=test@example.com"
```

### 2. View PayU Webhook Logs

In PayU Merchant Dashboard:
- Settings → Webhooks → **Webhook Logs** tab
- View all webhook deliveries (success/failure)
- See response codes and error messages
- Re-delivery available for failed webhooks

### 3. Server Logs

When webhooks are received, your server will log:
```
[PayU Webhook] Successful payment: {
  txnid: 'xxxxx',
  mihpayid: 'yyyyyy',
  status: 'success',
  timestamp: '2025-12-16T10:30:00Z'
}
[PayU Webhook] Order updated successfully: {
  orderId: 'xxxxx',
  status: 'paid',
  amount: 1000
}
```

---

## 🔐 Security Features

All webhook handlers include:

1. **Hash Verification** 
   - Every webhook is verified using SHA512 hash
   - Ensures request came from PayU
   - Invalid hashes are rejected with 400 error

2. **Database Validation**
   - Checks if Order ID exists in database
   - Prevents orphaned transactions
   - Returns 404 if order not found

3. **Atomic Updates**
   - Uses MongoDB findByIdAndUpdate
   - Ensures data consistency
   - Prevents race conditions

4. **Error Logging**
   - All errors logged to server console
   - Includes timestamp and context
   - Helps with debugging issues

---

## 📊 Complete Payment Flow

```
1. User initiates payment
   ↓
2. POST /api/payments/payu/initiate (creates Order, generates hash)
   ↓
3. PayU payment page loads
   ↓
4. User completes/fails payment
   ↓
5. PayU redirects to /payment-successful or /payment-failed (client page)
   AND
6. PayU sends async webhook to /api/webhooks/payu/successful (or failed)
   ↓
7. Webhook handler updates Order in MongoDB
   ↓
8. Order status now reflects actual payment status
```

**Why both redirect AND webhook?**
- **Redirect:** Instant user feedback (may fail due to network)
- **Webhook:** Guaranteed delivery from PayU (async, reliable)
- **Together:** Redundancy ensures payment is recorded

---

## ⚠️ Important Notes

1. **Webhook URLs must be HTTPS in production**
   - HTTP allowed for localhost/testing only
   - PayU requires HTTPS for production webhooks

2. **Endpoints must be publicly accessible**
   - Not behind authentication
   - Not rate-limited (or whitelist PayU IPs)
   - Must accept POST requests

3. **Hash verification is mandatory**
   - All webhooks include hash in payload
   - Must verify before processing
   - Prevents replay attacks

4. **Idempotency**
   - PayU may send same webhook multiple times
   - Handlers check if order already exists
   - Multiple calls are safe (update, not create)

5. **Error Handling**
   - Handlers return JSON responses
   - PayU expects 200 status for success
   - Server logs all errors for debugging

---

## 📱 Order Status Changes

### Successful Payment Path:
```
pending (initial)
    ↓
paid (webhook received)
    ↓
[sent to email, displayed in profile]
```

### Failed Payment Path:
```
pending (initial)
    ↓
payment_failed (webhook received)
    ↓
[user can retry payment]
```

### Refund Path:
```
paid (after successful payment)
    ↓
refunded (webhook received)
    ↓
[refund recorded in database]
```

---

## 🚀 Next Steps

1. ✅ Webhook handlers created in codebase
2. ⏳ **Update webhook URLs in PayU dashboard** (you must do this)
3. ⏳ **Test webhooks** with test credentials
4. ⏳ **Monitor webhook logs** in PayU dashboard
5. ⏳ **Deploy to production** when ready

---

## 📞 Troubleshooting

### Webhook Not Being Called
- Check URL in PayU dashboard is correct
- Ensure endpoint is using HTTPS (production)
- Verify webhook is marked as Active
- Check server is accessible from PayU servers

### Hash Verification Failed
- Verify PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT are correct
- Check PayU credentials in .env file
- Ensure no spaces/special characters in credentials

### Order Not Found Error
- Check Order was created by /api/payments/payu/initiate
- Verify txnid matches Order._id in database
- Check MongoDB connection is working

### Webhook Not Being Received
- Monitor PayU Webhook Logs tab
- Check for error responses (403, 500, etc.)
- Verify endpoint is returning 200 status
- Check server logs for errors

---

## Related Files

| File | Purpose |
|------|---------|
| `/api/webhooks/payu/successful/route.ts` | Successful payment handler |
| `/api/webhooks/payu/failed/route.ts` | Failed payment handler |
| `/api/webhooks/payu/refund/route.ts` | Refund handler |
| `/api/payments/payu/callback/route.ts` | Callback handler (redirect) |
| `/api/payments/payu/initiate/route.ts` | Payment initiation |
| `/lib/payments/payu.ts` | PayU utilities & hash verification |
| `/lib/db.ts` | Order model schema |

---

**Configuration complete! Update PayU dashboard URLs and test webhooks. 🎉**
