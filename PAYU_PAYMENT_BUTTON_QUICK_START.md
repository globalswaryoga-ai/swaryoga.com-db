# PayU Payment Button - Quick Start Guide

## 📌 What's New

I've created a **complete PayU payment button system** with dynamic URLs for workshop-based payments. Here's what you get:

### ✅ Files Created/Updated

1. **`components/PayUPaymentButton.tsx`** (Enhanced)
   - Complete payment button component with dynamic workshop details
   - Supports multiple currencies (INR, USD, NPR)
   - Integrated with PayU API endpoint
   - Professional error handling and loading states

2. **`lib/payments/payuButtonHelper.ts`** (Enhanced)
   - Functions to generate dynamic Success/Failure/Cancel URLs
   - URL parameter encoding
   - Payment validation
   - Amount formatting for different currencies

3. **`lib/payments/paymentPageHandler.ts`** (New)
   - Utility functions to handle payment page redirects
   - Parse URL parameters from PayU callback
   - Standardized messaging for different payment statuses

4. **`PAYU_PAYMENT_BUTTON_GUIDE.md`** (New)
   - Comprehensive implementation documentation
   - Code examples
   - Testing guide
   - Troubleshooting

---

## 🚀 Quick Start - 2 Minutes

### Step 1: Import the Component

```tsx
import PayUPaymentButton from '@/components/PayUPaymentButton';
```

### Step 2: Add to Your Page

```tsx
<PayUPaymentButton
  workshopSlug="swar-yoga-level-1"
  workshopName="Swar Yoga Level-1 Workshop"
  amount={3300}
  currency="INR"
  mode="online"
  language="english"
  buttonLabel="Proceed to Payment"
  onError={(error) => console.error('Payment error:', error)}
  onSuccess={() => console.log('Payment initiated')}
/>
```

### Step 3: Done! 🎉

The button will:
- ✅ Generate dynamic Success URL with workshop details
- ✅ Generate dynamic Failure URL with workshop details  
- ✅ Generate dynamic Cancel URL with workshop details
- ✅ Call PayU API to generate hash
- ✅ Submit form to PayU gateway
- ✅ Handle all errors gracefully

---

## 📊 How Payment URLs Work

### Amount Changes with Workshop Selection

```typescript
// When user selects different workshop
const [selectedWorkshop, setSelectedWorkshop] = useState({
  slug: 'swar-yoga-level-1',
  name: 'Swar Yoga Level-1 Workshop',
  amount: 3300,
  currency: 'INR',
});

// Pass to button - amount automatically updates
<PayUPaymentButton
  workshopSlug={selectedWorkshop.slug}
  workshopName={selectedWorkshop.name}
  amount={selectedWorkshop.amount}     // ← Changes dynamically
  currency={selectedWorkshop.currency}
/>
```

### Dynamic URLs Generated

```
✅ Success URL:
   /payment-successful
   ?workshop=swar-yoga-level-1
   &name=Swar%20Yoga%20Level-1%20Workshop
   &amount=3300
   &currency=INR
   &mode=online
   &language=english

✅ Failure URL:
   /payment-failed
   ?workshop=swar-yoga-level-1
   &name=Swar%20Yoga%20Level-1%20Workshop
   &amount=3300
   &currency=INR
   &mode=online
   &language=english

✅ Cancel URL:
   /payment-cancelled
   ?workshop=swar-yoga-level-1
   &name=Swar%20Yoga%20Level-1%20Workshop
   &amount=3300
   &currency=INR
   &mode=online
   &language=english
```

---

## 🔑 Key Features

### 1. **Dynamic Workshop Details**
```tsx
// Amount and name come from user selection
<PayUPaymentButton
  workshopName={selectedWorkshop.name}    // "Swar Yoga Level-1"
  amount={selectedWorkshop.amount}         // 3300
/>
```

### 2. **Three Dynamic URLs with Parameters**
- **Success**: When payment is successful
- **Failure**: When payment fails or is declined
- **Cancel**: When user cancels on PayU page

All include workshop slug, name, amount, and currency!

### 3. **Multi-Currency Support**
```tsx
amount={3300}     // INR
amount={39}       // USD
amount={5214}     // NPR
```

### 4. **Error Handling**
```tsx
onError={(error) => {
  // Handle authentication errors
  // Handle validation errors
  // Handle API errors
}}
```

### 5. **Secure Hash Generation**
- SHA512 hash generated on backend
- All PayU security requirements met
- Validation on each transaction

---

## 💻 Complete Example

