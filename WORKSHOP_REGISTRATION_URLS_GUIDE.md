# 🎯 WORKSHOP REGISTRATION URLS - COMPLETE GUIDE

## Overview

Every workshop now has a unique, shareable registration URL that people can use to:
- Fill out registration form
- Automatically add to cart
- Proceed to checkout & payment
- Have data saved to Sales/CRM page

---

## Format

```
https://swaryoga.com/workshop/register/[workshop-slug]
```

---

## All Workshop Registration URLs

### **Current Workshops:**

| Workshop Name | Registration URL | Link |
|---|---|---|
| **Swar Yoga Basic Program** | `/workshop/register/swar-yoga-basic-program` | [Register](http://localhost:3000/workshop/register/swar-yoga-basic-program) |
| **Swar Yoga Level 1** | `/workshop/register/swar-yoga-level-1` | [Register](http://localhost:3000/workshop/register/swar-yoga-level-1) |
| **Swar Yoga Level 2** | `/workshop/register/swar-yoga-level-2` | [Register](http://localhost:3000/workshop/register/swar-yoga-level-2) |
| **Swar Yoga Level 3** | `/workshop/register/swar-yoga-level-3` | [Register](http://localhost:3000/workshop/register/swar-yoga-level-3) |
| **Swar Yoga Level 4** | `/workshop/register/swar-yoga-level-4` | [Register](http://localhost:3000/workshop/register/swar-yoga-level-4) |
| **Yoga Asana Sadhana** | `/workshop/register/yogasana-sadhana` | [Register](http://localhost:3000/workshop/register/yogasana-sadhana) |
| **Breathing Basics** | `/workshop/register/breathing-basics` | [Register](http://localhost:3000/workshop/register/breathing-basics) |
| **Bandhan Mukti** | `/workshop/register/bandhan-mukti` | [Register](http://localhost:3000/workshop/register/bandhan-mukti) |
| **Astavakra Gita** | `/workshop/register/astavakra` | [Register](http://localhost:3000/workshop/register/astavakra) |
| **Sound Healing** | `/workshop/register/sound-healing` | [Register](http://localhost:3000/workshop/register/sound-healing) |
| **Chakra Awakening** | `/workshop/register/chakra-awakening` | [Register](http://localhost:3000/workshop/register/chakra-awakening) |
| **Meditation Mastery** | `/workshop/register/meditation-mastery` | [Register](http://localhost:3000/workshop/register/meditation-mastery) |
| **Pranayama Secrets** | `/workshop/register/pranayama-secrets` | [Register](http://localhost:3000/workshop/register/pranayama-secrets) |
| **Mantra Power** | `/workshop/register/mantra-power` | [Register](http://localhost:3000/workshop/register/mantra-power) |
| **Life Transformation** | `/workshop/register/life-transformation` | [Register](http://localhost:3000/workshop/register/life-transformation) |
| **Stress Relief Yoga** | `/workshop/register/stress-relief-yoga` | [Register](http://localhost:3000/workshop/register/stress-relief-yoga) |
| **Sleep Better Program** | `/workshop/register/sleep-better-program` | [Register](http://localhost:3000/workshop/register/sleep-better-program) |
| **Energy Boost** | `/workshop/register/energy-boost` | [Register](http://localhost:3000/workshop/register/energy-boost) |
| **Wellness Retreat** | `/workshop/register/wellness-retreat` | [Register](http://localhost:3000/workshop/register/wellness-retreat) |
| **Advanced Yoga** | `/workshop/register/advanced-yoga` | [Register](http://localhost:3000/workshop/register/advanced-yoga) |

---

## How Registration Works

### **Flow:**

```
1. User visits registration URL
   ↓
2. Sees registration form with:
   - First Name *
   - Last Name (optional)
   - Email *
   - Phone Number *
   - City *
   - State (optional)
   - Country (optional)
   
3. Clicks "Register & Add to Cart"
   ↓
4. System:
   - Validates all fields
   - Adds workshop to cart (localStorage)
   - Saves lead to CRM database
   - Shows success message
   
5. Auto-redirects to /checkout
   ↓
6. User proceeds with payment
   ↓
7. Order saved to database
   ↓
8. Sales page updated with registration data
```

---

## Features

### ✅ **Share & Copy URLs**

On each registration page, there's a "Copy" button to easily share the URL:

```
User sees: https://swaryoga.com/workshop/register/swar-yoga-level-1
Clicks: Copy button
Action: URL copied to clipboard
Share: User can paste in WhatsApp, Email, Social Media, etc.
```

### ✅ **Auto-Fill for Logged-In Users**

If user is already logged in:
- First name auto-fills from profile
- Email auto-fills from profile
- Can complete form quickly

### ✅ **No Registration Required (Initially)**

- Users can fill form without signing up first
- After clicking "Register & Add to Cart", goes to checkout
- Can create account during checkout/payment
- Or sign in with existing account

### ✅ **CRM Integration**

Registration data automatically saved to CRM with:
- Name, Email, Phone, City, State, Country
- Workshop name and slug
- Registration source (workshop-registration-url)
- Timestamp
- User ID (if logged in)
- Labels for filtering: ['workshop-registration', 'workshop-slug']

### ✅ **For Future Workshops**

New workshops added automatically work:
1. Add workshop to `workshopCatalog` in `lib/workshops.ts`
2. URL becomes: `/workshop/register/[new-workshop-slug]`
3. Done! No additional code needed

---

## Use Cases

### **Case 1: Direct Registration Link**

```
Friend 1 wants to share with Friend 2
Friend 1: "Sign up here: https://swaryoga.com/workshop/register/swar-yoga-level-1"
Friend 2: Clicks → Registration form → Pays → Enrolled
```

### **Case 2: Social Media Campaign**

```
Post on Instagram:
"Join our Swar Yoga Level 1 workshop! 
Register now: swaryoga.com/workshop/register/swar-yoga-level-1
Limited seats available 🧘"

Users click → Register → Pay → Enrolled
```

### **Case 3: WhatsApp/Telegram Sharing**

```
Copy URL from registration page
Paste in WhatsApp/Telegram
Friends click → Fill form → Pay → Enrolled
```

### **Case 4: Email Campaign**

```
Send email with:
"Join our exclusive workshop series!
[Swar Yoga Level 1](https://swaryoga.com/workshop/register/swar-yoga-level-1)
[Breathing Basics](https://swaryoga.com/workshop/register/breathing-basics)
[Chakra Awakening](https://swaryoga.com/workshop/register/chakra-awakening)"

Subscribers click → Register → Pay
```

### **Case 5: Sales Team Sharing**

```
Sales person has list of 50 leads
Sends each: "Personal recommendation for you: 
[Register for Meditation Mastery](https://swaryoga.com/workshop/register/meditation-mastery)"

Lead clicks → Registers → Data appears in Sales page
Sales person sees in CRM → Can follow up
```

---

## Data Flow to Sales Page

### **What Gets Saved:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "9876543210",
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "status": "lead",
  "source": "workshop-registration-url",
  "workshopName": "Swar Yoga Level 1",
  "workshopSlug": "swar-yoga-level-1",
  "labels": ["workshop-registration", "swar-yoga-level-1"],
  "metadata": {
    "registrationSource": "workshop-registration-url",
    "registeredAt": "2026-01-16T10:30:00Z",
    "userId": "user-id-or-anonymous"
  }
}
```

### **Where It Appears:**

1. **CRM Leads Database** - See all registrations
2. **Sales Page** - Filter by workshop
3. **Contact History** - Track all touchpoints
4. **Labels** - Filter by source (workshop-registration)
5. **User Profile** - If user is logged in, connects to account

---

## Implementation Details

### **New Files Created:**

```
app/workshop/register/[slug]/page.tsx
  ↓
  - Dynamic registration form
  - Cart integration
  - CRM submission
  - URL copy functionality

app/api/crm/workshop-registration/route.ts
  ↓
  - API endpoint for saving registrations
  - Lead creation/update
  - Optional authentication
  - Returns registration confirmation
```

### **How It Works Internally:**

1. **Dynamic Route**: `[slug]` captures workshop identifier
2. **Workshop Lookup**: Finds workshop details from catalog
3. **Form Submission**: 
   - Validates fields
   - Checks authentication (optional)
   - Saves to CRM
   - Adds to cart (localStorage)
4. **Redirect**: Auto-navigates to `/checkout`
5. **Payment**: Standard checkout flow

---

## For Future Workshops

### **To add new workshop registration:**

1. Add to `workshopCatalog`:
```typescript
{
  slug: 'new-workshop-name',
  name: 'New Workshop Display Name',
  basePrice: 4999,
  // ... other properties
}
```

2. That's it! Registration URL automatically works:
```
https://swaryoga.com/workshop/register/new-workshop-name
```

---

## Testing

### **Test a Registration URL:**

1. Go to: `http://localhost:3000/workshop/register/swar-yoga-level-1`
2. Fill form with test data
3. Click "Register & Add to Cart"
4. Should redirect to `/checkout`
5. Check localStorage for cart
6. Check CRM database for lead

### **Test URL Copy:**

1. On registration page, see URL section
2. Click "Copy" button
3. Paste in text editor or browser
4. Should be complete URL: `http://localhost:3000/workshop/register/[slug]`

---

## Summary

✅ **Every workshop has a unique URL**
✅ **Easy to copy and share**
✅ **Works without prior signup**
✅ **Auto-adds to cart**
✅ **Saves to CRM/Sales page**
✅ **Works for current and future workshops**
✅ **No additional code needed for new workshops**
✅ **Mobile responsive**
✅ **Fast registration (< 1 minute)**
✅ **Professional appearance**

---

## Quick Reference

**Base URL format:**
```
https://swaryoga.com/workshop/register/[workshop-slug]
```

**Example URLs:**
```
https://swaryoga.com/workshop/register/swar-yoga-level-1
https://swaryoga.com/workshop/register/breathing-basics
https://swaryoga.com/workshop/register/chakra-awakening
https://swaryoga.com/workshop/register/meditation-mastery
```

**Share via:**
- WhatsApp: Copy URL → Paste in chat
- Email: `[Register Here](URL)` 
- Social: Post with link
- SMS: Share shortened URL
- QR Code: Generate from URL

---

**That's it! Your workshop registration system is complete and ready to scale!** 🚀
