# 🧪 CASHFREE PAYMENT PAGE TESTING GUIDE

## How to Check if Cashfree Payment Page Opens

### **Step 1: Open Browser Developer Tools**
1. Go to http://localhost:3000
2. Press `F12` or `Cmd + Option + I` (Mac)
3. Go to **Console tab**

---

## **Step 2: Test the Payment Flow**

### **Option A: Using the Cart → Checkout Flow**

```
1. Go to http://localhost:3000/workshops
2. Click "Register Now" on any workshop
3. Fill the registration form
4. Click "REGISTER & ADD TO CART"
5. You'll be redirected to /cart
6. Click "💳 PAY NOW" button
7. You'll go to /checkout page
```

### **Option B: Direct Cart Test**
```
1. Go to http://localhost:3000/cart
2. If cart is empty, manually add items to localStorage first:

Open Console and run this code:
--------------------------------------------
const testCart = [
  {
    id: '1',
    name: 'Yoga Basics',
    price: 4999,
    quantity: 1,
    currency: 'INR',
    instructor: 'Yogi Anand',
    workshopSlug: 'yoga-basics'
  }
];
localStorage.setItem('cart', JSON.stringify(testCart));
location.reload();
--------------------------------------------

3. Now the cart should show the item
4. Click "Proceed to Checkout"
```

---

## **Step 3: At the Checkout Page (/checkout)**

1. **Fill the form with:**
   - First Name: John
   - Email: test@example.com
   - Phone: 9876543210
   - City: Bangalore

2. **Look in Console for:**
   ```
   ✓ "Form validated"
   ✓ "Sending payment request to /api/payments/cashfree/initiate"
   ```

3. **Click "Confirm Payment" Button**

---

## **Step 4: Check if Cashfree Opens**

### **Watch for these Console Messages:**

```
[1] "Initiating Cashfree payment..."
    ↓
[2] "Payment initiation response received"
    ↓
[3] "Payment session ID received: [long_string_here]"
    ↓
[4] "Cashfree checkout opened successfully"
    ↓
[5] A modal or popup should appear with "🔒 SECURE PAYMENT - Cashfree"
```

---

## **Step 5: Visual Checks**

### **You Should See:**

1. **On Success - A popup/modal showing:**
   - 🔒 Cashfree branding
   - Amount to pay (e.g., ₹5,899)
   - Payment methods:
     - Credit/Debit Card
     - UPI (Google Pay, PhonePe)
     - Net Banking
     - Wallet
   - Order details

2. **Payment Gateway Options:**
   - Select payment method
   - Enter payment details
   - Click "Authorize" or similar button

---

## **Step 6: Network Tab Monitoring**

To see all API calls:

1. Open DevTools → **Network** tab
2. Filter for: `cashfree` or `payments`
3. When you click "Confirm Payment", you should see:

```
POST /api/payments/cashfree/initiate
  ↓ (Response)
  {
    "success": true,
    "paymentSessionId": "xxxxxxxxxxxx",
    "amount": 5899,
    "currency": "INR"
  }
```

---

## **Step 7: Testing Different Scenarios**

### **Scenario A: Everything Works ✅**
```
Expected:
1. Form submits
2. API returns paymentSessionId
3. Cashfree popup opens
4. User can see payment methods
5. Can proceed with payment
```

### **Scenario B: Form Validation Fails ❌**
```
Check console for errors like:
- "Email is required"
- "Phone is invalid"
- "City is required"

Fix: Fill all fields properly
```

### **Scenario C: API Error ❌**
```
Console will show error like:
- "Failed to initiate payment"
- "401 Unauthorized"
- "Missing authentication token"

Fix: Make sure you're logged in!
```

### **Scenario D: Cashfree Not Opening ❌**
```
Check console for:
- "Cashfree object not found"
- "SDK not loaded"
- "Invalid session ID"

Fix: Check if Cashfree SDK is loaded (see Step 9)
```

---

