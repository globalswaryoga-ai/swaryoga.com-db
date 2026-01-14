# PayU Payment Button - Quick Reference Card

## 🎯 One-Liner Implementation

```tsx
<PayUPaymentButton workshopSlug="swar-yoga-level-1" workshopName="Swar Yoga" amount={3300} currency="INR" />
```

---

## 📋 Props Reference

```typescript
<PayUPaymentButton
  workshopSlug="swar-yoga-level-1"           // ✅ Required
  workshopName="Swar Yoga Level-1"           // ✅ Required
  amount={3300}                              // ✅ Required
  currency="INR"                             // ✅ Required (INR|USD|NPR)
  mode="online"                              // Optional (default: 'online')
  language="english"                         // Optional (default: 'english')
  scheduleId="o1"                            // Optional
  buttonLabel="Pay Now"                      // Optional
  className=""                               // Optional
  onError={(error) => {}}                    // Optional callback
  onSuccess={() => {}}                       // Optional callback
  disabled={false}                           // Optional
/>
```

---

## 🔑 Three Key URLs Generated

| URL | When | Purpose |
|-----|------|---------|
| **Success** | Payment successful | Enroll user, show confirmation |
| **Failure** | Payment failed | Show retry option |
| **Cancel** | User cancelled | Show continuation option |

### URL Format
```
/payment-successful?workshop=slug&name=NAME&amount=3300&currency=INR&mode=online&language=english
/payment-failed?workshop=slug&name=NAME&amount=3300&currency=INR&mode=online&language=english
/payment-cancelled?workshop=slug&name=NAME&amount=3300&currency=INR&mode=online&language=english
```

---

## 🌍 Currency Examples

```
Base Price: ₹3300

INR:  ₹3300    (1.0x)
USD:  $39      (0.012x)
NPR:  Rs.5214  (1.58x)
```

---

## 💻 Import Statement

```tsx
import PayUPaymentButton from '@/components/PayUPaymentButton';
```

---

## 🎨 Styling Example

```tsx
<PayUPaymentButton
  workshopSlug="yoga"
  workshopName="Yoga Workshop"
  amount={1000}
  currency="INR"
  className="my-custom-class"
/>

/* Default styles */
.button {
  bg-gradient-to-r from-yoga-600 to-yoga-700
  text-white
  px-6 py-3
  rounded-lg
  font-bold
}
```

---

## ⚙️ Environment Variables

```bash
# Required in .env.local
PAYU_MERCHANT_KEY=xxxxx
PAYU_MERCHANT_SALT=xxxxx
PAYU_MODE=TEST
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔐 Authentication

```tsx
// Must have auth token in localStorage
localStorage.setItem('auth_token', 'your_jwt_token');

// Or token is automatically retrieved:
const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
```

---

## 🚨 Error Handling

```tsx
<PayUPaymentButton
  ...
  onError={(error) => {
    console.error('Payment error:', error);
    // Handle error: show toast, log to analytics, etc.
  }}
/>

// Possible errors:
// - "Authentication required"
// - "Invalid amount"
// - "Missing required fields"
// - "Invalid response from payment gateway"
// - Network/API errors
```

---

## ✅ Success Callback

```tsx
<PayUPaymentButton
  ...
  onSuccess={() => {
    console.log('Payment initiated');
    // Optional: Show loading state, disable form, etc.
  }}
/>
```

---

## 📊 Amount Changing

```tsx
const [selectedWorkshop, setSelectedWorkshop] = useState({ amount: 3300 });

<PayUPaymentButton
  amount={selectedWorkshop.amount}  // 👈 Changes automatically!
/>
```

---

## 🧪 Quick Test

```tsx
// Test component
<PayUPaymentButton
  workshopSlug="test-workshop"
  workshopName="Test Workshop"
  amount={1}
  currency="INR"
  buttonLabel="Test Payment"
/>

