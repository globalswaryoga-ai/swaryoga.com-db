# Payment System Testing Guide - Quick Start

**Status:** ✅ Ready for PayU Sandbox Testing  
**Build:** ✅ Passed  
**Type Safety:** ✅ Full TypeScript coverage

---

## Quick Start: Three Payment Flows to Test

### 1️⃣ India PayU (Fastest to Test)

```
Steps:
1. Login to app (or create test account)
2. Add yoga workshop to cart (INR ₹500)
3. Go to cart → Click "Checkout"
4. Fill form:
   - First Name: Test User
   - Email: test@example.com
   - Phone: 9876543210
   - City: Delhi
5. Click green button "🇮🇳 Pay with India PayU"
6. Verify amount shows: ₹516.50 (500 + 3.3% fee)
7. Form should submit to PayU sandbox

Expected Behavior:
✓ Form validates email/phone
✓ Button disables while processing
✓ Amount includes 3.3% fee
✓ Form submits to PayU automatically
✓ Redirects to PayU payment page
```

### 2️⃣ International PayU

```
Steps:
1. Add international product (USD $100)
2. Click "Checkout"
3. Fill form
4. Click blue button "🌍 International Payment"
5. Verify amount shows: $103.30 (100 + 3.3% fee)

Expected Behavior:
✓ Currency changes to USD
✓ Amount calculation correct
✓ Redirects to PayU gateway
```

### 3️⃣ Nepal QR Payment (Instant Modal)

```
Steps:
1. Add Nepal product (NPR Rs. 2,000)
2. Click "Checkout"
3. Fill form
4. Click purple button "🇳🇵 Pay with Nepal QR"
5. Modal should open showing:
   - Title: "Nepal Payment"
   - Amount: Rs. 2,066 (includes 3.3% fee)
   - Dummy QR code (SVG placeholder)
   - Download button
   - Payment instructions

Expected Behavior:
✓ Modal opens immediately (no form submission)
✓ Amount includes 3.3% fee
✓ QR code displays
✓ Download button works
✓ Close button works
✓ Order created in MongoDB with pending_manual status
```

---

## Environment Setup

### 1. Verify Environment Variables

```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
cat .env.local | grep PAYU
```

Should show:
```
PAYU_MERCHANT_KEY=xxxxx
PAYU_MERCHANT_SALT=xxxxx
PAYU_MODE=TEST
```

### 2. Start Development Server

```bash
npm run dev
```

Access: http://localhost:3000

### 3. Login/Create Test Account

Navigate to: http://localhost:3000/signin

Use test credentials or create new account.

---

## Testing Checklist

### Phase 1: Form Validation (No API Calls)

```
Test Cases:

1. Empty form submission
   ✓ Error: "Please fill in: firstName, email, phone, city"

2. Invalid email
   ✓ Error: "Please enter a valid email address"

3. Invalid phone (< 10 digits)
   ✓ Error: "Please enter a valid phone number (at least 10 digits)"

4. All fields correct
   ✓ Form allows submission

5. Mobile responsiveness
   ✓ Form works on mobile (test with browser dev tools)
```

### Phase 2: Amount Calculation (No API Calls)

```
Test Cases:

1. Single item (₹100)
   ✓ Shows: Subtotal ₹100, Charges ₹3.30, Total ₹103.30

2. Multiple items (3 items × ₹100 = ₹300)
   ✓ Shows: Subtotal ₹300, Charges ₹9.90, Total ₹309.90

3. USD currency ($50)
   ✓ Shows: Subtotal $50, Charges $1.65, Total $51.65

4. NPR currency (Rs. 1,500)
   ✓ Shows: Subtotal Rs. 1,500, Charges Rs. 49.50, Total Rs. 1,549.50
```

### Phase 3: Payment Button Behavior (With API Calls)

```
Test Cases:

1. Click "India PayU" button
   ✓ Button disables
   ✓ Shows loading state (optional)
   ✓ Calls: POST /api/payments/payu/initiate
   ✓ Response: { orderId, paymentUrl, params }
   ✓ Form submits to PayU
   ✓ Redirects to PayU payment page

2. Click "International" button
   ✓ Similar flow to India
   ✓ Currency is USD

3. Click "Nepal QR" button
   ✓ Button disables temporarily
   ✓ Calls: POST /api/payments/payu/initiate
   ✓ Response: { orderId, country: 'nepal', amount }
   ✓ NepalQRModal opens
   ✓ Shows correct amount (with 3.3% fee)
```

### Phase 4: Nepal QR Modal

