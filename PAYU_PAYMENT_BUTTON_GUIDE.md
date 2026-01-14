# PayU Payment Button Implementation Guide

## 📋 Overview

This guide explains how to implement the PayU payment button form with dynamic URLs for workshop payments. The system supports:

- **Dynamic Workshop Details**: Workshop name and amount change based on selection
- **Three Dynamic URLs**: Success, Failure, and Cancel URLs generated with workshop parameters
- **Multi-Currency Support**: INR, USD, NPR
- **Secure Hash Generation**: SHA512 hash for PayU security

---

## 🏗️ Architecture

### Components

1. **`PayUPaymentButton.tsx`** - React component for payment button
2. **`payuButtonHelper.ts`** - Helper functions for URL generation and validation
3. **`/api/payments/payu/initiate`** - Backend endpoint for hash generation

### URL Flow

```
Workshop Selection (Amount changes)
           ↓
PayU Payment Button clicked
           ↓
API Call: /api/payments/payu/initiate
           ↓
Generate 3 Dynamic URLs:
  - Success: /payment-successful?workshop=slug&name=...&amount=...&currency=...
  - Failure: /payment-failed?workshop=slug&name=...&amount=...&currency=...
  - Cancel:  /payment-cancelled?workshop=slug&name=...&amount=...&currency=...
           ↓
Generate SHA512 Hash for security
           ↓
Submit PayU Form
           ↓
Redirect to PayU Gateway
           ↓
User Payment
           ↓
PayU Callback → Success/Failure/Cancel page
```

---

## 💻 Usage

### Basic Implementation

```tsx
import PayUPaymentButton from '@/components/PayUPaymentButton';

export default function WorkshopCheckout() {
  const [selectedWorkshop, setSelectedWorkshop] = useState({
    slug: 'swar-yoga-level-1',
    name: 'Swar Yoga Level-1 Workshop',
    amount: 3300,
    currency: 'INR',
  });

  return (
    <div className="space-y-6">
      <h2>Checkout</h2>

      {/* Workshop Selection Dropdown */}
      <select
        value={selectedWorkshop.slug}
        onChange={(e) => {
          const workshop = workshopList.find(w => w.slug === e.target.value);
          if (workshop) setSelectedWorkshop(workshop);
        }}
        className="w-full border rounded px-4 py-2"
      >
        {workshopList.map(w => (
          <option key={w.slug} value={w.slug}>
            {w.name} - {w.amount} {w.currency}
          </option>
        ))}
      </select>

      {/* Payment Button - Amount Changes with Workshop Selection */}
      <PayUPaymentButton
        workshopSlug={selectedWorkshop.slug}
        workshopName={selectedWorkshop.name}
        amount={selectedWorkshop.amount}
        currency={selectedWorkshop.currency}
        mode="online"
        language="english"
        buttonLabel="Proceed to Payment"
        onError={(error) => console.error('Payment error:', error)}
        onSuccess={() => console.log('Payment initiated')}
      />
    </div>
  );
}
```

### Props Reference

```typescript
interface PayUPaymentButtonProps {
  // Required
  workshopSlug: string;          // Workshop slug (e.g., 'swar-yoga-level-1')
  workshopName: string;          // Workshop name (e.g., 'Swar Yoga Level-1 Workshop')
  amount: number;                // Payment amount in selected currency
  currency: string;              // 'INR' | 'USD' | 'NPR'

  // Optional
  mode?: string;                 // 'online' | 'offline' | 'residential' | 'recorded'
  language?: string;             // 'english' | 'hindi' | 'marathi' | 'nepali'
  scheduleId?: string;           // Schedule identifier
  buttonLabel?: string;          // Button text (default: 'Pay Now')
  className?: string;            // Additional CSS classes
  
  // Callbacks
  onError?: (error: string) => void;     // Called on error
  onSuccess?: () => void;                // Called after payment initiated
  disabled?: boolean;            // Disable button
}
```

---

## 🔑 How It Works

### 1. **Dynamic URL Generation**

The `generatePayUButtonUrls()` function creates three URLs dynamically:

```typescript
const urls = generatePayUButtonUrls({
  workshopSlug: 'swar-yoga-level-1',
  workshopName: 'Swar Yoga Level-1 Workshop',
  amount: 3300,
  currency: 'INR',
  mode: 'online',
  language: 'hindi',
  scheduleId: 'o1'
});

// Results in:
urls.successUrl  = 'https://example.com/payment-successful?workshop=swar-yoga-level-1&name=Swar%20Yoga%20Level-1%20Workshop&amount=3300&currency=INR&mode=online&language=hindi&scheduleId=o1'
urls.failureUrl  = 'https://example.com/payment-failed?workshop=swar-yoga-level-1&name=...'
urls.cancelUrl   = 'https://example.com/payment-cancelled?workshop=swar-yoga-level-1&name=...'
```

