# PayU Payment Button - Architecture & Flow Diagram

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHECKOUT PAGE                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Workshop Selection Dropdown                             │  │
│  │ ┌─────────────────────────────────────────────────────┐ │  │
│  │ │ • Swar Yoga Level-1 (₹3300)                         │ │  │
│  │ │ • Yogasana Sadhana (₹330)                           │ │  │
│  │ │ • Breathing Basics (₹1500)                          │ │  │
│  │ └─────────────────────────────────────────────────────┘ │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │ (on change)                        │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Currency Selection (INR | USD | NPR)                   │  │
│  │ Amount auto-converts: 3300 → $39 or 5214 Rs.          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │  <PayUPaymentButton                                     │  │
│  │    workshopSlug="swar-yoga-level-1"                    │  │
│  │    workshopName="Swar Yoga Level-1 Workshop"           │  │
│  │    amount={3300}                                       │  │
│  │    currency="INR"                                      │  │
│  │    mode="online"                                       │  │
│  │    language="english"                                  │  │
│  │  />                                                     │  │
│  │                                                         │  │
│  │  ┌───────────────────────────────────────────────────┐ │  │
│  │  │ Workshop: Swar Yoga Level-1                      │ │  │
│  │  │ Amount: ₹3300                                    │ │  │
│  │  │ Mode: Online                                     │ │  │
│  │  │                                                 │ │  │
│  │  │           [💳 Pay Now - ₹3300]                │ │  │
│  │  │                                                 │ │  │
│  │  │ 🔒 Secure payment by PayU                      │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Payment Flow Sequence

```
USER                   COMPONENT              API ENDPOINT           PayU
 │                        │                       │                   │
 ├─ Click "Pay Now" ───────►                      │                   │
 │                        │                       │                   │
 │                   Validate inputs              │                   │
 │                        │                       │                   │
 │                   Get auth token               │                   │
 │                        │                       │                   │
 │                   Generate URLs:               │                   │
 │                   - Success                    │                   │
 │                   - Failure                    │                   │
 │                   - Cancel                     │                   │
 │                        │                       │                   │
 │                   POST /api/payments/payu/initiate               │
 │                        ├──────────────────────►│                   │
 │                        │                       │                   │
 │                        │                  Verify auth              │
 │                        │                  Create Order             │
 │                        │                  Generate Hash            │
 │                        │                  SHA512 hash              │
 │                        │                       │                   │
 │                        │◄──────────────────────┤                   │
 │                   Payment form data            │                   │
 │                        │                       │                   │
 │                   Create hidden form           │                   │
 │                   Submit form to PayU          │                   │
 │                        │                       │                   ├─ Redirect
 │                        │                       │                   │
 │                        │                       │                ◄──┤
 │    Show PayU Gateway ◄──────────────────────────────────────────┤
 │                        │                       │                   │
 │    Enter Card/UPI      │                       │                   │
 │    Complete Payment ───────────────────────────►                  │
 │                        │                       │        Process    │
 │                        │                       │        Payment    │
 │                        │                       │                   │
 │◄────────────────────────────────────────────────────────────────┤
 │  Redirect to Success URL                      │                   │
 │  with parameters                              │                   │
 │                        │                       │                   │
 ▼                        ▼                       ▼                   ▼
Success page         Payment complete        Order saved         Updated
/payment-successful                                              Dashboard
```

---

## 📊 Dynamic URL Generation Logic

```
Input from Component:
┌──────────────────────────┐
│ workshopSlug: "swar-..." │
│ workshopName: "Swar..." │
│ amount: 3300            │
│ currency: "INR"         │
│ mode: "online"          │
│ language: "english"     │
└──────────────────────────┘
          │
          ▼
URL Encoding & Parameter Building
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Success URL:                                                │
│ /payment-successful?                                        │
│   workshop=swar-yoga-level-1                                │
│   &name=Swar%20Yoga%20Level-1%20Workshop                    │
│   &amount=3300                                              │
│   &currency=INR                                             │
│   &mode=online                                              │
│   &language=english                                         │
├─────────────────────────────────────────────────────────────┤
│ Failure URL:                                                │
│ /payment-failed?                                            │
│   workshop=swar-yoga-level-1                                │
│   &name=Swar%20Yoga%20Level-1%20Workshop                    │
│   &amount=3300                                              │
│   &currency=INR                                             │
│   &mode=online                                              │
│   &language=english                                         │
├─────────────────────────────────────────────────────────────┤
│ Cancel URL:                                                 │
│ /payment-cancelled?                                         │
│   workshop=swar-yoga-level-1                                │
│   &name=Swar%20Yoga%20Level-1%20Workshop                    │
│   &amount=3300                                              │
│   &currency=INR                                             │
│   &mode=online                                              │
│   &language=english                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 PayU Form Submission

```
┌─────────────────────────────────────────────────────────────┐
│ Hidden Form Created & Submitted                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ <form method="POST" action="https://secure.payu.in/_payment">
│                                                              │
│  <!-- Merchant & Transaction Info -->                        │
│  <input name="key" value="MERCHANT_KEY" />                   │
│  <input name="txnid" value="TXN1704067...xyz" />            │
│  <input name="amount" value="3300.00" />                     │
│                                                              │
│  <!-- Product & Customer Info -->                            │
│  <input name="productinfo" value="Swar Yoga... (INR)" />    │
│  <input name="firstname" value="Customer" />                │
│  <input name="email" value="payment@example.com" />         │
│  <input name="phone" value="9999999999" />                  │
│                                                              │
│  <!-- Dynamic Redirect URLs -->                              │
│  <input name="surl" value="https://...payment-successful?..." />
│  <input name="furl" value="https://...payment-failed?..." />    │
│  <input name="curl" value="https://...payment-cancelled?..." /> │
│                                                              │
│  <!-- Security Hash -->                                      │
│  <input name="hash" value="SHA512_HASH_HERE" />             │
│  <input name="service_provider" value="payu_paisa" />       │
│                                                              │
│  <button type="submit">Submit</button>                       │
│ </form>                                                      │
│                                                              │
│ ▶ Auto-submits after form creation                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📲 Component Props Flow

