# 🎯 Visual System Architecture - Repeat Purchase Discount

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     SWAR YOGA WEBSITE                           │
│                    (swaryoga.com)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
          ┌──────────┐  ┌──────────┐  ┌──────────┐
          │ Workshop │  │  Cart    │  │ Checkout │
          │  Browse  │  │  Page    │  │   Page   │
          └──────────┘  └──────────┘  └────┬─────┘
                                           │
                   ┌───────────────────────┼────────────────────┐
                   │                       │                    │
                   ▼                       ▼                    ▼
        ┌──────────────────┐    ┌────────────────────┐   ┌──────────────┐
        │  Fetch Purchase  │    │  Editable Cart     │   │  Payment     │
        │  History API     │    │  Controls          │   │  Processing  │
        └────────┬─────────┘    └────────┬───────────┘   └──────┬───────┘
                 │                       │                       │
        ┌────────▼────────────────────────▼──────────┐           │
        │   /api/user/purchase-history               │           │
        │   ├─ Verify JWT Token (optional)           │           │
        │   ├─ Query MongoDB Orders                  │           │
        │   ├─ Filter: paymentStatus = 'completed'  │           │
        │   └─ Return: Purchased Items List          │           │
        └────────┬────────────────────────────────────┘           │
                 │                                                 │
    ┌────────────▼──────────────┐        ┌──────────────────────┐│
    │  Frontend Processing:     │        │ Pricing Calculation  ││
    │                          │        │                      ││
    │  1. Get cart items       │        │ New Item:            ││
    │  2. Get purchase history  │        │   Price = ₹500       ││
    │  3. Match items with     │        │                      ││
    │     history              │        │ Repeat Item:         ││
    │  4. Set isRepeatPurchase │        │   Price = ₹500 × 0.6 ││
    │     flag                 │        │   Price = ₹300 (40%) ││
    │  5. Display badges       │        │                      ││
    │  6. Show new prices      │        │ Final Total:         ││
    │                          │        │   ₹800 + ₹300 + Tax  ││
    └────────┬──────────────────┘        └──────────────────────┘│
             │                                                     │
             ▼                                                     ▼
    ┌────────────────────────┐   ┌─────────────────────────────────┐
    │ Updated Cart Display   │   │ Cashfree Payment Gateway       │
    │                        │   │                                │
    │ Item 1:                │   │ ┌─────────────────────────────┐│
    │  Yoga Basics           │   │ │ Order Summary:              ││
    │  🏷️ Regular Price      │   │ │ - Subtotal: ₹1100          ││
    │  ₹500                  │   │ │ - Discount: -₹200           ││
    │  Qty: 1 [−][+]         │   │ │ - Tax: +₹27                 ││
    │                        │   │ │ - TOTAL: ₹927              ││
    │ Item 2:                │   │ │                             ││
    │  Yoga Basics           │   │ │ [🔵 PAY NOW (Blue Button)]  ││
    │  🎉 40% OFF            │   │ └─────────────────────────────┘│
    │  ₹300 (was ₹500)       │   │                                │
    │  Qty: 1 [−][+]         │   │ Payment Methods:              │
    │                        │   │ • UPI                         │
    │ [Remove ✕] [Edit]      │   │ • Cards (Credit/Debit)       │
    └────────┬───────────────┘   │ • Wallets                    │
             │                    │ • Bank Transfer              │
             │                    └──────────┬────────────────────┘
             │                              │
             └──────────────────┬───────────┘
                               │
                   ┌───────────▼───────────┐
                   │  Payment Processing   │
                   │                       │
                   │  1. Cashfree v3 SDK  │
                   │  2. User enters PIN  │
                   │  3. Bank verifies    │
                   │  4. Payment confirmed│
                   │  5. Order stored     │
                   │  6. Confirmation sent│
                   └───────────┬───────────┘
                               │
                   ┌───────────▼──────────┐
                   │  MongoDB Database    │
                   │                      │
                   │  Orders Collection:  │
                   │  ├─ userId          │
                   │  ├─ items[]         │
                   │  ├─ amount          │
                   │  ├─ discount        │
                   │  ├─ paymentStatus   │
                   │  └─ timestamp       │
                   └────────────────────┘
