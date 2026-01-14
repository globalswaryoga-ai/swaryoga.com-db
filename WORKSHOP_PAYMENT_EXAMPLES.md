# 🎯 Workshop Payment Button Examples

## Complete Implementation Examples

---

## 1️⃣ Swar Yoga Basic Program (2 Days)

**Details:**
- Duration: 2 days only
- Schedule: 7:00 PM - 8:30 PM
- Price: ₹3300
- Mode: Online
- Language: Hindi

### Simple Implementation

```tsx
import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function SwarYogaBasicPage() {
  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Swar Yoga Basic Program</h1>
      <p className="text-gray-600 mb-6">2 Days • 7:00 PM - 8:30 PM • ₹3300</p>
      
      <WorkshopPaymentButton
        workshopSlug="swar-yoga-basic-program"
        mode="online"
        language="hindi"
        showDetails={true}
        showLanguageSelector={false}
      />
    </div>
  );
}
```

### With Language Selector

```tsx
<WorkshopPaymentButton
  workshopSlug="swar-yoga-basic-program"
  mode="online"
  showDetails={true}
  showLanguageSelector={true}
/>
```

**Output:**
```
┌──────────────────────────────┐
│  Swar Yoga Basic Program - 2 Days
│  Duration: 2 days only
│  Schedule: 7:00 PM - 8:30 PM
│  Price: ₹3300
│
│  Select Language:
│  [English] [Hindi] [Marathi]
│
│     ┌──────────────────┐
│     │   💳 Pay Now     │
│     └──────────────────┘
│  🔒 Secure payment by PayU
└──────────────────────────────┘
```

---

## 2️⃣ Swar Yoga Level-1 Workshop

**Details:**
- Duration: 5 days
- Price: ₹3300
- Available Modes: Online, Offline, Residential
- Available Languages: English, Hindi, Marathi, Nepali

### With Mode & Language Selectors

```tsx
import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function SwarYogaL1Page() {
  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-2">Swar Yoga Level-1 Workshop</h1>
      <p className="text-gray-600 mb-8">5 Days • Advanced Yoga Training • ₹3300</p>
      
      <WorkshopPaymentButton
        workshopSlug="swar-yoga-level-1"
        showDetails={true}
        showModeSelector={true}
        showLanguageSelector={true}
      />
    </div>
  );
}
```

**Output:**
```
┌─────────────────────────────────────┐
│  Swar Yoga Level-1 Workshop
│  Duration: 5 days
│  Schedule: Varies by schedule
│  Price: ₹3300
│
│  Select Mode:
│  [Online] [Offline] [Residential]
│
│  Select Language:
│  [English] [Hindi] [Marathi] [Nepali]
│
│     ┌──────────────────┐
│     │   💳 Pay Now     │
│     └──────────────────┘
│  🔒 Secure payment by PayU
└─────────────────────────────────────┘
```

---

## 3️⃣ Yogasana Sadhana Workshop

**Details:**
- Duration: 3 days
- Price: ₹330
- Available Modes: Online
- Available Languages: English, Hindi

### Simple Implementation

```tsx
import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function YogasanaSadhanaPage() {
  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Yogasana Sadhana</h1>
      <p className="text-gray-600 mb-6">3 Days • Online • ₹330</p>
      
      <WorkshopPaymentButton
        workshopSlug="yogasana-sadhana"
        mode="online"
        showDetails={true}
        showLanguageSelector={true}
      />
    </div>
  );
}
```

---

## 4️⃣ Breathing Basics Workshop

**Details:**
- Duration: 2 days
- Price: ₹1500
- Available Modes: Online
- Available Languages: English, Hindi

### Simple Implementation

```tsx
import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function BreathingBasicsPage() {
  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Breathing Basics</h1>
      <p className="text-gray-600 mb-6">2 Days • Online • ₹1500</p>
      
      <WorkshopPaymentButton
        workshopSlug="breathing-basics"
        mode="online"
        showDetails={true}
        showLanguageSelector={true}
      />
    </div>
  );
}
```

---

## 🎨 All Workshops Landing Page

