# 🧪 Testing Guide - Payment System

## Live Site URLs

| Feature | URL | Status |
|---------|-----|--------|
| **Workshops** | https://swar-yoga-web-mohan-me342dibi-swar-yoga-projects.vercel.app/workshop | ✅ Ready |
| **Checkout** | https://swar-yoga-web-mohan-me342dibi-swar-yoga-projects.vercel.app/checkout | ✅ Ready |
| **Payment Success** | https://swar-yoga-web-mohan-me342dibi-swar-yoga-projects.vercel.app/payment-successful | ✅ Ready |
| **Payment Failed** | https://swar-yoga-web-mohan-me342dibi-swar-yoga-projects.vercel.app/payment-failed | ✅ Ready |
| **Refund Request** | https://swar-yoga-web-mohan-me342dibi-swar-yoga-projects.vercel.app/refund | ✅ Ready |

---

## 🧪 Testing Procedure

### Step 1: Navigate to Workshops
1. Open: https://swar-yoga-web-mohan-me342dibi-swar-yoga-projects.vercel.app/workshop
2. See list of workshops
3. Find any workshop card

### Step 2: Start Enrollment
1. Click "Enroll Now" button on any workshop
2. Should automatically redirect to `/checkout`

### Step 3: Currency Selection (Step 1)
1. You should see 10 currency options:
   - 🇮🇳 INR (India)
   - 🇺🇸 USD (United States)
   - 🇪🇺 EUR (Europe)
   - 🇬🇧 GBP (United Kingdom)
   - 🇨🇦 CAD (Canada)
   - 🇦🇺 AUD (Australia)
   - 🇯🇵 JPY (Japan)
   - 🇸🇬 SGD (Singapore)
   - 🇲🇺 MUR (Mauritius)
   - 🇳🇵 NPR (Nepal) ⭐ Special

### Step 4a: Test with INR (Regular Flow)
1. Click INR option
2. Should see order summary on right side with:
   - Workshop price in INR
   - 3.3% payment fee
   - Total amount
3. Fill payment form:
   - Name: Test User
   - Email: test@example.com
   - Phone: +91 9999999999
4. Click "Pay Now"
5. Should redirect to PayU payment gateway

### Step 4b: Test with USD (Regular Flow)
1. Click USD option
2. Verify price converts correctly:
   - If workshop was ₹1,000, should show $12
   - 3.3% fee should show
3. Fill form and click "Pay Now"

### Step 4c: Test with Nepal (NPR) - Special QR Flow
1. Click Nepal (🇳🇵) option
2. Should **automatically open QR code page**
3. You should see:
   - QR code (dummy currently)
   - "Download QR" button
   - Instructions for Nepal payment

### Step 5: Handle Payment Results

#### Success Scenario
1. Complete test payment on PayU
2. Should redirect to `/payment-successful`
3. You should see:
   - ✓ CheckCircle icon
   - Transaction ID (copyable)
   - Amount and currency
   - Next steps
   - Support contact

#### Failed Scenario
1. Decline test payment on PayU
2. Should redirect to `/payment-failed`
3. You should see:
   - ⚠️ AlertCircle icon
   - Error message
   - Troubleshooting guide (5 steps)
   - "Try Again" button
   - Support contact

### Step 6: Test Refund System
1. Navigate to: https://swar-yoga-web-mohan-me342dibi-swar-yoga-projects.vercel.app/refund
2. Fill refund form:
   - Name: Test User
   - Email: test@example.com
   - Transaction ID: (from successful payment)
   - Workshop Name: (from payment)
   - Reason: Select one
3. Click "Submit Refund Request"
4. Should see success message

---

## ✅ Validation Checklist

### Checkout Page
- [ ] All 10 currencies display with flags
- [ ] Price updates in real-time when currency changes
- [ ] 3.3% fee is calculated correctly
- [ ] Order summary shows total amount
- [ ] Form validation works (required fields)
- [ ] Nepal selection triggers QR page
- [ ] Responsive design on mobile (test with DevTools)

### PayU Integration
- [ ] Form submits successfully
- [ ] Redirects to PayU payment gateway
- [ ] Hash generation works (no errors in console)
- [ ] Callback URLs correct