```

## API Endpoint Flow

```
┌──────────────────────────────────────────────────────┐
│  GET /api/user/purchase-history                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  REQUEST HEADERS:                                   │
│  ├─ Authorization: Bearer eyJhbGc... (optional)    │
│  └─ User-Agent: Mozilla/5.0...                    │
│                                                      │
├──────────────────────────────────────────────────────┤
│  PROCESSING:                                         │
│  1. Check Authorization header                      │
│     ├─ If present → Verify JWT token               │
│     └─ If absent → Continue as guest               │
│                                                      │
│  2. Query MongoDB database:                         │
│     db.orders.find({                                │
│       userId: "user123",                            │
│       paymentStatus: "completed"                    │
│     })                                               │
│                                                      │
│  3. Extract purchased items from orders             │
│     └─ Map: [{name, id, purchaseDate}, ...]        │
│                                                      │
│  4. Log transaction                                 │
│     ✅ Found 5 completed orders                     │
│     ✅ Found 12 distinct items purchased            │
│                                                      │
├──────────────────────────────────────────────────────┤
│  RESPONSE (200 OK):                                 │
│  {                                                   │
│    "success": true,                                 │
│    "userId": "user123",                             │
│    "purchasedItems": [                              │
│      {                                               │
│        "name": "Yoga Basics - Morning",             │
│        "id": "workshop_001",                        │
│        "purchaseDate": "2024-01-15T10:30:00Z"      │
│      },                                              │
│      {                                               │
│        "name": "Advanced Breathing",                │
│        "id": "workshop_002",                        │
│        "purchaseDate": "2024-02-20T14:00:00Z"      │
│      }                                               │
│    ],                                                │
│    "count": 2,                                       │
│    "message": "Found 2 previous purchase(s)"       │
│  }                                                   │
│                                                      │
│  OR (if guest):                                     │
│  {                                                   │
│    "success": true,                                 │
│    "purchasedItems": [],                            │
│    "isGuest": true,                                 │
│    "message": "No authentication provided"          │
│  }                                                   │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ERROR RESPONSES:                                    │
│  500: Failed to fetch purchase history               │
│  401: Invalid authentication token                   │
│  503: Database connection error                     │
└──────────────────────────────────────────────────────┘
```

## Data Model Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    MONGODB DATABASES                    │
└─────────────────────────────────────────────────────────┘

Database 1: swaryogaDB (MAIN)
├─ users Collection
│  ├─ userId
│  ├─ name
│  ├─ email
│  └─ preferences
│
├─ orders Collection
│  ├─ _id (ObjectId)
│  ├─ userId ──┐
│  ├─ items[]  │
│  │  ├─ name  │
│  │  ├─ id    │
│  │  ├─ price │
│  │  └─ qty   │
│  ├─ discount │
│  ├─ total    │
│  ├─ paymentStatus ◄──┐ We filter on this
│  └─ createdAt       │
│                     │
└─ cartItems Collection
   ├─ userId ─────────┘
   ├─ items[]
   │  ├─ id
   │  ├─ name
   │  ├─ price
   │  ├─ quantity
   │  └─ isRepeatPurchase  ◄── Calculated from orders
   └─ updatedAt

Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ New      │ ──► │ Check    │ ──► │ Get      │
│ Purchase │     │ History  │     │ Repeat   │
└──────────┘     │ (Orders) │     │ Status   │
                 └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ Apply    │
                                  │ 40%      │
                                  │ Discount │
                                  └──────────┘
```

## Component Hierarchy

```
App Router (Next.js 14)
│
├─ app/
│  ├─ checkout-enhanced/
│  │  └─ page.tsx
│  │     ├─ useEffect: Fetch purchase history
│  │     ├─ useState: cartItems (with isRepeatPurchase)
│  │     ├─ Components:
│  │     │  ├─ <CheckoutForm> (user details)
│  │     │  ├─ <EditableCart> (±, remove)
│  │     │  │   └─ Calls: updateCartItemQuantity()
│  │     │  │   └─ Calls: removeCartItem()
│  │     │  ├─ <PaymentMethodSelector>
│  │     │  └─ <OrderSummary> (shows discount)
│  │     └─ <CashfreePaymentButton>
│  │        └─ Initiates: /api/payments/cashfree/initiate
│  │
│  ├─ api/
│  │  ├─ user/
│  │  │  └─ purchase-history/
│  │  │     └─ route.ts (GET)
│  │  │        ├─ Verify JWT
│  │  │        ├─ Query orders
│  │  │        └─ Return purchased items
│  │  │
│  │  └─ payments/
│  │     └─ cashfree/
│  │        ├─ initiate/ (POST)
│  │        ├─ return/ (GET)
│  │        └─ webhook/ (POST)
│  │
│  └─ cart/
│     └─ page.tsx
│        └─ Uses: usePurchaseHistory hook
│
├─ components/
│  ├─ CashfreePaymentButton.tsx
│  │  └─ Renders: Blue payment button
│  │
│  └─ admin/crm/
│     └─ Various CRM components
│
├─ hooks/
│  └─ usePurchaseHistory.ts
│     ├─ Fetches: /api/user/purchase-history
│     ├─ Returns: isRepeatPurchase(name)
│     └─ Returns: getRepeatItems(items)
│
├─ lib/
│  ├─ cart.ts
│  │  ├─ getStoredCart()
│  │  ├─ updateCartItemQuantity()
│  │  ├─ removeCartItem()
│  │  └─ updateCartItem()
│  │
│  ├─ payments/
│  │  └─ cashfree.ts
│  │     ├─ cashfreeCreateOrder()
│  │     └─ cashfreeGetOrder()
│  │
│  └─ db.ts
│     └─ connectDB() → MongoDB connection
│
└─ public/
   └─ Assets

Dependency Graph:
   checkout-enhanced
     ├─ usePurchaseHistory hook
     ├─ lib/cart (functions)
     ├─ CashfreePaymentButton
     └─ lib/payments/cashfree

   CashfreePaymentButton
     ├─ Cashfree SDK (external)
     └─ lib/payments/cashfree
```

