# 🔗 Cashfree Webhook Configuration

## ✅ Webhook URL for Your Production Environment

### Primary Webhook URL
```
https://swaryoga.com/api/payments/cashfree/webhook
```

### Alternative (with www)
```
https://www.swaryoga.com/api/payments/cashfree/webhook
```

### Staging/Testing (if needed)
```
https://staging.swaryoga.com/api/payments/cashfree/webhook
```

---

## 🔧 How to Set Up Webhook in Cashfree Dashboard

### Step 1: Log in to Cashfree Dashboard
1. Go to https://dashboard.cashfree.com
2. Sign in with your production credentials
3. Navigate to **Settings** → **Webhook Configuration**

### Step 2: Add Webhook Endpoint
1. Click **Add Webhook**
2. **Webhook URL**: Paste the webhook URL above
3. **Version**: Select `2023-08-01` (or your API version)
4. **Status**: Enable/Active
5. Click **Add**

### Step 3: Select Webhook Events
Enable the following events:
- ✅ `PAYMENT_SUCCESS` - Triggers when payment is successful
- ✅ `PAYMENT_FAILED` - Triggers when payment fails
- ✅ `PAYMENT_CANCELLED` - Triggers when payment is cancelled
- ⚠️ (Optional) `PAYMENT_EXPIRED` - Triggers when payment expires

### Step 4: Test Webhook (Recommended)
1. In Cashfree Dashboard, find your webhook
2. Click **Test Webhook**
3. Check your application logs to verify webhook was received
4. Look for incoming POST request at `/api/payments/cashfree/webhook`

---

## 🔐 Webhook Security

Your webhook endpoint at `/api/payments/cashfree/webhook` includes:

### Current Implementation
✅ **Order Verification** - Server-side verification with Cashfree API  
✅ **Idempotent Processing** - Handles duplicate webhooks gracefully  
✅ **Error Handling** - Returns 200 OK for all events (prevents retries)  

### Optional: Webhook Signature Verification
To add signature verification (recommended for production):

```typescript
// In app/api/payments/cashfree/webhook/route.ts
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return hash === signature;
}
```

**Cashfree will send signature in header:** `x-webhook-signature`

---

## 📊 Webhook Event Payload Example

### PAYMENT_SUCCESS Event
```json
{
  "event": "PAYMENT_SUCCESS",
  "data": {
    "order": {
      "order_id": "order_123abc",
      "order_amount": 5000,
      "order_currency": "INR",
      "order_status": "PAID",
      "cf_order_id": 123456
    },
    "payment": {
      "cf_payment_id": 987654,
      "payment_status": "SUCCESS",
      "payment_method": "upi"
    }
  }
}
```

### PAYMENT_FAILED Event
```json
{
  "event": "PAYMENT_FAILED",
  "data": {
    "order": {
      "order_id": "order_123abc",
      "order_status": "FAILED",
      "cf_order_id": 123456
    },
    "payment": {
      "payment_status": "FAILED",
      "error_reason": "Card Declined"
    }
  }
}
```

---

## 🔄 Webhook Processing Flow

```
Cashfree Server
    ↓
POST /api/payments/cashfree/webhook (your endpoint)
    ↓
Extract order_id from payload
    ↓
Verify with Cashfree API using server credentials
    ↓
Update Order in MongoDB
    ↓
Return 200 OK
    ↓
Webhook marked as delivered
```

---

## ⚠️ Important Notes

1. **Webhook Delivery Attempts**
   - Cashfree retries failed webhooks for 24 hours
   - Your endpoint should always return 200 OK
   - Processing failures should be handled internally

2. **Order Verification**
   - Never trust webhook payload alone
   - Always verify with Cashfree API using your credentials
   - This is implemented in `/api/payments/cashfree/webhook/route.ts`

3. **Duplicate Events**
   - Webhooks may be delivered multiple times
   - Your endpoint handles idempotent processing
   - Safe to process same event multiple times

4. **Timeout Handling**
   - Webhook calls timeout after 30 seconds
   - Keep processing lightweight
   - Use async tasks for heavy operations

---

## 🧪 Testing Webhooks

### Method 1: Cashfree Dashboard Test
1. Go to Settings → Webhooks
2. Find your webhook
3. Click "Test Webhook"
4. Check MongoDB for order updates

### Method 2: Local Testing with ngrok
```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3000

# Use ngrok URL in Cashfree dashboard
# Example: https://abc123.ngrok.io/api/payments/cashfree/webhook
```

### Method 3: Use Test Card for Full Flow
1. Initiate payment with test card: `4111111111111111`
2. Complete payment
3. Monitor webhook logs
4. Verify order status updates in MongoDB

---

## 📋 Webhook Debugging Checklist

- [ ] Webhook URL is accessible from internet (HTTPS)
- [ ] Endpoint returns 200 OK for all requests
- [ ] Order ID is correctly extracted from payload
- [ ] Cashfree API verification is successful
- [ ] MongoDB order is being updated
- [ ] Logs show webhook receipt and processing
- [ ] Payment status reflects in user dashboard

---

## 🔍 Monitoring Webhooks

### Check Webhook Status in Cashfree Dashboard
1. Settings → Webhooks
2. Click webhook name
3. View **Recent Deliveries**
4. Check **Status** and **Response**

### Monitor Application Logs
```bash
# Check logs in Vercel
vercel logs

# Or check MongoDB for order updates
db.orders.find({ updated: { $gte: new Date(Date.now() - 3600000) } })
```

### Set Up Alerts (Recommended)
- Alert on failed webhook deliveries
- Alert on payment status mismatches
- Alert on repeated failures from same order

---

## 🚨 Troubleshooting

### Webhook Not Triggering
**Problem:** Payment succeeds but webhook doesn't arrive

**Solutions:**
1. Verify webhook URL is publicly accessible
2. Check Cashfree Dashboard → Recent Deliveries
3. Ensure endpoint returns 200 OK
4. Check server logs for errors
5. Whitelist Cashfree IP ranges (if applicable)

### Order Not Updating
**Problem:** Webhook received but order not updating

**Solutions:**
1. Verify Cashfree credentials in .env.production
2. Check if order exists in MongoDB
3. Enable detailed logging in webhook handler
4. Test Cashfree API call directly
5. Check database connection

### Duplicate Orders
**Problem:** Same order appearing multiple times

**Solutions:**
1. Webhook is being processed twice
2. Add deduplication check using order_id
3. Use idempotent key in database update
4. Current implementation already handles this

---

## 📞 Support

### For Webhook Issues
- **Cashfree Support**: https://support.cashfree.com
- **Documentation**: https://docs.cashfree.com/docs/payments/webhooks
- **Status Page**: https://status.cashfree.com

### For Application Issues
- Check `/api/payments/cashfree/webhook` implementation
- Review server logs in Vercel dashboard
- Check MongoDB order documents
- Verify environment variables

---

## ✅ Checklist Before Going Live

- [ ] Webhook URL registered in Cashfree Dashboard
- [ ] Events enabled: PAYMENT_SUCCESS, PAYMENT_FAILED
- [ ] Test webhook delivery (use Dashboard test feature)
- [ ] Verified webhook processing in logs
- [ ] MongoDB orders updating correctly
- [ ] SSL certificate valid (HTTPS)
- [ ] Firewall allows incoming webhooks
- [ ] Monitoring/alerts set up
- [ ] Runbook created for webhook failures
- [ ] Team trained on webhook troubleshooting

---

**Last Updated**: January 16, 2026  
**Status**: ✅ Production Ready  
**Cashfree Account**: Production Environment  
