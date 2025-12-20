# 🎯 PayU Go-Live Quick Reference Card

**Use this card as your checklist when switching from test to production**

---

## 📝 Step 1: Get Live Credentials (5 min)

```
☐ Log in: https://dashboard.payu.in/
☐ Switch: Toggle to "LIVE MODE" (top right)
☐ Copy: Developer Tools → API Keys
  • Live Merchant Key: suVlp5D9Yvd8vYHXrB4xWm (keep secret!)
  • Live Merchant Salt: 2H8kL9mQpR7tU3xW5yZ1aB4cD6eF9gH2jK5lM7nP0qR2sT4u (keep secret!)
```

---

## 🔑 Step 2: Store Credentials Securely

### For Vercel Deployment

```bash
# Add to Vercel environment
vercel env add PAYU_MERCHANT_KEY
# → Paste: <YOUR_LIVE_KEY>

vercel env add PAYU_MERCHANT_SALT
# → Paste: <YOUR_LIVE_SALT>

vercel env add PAYU_MODE
# → Type: PRODUCTION

# Verify stored
vercel env list
```

### For Local Development (Testing)

```bash
# Edit .env.local
PAYU_MERCHANT_KEY=<YOUR_LIVE_KEY>
PAYU_MERCHANT_SALT=<YOUR_LIVE_SALT>
PAYU_MODE=PRODUCTION
```

---

## ✅ Step 3: Verify Configuration

```bash
# Start server
PAYU_MODE=PRODUCTION npm run dev

# Check logs show:
🔐 PayU Configuration: {
  mode: 'PRODUCTION',
  baseUrl: 'https://secure.payu.in',      ← MUST be secure.payu.in
  hasKey: true,
  hasSalt: true
}
```

**If baseUrl is test.payu.in → Credentials not loaded correctly!**

---

## 🌐 Step 4: Configure Webhook URL in PayU Dashboard

```
☐ Log in: https://dashboard.payu.in/ (LIVE mode)
☐ Go to: Settings → Integration → Webhook
☐ Set URL: https://your-domain.com/api/payments/payu/callback
☐ Method: POST
☐ Status: Enabled
☐ Click: "Test Webhook" → Should see 200 OK
☐ Save
```

---

## 🔗 Step 5: Verify URLs Correct

| Component | TEST | PRODUCTION |
|-----------|------|------------|
| **Payment URL** | test.payu.in | **secure.payu.in** ✅ |
| **Callback** | http://localhost:3000 | https://your-domain.com ✅ |
| **Hash Salt** | Test salt | Live salt ✅ |
| **PAYU_MODE** | TEST | PRODUCTION ✅ |

---

## 🧪 Step 6: Test Live Credentials

```bash
# Create & run test
cat > test-live-setup.js << 'EOF'
const crypto = require('crypto');

const key = process.env.PAYU_MERCHANT_KEY;
const salt = process.env.PAYU_MERCHANT_SALT;

if (!key || !salt) {
  console.error('❌ Credentials not found');
  process.exit(1);
}

console.log('✅ Credentials loaded');
console.log(`✅ Key prefix: ${key.substring(0, 5)}***`);
console.log(`✅ Salt prefix: ${salt.substring(0, 5)}***`);

// Test hash generation
const hash = crypto
  .createHash('sha512')
  .update(`${key}|TEST|100.00|Test|User|test@example.com|||||||||${salt}`)
  .digest('hex');

console.log(`✅ Hash generated: ${hash.substring(0, 20)}...`);
console.log('✅ All systems ready for live!');
EOF

# Run with live credentials
PAYU_MODE=PRODUCTION \
PAYU_MERCHANT_KEY=<YOUR_LIVE_KEY> \
PAYU_MERCHANT_SALT=<YOUR_LIVE_SALT> \
node test-live-setup.js
```

---

## 💳 Step 7: Execute Test Payments

### Test 1: Successful Payment (2 min)

```
Card: 5123456789012346
Expiry: 12/2030
CVV: 123
OTP: 123456

Expected:
✅ Browser redirects to /payment-successful
✅ Order status in DB: "completed"
✅ Logs show: "Payment success:"
✅ PayU dashboard shows: SUCCESSFUL transaction
```

### Test 2: Failed Payment (2 min)

