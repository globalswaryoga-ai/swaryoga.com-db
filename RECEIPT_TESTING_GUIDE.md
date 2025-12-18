# Receipt System - Quick Testing Guide

## 🚀 Quick Start

### Build the Project
```bash
npm run build
```

### Start Development Server
```bash
npm run dev
```

### Access the App
Open `http://localhost:3000` in your browser

---

## 📝 Testing the Receipt System

### Test Scenario: Complete Payment & Download Receipt

#### Step 1: Add Item to Cart
1. Go to homepage or workshops page
2. Click on any workshop
3. Click "Add to Cart" or similar button
4. Verify item appears in cart

#### Step 2: Proceed to Checkout
1. Navigate to `/checkout`
2. Fill in personal details:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Phone: +91-9999999999
   - City: Delhi
   - Address: 123 Main St
   - State: Delhi
   - ZIP: 110001
3. Select Country: India
4. Select Payment Method: India PayU

#### Step 3: Complete PayU Payment
1. Click "Pay Now" or similar button
2. You'll be redirected to PayU payment gateway
3. Use PayU test credentials (if available)
4. Click "Pay"

#### Step 4: See Thank You Page
1. After payment, should see `/thankyou?orderId={orderId}`
2. Shows:
   - ✅ Order ID
   - ✅ Payment confirmation
   - ✅ Total amount
   - ✅ Contact support link

#### Step 5: View Orders in Profile
1. Click "Profile" or navigate to `/profile`
2. Login if not already logged in
3. Click "Orders" tab
4. Should see your recent order with:
   - Order number
   - Order date
   - Items
   - Total amount
   - Payment status

#### Step 6: Download Receipt
1. Find your order in the Orders tab
2. Look for "Download Receipt" button
3. Click button (shows "Downloading..." briefly)
4. PDF should download as: `swar-yoga-receipt-{orderId}.pdf`

#### Step 7: Verify Receipt PDF
1. Open downloaded PDF
2. Verify it contains:
   - ✅ SWAR YOGA header
   - ✅ Payment Receipt title
   - ✅ Receipt number (Order ID)
   - ✅ Order date
   - ✅ Payment status (Completed)
   - ✅ Customer name, email, phone, city
   - ✅ Workshop name and details
   - ✅ Item quantity
   - ✅ Subtotal amount
   - ✅ Platform fee (3.3%)
   - ✅ Total amount
   - ✅ Currency
   - ✅ Payment method
   - ✅ Transaction ID

---

## 🧪 Testing Scenarios

### Scenario 1: Multiple Downloads
- Download receipt for same order multiple times
- ✅ Should work each time
- ✅ Button should disable during download
- ✅ Should enable after download completes

### Scenario 2: Multiple Orders
- Create 2-3 different orders with different products
- Navigate to profile
- ✅ All orders should appear in Orders tab
- ✅ Each should have its own Download Receipt button
- Download receipts for all orders
- ✅ Each PDF should be different

### Scenario 3: Mobile Download
- Open profile on mobile device
- ✅ Download button should be visible
- Click download
- ✅ PDF should download to device
- ✅ Should be openable in default PDF viewer

### Scenario 4: Error Handling
- Try to access `/api/orders/invalid-id/receipt`
- ✅ Should return 400 error
- Try to access `/api/orders/{non-existent-id}/receipt`
- ✅ Should return 404 error
- ✅ Profile page should handle gracefully

---

## 🔍 Verification Points

### API Endpoints

**1. Fetch Orders**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/orders
```
✅ Should return array of orders

**2. Fetch Single Order**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/orders/{orderId}
```
✅ Should return order details

**3. Fetch Receipt Data**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/orders/{orderId}/receipt
```
✅ Should return receipt JSON

---

## 📊 What Gets Tested

### Database Verification
- ✅ Order created after payment
- ✅ All details stored correctly
- ✅ Status updated to "paid"
- ✅ Transaction ID saved

### Frontend Verification
- ✅ Thank you page displays
- ✅ Profile shows order
- ✅ Download button visible
- ✅ PDF generation works

### PDF Verification
- ✅ All fields populated
- ✅ Calculations correct
- ✅ Formatting professional
- ✅ File naming correct

---

## 🐛 Troubleshooting

### Issue: "Download Receipt" button not visible
**Solution:**
1. Refresh page
2. Clear browser cache
3. Check if order status is "completed"

### Issue: PDF download fails
**Solution:**
1. Check browser console for errors
2. Verify internet connection
3. Try different browser
4. Check if order data is complete

### Issue: PDF is empty
**Solution:**
1. Verify order has items
2. Check if receipt API returns data
3. Try downloading again

### Issue: "Invalid order ID" error
**Solution:**
1. Use valid order ID from profile
2. Make sure you're authenticated
3. Check if order belongs to current user

---

## ✅ Sign-Off Checklist

After testing, verify:

- [ ] Can add item to cart
- [ ] Can proceed to checkout
- [ ] Can complete PayU payment
- [ ] Thank you page displays correctly
- [ ] Order appears in profile
- [ ] Download button is visible
- [ ] Receipt PDF downloads
- [ ] PDF contains all information
- [ ] PDF is professionally formatted
- [ ] Multiple downloads work
- [ ] Works on mobile
- [ ] Error messages are user-friendly

---

## 📞 Support

If you encounter issues:
1. Check browser console (F12)
2. Check server logs
3. Verify database connection
4. Ensure JWT token is valid
5. Check API endpoint responses

---

## 🎉 Ready for Production!

Once all tests pass, the receipt system is ready for:
- ✅ User acceptance testing
- ✅ Production deployment
- ✅ User rollout

