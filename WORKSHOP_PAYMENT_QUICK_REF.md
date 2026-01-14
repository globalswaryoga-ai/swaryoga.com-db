# Workshop Payment Button - Quick Reference

## 🎯 One-Liner for Swar Yoga Basic Program

```tsx
<WorkshopPaymentButton workshopSlug="swar-yoga-basic-program" mode="online" language="hindi" />
```

---

## 📋 All Workshop Slugs

```typescript
'swar-yoga-basic-program'   // Swar Yoga Basic - 2 Days (7-8:30 PM)
'swar-yoga-level-1'        // Swar Yoga Level-1 - 5 Days
'yogasana-sadhana'         // Yogasana Sadhana - 3 Days
'breathing-basics'         // Breathing Basics - 2 Days
```

---

## 🌍 Available Languages

```typescript
'english'   // English
'hindi'     // हिंदी
'marathi'   // मराठी
'nepali'    // नेपाली
```

---

## 📍 Available Modes

```typescript
'online'       // Online mode
'offline'      // Offline mode
'residential'  // Residential mode
'recorded'     // Recorded mode
```

---

## 💻 Component Props

```typescript
<WorkshopPaymentButton
  workshopSlug="swar-yoga-basic-program"        // Required
  mode="online"                                 // Optional: 'online' | 'offline' | 'residential'
  language="hindi"                              // Optional: 'english' | 'hindi' | 'marathi' | 'nepali'
  className=""                                  // Optional: CSS classes
  showDetails={true}                            // Optional: show workshop details
  showModeSelector={false}                      // Optional: show mode selector
  showLanguageSelector={true}                   // Optional: show language selector
/>
```

---

## 🔗 Direct PayU Links

Use `getWorkshopPaymentLink()` to get PayU links:

```typescript
import { getWorkshopPaymentLink } from '@/lib/workshops/workshopPaymentConfig';

const link = getWorkshopPaymentLink(
  'swar-yoga-basic-program',    // Workshop slug
  'online',                      // Mode
  'hindi'                        // Language
);
// Returns: 'https://u.payu.in/kru2VzxJ7TlK'
```

---

## 📊 Workshop Details

```typescript
import { getWorkshopDetails } from '@/lib/workshops/workshopPaymentConfig';

const workshop = getWorkshopDetails('swar-yoga-basic-program');
// {
//   slug: 'swar-yoga-basic-program',
//   name: 'Swar Yoga Basic Program - 2 Days',
//   duration: '2 days only',
//   schedule: '7:00 PM - 8:30 PM',
//   basePrice: 3300,
//   currency: 'INR',
//   paymentLinks: { ... }
// }
```

---

## 🎨 Component Variations

### Simple Button (Fixed Mode & Language)
```tsx
<WorkshopPaymentButton
  workshopSlug="swar-yoga-basic-program"
  mode="online"
  language="hindi"
  showLanguageSelector={false}
/>
```

### With Language Selector
```tsx
<WorkshopPaymentButton
  workshopSlug="swar-yoga-basic-program"
  showLanguageSelector={true}
/>
```

### With Mode & Language Selectors
```tsx
<WorkshopPaymentButton
  workshopSlug="swar-yoga-level-1"
  showModeSelector={true}
  showLanguageSelector={true}
/>
```

### Direct Button (No Selectors)
```tsx
<PayUStaticButton
  workshopName="Swar Yoga Basic Program"
  payuLink="https://u.payu.in/kru2VzxJ7TlK"
/>
```

---

## 💡 Common Patterns

### Pattern 1: Landing Page
```tsx
<WorkshopPaymentButton
  workshopSlug="swar-yoga-basic-program"
  showDetails={true}
  showLanguageSelector={true}
/>
```

### Pattern 2: Workshop Grid
```tsx
{workshops.map(slug => (
  <WorkshopPaymentButton
    key={slug}
    workshopSlug={slug}
    showDetails={true}
    showLanguageSelector={true}
  />
))}
```

### Pattern 3: Minimal
```tsx
<WorkshopPaymentButton workshopSlug="swar-yoga-basic-program" />
```

---

## 📁 File Structure

```
components/
├── PayUStaticButton.tsx              ← Basic button
└── WorkshopPaymentButton.tsx         ← Full-featured button

lib/
└── workshops/
    └── workshopPaymentConfig.ts      ← Configuration

Documentation/
├── WORKSHOP_PAYMENT_BUTTON_GUIDE.md
├── WORKSHOP_PAYMENT_EXAMPLES.md
└── WORKSHOP_PAYMENT_SUMMARY.md
```

---

## 🚀 Implementation Checklist

- [ ] Import `WorkshopPaymentButton`
- [ ] Add to your page
- [ ] Update PayU links in config
- [ ] Test payment flow
- [ ] Test all languages
- [ ] Test on mobile
- [ ] Deploy

---

## 🎯 Swar Yoga Basic Program - Ready to Use

```tsx
import WorkshopPaymentButton from '@/components/WorkshopPaymentButton';

export default function SwarYogaBasicPage() {
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

**Output:**
- Shows workshop details (2 days, 7-8:30 PM, ₹3300)
- Green "Pay Now" button
- Redirects to PayU payment link

---

## 🔧 Update PayU Links

Edit `/lib/workshops/workshopPaymentConfig.ts`:

```typescript
paymentLinks: {
  online: {
    english: 'https://u.payu.in/YOUR_LINK',
    hindi: 'https://u.payu.in/kru2VzxJ7TlK',  // ← Your link
    marathi: 'https://u.payu.in/YOUR_LINK',
    nepali: 'https://u.payu.in/YOUR_LINK',
  },
}
```

---

## 📱 Responsive

✅ Desktop: Full layout
✅ Tablet: Optimized spacing
✅ Mobile: Full-width button

---

## 🔒 Security

✅ Direct PayU links (no API)
✅ No sensitive data in URLs
✅ HTTPS recommended
✅ Safe parameter encoding

---

## 📞 Support Files

1. `WORKSHOP_PAYMENT_BUTTON_GUIDE.md` - Full documentation
2. `WORKSHOP_PAYMENT_EXAMPLES.md` - Code examples
3. `workshopPaymentConfig.ts` - Configuration reference

---

## ✨ Features

✅ Multiple languages
✅ Multiple modes
✅ Workshop details display
✅ Professional styling
✅ Responsive design
✅ Helper functions
✅ Easy customization
✅ Production ready

---

**Ready to Use!** 🎉

Just import the component and add to your pages!