// Use test card: 4111 1111 1111 1111
```

---

## 🎭 Loading State

```
While loading:
- Button shows "Processing Payment..."
- Spinner icon displays
- Button is disabled
- No interaction possible
```

---

## 🎯 Common Integration Points

```tsx
// In checkout page
<div>
  <h1>Checkout</h1>
  
  {/* Workshop selection */}
  <select onChange={(e) => setWorkshop(e.target.value)} />
  
  {/* Currency selection */}
  <button onClick={() => setCurrency('INR')}>INR</button>
  
  {/* Payment button */}
  <PayUPaymentButton
    workshopSlug={workshop.slug}
    workshopName={workshop.name}
    amount={getConvertedAmount(workshop.price, currency)}
    currency={currency}
  />
</div>
```

---

## 📱 Mobile Responsive

```
Desktop: Full-width optimized layout
Tablet:  Adjusted spacing, touch-friendly
Mobile:  100% width button, readable text
```

---

## 🔗 Related Pages to Create

```
/payment-successful/page.tsx  ← Success page
/payment-failed/page.tsx      ← Failure page
/payment-cancelled/page.tsx   ← Cancel page
```

---

## 🧩 Helper Functions

```tsx
// Generate URLs
import { generatePayUButtonUrls } from '@/lib/payments/payuButtonHelper';

const urls = generatePayUButtonUrls({
  workshopSlug: 'yoga',
  workshopName: 'Yoga',
  amount: 3300,
  currency: 'INR',
});

// Parse URL params
import { parsePaymentUrlParams } from '@/lib/payments/paymentPageHandler';

const data = parsePaymentUrlParams(searchParams);
// { workshopSlug, workshopName, amount, currency, ... }

// Format amount
import { formatPaymentAmount } from '@/lib/payments/payuButtonHelper';

const display = formatPaymentAmount(3300, 'INR');
// "₹3,300"
```

---

## 📈 Props Flow

```
Parent Component (CheckoutPage)
  ↓ (pass props)
PayUPaymentButton
  ↓ (on click)
Validate → Generate URLs → Call API → Submit Form → Redirect
```

---

## 🎬 Full Page Example

```tsx
'use client';
import { useState } from 'react';
import PayUPaymentButton from '@/components/PayUPaymentButton';

export default function Checkout() {
  const [workshop, setWorkshop] = useState('yoga-1');
  const [currency, setCurrency] = useState('INR');
  
  const workshops = {
    'yoga-1': { slug: 'swar-yoga-level-1', name: 'Swar Yoga L1', price: 3300 },
    'yoga-2': { slug: 'breathing-basics', name: 'Breathing', price: 1500 },
  };
  
  const w = workshops[workshop];
  const rates = { INR: 1, USD: 0.012, NPR: 1.58 };
  const amount = Math.ceil(w.price * rates[currency]);
  
  return (
    <div>
      <select onChange={(e) => setWorkshop(e.target.value)}>
        {Object.entries(workshops).map(([key, w]) => (
          <option key={key} value={key}>{w.name}</option>
        ))}
      </select>
      
      <div>
        {['INR', 'USD', 'NPR'].map(c => (
          <button key={c} onClick={() => setCurrency(c)}>
            {c}
          </button>
        ))}
      </div>
      
      <PayUPaymentButton
        workshopSlug={w.slug}
        workshopName={w.name}
        amount={amount}
        currency={currency}
      />
    </div>
  );
}
```

---

## 🚀 Deployment Checklist

- [ ] Environment variables set
- [ ] Auth token working
- [ ] Component imports correctly
- [ ] No TypeScript errors
- [ ] Builds successfully
- [ ] Test payment works
- [ ] Success page created
- [ ] Failure page created
- [ ] Cancel page created
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Production credentials ready

---

## 📞 Support

- **Quick Start**: `PAYU_PAYMENT_BUTTON_QUICK_START.md`
- **Full Guide**: `PAYU_PAYMENT_BUTTON_GUIDE.md`
- **Architecture**: `PAYU_PAYMENT_BUTTON_ARCHITECTURE.md`
- **Checklist**: `PAYU_PAYMENT_BUTTON_CHECKLIST.md`

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Production Ready ✅
