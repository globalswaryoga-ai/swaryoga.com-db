# 🎯 QUICK LOCALHOST TEST COMMANDS

## ⚡ Fast Testing Reference

### 1. WORKSHOPS PAGE
**URL**: http://localhost:3000/workshops
**What to Test** (2 minutes):
```
✓ See 3 workshop cards
✓ Click Category filter → opens exclusively
✓ Click Workshop filter → closes Category
✓ Click "Next" → shows next 3 cards
✓ Click "Register Now" → goes to /registernow
✓ Click "Learn More" → opens /workshops/[slug]
✓ See starting fees (₹96, ₹3,300, etc.)
```

### 2. WORKSHOP DETAIL PAGE
**URL**: http://localhost:3000/workshops/swar-yoga-basic
**What to Test** (2 minutes):
```
✓ Full workshop details load
✓ See image, description, videos
✓ See duration: 3 days
✓ See level: Beginner
✓ Click "Register Now" → /registernow?workshop=swar-yoga-basic
```

### 3. REGISTRATION PAGE
**URL**: http://localhost:3000/registernow?workshop=swar-yoga-basic
**What to Test** (3 minutes):
```
✓ See workshop selected: "Swar Yoga Basic"
✓ See schedules in cards (mobile) or table (desktop)
✓ See fees: ₹96 for online and offline
✓ See mode, language, batch info
✓ Click "Book Seat" → proceeds to checkout
✓ Check different workshops show different fees
```

### 4. BUDGET MODULE (NEW)
**URL**: http://localhost:3000/life-planner/dashboard/budget
**What to Test** (3 minutes):
```
✓ Budget panel loads
✓ See 11 default allocations (30%, 15%, 15%, etc.)
✓ Total shows as 100%
✓ Try setting income: 12,00,000
✓ See monthly/weekly calculated automatically
✓ Try generating a report for this month
✓ Check variance analysis displays
```

### 5. POLICY PAGES (NEW)
**Test all three**:
```
http://localhost:3000/terms
http://localhost:3000/privacy
http://localhost:3000/refunds-and-cancellations

✓ All pages load without errors
✓ Content displays properly
✓ Navigation works
```

---

## 📋 KEY FILES CHANGED (Dec 22, 2025)

### 1. Workshops Page
**File**: `app/workshops/page.tsx`
**Changes**:
- ✅ Exclusive accordion filters (one opens at a time)
- ✅ 3 cards per page pagination
- ✅ Latest dates first sorting
- ✅ Fixed registernow links

**Test**: Type `/workshops` in address bar

### 2. Budget Module (NEW)
**Files**:
- `components/life-planner/MyBudgetPanel.tsx` (NEW)
- `app/life-planner/dashboard/budget/page.tsx` (NEW)
- `app/api/accounting/budget/route.ts` (NEW)
- `app/api/accounting/budget/report/route.ts` (NEW)
- `app/api/accounting/budget/download/route.ts` (NEW)

**Test**: Type `/life-planner/dashboard/budget` in address bar

### 3. Policy Pages (NEW)
**Files**:
- `app/terms/page.tsx` (NEW)
- `app/privacy/page.tsx` (NEW)
- `app/refunds-and-cancellations/page.tsx` (NEW)

**Test**: Navigate to any of these URLs

### 4. Payment Integration
**Files**:
- `app/api/payments/cashfree/initiate/route.ts` (NEW)
- `app/api/payments/cashfree/return/route.ts` (NEW)
- `app/api/payments/cashfree/webhook/route.ts` (NEW)
- `app/api/payments/payu/verify/route.ts` (NEW)

**Test**: Go to `/checkout` and try payment flow

---

## 🎯 WHAT YOU'LL SEE ON LOCALHOST

### Workshops Page Screenshot (Expected):
```
┌─────────────────────────────────────────────┐
│          TRANSFORMATIVE WORKSHOPS           │
│  Choose from 20 comprehensive workshops...  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ FILTERS:                                    │
│ [Category ▼]  [Workshops ▼] [Mode ▼] ...   │
│ (Only one opens at a time - Exclusive)      │
└─────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│Workshop 1│  │Workshop 2│  │Workshop 3│
│          │  │          │  │          │
│₹Price    │  │₹Price    │  │₹Price    │
│[More][Reg│  │[More][Reg│  │[More][Reg│
└──────────┘  └──────────┘  └──────────┘

← Previous [●][○][○][○] Next →
(3 cards per page, dot shows page 1 of 4)
```

### Budget Page Screenshot (Expected):
```
┌─────────────────────────────────────────────┐
│         MY BUDGET PANEL                     │
├─────────────────────────────────────────────┤
│ Income Target (Yearly): [12,00,000]         │
│ Monthly: ₹1,00,000  Weekly: ₹23,077         │
│                                [Save]       │
├─────────────────────────────────────────────┤
│ ALLOCATIONS (Must total 100%):              │
│ ✓ Profit Ratio: 30%                         │
│ ✓ Self Expense: 15%                         │
│ ✓ Family Expense: 15%                       │
│ ✓ Health: 5%                                │
│ ✓ LIC/Insurance: 5%                         │
│ ... (6 more)                                │
│ Total: 100% ✓                               │
├─────────────────────────────────────────────┤
│ REPORT:                                     │
│ Date Range: [From] [To]                     │
│ Mode: [Actual ✓] [Target]                   │
│                      [Generate] [Export]    │
└─────────────────────────────────────────────┘
```