### 2. **API Endpoint Call**

Sends data to `/api/payments/payu/initiate`:

```typescript
const response = await fetch('/api/payments/payu/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    amount: 3300,
    productInfo: 'Swar Yoga Level-1 Workshop (INR)',
    firstName: 'Customer',
    email: 'payment@example.com',
    phone: '9999999999',
    city: 'India',
    items: [{
      name: 'Swar Yoga Level-1 Workshop',
      price: 3300,
      quantity: 1,
      workshopSlug: 'swar-yoga-level-1',
      mode: 'online',
      language: 'hindi',
    }],
    successUrl: 'https://example.com/payment-successful?...',
    failureUrl: 'https://example.com/payment-failed?...',
    cancelUrl: 'https://example.com/payment-cancelled?...',
  }),
});
```

### 3. **Hash Generation**

Backend generates SHA512 hash using PayU formula:
```
hash = SHA512(key|txnid|amount|productinfo|firstname|email|||||||||||||salt)
```

### 4. **Form Submission**

Hidden form submitted to PayU:

```html
<form method="POST" action="https://secure.payu.in/_payment">
  <input name="key" value="MERCHANT_KEY" />
  <input name="txnid" value="TXN1704067200xyz" />
  <input name="amount" value="3300.00" />
  <input name="productinfo" value="Swar Yoga Level-1 Workshop (INR)" />
  <input name="firstname" value="Customer" />
  <input name="email" value="payment@example.com" />
  <input name="phone" value="9999999999" />
  <input name="surl" value="https://example.com/payment-successful?workshop=..." />
  <input name="furl" value="https://example.com/payment-failed?workshop=..." />
  <input name="curl" value="https://example.com/payment-cancelled?workshop=..." />
  <input name="hash" value="SHA512_HASH_HERE" />
  <input name="service_provider" value="payu_paisa" />
</form>
```

---

## 🎯 Three URLs Explained

### 1. **Success URL** (surl)
Redirected when payment is **successful**
```
/payment-successful?workshop=swar-yoga-level-1&name=Swar%20Yoga&amount=3300&currency=INR
```
**Use this page to:**
- Show success message
- Display order confirmation
- Trigger enrollment
- Send confirmation email
- Update database

### 2. **Failure URL** (furl)
Redirected when payment **fails** (insufficient funds, card declined, etc.)
```
/payment-failed?workshop=swar-yoga-level-1&name=Swar%20Yoga&amount=3300&currency=INR
```
**Use this page to:**
- Show error message
- Display failure reason
- Offer retry option
- Show alternative payment methods
- Log failure for support

### 3. **Cancel URL** (curl)
Redirected when user **cancels** payment on PayU page
```
/payment-cancelled?workshop=swar-yoga-level-1&name=Swar%20Yoga&amount=3300&currency=INR
```
**Use this page to:**
- Show cancellation message
- Offer to continue shopping
- Suggest contact support
- Log cancellation

---

## 📝 Example: Complete Implementation

