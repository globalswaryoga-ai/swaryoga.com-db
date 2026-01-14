# Workshop Payment Button - Usage Guide

## 📋 Overview

Complete workshop payment system with direct PayU links for multiple workshops, modes, and languages.

**Workshops Configured:**
1. ✅ **Swar Yoga Basic Program** - 2 Days (7:00 PM - 8:30 PM) - ₹3300
2. ✅ **Swar Yoga Level-1** - 5 Days - ₹3300
3. ✅ **Yogasana Sadhana** - 3 Days - ₹330
4. ✅ **Breathing Basics** - 2 Days - ₹1500

---

## 🚀 Quick Start

### Option 1: Simple Button (Swar Yoga Basic - Hindi - Online)

```tsx
import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function BasicWorkshopPage() {
  return (
    <WorkshopPaymentButton
      workshopSlug="swar-yoga-basic-program"
      mode="online"
      language="hindi"
      showDetails={true}
      showLanguageSelector={false}
    />
  );
}
```

### Option 2: With Mode & Language Selectors

```tsx
<WorkshopPaymentButton
  workshopSlug="swar-yoga-level-1"
  showDetails={true}
  showModeSelector={true}
  showLanguageSelector={true}
/>
```

### Option 3: Direct Button Only

```tsx
import PayUStaticButton from '@/components/PayUStaticButton';
import { getWorkshopPaymentLink } from '@/lib/workshops/workshopPaymentConfig';

export default function SimpleButton() {
  const link = getWorkshopPaymentLink('swar-yoga-basic-program', 'online', 'hindi');
  
  return (
    <PayUStaticButton
      workshopName="Swar Yoga Basic Program"
      payuLink={link}
      buttonText="Enroll Now"
    />
  );
}
```

---

## 🎯 Swar Yoga Basic Program - Specific Example

**Details:**
- Name: Swar Yoga Basic Program - 2 Days
- Duration: 2 days only
- Schedule: 7:00 PM - 8:30 PM
- Price: ₹3300
- Mode: Online
- Language: Hindi

### Complete Page Implementation

```tsx
'use client';

import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function SwarYogaBasicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Swar Yoga Basic Program
          </h1>
          <p className="text-lg text-gray-600">
            2 Days • 7:00 PM - 8:30 PM • ₹3300
          </p>
        </div>

        {/* Course Description */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Program</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Introduction to Swar Yoga fundamentals</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Learn basic breathing techniques (Pranayama)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Understand energy flow in the body</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Perfect for beginners</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Online mode - join from anywhere</span>
            </li>
          </ul>
        </div>

        {/* Payment Button */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Enroll Now
          </h2>
          <WorkshopPaymentButton
            workshopSlug="swar-yoga-basic-program"
            mode="online"
            language="hindi"
            showDetails={true}
            showModeSelector={false}
            showLanguageSelector={false}
          />
        </div>

        {/* Benefits */}
        <div className="bg-green-50 border-l-4 border-green-600 rounded-lg p-6 mt-8">
          <h3 className="font-bold text-green-900 mb-2">Why Join?</h3>
          <p className="text-green-800 text-sm">
            Learn authentic Swar Yoga from expert instructors. This 2-day intensive 
            program covers all essentials for beginners to start their yoga journey.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 📱 Props Reference

### WorkshopPaymentButton Props

```typescript
interface WorkshopPaymentButtonProps {
  workshopSlug: string;                    // Required: 'swar-yoga-basic-program', 'swar-yoga-level-1', etc.
  mode?: 'online' | 'offline' | 'residential' | 'recorded';  // Default: 'online'
  language?: 'english' | 'hindi' | 'marathi' | 'nepali';     // Default: 'english'
  className?: string;                      // Optional: CSS classes
  showDetails?: boolean;                   // Default: true
  showModeSelector?: boolean;              // Default: false
  showLanguageSelector?: boolean;          // Default: true
}
```

### PayUStaticButton Props

```typescript
interface PayUStaticButtonProps {
  workshopName: string;        // Workshop display name
  payuLink: string;            // PayU payment link
  mode?: string;               // Workshop mode (for reference)
  language?: string;           // Workshop language (for reference)
  className?: string;          // Optional CSS classes
  buttonText?: string;         // Button text (default: 'Pay Now')
}
```

---

## 🎯 Workshop Slugs

Use these slugs to reference workshops:

```typescript
'swar-yoga-basic-program'   // Swar Yoga Basic Program - 2 Days
'swar-yoga-level-1'        // Swar Yoga Level-1 Workshop
'yogasana-sadhana'         // Yogasana Sadhana Workshop
'breathing-basics'         // Breathing Basics Workshop
```

---

## 🌍 Supported Modes

Each workshop may support different modes:

```typescript
'online'       // Online classes
'offline'      // In-person classes
'residential'  // Residential program
'recorded'     // Recorded classes
```

**Note:** Not all workshops support all modes. Check configuration file.

---

## 🗣️ Supported Languages

```typescript
'english'   // English
'hindi'     // Hindi (हिंदी)
'marathi'   // Marathi (मराठी)
'nepali'    // Nepali (नेपाली)
```

---

## 🔧 Adding New Workshops

Edit `/lib/workshops/workshopPaymentConfig.ts`:

```typescript
export const MyNewWorkshop: WorkshopPaymentConfig = {
  slug: 'my-new-workshop',
  name: 'My New Workshop',
  shortName: 'New Workshop',
  duration: '3 days',
  schedule: '9:00 AM - 10:30 AM',
  basePrice: 2000,
  currency: 'INR',
  paymentLinks: {
    online: {
      english: 'https://u.payu.in/new-workshop-english',
      hindi: 'https://u.payu.in/new-workshop-hindi',
    },
  },
};