```
Test Cases:

1. Modal renders correctly
   ✓ Header: "Nepal Payment" (green background)
   ✓ Amount box displays
   ✓ Amount is correct (subtotal + 3.3%)
   ✓ Currency symbol correct (Rs.)

2. QR Code section
   ✓ QR code displays (currently dummy SVG)
   ✓ No errors in console

3. Download button
   ✓ Click download
   ✓ File downloads as PNG
   ✓ File name: "swar-yoga-payment-{amount}.png"

4. Instructions section
   ✓ Shows eSewa, Khalti, etc.
   ✓ Contact info visible

5. Close button
   ✓ Click X button
   ✓ Modal closes
   ✓ Returns to checkout page

6. Mobile responsiveness
   ✓ Modal fits on mobile screen
   ✓ All buttons clickable
```

### Phase 5: Backend Order Creation

```
Database Tests:

For India/International PayU:
1. Open MongoDB
2. Query: db.orders.findOne({_id: ObjectId(txnid)})
3. Verify fields:
   ✓ userId: correct user
   ✓ total: subtotal + 3.3%
   ✓ status: "pending"
   ✓ paymentStatus: "pending"
   ✓ paymentMethod: "india_payu" or "international_payu"
   ✓ shippingAddress: all fields filled
   ✓ items: array of products

For Nepal QR:
1. Query: db.orders.findOne({paymentMethod: "nepal_qr"})
2. Verify fields:
   ✓ paymentStatus: "pending_manual" (NOT "pending")
   ✓ total: includes 3.3% fee
   ✓ All other fields same as above
```

### Phase 6: Webhook Processing

```
Test Cases:

1. Success Webhook
   Request: POST /api/webhooks/payu/successful
   Body: {
     txnid: "507f1f77bcf86cd799439011",
     status: "success",
     amount: "516.50",
     email: "test@example.com",
     hash: "..."
   }
   
   ✓ Order updated: status = "completed"
   ✓ paymentStatus = "completed"
   ✓ User redirected to success page
   ✓ Email notification sent (if configured)

2. Failure Webhook
   Request: POST /api/webhooks/payu/failed
   Body: {
     txnid: "...",
     status: "failure",
     error: "Payment declined",
     hash: "..."
   }
   
   ✓ Order updated: status = "failed"
   ✓ paymentStatus = "failed"
   ✓ User redirected to failure page
   ✓ Error message displayed

3. Refund Webhook
   Request: POST /api/webhooks/payu/refund
   Body: {
     txnid: "...",
     refund_amount: "516.50",
     hash: "..."
   }
   
   ✓ Order updated: status = "refunded"
   ✓ Refund notification sent
```

### Phase 7: Error Handling

```
Test Cases:

1. Network error during API call
   ✓ Error message displayed: "Payment failed. Please try again."
   ✓ Button re-enabled
   ✓ Can retry payment

2. Invalid token (expired session)
   ✓ Error: "Authentication required"
   ✓ Redirect to signin page

3. Missing required fields
   ✓ Form validation catches errors
   ✓ Error message before API call

4. PayU hash mismatch
   ✓ Webhook rejected
   ✓ Order status not updated
   ✓ Admin notified
```

---

## API Testing with cURL

### Test India PayU Flow

```bash
# Set variables
TOKEN="your_jwt_token_here"
API_URL="http://localhost:3000"

# Call payment initiate
curl -X POST "$API_URL/api/payments/payu/initiate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "india",
    "amount": 500,
    "productInfo": "Test Workshop",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "9876543210",
    "city": "Delhi",
    "currency": "INR",
    "items": [
      {
        "name": "Yoga Workshop",
        "price": 500,
        "quantity": 1
      }
    ]
  }'

# Expected Response:
{
  "success": true,
  "orderId": "507f1f77bcf86cd799439011",
  "country": "india",
  "paymentUrl": "https://secure.payu.in/_payment",
  "params": {
    "key": "...",
    "txnid": "507f1f77bcf86cd799439011",
    "amount": "516.50",
    "productinfo": "Test Workshop",
    ...
  }
}
```

### Test Nepal QR Flow

```bash
curl -X POST "$API_URL/api/payments/payu/initiate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "nepal",
    "amount": 2000,
    "productInfo": "Nepal Workshop",
    "firstName": "Test",
    "email": "test@example.com",
    "phone": "9876543210",
    "city": "Kathmandu",
    "currency": "NPR"
  }'

# Expected Response:
{
  "success": true,
  "orderId": "507f1f77bcf86cd799439011",
  "country": "nepal",
  "paymentMethod": "qr",
  "amount": 2066,
  "currency": "NPR",
  "message": "QR code displayed for manual payment"
}
```