### Registration Page Screenshot (Expected):
```
┌──────────────────────────────────────────────┐
│ SWAR YOGA BASIC                              │
├──────────────────────────────────────────────┤
│ SCHEDULES:                                   │
│                                              │
│ ┌────────────────────────────────┐           │
│ │ Jan 2026 | Online | English     │           │
│ │ Time: 7:00 AM                   │           │
│ │ Seats: 60 Available             │           │
│ │ Fees: ₹96                       │           │
│ │           [Book Seat]           │           │
│ └────────────────────────────────┘           │
│                                              │
│ ┌────────────────────────────────┐           │
│ │ Jan 2026 | Offline | Hindi      │           │
│ │ Location: Mumbai                │           │
│ │ Fees: ₹96                       │           │
│ │           [Book Seat]           │           │
│ └────────────────────────────────┘           │
└──────────────────────────────────────────────┘
```

---

## 🚀 COMPLETE TEST FLOW (5 minutes)

### Step 1: Workshops List (1 min)
1. Go to http://localhost:3000/workshops
2. See 3 cards displayed
3. Click "Category" filter
4. Click "Mode" filter
5. Verify Category closes automatically

### Step 2: Workshop Detail (1 min)
1. Click "Learn More" on any card
2. See full workshop details
3. See videos/testimonials
4. Click "Register Now"

### Step 3: Registration (1.5 min)
1. See workshop selected
2. See fees displayed (₹96 for basic)
3. Select different mode
4. Verify fees correct
5. Try "Book Seat"

### Step 4: Budget (1 min)
1. Go to http://localhost:3000/life-planner/dashboard/budget
2. Set income: 1200000
3. Verify allocations = 100%
4. Save and generate report

### Step 5: Verify All Works (0.5 min)
1. Check browser console (F12) - NO ERRORS
2. Check network tab - NO 404s
3. Test on mobile view (Ctrl+Shift+M)

---

## 💾 ALL WORKSHOP FEES AT A GLANCE

```
HEALTH CATEGORY:
Swar Yoga Basic ............ ₹96 (3 days)
Yogasana & Sadhana ......... ₹330 (30 days, recorded)
Swar Yoga Level-1 .......... ₹3,300 (15 days)
Swar Yoga Level-3 .......... ₹3,300 (10 days)
Swar Yoga Level-4 .......... ₹6,000 (42 days)
96 Days Weight Loss ........ ₹6,600
42 Days Meditation ......... ₹2,400
Amrut Aahar (42 days) ...... ₹2,400
Bandhan Mukti .............. ₹2,400

WEALTH CATEGORY:
Swar Yoga Level-2 .......... ₹3,300 (14 days)
Businessman Program ........ ₹4,200 (10 weeks)
Corporate Swar Yoga ........ ₹4,200

MARRIED CATEGORY:
Pre-Pregnancy Planning ...... ₹3,300 (8 weeks)
Garbh Sanskar .............. ₹1,000/month
Happy Married Life ......... ₹5,900

YOUTH & CHILDREN:
Swar Yoga Youth ............ ₹999 (10 days)
Children Swar Yoga ......... ₹600 (10 days)

TRAININGS:
Teacher Training ........... ₹33,000 (15 days, residential)
Organiser Training ......... ₹4,500 (4 days)
Gurukul Teacher ............ ₹5,999 (5 days)
```

---

## 🔗 IMPORTANT URLs

### Main Pages:
```
Home:                 http://localhost:3000
Workshops:            http://localhost:3000/workshops
Workshop Detail:      http://localhost:3000/workshops/swar-yoga-basic
Register Now:         http://localhost:3000/registernow
Checkout:             http://localhost:3000/checkout
```

### Life Planner:
```
Daily Planner:        http://localhost:3000/life-planner/dashboard/daily
Budget Module:        http://localhost:3000/life-planner/dashboard/budget
Calendar:             http://localhost:3000/life-planner/dashboard/calendar
Notes:                http://localhost:3000/life-planner/dashboard/notes
```

### Admin:
```
CRM Analytics:        http://localhost:3000/admin/crm/analytics
CRM Leads:            http://localhost:3000/admin/crm/leads
CRM Sales:            http://localhost:3000/admin/crm/sales
CRM Messages:         http://localhost:3000/admin/crm/messages
Admin Accounting:     http://localhost:3000/admin/accounting
```

### Policies:
```
Terms & Conditions:   http://localhost:3000/terms
Privacy Policy:       http://localhost:3000/privacy
Refunds & Cancellations: http://localhost:3000/refunds-and-cancellations
```

---

## ✅ READY FOR TESTING

**Server**: ✓ Running on port 3000
**Updates**: ✓ All 5 major features implemented
**Documentation**: ✓ Complete
**Code**: ✓ Committed and ready

**Start Testing Now!** 🚀