## **Step 8: Check Cashfree SDK Loading**

Run this in Console:

```javascript
// Check if Cashfree SDK is loaded
if (window.Cashfree) {
  console.log('✅ Cashfree SDK is loaded!');
  console.log(window.Cashfree);
} else {
  console.log('❌ Cashfree SDK NOT loaded!');
}

// Check environment
console.log('Current URL:', window.location.href);
console.log('localStorage token:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
```

---

## **Step 9: Verify Cashfree Configuration**

Check `.env.production` has these keys:

```bash
CASHFREE_CLIENT_ID=xxxxxxxxxxxx
CASHFREE_CLIENT_SECRET=xxxxxxxxxxxx
CASHFREE_API_VERSION=2023-08-01
CASHFREE_ENV=production
```

**How to check in app:**

In Console, run:
```javascript
// Fetch environment config
fetch('/api/payments/cashfree/config')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error('Config error:', e));
```

---

## **Step 10: Full Payment Flow Test**

### **Complete Test Sequence:**

```
1. Open http://localhost:3000/workshops
   Console: Should be clear

2. Click "Register Now" on a workshop
   Console: Modal should open

3. Fill form + Click "REGISTER & ADD TO CART"
   Console: Should show no errors
   Expected redirect: /cart

4. At /cart, click "Proceed to Checkout"
   Console: No errors
   Check: Logged in? If not → redirected to /signin

5. At /checkout, fill form
   Console: No validation errors

6. Click "Confirm Payment"
   Console watch for:
   - "Initiating Cashfree payment..."
   - "paymentSessionId received"
   - "Cashfree SDK initialized"
   
   Expected: Payment modal appears
```

---

## **Step 11: Common Issues & Fixes**

| Issue | Cause | Fix |
|-------|-------|-----|
| "Not authenticated" | Not logged in | Click "Sign In" first |
| "Cart is empty" | No items in cart | Add workshop to cart |
| Cashfree not opening | SDK not loaded | Check network tab for SDK script |
| "Invalid amount" | Form validation | Fill all fields with valid data |
| 404 error on API | Endpoint missing | Check `/app/api/payments/cashfree/initiate/route.ts` exists |
| "CORS error" | Localhost issue | Try refreshing page or restart server |

---

## **Step 12: Success Indicators**

### **You'll Know it's Working When:**

```
✅ Form validates without errors
✅ No 404/500 errors in Network tab
✅ /api/payments/cashfree/initiate returns 200 OK
✅ Response includes "paymentSessionId"
✅ Cashfree modal/popup appears
✅ Can select payment method
✅ Can proceed with payment (test mode)
✅ After payment → redirects to /payment-successful or /payment-failed
✅ Order appears in database
✅ Payment history shows in user profile
```

---

## **Step 13: Console Commands for Testing**

### **Check Payment State:**
```javascript
// See if there's a pending order
localStorage.getItem('pendingOrder');

// Check cart contents
JSON.parse(localStorage.getItem('cart') || '[]');

// Check user auth
JSON.parse(localStorage.getItem('user') || '{}');

// Check payment token
localStorage.getItem('token') ? 'Logged In' : 'Not Logged In';
```

### **Trigger Payment Manually:**
```javascript
// Simulate payment initiation
const form = new FormData();
form.append('firstName', 'Test');
form.append('email', 'test@example.com');
form.append('phone', '9876543210');
form.append('city', 'Bangalore');

fetch('/api/payments/cashfree/initiate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 5899,
    currency: 'INR',
    firstName: 'Test',
    email: 'test@example.com',
    phone: '9876543210',
    city: 'Bangalore'
  })
})
.then(r => r.json())
.then(d => {
  console.log('Response:', d);
  if (d.paymentSessionId) {
    console.log('✅ Payment session created!');
    console.log('Session ID:', d.paymentSessionId);
  }
})
.catch(e => console.error('Error:', e));
```

---

## **Step 14: Testing Payment Scenarios**