### Success Page
- [ ] Displays after successful payment
- [ ] Shows transaction ID
- [ ] Copy button works
- [ ] Next steps visible
- [ ] Support email link works
- [ ] CTAs (Home, Browse More) functional

### Failed Page
- [ ] Displays after failed payment
- [ ] Shows error message
- [ ] Troubleshooting guide visible
- [ ] "Try Again" button redirects to checkout
- [ ] Support email link works
- [ ] Home button works

### Nepal QR Flow
- [ ] Selecting NPR auto-opens QR page
- [ ] QR code displays
- [ ] Download button functional
- [ ] Back button works
- [ ] Responsive on mobile

### Refund Page
- [ ] Form displays correctly
- [ ] All fields validate (required)
- [ ] Email validation works
- [ ] Submit button works
- [ ] Success message displays
- [ ] Responsive design works

---

## 📊 Currency Testing Matrix

| Currency | Test Amount | Expected Calculation | 3.3% Fee | Total |
|----------|-------------|----------------------|----------|-------|
| INR | ₹1,000 | 1,000 × 1.0 = ₹1,000 | ₹33 | ₹1,033 |
| USD | $12 | 1,000 × 0.012 = $12 | $0.40 | $12.40 |
| EUR | €11 | 1,000 × 0.011 = €11 | €0.36 | €11.36 |
| GBP | £9.50 | 1,000 × 0.0095 = £9.50 | £0.31 | £9.81 |
| CAD | C$17 | 1,000 × 0.017 = C$17 | C$0.56 | C$17.56 |
| AUD | A$18 | 1,000 × 0.018 = A$18 | A$0.59 | A$18.59 |
| JPY | ¥1,800 | 1,000 × 1.8 = ¥1,800 | ¥59.40 | ¥1,859.40 |
| SGD | S$16 | 1,000 × 0.016 = S$16 | S$0.53 | S$16.53 |
| MUR | ₨540 | 1,000 × 0.54 = ₨540 | ₨17.82 | ₨557.82 |
| NPR | ₨1,580 | 1,000 × 1.58 = ₨1,580 | ₨52.14 | ₨1,632.14 |

---

## 🐛 Troubleshooting

### Issue: Currency selector not showing
**Solution:** 
- Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Clear browser cache
- Check browser console for errors

### Issue: Price not updating when currency changes
**Solution:**
- Check if JavaScript is enabled
- Try different currency
- Refresh page

### Issue: PayU redirect not working
**Solution:**
- Check browser console for errors
- Verify merchant key/salt in .env.local
- Check if PAYU_MODE=PRODUCTION

### Issue: Nepal QR page not showing
**Solution:**
- Select NPR currency carefully
- Check if currency detection logic works
- Check browser console

### Issue: Success page showing blank transaction ID
**Solution:**
- Check PayU callback parameters
- Verify callback URL configuration
- Check browser console

### Issue: Form validation not working
**Solution:**
- Check if HTML5 form validation is enabled
- Try disabling browser extensions
- Try different browser

---

## 📝 Test Payment Card Details

Use these for PayU testing (if available):

```
Card Type: Visa Test
Card Number: 4111 1111 1111 1111
Expiry: 12/25
CVV: 123
Name: Test User
```

⚠️ **Note:** These are for testing only. Use PayU's official test credentials.

---

## 🎯 Success Criteria

✅ All checkout pages load without errors  
✅ All 10 currencies display correctly  
✅ Price calculations are accurate  
✅ PayU redirects work  
✅ Success page displays transaction details  
✅ Failed page shows troubleshooting  
✅ Nepal QR page opens automatically  
✅ Refund form submits successfully  
✅ Responsive design works on mobile  
✅ No console errors  

---

## 📞 If You Encounter Issues

1. **Check the console:** Open DevTools (F12) → Console tab
2. **Look for error messages** in the console
3. **Check network tab:** See what requests are being made
4. **Verify environment variables:** Check `.env.local` has correct PayU keys
5. **Clear cache:** Hard refresh the page

---

## 🚀 When Testing is Complete

1. Document all successful tests
2. Note any issues found
3. Share feedback for improvements
4. Proceed to live payment processing

---

**Ready to test?** Start with Step 1 above! 🎉

