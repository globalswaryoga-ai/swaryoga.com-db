# 🔴 Failing Card Test - Quick Reference

## Failing Test Card Details

```
Card Number: 5123456789012340
Expiry Date: 12/2030 (any future date)
CVV: 123
Cardholder Name: Test User (or any name)
```

⚠️ **Important:** Last digit is `0` (not `6`)
- Success card: 5123456789012346
- **Failure card: 5123456789012340**

---

## 5-Minute Failure Test

### Setup (1 min)
```bash
# Terminal 1: Start dev server with debug
DEBUG_PAYU=1 npm run dev

# Terminal 2: Optional - Watch MongoDB
mongodb-compass
```

### Test Flow (4 min)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in at http://localhost:3000 | Home page |
| 2 | Add item to cart | Badge shows count |
| 3 | Go to /checkout | Form displays |
| 4 | Fill form (any test data) | Form accepts input |
| 5 | Click "Proceed to Payment" | Redirected to PayU |
| 6 | Select Credit Card | Card fields appear |
| 7 | Enter card: 5123456789012340 | Card field accepts |
| 8 | Expiry: 12/2030, CVV: 123 | Fields accept input |
| 9 | Click "Pay Now" | Bank page or 3D prompt |
| 10 | Enter OTP: 123456 | Simulated (auto-filled) |
| 11 | Click "Submit" | Redirected to /payment-failed |
| 12 | Verify error message | Error displayed |

---

## Server Log Signals

### ✅ Test is Working
```
✅ PayU payment initiated: { orderId: "...", txnid: "TXN_...", ... }
❌ Payment failure: { status: "failure", failureReason: "..." }
✅ Order updated: { status: "failed", ... }
```

### ❌ Test Failed - Check
```
❌ "Invalid PayU hash" → Run: node debug-payu-advanced.js
❌ "Order not found" → Check txnid matches database
❌ "No logs at all" → Callback not being called
```

---

## Database Verification

### Before Payment
```javascript
db.orders.find({ email: "your-test@email.com" }).count()
// Should be 0 (first time)
```

### After Failed Payment
```javascript
db.orders.findOne({ email: "your-test@email.com" })
// Should show:
{
  status: "failed",
  paymentStatus: "failed",
  failureReason: "Bank was unable to authenticate"
}
```

---

## ✅ Success Indicators

All of these should be true:

- ✅ Received "Payment failure:" log
- ✅ Order status in DB is "failed"
- ✅ failureReason populated in DB
- ✅ Redirected to /payment-failed
- ✅ Error message displayed to user
- ✅ No errors in server logs
- ✅ Hash verification passed (then rejected payment)

---

## If Something Goes Wrong

| Issue | Fix |
|-------|-----|
| Not redirected to PayU | Check browser console, server logs |
| Card not accepted | Use exact card: 5123456789012340 |
| PayU error page | Normal - card designed to fail |
| Not redirected to failure page | Callback not received, check logs |
| Order not in database | Check if order was created (should be in "failed" state) |
| No error message shown | Browser page not loading, check console |

---

## Expected Behavior

### What Should Happen
1. User clicks "Pay Now"
2. PayU receives request
3. PayU declines card (by design)
4. PayU POSTs to your callback
5. Your callback verifies hash ✓
6. Your callback finds order
7. Your callback updates status → "failed"
8. Your callback stores failure reason
9. User redirected to /payment-failed
10. Error message displayed

### What NOT to Expect
- ❌ No redirect (something's wrong)
- ❌ Order in "pending" state (should be "failed")
- ❌ No error message (failure page broken)
- ❌ Multiple orders created (one only)

---

## Testing Checklist

Before you test, verify:
- [ ] Server running: `npm run dev`
- [ ] Debug logging: `DEBUG_PAYU=1`
- [ ] Logged in to app
- [ ] Cart has items
- [ ] MongoDB running (optional for live check)
- [ ] Browser DevTools open (F12)

After test, verify:
- [ ] Server logs show "Payment failure:"
- [ ] Database has failed order
- [ ] Browser shows /payment-failed page
- [ ] Error message is visible
- [ ] No duplicate orders

---

## Card Reference

| Type | Card Number | Result |
|------|-------------|--------|
| ✅ Success | 5123456789012346 | Payment approved |
| ❌ Failure | 5123456789012340 | Payment declined |
| 🔧 Test | 4111111111111111 | May decline (depends on config) |

**Always use:** 5123456789012340 for failure test

---

## Full Test Documentation

For complete details, see: `PAYU_FAILURE_TESTING.md`

---

**Quick Test Time:** 5 minutes  
**Status:** ✅ Ready to Test  
**Confidence:** 🟢 High