---

## Browser DevTools Testing

### 1. Network Tab
```
Monitor API calls:
✓ POST /api/payments/payu/initiate → Status 200
✓ Request body: { country, amount, ... }
✓ Response body: { success, orderId, params }
✓ Timing: < 500ms
```

### 2. Console Tab
```
Check for errors:
✓ No 401 Unauthorized errors
✓ No CORS errors
✓ No missing import warnings
✓ Payment debugging logs visible
```

### 3. Application Tab (LocalStorage)
```
Verify data:
✓ token: Valid JWT token
✓ orderId: Stored after payment
✓ Cart cleared after payment (optional)
```

### 4. Database (MongoDB Compass)
```
Check order creation:
✓ New order in 'orders' collection
✓ Correct amount (with 3.3%)
✓ Correct status ('pending' or 'pending_manual')
✓ All required fields populated
```

---

## Common Issues & Solutions

### Issue 1: "Unauthorized" Error

```
Symptom: { error: 'Unauthorized' }
Status: 401

Cause: Missing or invalid JWT token

Solution:
1. Ensure logged in: Go to /signin
2. Fill email and password
3. Check localStorage has token:
   - Open DevTools → Application → LocalStorage
   - Look for 'token' key
   - Should have value (long JWT string)
4. Retry payment

Test:
- Open DevTools Console
- Run: localStorage.getItem('token')
- Should return JWT string (not null)
```

### Issue 2: "Invalid country" Error

```
Symptom: { error: 'Invalid country. Must be "india", "international", or "nepal"' }

Cause: Typo or wrong value in country parameter

Solution:
- Verify checkout.tsx sends correct country value
- Check API request in Network tab
- Ensure spelling: 'india' (not 'India')
```

### Issue 3: Amount Calculation Wrong

```
Symptom: Total shows ₹1000 instead of ₹1033

Cause: 3.3% fee not added

Solution:
1. Check /lib/paymentMath.ts:
   - getChargeRate() should return 0.033
2. Check checkout.tsx calculation:
   - chargeAmount = subtotal * 0.033
   - total = subtotal + chargeAmount
3. Rebuild: npm run build
```

### Issue 4: NepalQRModal Not Showing

```
Symptom: Click Nepal button, nothing happens

Cause: Component not imported or rendering issue

Solution:
1. Check import in checkout.tsx:
   - import NepalQRModal from '@/components/NepalQRModal'
2. Check render:
   - {showNepalQR && <NepalQRModal ... />}
3. Check state:
   - DevTools → React DevTools → Check showNepalQR state
4. Rebuild: npm run build && npm run dev
```

### Issue 5: PayU Form Not Submitting

```
Symptom: See payment params but not redirected to PayU

Cause: Form submission issue

Solution:
1. Check browser console for errors
2. Verify PayU URL is correct:
   - Should be: https://secure.payu.in/_payment
3. Check form params:
   - DevTools → Network → See POST data sent
4. Verify PayU credentials:
   - PAYU_MERCHANT_KEY set
   - PAYU_MERCHANT_SALT set
   - PAYU_MODE = "TEST"
```

---

## Success Metrics

When all tests pass, you should see:

✅ **Checkout Form**
- Clean, simple interface
- 5 input fields only
- Clear payment options

✅ **Amount Calculation**
- Subtotal displayed
- 3.3% fee added
- Total correct

✅ **Payment Processing**
- India/International redirects to PayU
- Nepal opens QR modal
- Button disables during processing

✅ **Database**
- Orders created with correct total
- Correct payment method tracked
- Status updates on webhook

✅ **User Experience**
- Clear error messages
- Fast form validation
- No crashes or freezes

---

## Deployment Readiness Checklist

- [ ] All tests pass locally
- [ ] Build compiles without errors
- [ ] PayU sandbox credentials configured
- [ ] Webhook URLs set in PayU dashboard
- [ ] Database backups created
- [ ] Error logging configured
- [ ] Success/failure pages tested
- [ ] Mobile view tested
- [ ] Accessibility checked (WCAG)
- [ ] Performance metrics acceptable
- [ ] Security audit passed
- [ ] Documentation complete

---

## Support

For issues, check:
1. `PAYMENT_FLOW_GUIDE.md` - Complete API documentation
2. `PAYU_ERROR_ANALYSIS.md` - Common PayU errors
3. `WEBHOOK_CONFIGURATION_GUIDE.md` - Webhook setup
4. Browser DevTools Console for error messages

---

**Ready to Test!** 🚀  
Start with Phase 1 (Form Validation) and work through systematically.