```tsx
'use client';

import { useState, useEffect } from 'react';
import PayUPaymentButton from '@/components/PayUPaymentButton';
import { workshopCatalog } from '@/lib/workshopsData';

interface Workshop {
  slug: string;
  name: string;
  basePrice: number;
}

const WORKSHOPS: Record<string, Workshop> = {
  'swar-yoga-level-1': {
    slug: 'swar-yoga-level-1',
    name: 'Swar Yoga Level-1 Workshop',
    basePrice: 3300,
  },
  'yogasana-sadhana': {
    slug: 'yogasana-sadhana',
    name: 'Yogasana Sadhana',
    basePrice: 330,
  },
  'breathing-basics': {
    slug: 'breathing-basics',
    name: 'Breathing Basics Workshop',
    basePrice: 1500,
  },
};

export default function CheckoutPage() {
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop>(WORKSHOPS['swar-yoga-level-1']);
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD' | 'NPR'>('INR');
  const [selectedMode, setSelectedMode] = useState<string>('online');
  const [isLoading, setIsLoading] = useState(false);

  const getConvertedAmount = (baseAmount: number): number => {
    const rates: Record<string, number> = {
      INR: 1,
      USD: 0.012,
      NPR: 1.58,
    };
    return Math.ceil(baseAmount * rates[selectedCurrency]);
  };

  const currentAmount = getConvertedAmount(selectedWorkshop.basePrice);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-yoga-700 mb-8">Workshop Checkout</h1>

        <div className="space-y-6">
          {/* Workshop Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Workshop
            </label>
            <select
              value={selectedWorkshop.slug}
              onChange={(e) => {
                const workshop = Object.values(WORKSHOPS).find(w => w.slug === e.target.value);
                if (workshop) setSelectedWorkshop(workshop);
              }}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yoga-600"
            >
              {Object.values(WORKSHOPS).map(workshop => (
                <option key={workshop.slug} value={workshop.slug}>
                  {workshop.name} - Base Price: ₹{workshop.basePrice}
                </option>
              ))}
            </select>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Currency
            </label>
            <div className="flex gap-3">
              {(['INR', 'USD', 'NPR'] as const).map(currency => (
                <button
                  key={currency}
                  onClick={() => setSelectedCurrency(currency)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    selectedCurrency === currency
                      ? 'bg-yoga-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Workshop Mode
            </label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yoga-600"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="residential">Residential</option>
              <option value="recorded">Recorded</option>
            </select>
          </div>

          {/* Order Summary */}
          <div className="bg-yoga-50 border-l-4 border-yoga-600 p-4 rounded">
            <h3 className="font-bold text-yoga-700 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Workshop:</span>
                <span className="font-semibold">{selectedWorkshop.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="font-semibold capitalize">{selectedMode}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-yoga-700 border-t border-yoga-200 pt-2 mt-2">
                <span>Total Amount:</span>
                <span>
                  {selectedCurrency === 'INR' && '₹'}
                  {selectedCurrency === 'USD' && '$'}
                  {selectedCurrency === 'NPR' && 'Rs.'}
                  {currentAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <PayUPaymentButton
            workshopSlug={selectedWorkshop.slug}
            workshopName={selectedWorkshop.name}
            amount={currentAmount}
            currency={selectedCurrency}
            mode={selectedMode}
            buttonLabel="Proceed to Secure Payment"
            onError={(error) => {
              console.error('Payment error:', error);
              // Show error toast
            }}
            onSuccess={() => {
              console.log('Payment initiated');
              // Optional: Show loading state
            }}
          />

          {/* Security Note */}
          <p className="text-xs text-gray-600 text-center pt-4 border-t border-gray-200">
            💳 Your payment information is secure and encrypted by PayU • 🔒 No extra charges
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🌍 Environment Variables Required

```bash
# PayU Configuration (.env.local)
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_MERCHANT_SALT=your_merchant_salt
PAYU_MODE=TEST  # or PRODUCTION
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 🔒 Security Considerations

1. **Hash Verification**: Always verify SHA512 hash on callback
2. **Auth Required**: Payment requires valid JWT token
3. **Amount Validation**: Backend validates amount before hash generation
4. **URL Encoding**: All URL parameters are properly encoded
5. **HTTPS Only**: Use HTTPS in production
6. **Token Storage**: Store auth token securely (httpOnly in production)

---

## 📊 Testing

### Test Cases

1. **Amount Changes on Workshop Selection**
   - Select different workshops
   - Verify amount updates in button display
   - Click "Pay Now" button

2. **Multi-Currency Support**
   - Test INR, USD, NPR selection
   - Verify amount conversion
   - Check all payment buttons work

3. **Error Handling**
   - Missing auth token → Shows "Authentication required"
   - Invalid amount → Shows validation error
   - Invalid email → Shows email validation error

### Test Payment Flow

```bash
# Using test mode (set PAYU_MODE=TEST)
1. Fill workshop details
2. Click "Proceed to Payment"
3. On PayU page:
   - Card: 4111111111111111 (any future date, any CVV)
   - UPI: success@payu or failure@payu
   - Net Banking: Select any bank
4. Check redirect to success/failure URL with parameters
```

---

## 📱 Mobile Responsiveness

The component is fully responsive:
- Button takes full width on mobile
- Summary card is readable on small screens
- All text is appropriately sized
- Touch-friendly button size (48px minimum height)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Authentication required" | Ensure user is logged in and token is in localStorage |
| "Invalid amount" | Amount must be > 0 and a valid number |
| Amount not changing | Check that props are being passed correctly |
| Form not submitting | Check browser console for errors, verify PAYU_MODE |
| Hash verification failed | Verify PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT |

---

## 📚 Related Files

- Component: `/components/PayUPaymentButton.tsx`
- Helper: `/lib/payments/payuButtonHelper.ts`
- PayU Config: `/lib/payments/payu.ts`
- API Endpoint: `/app/api/payments/payu/initiate/route.ts`
- Success Page: `/app/payment-successful/page.tsx`
- Failure Page: `/app/payment-failed/page.tsx`

---

## 🚀 Next Steps

1. ✅ Implement payment button in your checkout page
2. ✅ Test with test payment credentials
3. ✅ Create success/failure/cancel page handlers
4. ✅ Set up order tracking in database
5. ✅ Configure production PayU credentials
6. ✅ Deploy and test with real payments

---

## 📞 Support

For issues:
1. Check browser console for errors
2. Verify environment variables are set
3. Check PayU dashboard for webhook events
4. Review `/api/payments/payu/callback` logs
