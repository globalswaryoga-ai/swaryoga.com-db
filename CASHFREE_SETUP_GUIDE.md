# Cashfree Payment Integration Setup Guide

## ✅ What's Been Completed

The following components and configurations have been created/updated to support Cashfree payments:

### Backend (Already Implemented)
1. **Cashfree Utilities** - `lib/payments/cashfree.ts`
   - Order creation and verification functions
   - API configuration and headers
   - Environment handling (sandbox/production)

2. **Cashfree API Routes** - `app/api/payments/cashfree/`
   - **Initiate** (`/initiate/route.ts`) - Creates orders and payment sessions
   - **Return** (`/return/route.ts`) - Handles post-payment verification
   - **Webhook** (`/webhook/route.ts`) - Processes Cashfree webhook notifications

3. **Database Schema** - `lib/db.ts`
   - Cashfree-specific fields in Order model:
     - `cashfreeOrderId`
     - `cashfreePaymentSessionId`
     - `cashfreePaymentId`
     - `cashfreeOrderStatus`

### Frontend (Newly Created/Updated)
1. **CashfreePaymentButton Component** - `components/CashfreePaymentButton.tsx`
   - Loads Cashfree JS SDK v3 dynamically
   - Initiates payment through API
   - Handles checkout flow
   - Error handling and loading states

2. **Updated PurchaseModal** - `components/PurchaseModal.tsx`
   - Added `cashfree` as payment method option
   - Removed `payu` payment method
   - Updated UI labels to reflect Cashfree

3. **Updated WorkshopPaymentButton** - `components/WorkshopPaymentButton.tsx`
   - Replaced PayU integration with Cashfree
   - Added authentication-based payment flow
   - Accepts user details for secure checkout

## ⚙️ Configuration Required

### 1. Update `.env.local` with Cashfree Credentials

The following placeholders have been added to `.env.local`. Replace them with your actual Cashfree credentials:

```dotenv
CASHFREE_ENV=sandbox                          # Change to 'production' for live
CASHFREE_CLIENT_ID=YOUR_CASHFREE_CLIENT_ID_HERE
CASHFREE_CLIENT_SECRET=YOUR_CASHFREE_CLIENT_SECRET_HERE
CASHFREE_API_VERSION=2023-08-01               # Confirm with Cashfree docs
```