// Add to export
export const workshopPaymentConfig: Record<string, WorkshopPaymentConfig> = {
  'my-new-workshop': MyNewWorkshop,
  // ... other workshops
};
```

---

## 🔗 Helper Functions

### Get Payment Link

```typescript
import { getWorkshopPaymentLink } from '@/lib/workshops/workshopPaymentConfig';

const link = getWorkshopPaymentLink('swar-yoga-basic-program', 'online', 'hindi');
// Returns: 'https://u.payu.in/kru2VzxJ7TlK'
```

### Get Workshop Details

```typescript
import { getWorkshopDetails } from '@/lib/workshops/workshopPaymentConfig';

const workshop = getWorkshopDetails('swar-yoga-basic-program');
// Returns: { name, duration, schedule, basePrice, ... }
```

### Get Available Modes

```typescript
import { getAvailableModes } from '@/lib/workshops/workshopPaymentConfig';

const modes = getAvailableModes('swar-yoga-basic-program');
// Returns: ['online', 'offline', 'residential']
```

### Get Available Languages

```typescript
import { getAvailableLanguages } from '@/lib/workshops/workshopPaymentConfig';

const languages = getAvailableLanguages('swar-yoga-basic-program', 'online');
// Returns: ['english', 'hindi', 'marathi']
```

---

## 💻 Common Implementation Patterns

### Pattern 1: Landing Page with Multiple Workshops

```tsx
'use client';

import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function WorkshopsPage() {
  const workshops = [
    'swar-yoga-basic-program',
    'swar-yoga-level-1',
    'yogasana-sadhana',
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
      {workshops.map(slug => (
        <div key={slug} className="bg-white rounded-lg shadow-lg p-6">
          <WorkshopPaymentButton
            workshopSlug={slug}
            showDetails={true}
            showLanguageSelector={true}
          />
        </div>
      ))}
    </div>
  );
}
```

### Pattern 2: Individual Workshop Page

```tsx
'use client';

export default function SwarYogaBasicPage() {
  return (
    <div>
      <h1>Swar Yoga Basic Program</h1>
      <p>Join our 2-day intensive program</p>
      <WorkshopPaymentButton
        workshopSlug="swar-yoga-basic-program"
        mode="online"
        language="hindi"
        showModeSelector={false}
        showLanguageSelector={false}
      />
    </div>
  );
}
```

### Pattern 3: With Custom Styling

```tsx
<WorkshopPaymentButton
  workshopSlug="swar-yoga-basic-program"
  className="my-custom-class"
/>
```

---

## 🎨 Styling

The button uses inline styles that match your PayU theme:
- Color: `#1CA953` (Green)
- Width: `200px`
- Padding: `11px 0px`
- Border Radius: `3.229px`
- Hover effect included

### Custom Button Colors

Edit `PayUStaticButton.tsx` to change colors:

```tsx
backgroundColor: '#1CA953',  // Change this
```

---

## 📊 Button Appearance

```
┌──────────────────┐
│   💳 Pay Now     │  ← Green button (#1CA953)
└──────────────────┘
   Width: 200px
   Height: ~35px
   Font: Bold, 12px
   Color: White
```

---

## ✅ Checklist for Implementation

- [ ] Add PayU links to `workshopPaymentConfig.ts`
- [ ] Update workshop details (duration, schedule, price)
- [ ] Test payment button on staging
- [ ] Verify PayU links work
- [ ] Check all languages display correctly
- [ ] Test on mobile devices
- [ ] Deploy to production
- [ ] Monitor payment dashboard

---

## 🚀 Ready to Use!

All files are ready to implement:
- ✅ `/lib/workshops/workshopPaymentConfig.ts` - Workshop configuration
- ✅ `/components/PayUStaticButton.tsx` - Basic button component
- ✅ `/components/WorkshopPaymentButton.tsx` - Full-featured component

Just import and use! 🎉

---

## 📞 Support

- Check the configuration file for available options
- Review the component props for customization
- Add new workshops to the config file
- Update PayU links as needed