```
Card: 5123456789012340 (note: 0 at end)
Expiry: 12/2030
CVV: 123
OTP: 123456

Expected:
❌ Browser redirects to /payment-failed
❌ Order status in DB: "failed"
❌ Logs show: "Payment failure:"
❌ PayU dashboard shows: FAILED transaction
```

---

## 📊 Step 8: Verify Both Payments

### In Database

```javascript
// Success payment
db.orders.findOne({ status: "completed" })
// → status: "completed", transactionId: populated ✅

// Failure payment
db.orders.findOne({ status: "failed" })
// → status: "failed", failureReason: "..." ✅
```

### In PayU Dashboard

```
Log in: https://dashboard.payu.in/ (LIVE mode)
Transactions → All

Look for both:
✅ Success transaction (Status: SUCCESS)
✅ Failure transaction (Status: FAILED)

Click each → Verify:
  • Webhook Status: Sent ✅
  • Response: 200 OK ✅
```

---

## 🚀 Step 9: Deploy to Production

```bash
# If using Vercel (env vars already set)
git push origin main
# → Vercel auto-deploys

# If self-hosted
npm run build
npm run start
```

---

## ✅ Step 10: Final Checklist

```
CREDENTIALS
☐ Live keys obtained from PayU
☐ Keys NOT hardcoded (using env vars)
☐ Keys stored securely (Vercel env / .env.local)

CONFIGURATION
☐ PAYU_MODE = PRODUCTION
☐ Endpoint: https://secure.payu.in (NOT test.payu.in)
☐ Callback URL configured in PayU dashboard
☐ HTTPS enabled on domain

TESTING
☐ Success payment tested (card 5123456789012346)
☐ Failure payment tested (card 5123456789012340)
☐ Order status updated in database
☐ Logs show successful webhooks
☐ PayU dashboard shows both transactions

DEPLOYMENT
☐ Environment variables set correctly
☐ No hardcoded credentials in code
☐ SSL certificate valid
☐ Callback URL reachable from internet
☐ Error logging configured

MONITORING
☐ Payment logs accessible
☐ Alert system configured
☐ Database backups enabled
```

---

## 🔴 CRITICAL: Before You Push to Prod

**DO NOT go live unless ALL of these are true:**

1. ✅ Both test payments work (success AND failure)
2. ✅ Webhook received for both payments (check logs)
3. ✅ Database updated correctly for both
4. ✅ PayU dashboard shows both transactions
5. ✅ PAYU_MODE is PRODUCTION (not TEST)
6. ✅ No hardcoded credentials in code
7. ✅ Callback URL is https:// not http://
8. ✅ Domain has valid SSL certificate
9. ✅ Error monitoring is configured
10. ✅ You can restore from backups if needed

---

## 🆘 Troubleshooting

**Problem:** Browser shows `test.payu.in` instead of `secure.payu.in`

**Fix:**
```bash
# Check environment
echo $PAYU_MODE        # Must be PRODUCTION
echo $PAYU_MERCHANT_KEY  # Must start with different chars than test key

# Restart server
npm run dev
```

---

**Problem:** Hash verification fails (Checksum error)

**Fix:**
1. Verify PAYU_MERCHANT_SALT is set
2. Check salt matches PayU dashboard (live version)
3. Restart server
4. Try payment again

---

**Problem:** Callback not received (logs don't show "Payment success/failure")

**Fix:**
1. Check webhook URL in PayU dashboard
2. Must be: `https://your-live-domain.com/api/payments/payu/callback`
3. Test webhook from PayU dashboard
4. Check server logs for incoming POST requests

---

**Problem:** Payment works but order shows "pending" in database

**Fix:**
1. Check server logs for hash verification error
2. Verify PAYU_MERCHANT_SALT is correct
3. If hash verified OK but status still "pending", wait 30 seconds (webhook delay)
4. Check database directly

---

## 📞 Support

- **PayU Support:** support@payu.in
- **PayU Merchant Dashboard:** https://dashboard.payu.in/
- **Your Logs:** `npm run dev` or cloud provider's log viewer
- **Database:** MongoDB Compass or mongosh CLI

---

**✅ Ready? Push to production!**

**Still uncertain? Review:**
- [PAYU_PRODUCTION_SETUP.md](PAYU_PRODUCTION_SETUP.md) - Full guide
- [PAYU_S2S_WEBHOOK_VERIFICATION.md](PAYU_S2S_WEBHOOK_VERIFICATION.md) - Verification checklist