## Discount Calculation Flow

```
User Input:
├─ Cart Item 1: "Yoga Basics" | ₹500 | Qty: 1
├─ Cart Item 2: "Yoga Basics" | ₹500 | Qty: 1
└─ Cart Item 3: "Advanced"    | ₹800 | Qty: 1

         │
         ▼
Fetch Purchase History:
├─ Query: db.orders.find({userId, paymentStatus: 'completed'})
├─ Result: ["Yoga Basics", "Meditation"] (previous purchases)
         │
         ▼
Match & Mark Repeats:
├─ Item 1: "Yoga Basics" → Found in history → isRepeatPurchase = true
├─ Item 2: "Yoga Basics" → Found in history → isRepeatPurchase = true
└─ Item 3: "Advanced" → NOT in history → isRepeatPurchase = false

         │
         ▼
Calculate Prices:
├─ Item 1 (REPEAT):    ₹500 × 0.6 = ₹300 per unit | × Qty 1 = ₹300
├─ Item 2 (REPEAT):    ₹500 × 0.6 = ₹300 per unit | × Qty 1 = ₹300
└─ Item 3 (NEW):       ₹800 × 1.0 = ₹800 per unit | × Qty 1 = ₹800

         │
         ▼
Order Summary:
├─ Subtotal: ₹300 + ₹300 + ₹800 = ₹1400
├─ Discount: (₹500 - ₹300) + (₹500 - ₹300) = -₹400
├─ Service Charges (2.5%): ₹1400 × 0.025 = ₹35
├─ Shipping: Free
         │
         ▼
Final Total: ₹1400 - ₹400 + ₹35 = ₹1035 ✓

User pays: ₹1035 (instead of ₹1535)
User saves: ₹400 (40% on repeat items only)
```

## State Management Flow

```
Component: app/checkout-enhanced/page.tsx

Local State:
┌────────────────────────────────────────────┐
│ cartItems: CartItem[] = [                 │
│   {                                        │
│     id: "item_1",                         │
│     name: "Yoga Basics",                  │
│     price: 500,                           │
│     quantity: 1,                          │
│     currency: "₹",                        │
│     isRepeatPurchase: true  ◄─ Calculated│
│   },                                       │
│   ...                                      │
│ ]                                          │
└────────────────────────────────────────────┘
         │
         ▼ (onChange events)
Updates via:
├─ updateCartItemQuantity(id, newQty)
├─ removeCartItem(id)
└─ setCartItems(newItems)

         │
         ▼
Computed Values:
├─ subtotal = sum of (item.price × item.qty)
│  ├─ Apply 0.6 multiplier if isRepeatPurchase
│  └─ subtotal = ₹1400
│
├─ tax = subtotal × 0.025
│  └─ tax = ₹35
│
└─ total = subtotal + tax
   └─ total = ₹1435

         │
         ▼
Re-render Components:
├─ <EditableCart> (updated with new quantities)
├─ <OrderSummary> (updated with new totals)
└─ <CashfreePaymentButton> (passes new total)

         │
         ▼ (User clicks Pay)
Payment Flow:
├─ Initiate: POST /api/payments/cashfree/initiate
├─ Body: { amount: 1435, items: cartItems[], ... }
├─ Response: { paymentSessionId: "session_..." }
└─ Open: Cashfree.Checkout(sessionId)
```

---

This visual architecture helps understand how all components work together to provide the repeat purchase discount feature!