**How to get these credentials:**
1. Go to [Cashfree Dashboard](https://dashboard.cashfree.com)
2. Sign in to your account
3. Navigate to **Settings > API Keys**
4. Copy your **Client ID** and **Client Secret**
5. Confirm your API version from Cashfree documentation

### 2. Set Webhook URL in Cashfree Dashboard

1. Go to [Cashfree Dashboard](https://dashboard.cashfree.com)
2. Navigate to **Settings > Webhook Configuration**
3. Add your webhook URL:
   - **Development**: `http://localhost:3000/api/payments/cashfree/webhook`
   - **Production**: `https://yourdomain.com/api/payments/cashfree/webhook`
4. Select webhook events (at minimum: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`)

### 3. (Optional) Webhook Signature Verification

The current webhook handler is permissive. For production, add signature verification:

Edit `app/api/payments/cashfree/webhook/route.ts` and add signature validation based on Cashfree's documentation.

## 🔄 Payment Flow

### User Initiates Payment
1. User clicks "Pay with Cashfree" button
2. CashfreePaymentButton loads Cashfree SDK
3. Frontend calls `/api/payments/cashfree/initiate`

### Backend Creates Order
1. Verifies user JWT token
2. Creates Order in MongoDB with `paymentStatus: 'pending'`
3. Calls Cashfree API to create order
4. Returns `paymentSessionId` to frontend

### Checkout Process
1. Cashfree JS SDK initializes with `paymentSessionId`
2. User sees Cashfree's hosted checkout
3. User completes payment (card, UPI, wallet, etc.)
4. Cashfree redirects to return handler

### Return Handler
1. Receives redirect from Cashfree with `order_id`
2. Verifies payment status via Cashfree API
3. Updates Order in MongoDB with final status
4. Redirects to `/payment-successful` or `/payment-failed`

### Webhook Notifications
1. Cashfree sends webhook for payment events
2. Handler extracts order ID and verifies with Cashfree API
3. Updates Order document with latest status
4. Handles retries gracefully

## 🧪 Testing

### Local Testing with Sandbox

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test with Cashfree Test Cards:**
   - Use test credentials from [Cashfree Docs](https://docs.cashfree.com/docs/payments/test-credentials)
   - Example card: `4111111111111111` with any future expiry

3. **Check Order Status:**
   - Visit MongoDB to verify Order documents
   - Check `cashfreeOrderStatus` field

### Production Checklist

Before going live:
- [ ] Replace `CASHFREE_ENV` with `production`
- [ ] Update `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET` with live credentials
- [ ] Register webhook URL in Cashfree Dashboard
- [ ] Test payment flow end-to-end
- [ ] Enable webhook signature verification
- [ ] Set up monitoring for failed payments

## 📋 Component Usage Examples

### In PurchaseModal (already done)
```tsx
<PaymentMethod>
  - Stripe (Card)
  - Cashfree (UPI/Card)
</PaymentMethod>
```

### In WorkshopPaymentButton (already done)
```tsx
<CashfreePaymentButton
  amount={workshop.basePrice}
  productInfo={`${workshop.name} - ${mode}`}
  firstName={userFirstName}
  lastName={userLastName}
  email={userEmail}
  phone={userPhone}
  city={userCity}
  token={authToken}
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

### Custom Usage in Other Components
```tsx
import CashfreePaymentButton from '@/components/CashfreePaymentButton';

<CashfreePaymentButton
  amount={99}
  productInfo="Course: Advanced Yoga"
  firstName="John"
  lastName="Doe"
  email="john@example.com"
  phone="+919876543210"
  city="Bangalore"
  currency="INR"
  token={userToken}
  onSuccess={(response) => console.log('Payment successful:', response)}
  onError={(error) => console.log('Payment failed:', error)}
/>
```

## 🐛 Troubleshooting

### "Cashfree SDK not loaded"
- Check browser console for script loading errors
- Verify CDN is accessible: `https://sdk.cashfree.com/js/v3/cashfree.js`
- Try refreshing the page

### "Invalid payment session"
- Verify `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET` in `.env.local`
- Check MongoDB connection is working
- Ensure Order is being created before payment initiation

### Webhook not triggering
- Verify webhook URL in Cashfree Dashboard
- Check MongoDB logs for Order updates
- Test webhook delivery in Cashfree Dashboard test interface

### Order not updating after payment
- Check `app/api/payments/cashfree/webhook/route.ts` is deployed
- Verify webhook signature (if implemented)
- Check MongoDB `Order` collection for the order

## 📚 Additional Resources

- [Cashfree Payment Gateway Docs](https://docs.cashfree.com/docs/payments)
- [Cashfree JS SDK Documentation](https://docs.cashfree.com/docs/payments/integrate-web)
- [Test Credentials](https://docs.cashfree.com/docs/payments/test-credentials)
- [Webhook Documentation](https://docs.cashfree.com/docs/payments/webhooks)

## 🔐 Security Notes

1. **Never expose Client Secret** - Keep it only in `.env.local` and `.env` files
2. **JWT Verification** - All payment endpoints verify user token
3. **HTTPS in Production** - Cashfree requires HTTPS for webhook URLs
4. **Idempotent Updates** - Webhook handler safely handles duplicate notifications
5. **Server-Side Verification** - Always verify payment status server-side, not just client-side

## ❓ Next Steps

1. **Add Cashfree credentials** to `.env.local`
2. **Register webhook URL** in Cashfree Dashboard
3. **Test the flow** locally with sandbox credentials
4. **Monitor production** payments and handle edge cases
5. **Implement webhook signature verification** for security