```tsx
'use client';

import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

const workshops = [
  {
    slug: 'swar-yoga-basic-program',
    title: 'Swar Yoga Basic Program',
    duration: '2 days',
    schedule: '7:00 PM - 8:30 PM',
    price: '₹3300',
    description: 'Perfect for beginners. Learn fundamentals of Swar Yoga.',
  },
  {
    slug: 'swar-yoga-level-1',
    title: 'Swar Yoga Level-1',
    duration: '5 days',
    schedule: 'Varies',
    price: '₹3300',
    description: 'Advanced training for intermediate practitioners.',
  },
  {
    slug: 'yogasana-sadhana',
    title: 'Yogasana Sadhana',
    duration: '3 days',
    schedule: 'Varies',
    price: '₹330',
    description: 'Master yoga postures and body alignment.',
  },
  {
    slug: 'breathing-basics',
    title: 'Breathing Basics',
    duration: '2 days',
    schedule: 'Varies',
    price: '₹1500',
    description: 'Learn fundamental breathing techniques.',
  },
];

export default function WorkshopsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Swar Yoga Workshops
          </h1>
          <p className="text-xl text-gray-600">
            Choose your workshop and start your yoga journey today
          </p>
        </div>

        {/* Workshops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {workshops.map(workshop => (
            <div
              key={workshop.slug}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
            >
              {/* Workshop Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">{workshop.title}</h2>
                <p className="text-blue-100">{workshop.description}</p>
              </div>

              {/* Workshop Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Duration</span>
                    <p className="text-gray-600">{workshop.duration}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Schedule</span>
                    <p className="text-gray-600">{workshop.schedule}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                  <span className="font-bold text-blue-900 text-lg">
                    {workshop.price}
                  </span>
                </div>

                {/* Payment Button */}
                <WorkshopPaymentButton
                  workshopSlug={workshop.slug}
                  showDetails={false}
                  showModeSelector={false}
                  showLanguageSelector={true}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Swar Yoga?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <span className="text-2xl">🎓</span>
              <div>
                <h3 className="font-bold text-gray-900">Expert Instructors</h3>
                <p className="text-gray-600">Learn from experienced yoga masters</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">💪</span>
              <div>
                <h3 className="font-bold text-gray-900">Proven Results</h3>
                <p className="text-gray-600">Transform your body and mind</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">🌍</span>
              <div>
                <h3 className="font-bold text-gray-900">Online & Offline</h3>
                <p className="text-gray-600">Learn from anywhere, anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔗 Using Helper Functions Directly

### Get Payment Link Directly

```tsx
import { getWorkshopPaymentLink } from '@/lib/workshops/workshopPaymentConfig';
import PayUStaticButton from '@/components/PayUStaticButton';

export default function DirectButtonPage() {
  const paymentLink = getWorkshopPaymentLink('swar-yoga-basic-program', 'online', 'hindi');
  
  return (
    <PayUStaticButton
      workshopName="Swar Yoga Basic Program"
      payuLink={paymentLink}
      buttonText="Enroll Now"
    />
  );
}
```

### Get Workshop Details

```tsx
import { getWorkshopDetails, getAvailableLanguages } from '@/lib/workshops/workshopPaymentConfig';

export default function WorkshopInfoPage() {
  const workshop = getWorkshopDetails('swar-yoga-basic-program');
  const languages = getAvailableLanguages('swar-yoga-basic-program', 'online');
  
  return (
    <div>
      <h1>{workshop?.name}</h1>
      <p>Duration: {workshop?.duration}</p>
      <p>Price: ₹{workshop?.basePrice}</p>
      <p>Available Languages: {languages.join(', ')}</p>
    </div>
  );
}
```

---

## 📱 Mobile Responsive

All examples are fully responsive:

```
Desktop (1200px+):
┌─────────────────────────────────────────────┐
│ ┌───────────────────┐ ┌───────────────────┐ │
│ │  Workshop 1       │ │  Workshop 2       │ │
│ │                   │ │                   │ │
│ │  [Pay Now Button] │ │  [Pay Now Button] │ │
│ └───────────────────┘ └───────────────────┘ │
│ ┌───────────────────┐ ┌───────────────────┐ │
│ │  Workshop 3       │ │  Workshop 4       │ │
│ │                   │ │                   │ │
│ │  [Pay Now Button] │ │  [Pay Now Button] │ │
│ └───────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────┘

Tablet (768px):
┌────────────────────────────┐
│ ┌──────────────┐           │
│ │ Workshop 1   │           │
│ │ [Pay Now]    │           │
│ └──────────────┘           │
│ ┌──────────────┐           │
│ │ Workshop 2   │           │
│ │ [Pay Now]    │           │
│ └──────────────┘           │
└────────────────────────────┘

Mobile (375px):
┌──────────────────┐
│ ┌──────────────┐ │
│ │ Workshop 1   │ │
│ │ [Pay Now]    │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │ Workshop 2   │ │
│ │ [Pay Now]    │ │
│ └──────────────┘ │
└──────────────────┘
```

---

## ✅ Quick Checklist

- [ ] Add PayU links to `/lib/workshops/workshopPaymentConfig.ts`
- [ ] Test Swar Yoga Basic Program button
- [ ] Test Swar Yoga Level-1 with mode selector
- [ ] Test language selectors
- [ ] Verify payment flows
- [ ] Test on mobile
- [ ] Check all workshops load
- [ ] Verify button styling

---

## 🎉 Ready to Deploy!

All components are ready to use. Just copy the examples and customize as needed!