### **Test Mode (Sandbox):**

If using Cashfree sandbox:
- Test card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- OTP: `123456`

### **Production Mode:**

Use real payment methods or Cashfree's test payment links.

---

## **Step 15: Debug Mode Checklist**

Before testing, enable debug logging:

```tsx
// In app/checkout/page.tsx, find handlePayment function and add:

const handlePayment = async () => {
  console.log('🔍 DEBUG: Starting payment...');
  console.log('Form Data:', formData);
  console.log('Cart Items:', cartItems);
  console.log('Selected Currency:', selectedCurrency);
  
  // ... rest of code
  
  console.log('📤 Sending to API:', payload);
  
  const response = await fetch('/api/payments/cashfree/initiate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  console.log('📥 API Response Status:', response.status);
  const data = await response.json();
  console.log('📥 API Response Data:', data);
  
  // ... rest of code
};
```

---

## **Quick Reference - What to Check**

```
Browser Console:
  ✅ No red errors
  ✅ "Cashfree initialized" message
  ✅ "Payment session created" message
  
Network Tab:
  ✅ POST /api/payments/cashfree/initiate → 200 OK
  ✅ Response contains "paymentSessionId"
  
Visual:
  ✅ Cashfree payment modal appears
  ✅ Can select payment method
  ✅ Can proceed with payment
  
Database (Optional):
  ✅ Order created with status "pending"
  ✅ Payment method set to "cashfree"
```

---

## **Success Flow Map**

```
User clicks "Confirm Payment"
    ↓
Form validation (Console: "Form validated")
    ↓
API POST /api/payments/cashfree/initiate
    ↓ (Network: 200 OK)
Cashfree paymentSessionId received
    ↓ (Console: "Session ID: ...")
Cashfree SDK initialized
    ↓ (Console: "Cashfree SDK ready")
window.Cashfree.checkout() called
    ↓
🔒 SECURE PAYMENT Modal Appears ✅
    ↓
User selects payment method
    ↓
User enters payment details
    ↓
Payment processed (Cashfree webhook)
    ↓
Redirected to /payment-successful or /payment-failed
    ↓
✅ COMPLETE!
```

---

## 📞 If Cashfree Still Doesn't Open

### Check These Files Exist:

1. ✅ `/app/api/payments/cashfree/initiate/route.ts` - Payment init endpoint
2. ✅ `/lib/payments/cashfree.ts` - Cashfree API integration
3. ✅ `/types/cashfree.d.ts` - Cashfree TypeScript definitions
4. ✅ `/app/payment-successful/page.tsx` - Success page
5. ✅ `/app/payment-failed/page.tsx` - Failure page

### Check These Environment Variables:

```bash
# In .env.production
CASHFREE_CLIENT_ID=...
CASHFREE_CLIENT_SECRET=...
NEXT_PUBLIC_CASHFREE_SDK_URL=https://sdk.cashfree.com/js/v3/cashfree.js
```

### Check Script is Loading:

```html
<!-- Should see this in Network → Documents -->
https://sdk.cashfree.com/js/v3/cashfree.js → 200 OK
```

---

## 🎯 Final Testing Command

Copy this into Console and run it:

```javascript
console.log('%c🧪 CASHFREE PAYMENT TEST STARTING', 'color: blue; font-size: 16px; font-weight: bold;');

console.log('Environment:');
console.log('  Current URL:', window.location.href);
console.log('  Logged In:', !!localStorage.getItem('token'));
console.log('  Cart Items:', JSON.parse(localStorage.getItem('cart') || '[]').length);

console.log('\nSDK Check:');
console.log('  Cashfree SDK:', window.Cashfree ? '✅ LOADED' : '❌ NOT LOADED');

console.log('\nReady to test! Fill the checkout form and click "Confirm Payment"');
console.log('%c📍 Watch this console for messages from the payment flow', 'color: green; font-size: 12px;');
```

---

**That's everything you need to test if Cashfree payment page opens!** ✅
