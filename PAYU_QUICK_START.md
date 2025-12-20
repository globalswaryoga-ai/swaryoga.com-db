# 🚀 PayU Testing Quick Start

## Pre-Flight Checklist
```bash
# 1. Verify configuration
node test-payu-integration.js

# 2. Start dev server
npm run dev

# 3. With debug logging
DEBUG_PAYU=1 npm run dev
```

## ✅ Test Flow (5 minutes)

| Step | Action | Expected | Check |
|------|--------|----------|-------|
| 1 | Log in or create account | Auth token in localStorage | DevTools → Application |
| 2 | Add item to cart | Item count badge appears | Badge on cart icon |
| 3 | Go to `/checkout` | Form displays | Fill form |
| 4 | Enter details | All fields accept input | No validation errors |
| 5 | Select "India" payment | Button enables | Click enabled |
| 6 | Click "Proceed" | Redirected to PayU | Check server logs |
| 7 | Fill card details | PayU accepts input | Card: 5123456789012346 |
| 8 | Submit payment | 3D Secure prompt | Enter OTP: 123456 |
| 9 | Complete transaction | Redirected to success page | Order ID visible |
| 10 | Verify database | Order in MongoDB | Check order status: "completed" |

## 📊 Test Credentials

### Credit Card (Success)
```
Card: 5123456789012346
Exp:  12/2030
CVV:  123
OTP:  123456
```

### UPI (Success)
```
UPI ID: 9999999999@payu
```

### Nepal QR
```
Shows QR modal instead of redirect
Amount in NPR automatically calculated
```

## 🔍 Key Logs to Watch

### Successful Flow
```
✅ Payment initiated:
   orderId: "xxxxx"
   txnid: "TXN_xxx"
   amount: xxx.xx
   hash: "generated"

✅ Payment successful:
   status: "success"
   order.status: "completed"
```

### Failed Flow
```
❌ Payment failed:
   status: "failure"
   error: "Bank was unable to authenticate"
   order.status: "failed"
```

## 🐛 Troubleshooting

### Not redirected to PayU?
```bash
# Check logs
grep -i "error" ~/.pm2/logs/* 2>/dev/null

# Enable debug
DEBUG_PAYU=1 npm run dev

# Verify credentials
node diagnose-payu-403.js
```

### Hash mismatch error?
```bash
# Run deep analysis
node debug-payu-advanced.js

# Check salt in .env.local
echo $PAYU_MERCHANT_SALT
```

### Database not updated?
```bash
# Check MongoDB connection
node test-mongodb.js

# View orders in DB (requires connection)
# MongoDB Compass → swar_yoga_db → orders
```

## 📞 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Unauthorized" | Not logged in | Log in at `/signin` |
| "Missing fields" | Empty form fields | Fill all required fields |
| "Checksum failed" | Hash mismatch | Run `node debug-payu-advanced.js` |
| "Merchant not found" | Wrong PAYU_MERCHANT_KEY | Check `.env.local` |
| "Payment page blank" | Parameters not passed | Check server logs |
| "Order not found" | Callback txnid mismatch | Check `/api/payments/payu/callback` logs |

## 🎯 Success Indicators

- ✅ Checkout form accepts all inputs
- ✅ No validation errors on submit
- ✅ Redirected to PayU page (not error page)
- ✅ PayU page shows correct amount + products
- ✅ Can select multiple payment methods
- ✅ Test card accepted
- ✅ Redirected to `/payment-successful`
- ✅ Order appears in database with `status: "completed"`
- ✅ No "Checksum failed" errors in logs

## 📋 Test Scenarios (Recommended Order)

1. **Card Success** ← Start here (5 min)
2. **Card Failure** (5 min)
3. **UPI Success** (3 min)
4. **Form Validation** (2 min)
5. **Nepal QR** (2 min)

**Total time:** ~20 minutes for full verification

## 🚢 Production Readiness

Before deploying:
```bash
# 1. All 5 scenarios tested ✓
# 2. No error logs with DEBUG=1 ✓
# 3. Database entries created ✓
# 4. Redirects working ✓
# 5. Set PAYU_MODE=PRODUCTION ✓
# 6. Use real production credentials ✓
# 7. Enable HTTPS ✓
# 8. Update callback URL in PayU dashboard ✓
```

## 📚 Full Documentation

See `PAYU_TESTING_GUIDE.md` for:
- Detailed step-by-step instructions
- Screenshot guides
- Complete test scenarios
- Debugging procedures
- API response examples

## 🆘 Still Having Issues?

1. Check `PAYU_TESTING_GUIDE.md` → Debugging section
2. Run diagnostic: `node diagnose-payu-403.js`
3. Run advanced debug: `DEBUG_PAYU=1 node debug-payu-advanced.js`
4. Check PayU docs: https://www.payumoney.com/dev-api/payment-gateway
5. Contact PayU Support: care@payu.in

---

**Status:** ✅ Ready to Test  
**Last Updated:** December 20, 2025