```
CheckoutPage
│
├─ State: selectedWorkshop
│  └─ slug: "swar-yoga-level-1"
│  └─ name: "Swar Yoga Level-1 Workshop"
│  └─ amount: 3300
│
├─ State: selectedCurrency
│  └─ "INR"
│
└─ Render: <PayUPaymentButton />
   │
   ├─ Props passed:
   │  ├─ workshopSlug="swar-yoga-level-1"
   │  ├─ workshopName="Swar Yoga..."
   │  ├─ amount={3300}
   │  ├─ currency="INR"
   │  ├─ mode="online"
   │  └─ onError={handleError}
   │
   └─ Component handles:
      ├─ URL generation
      ├─ Hash generation via API
      ├─ Form submission
      └─ Error handling
```

---

## 🌍 Multi-Workshop Scenario

```
Workshop 1                Workshop 2                Workshop 3
Swar Yoga L1             Yogasana Sadhana          Breathing
₹3300                    ₹330                      ₹1500
│                        │                        │
└────────┬────────────────┼────────────────────────┘
         │                │
         ▼                ▼
    User selects one
         │
         ▼
    <PayUPaymentButton
      workshopSlug="yoga1"
      amount={3300}
    />
         │
         ▼
    Success URL:
    /payment-successful
    ?workshop=yoga1
    &amount=3300
    &name=Swar%20Yoga%20Level-1

    User can then select Workshop 2:
    
    <PayUPaymentButton
      workshopSlug="yogasana"
      amount={330}
    />
         │
         ▼
    Success URL:
    /payment-successful
    ?workshop=yogasana
    &amount=330
    &name=Yogasana%20Sadhana
```

---

## 💱 Currency Conversion Logic

```
Base Price: ₹3300

INR Selection:
  3300 × 1.0 = ₹3300

USD Selection:
  3300 × 0.012 = $39.60

NPR Selection:
  3300 × 1.58 = Rs.5214

Generated Button Shows:
  INR: [💳 Pay Now - ₹3300]
  USD: [💳 Pay Now - $39.60]
  NPR: [💳 Pay Now - Rs.5214]

Dynamic URLs Include Currency:
  ...&currency=INR (or USD/NPR)
  ...&amount=3300 (or 39 or 5214)
```

---

## ✅ Validation Flow

```
User clicks "Pay Now"
  │
  ▼
Validate Inputs:
  │
  ├─ workshopSlug? ──X──► Show error
  │
  ├─ workshopName? ──X──► Show error
  │
  ├─ amount > 0? ──X──► Show error
  │
  ├─ currency valid? ──X──► Show error
  │                    (INR/USD/NPR)
  │
  ├─ auth token exists? ──X──► "Authentication required"
  │
  └─ ✓ All valid
     │
     ▼
  Generate URLs & Call API
     │
     ▼
  Success: Submit to PayU
  Error: Show error message
```

---

## 🎨 Component State Management

```
PayUPaymentButton State
│
├─ isLoading: boolean
│  └─ true when API call is in progress
│  └─ Disables button, shows spinner
│
├─ error: string | null
│  └─ Stores error message
│  └─ Displays in red box
│
└─ formRef: React.RefObject
   └─ Hidden form element reference
   └─ Used for PayU submission
```

---

## 🔄 When Amount Changes

```
User selects different workshop:
  
  Workshop 1 (₹3300)
  │
  ├─ Component receives new props
  │  ├─ amount={3300}
  │  └─ workshopName="Swar Yoga L1"
  │
  └─ Button re-renders with:
     ├─ Updated summary box
     ├─ Updated amount display
     ├─ Updated title
     └─ Updated URLs ready for next click

User clicks "Pay Now":
  │
  └─ New URLs generated with:
     ├─ workshop=swar-yoga-level-1
     ├─ amount=3300
     └─ name=Swar%20Yoga%20Level-1
```

---

## 📋 Summary Table

| Aspect | Details |
|--------|---------|
| **Component File** | `/components/PayUPaymentButton.tsx` |
| **Helper Functions** | `/lib/payments/payuButtonHelper.ts` |
| **API Endpoint** | `/api/payments/payu/initiate` |
| **Hash Algorithm** | SHA512 |
| **Supported Currencies** | INR, USD, NPR |
| **Dynamic URLs** | Success, Failure, Cancel |
| **URL Parameters** | workshop, name, amount, currency, mode, language, scheduleId |
| **Authentication** | JWT token required |
| **Validation** | Input validation + backend validation |
| **Error Handling** | User-friendly error messages |
| **Mobile Support** | Fully responsive |
| **Security** | Hash, HTTPS, auth token |

This architecture ensures dynamic, flexible, and secure payment processing! 🚀