```tsx
'use client';

import { useState } from 'react';
import PayUPaymentButton from '@/components/PayUPaymentButton';

const WORKSHOPS = [
  {
    slug: 'swar-yoga-level-1',
    name: 'Swar Yoga Level-1 Workshop',
    basePrice: 3300,
  },
  {
    slug: 'yogasana-sadhana',
    name: 'Yogasana Sadhana',
    basePrice: 330,
  },
  {
    slug: 'breathing-basics',
    name: 'Breathing Basics Workshop',
    basePrice: 1500,
  },
];

export default function CheckoutPage() {
  const [selectedWorkshop, setSelectedWorkshop] = useState(WORKSHOPS[0]);
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD' | 'NPR'>('INR');

  const getAmount = (basePrice: number) => {
    const rates: Record<string, number> = {
      INR: 1,
      USD: 0.012,
      NPR: 1.58,
    };
    return Math.ceil(basePrice * rates[selectedCurrency]);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {/* Workshop Selection - Amount will change */}
      <select
        value={selectedWorkshop.slug}
        onChange={(e) => {
          const ws = WORKSHOPS.find(w => w.slug === e.target.value);
          if (ws) setSelectedWorkshop(ws);
        }}
        className="w-full border rounded px-4 py-2 mb-4"
      >
        {WORKSHOPS.map(ws => (
          <option key={ws.slug} value={ws.slug}>
            {ws.name} - ₹{ws.basePrice}
          </option>
        ))}
      </select>

      {/* Currency Selection */}
      <div className="flex gap-3 mb-6">
        {(['INR', 'USD', 'NPR'] as const).map(curr => (
          <button
            key={curr}
            onClick={() => setSelectedCurrency(curr)}
            className={`px-4 py-2 rounded ${
              selectedCurrency === curr ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {curr}
          </button>
        ))}
      </div>

      {/* Payment Button - Automatically updates amount */}
      <PayUPaymentButton
        workshopSlug={selectedWorkshop.slug}
        workshopName={selectedWorkshop.name}
        amount={getAmount(selectedWorkshop.basePrice)}
        currency={selectedCurrency}
        buttonLabel="Proceed to Payment"
        onError={(error) => alert('Error: ' + error)}
      />
    </div>
  );
}
```

---

## 🌐 URL Parameters Reference

| Parameter | Example | Used For |
|-----------|---------|----------|
| `workshop` | `swar-yoga-level-1` | Track which workshop was purchased |
| `name` | `Swar%20Yoga%20Level-1` | Display workshop name on result page |
| `amount` | `3300` | Show payment amount received |
| `currency` | `INR` | Show correct currency symbol |
| `mode` | `online` | Track workshop delivery mode |
| `language` | `english` | Track language preference |
| `scheduleId` | `o1` | Track specific schedule if needed |

---

## 🔒 Security Features

✅ **SHA512 Hash** - Cryptographic verification
✅ **Auth Required** - JWT token validation
✅ **Amount Validation** - Backend checks amount is correct
✅ **HTTPS Only** - Production uses HTTPS
✅ **Parameter Encoding** - Safe URL encoding
✅ **No Sensitive Data** - No card/payment info in URLs

---

## 📱 Responsive Design

The component is fully responsive:
- Mobile: Full-width button with clear display
- Tablet: Optimized spacing
- Desktop: Professional layout with summary

---

## 🧪 Testing

### Test with Different Workshops
```tsx
const workshops = [
  { slug: 'workshop-1', name: 'Workshop 1', amount: 1000 },
  { slug: 'workshop-2', name: 'Workshop 2', amount: 2000 },
  { slug: 'workshop-3', name: 'Workshop 3', amount: 3000 },
];

// Select each and verify:
// 1. Button shows correct amount
// 2. URLs contain correct workshop slug
// 3. Payment API receives correct data
```

### Test Payment Flow
1. Select workshop
2. Select currency
3. Click "Pay Now"
4. Should redirect to PayU payment page
5. Complete payment (use test credentials in TEST mode)
6. Should redirect to success URL with all parameters
7. Verify workshop details are displayed correctly

---

## 📝 Environment Setup

```bash
# .env.local

# PayU Configuration
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_MERCHANT_SALT=your_merchant_salt
PAYU_MODE=TEST  # or PRODUCTION

# App URL (for success/failure redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔧 Implementation Steps

1. ✅ Import `PayUPaymentButton` component
2. ✅ Wrap with workshop selection logic
3. ✅ Pass dynamic workshop slug, name, amount
4. ✅ Add currency selection (INR/USD/NPR)
5. ✅ Handle `onError` and `onSuccess` callbacks
6. ✅ Create `/payment-successful`, `/payment-failed`, `/payment-cancelled` pages
7. ✅ Extract workshop details from URL params
8. ✅ Process order in database
9. ✅ Send confirmation email
10. ✅ Test with test credentials

---

## 📚 Files & Documentation

| File | Purpose |
|------|---------|
| `/components/PayUPaymentButton.tsx` | Main payment button component |
| `/lib/payments/payuButtonHelper.ts` | URL generation and validation |
| `/lib/payments/paymentPageHandler.ts` | Handle payment redirects |
| `/lib/payments/payu.ts` | PayU configuration |
| `/app/api/payments/payu/initiate/route.ts` | Hash generation API |
| `PAYU_PAYMENT_BUTTON_GUIDE.md` | Complete implementation guide |
| `PAYU_PAYMENT_BUTTON_QUICK_START.md` | This file |

---

## ❓ Common Questions

**Q: How does the amount change?**
A: The `amount` prop is dynamic. When user selects different workshop, pass new amount.

**Q: Why are there three URLs?**
A: Success = payment worked, Failure = payment failed, Cancel = user cancelled.

**Q: Can I customize the button?**
A: Yes! Use `buttonLabel`, `className`, `onError`, `onSuccess` props.

**Q: Is it secure?**
A: Yes! Uses SHA512 hash, JWT auth, and HTTPS.

**Q: Can I change the currency?**
A: Yes! Pass `currency` prop as 'INR', 'USD', or 'NPR'.

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| "Authentication required" | User must be logged in. Check localStorage has `auth_token` |
| "Invalid amount" | Amount must be > 0. Check workshop has valid price |
| Amount not updating | Pass new `amount` prop when workshop changes |
| Hash verification failed | Check PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in .env |

---

## 🚀 Next Steps

1. **Implement the component** in your checkout page
2. **Test with test credentials** in PayU test mode
3. **Create success/failure pages** to handle redirects
4. **Set up database tracking** for orders
5. **Configure production** credentials
6. **Deploy and test** with real payments

---

## 📞 Need Help?

- Check `PAYU_PAYMENT_BUTTON_GUIDE.md` for detailed documentation
- Review example implementation above
- Check browser console for error messages
- Verify all environment variables are set correctly

Good luck! 🎉
