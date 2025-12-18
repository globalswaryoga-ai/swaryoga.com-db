# PayU Payment Flow Testing - Terminal Guide

**Server Status:** ✅ Running on http://localhost:3002

---

## Quick Testing Steps

### Step 1: Login
1. Go to: http://localhost:3002/signin
2. Use any test email/password or create new account
3. After login, you'll be redirected to dashboard

### Step 2: Add Item to Cart
1. Go to: http://localhost:3002/workshops
2. Find any workshop and click "Register Now"
3. Add to cart
4. Go to: http://localhost:3002/cart

### Step 3: Proceed to Checkout
1. Click "Checkout" button
2. Should redirect to: http://localhost:3002/checkout

### Step 4: Fill Form
Fill the simple billing form:
- First Name: Test
- Last Name: User
- Email: test@example.com
- Phone: 9876543210
- City: Delhi

### Step 5: Click Payment Button
Choose one:

**For India Payment:**
- Click green button: "🇮🇳 Pay with India PayU"
- Should show processing
- Check browser Network tab
- Should see POST to /api/payments/payu/initiate

**For Nepal QR:**
- Click purple button: "🇳🇵 Pay with Nepal QR"
- Modal should open instantly showing QR code

---

## What to Check in Browser DevTools

### Network Tab
```
1. Open: F12 (or Cmd+Option+I on Mac)
2. Go to "Network" tab
3. Click payment button
4. Look for POST request to:
   /api/payments/payu/initiate

Check:
- Status: Should be 200 (success)
- Response: Should have { success, orderId, paymentUrl, params }
```

### Console Tab
```
1. Open: F12
2. Go to "Console" tab
3. Click payment button
4. Look for any red errors
5. Errors would show why PayU isn't opening
```

### Expected Behavior

**India/International PayU:**
1. Click button
2. Form submits to /api/payments/payu/initiate
3. Get response with PayU params
4. Hidden form auto-submits to PayU
5. Page redirects to: https://secure.payu.in/_payment (or PayU test URL)

**Nepal QR:**
1. Click button
2. Modal opens showing QR code
3. Shows amount with 3.3% fee
4. Can download QR
5. Can close modal

---

## Debugging: If PayU Doesn't Open

### Check 1: API Response
```
In Network tab → Click /api/payments/payu/initiate request
→ Go to "Response" tab
→ Look for:
{
  "success": true,
  "orderId": "...",
  "paymentUrl": "https://secure.payu.in/_payment",
  "params": { ... }
}

If missing → API error (check Console for details)
```

### Check 2: Console Errors
```
In Console tab, look for:
- 401 Unauthorized → Session expired, need to login again
- Network error → Backend connection issue
- "fetch failed" → API endpoint not responding
- TypeError → Code error in checkout
```

### Check 3: Form Validation
```
If button doesn't respond:
- Are all fields filled? (firstName, email, phone, city)
- Is email valid? (has @)
- Is phone 10+ digits?
- Error message should show what's wrong
```

### Check 4: PayU Credentials
```
Check .env.local has:
PAYU_MERCHANT_KEY=xxxxx
PAYU_MERCHANT_SALT=xxxxx
PAYU_MODE=TEST

If missing:
1. Add to .env.local
2. Restart server: npm run dev
```

---

## Manual Test Commands

### Test API Directly (Terminal)

```bash
# Get your token first
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Now test payment API
curl -X POST http://localhost:3002/api/payments/payu/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "india",
    "amount": 500,
    "productInfo": "Test",
    "firstName": "Test",
    "email": "test@example.com",
    "phone": "9876543210",
    "city": "Delhi"
  }' | jq .
```

---

## PayU Test Mode URLs

**PayU Test (Sandbox):**
- URL: https://test.payu.in/_payment
- Mode: PAYU_MODE=TEST in .env.local

**PayU Production:**
- URL: https://secure.payu.in/_payment
- Mode: PAYU_MODE=PRODUCTION in .env.local

Current setting in checkout should use test URL.

---

## Common Issues & Fixes

### Issue: "Cart is empty" error
**Fix:** Add items before going to checkout

### Issue: "Authentication required" error
**Fix:** Login first at /signin

### Issue: Form won't validate
**Fix:** Make sure all 5 fields are filled correctly:
- Email must contain @
- Phone must be 10+ digits
- All fields required

### Issue: API returns 500 error
**Fix:** Check MongoDB connection
- Open .env.local
- Verify MONGODB_URI is correct
- Check MongoDB is running

### Issue: "PayU credentials not configured"
**Fix:** Update .env.local:
```
PAYU_MERCHANT_KEY=your_key
PAYU_MERCHANT_SALT=your_salt
PAYU_MODE=TEST
```
Then restart: npm run dev

---

## Next Steps

1. **Test Form Validation** (no API calls)
   - Try submitting empty form
   - Try invalid email
   - Try invalid phone

2. **Test India Payment**
   - Add INR item
   - Fill form correctly
   - Click India button
   - Check Network tab for API response
   - Verify PayU form submission

3. **Test Nepal QR**
   - Add NPR item
   - Fill form
   - Click Nepal button
   - Modal should open immediately

4. **Check Console**
   - Look for any red errors
   - Red errors explain why things aren't working

---

**Server Running:** http://localhost:3002 ✅  
**Ready to Test:** Yes ✅  
**Start Testing:** Follow "Quick Testing Steps" above
