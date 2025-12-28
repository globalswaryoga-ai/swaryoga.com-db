# Panchang Calendar - UI Layout Guide

## Page Structure

```
┌─────────────────────────────────────────────────────────┐
│                    NAVIGATION BAR                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   HERO SECTION                           │
│              "Calculate Your Panchang"                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   FORM SECTION                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Country: [DROPDOWN]  State: [DROPDOWN]           │   │
│  │ City: [DROPDOWN]     Date: [DATE PICKER]         │   │
│  │                                                    │   │
│  │ Coordinates: Lat: 28.6139 | Lng: 77.2090        │   │
│  │                                                    │   │
│  │ [        CALCULATE HINDU CALENDAR       ]        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

AFTER SUBMISSION:

┌─────────────────────────────────────────────────────────┐
│                  RESULTS SECTION                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 📍 Delhi, India                                  │   │
│  │ 📅 December 20, 2024 | 🕐 Friday                │   │
│  │ 📍 Lat: 28.6139, Lng: 77.2090                   │   │
│  │                    ☀️ 07:07 Sunrise             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ⚠️ VAIDHRITI YOGA - AVOID NEW VENTURES          │   │
│  │ This yoga is inauspicious for starting new      │   │
│  │ work. Good for meditation and yoga only.        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                    ✨                             │   │
│  │           DAY IS AUSPICIOUS                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  PANCHANG CARDS (Responsive Grid):                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │   TITHI     │ │   YOGA      │ │  NAKSHATRA  │      │
│  │             │ │             │ │             │      │
│  │    15       │ │     ✨      │ │     🔥      │      │
│  │ Chaturdashi │ │  Auspicious │ │   Kritika   │      │
│  │             │ │   [GREEN]   │ │   ♈︎ III   │      │
│  │  Shukla     │ │             │ │             │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │   KARANA    │ │  MOON RASHI │ │  SUN RASHI  │      │
│  │             │ │             │ │             │      │
│  │     🌀      │ │     ♉︎      │ │     ♐︎      │      │
│  │   Bava      │ │   Taurus    │ │ Sagittarius │      │
│  │             │ │  Earth ♀   │ │   Fire ♃   │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 📋 TODAY'S RECOMMENDATIONS                      │   │
│  │                                                  │   │
│  │ ❌ AVOID TODAY          │  ✅ GOOD FOR TODAY    │   │
│  │ • Starting new business │  • Meditation        │   │
│  │ • Major decisions       │  • Yoga practice     │   │
│  │ • Long journeys         │  • Spiritual work    │   │
│  │                         │  • Self-reflection   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Card Styling Details

### Location & Basic Info Card
```
╔════════════════════════════════════════╗
║ 📍 Delhi, India                        ║
║                                        ║
║ 📅 December 20, 2024 | 🕐 Friday      ║
║ 📍 Lat: 28.6139, Lng: 77.2090         ║
║                                        ║
║                 ☀️ 07:07 Sunrise       ║
╚════════════════════════════════════════╝
```
**Styling**: Gradient from swar-primary-light to blue-50, rounded corners, border

### Warning Cards (Conditional)
```
╔════════════════════════════════════════╗
║ ⚠️ VAIDHRITI YOGA - AVOID NEW VENTURES ║
║                                        ║
║ This yoga is inauspicious for starting ║
║ new work or business. Good for         ║
║ meditation, yoga, and introspection.   ║
╚════════════════════════════════════════╝
```
**Styling**: Red/red-50 background, red left border, red text

### Day Quality Card
```
╔════════════════════════════════════════╗
║              ✨                        ║
║                                        ║
║        DAY IS AUSPICIOUS              ║
╚════════════════════════════════════════╝
```
**Styling**: 
- Auspicious: Green background, green border
- Inauspicious: Red background, red border
- Neutral: Yellow background, yellow border

### Panchang Information Cards

#### Tithi Card
```
╔═══════════════════╗
║ TITHI             ║
║                   ║
║ 15 (large)        ║
║ Chaturdashi (sm)  ║
║                   ║
║ [Shukla badge]    ║
╚═══════════════════╝
```
**Colors**: Purple gradient (purple-50 to indigo-50)

#### Yoga Card
```
╔═══════════════════╗
║ YOGA              ║
║                   ║
║ ✨ (large emoji)  ║
║ Auspicious (bold) ║
║ Very Auspicious   ║
║ (effect - small)  ║
╚═══════════════════╝
```
**Colors**: 
- Auspicious: Green gradient
- Inauspicious: Red gradient
- Very Auspicious: Gold

#### Nakshatra Card
```
╔═══════════════════╗
║ NAKSHATRA         ║
║                   ║
║ 🔥 (emoji)        ║
║ Kritika (name)    ║
║ 🔯 ♈︎ III (zodiac)║
╚═══════════════════╝
```
**Colors**: Blue gradient (blue-50 to cyan-50)

#### Karana Card
```
╔═══════════════════╗
║ KARANA            ║
║                   ║
║ 🌀 (emoji)        ║
║ Bava (name)       ║
╚═══════════════════╝
```
**Colors**: Orange gradient (orange-50 to amber-50)

#### Moon/Sun Rashi Cards
```
╔═══════════════════╗        ╔═══════════════════╗
║ MOON RASHI        ║        ║ SUN RASHI         ║
║                   ║        ║                   ║
║ ♉︎ (symbol)       ║        ║ ♐︎ (symbol)       ║
║ Taurus (name)     ║        ║ Sagittarius       ║
║ 🌙 Earth (♀)     ║        ║ ☀️ Fire (♃)      ║
╚═══════════════════╝        ╚═══════════════════╝
```
**Colors**: 
- Moon: Pink gradient (pink-50 to rose-50)
- Sun: Yellow/Orange gradient (yellow-50 to orange-50)

### Recommendations Section
```
╔════════════════════════════════════════╗
║ 📋 TODAY'S RECOMMENDATIONS             ║
║                                        ║
║ ❌ AVOID TODAY  │  ✅ GOOD FOR TODAY   ║
║                 │                      ║
║ • Starting      │  • Meditation        ║
║   businesses    │  • Yoga practice     ║
║ • Major         │  • Spiritual work    ║
║   decisions     │  • Introspection     ║
│ • Long journeys │  • Reflection        ║
╚════════════════════════════════════════╝
```
**Styling**: Indigo gradient (indigo-50 to purple-50), two-column grid, bullet points

## Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Full-width cards
- Stacked Panchang cards
- Font sizes: Smaller but readable
- Touch-friendly buttons and dropdowns

### Tablet (768px - 1024px)
- 2-column Panchang cards
- Slightly larger text
- Better spacing between cards
- Form fields on single lines where space allows

### Desktop (> 1024px)
- 3-column Panchang cards
- Optimal card sizes
- Smooth hover effects on cards
- Full recommendations grid visible
- Maximum readability and visual hierarchy

## Color Palette

| Element | Color | HEX | Usage |
|---------|-------|-----|-------|
| Primary | Swar Green | #00a67e | Headers, accents |
| Auspicious | Green | #51cf66 | Positive yogas, badges |
| Very Auspicious | Gold | #ffd700 | Best yogas, emphasis |
| Inauspicious | Red | #ff6b6b | Bad yogas, warnings |
| Neutral | Yellow | #fcd34d | Neutral days |
| Card Backgrounds | Light variants | -f50, -50 | Card bodies |
| Borders | Color variants | -200 to -300 | Subtle outlines |
| Text | Dark gray | #1a1a1a | Body text |
| Muted Text | Light gray | #666666 | Secondary text |

## Interactive Elements

### Hover Effects
- Cards: Shadow increases, slight lift effect
- Buttons: Background color change, scale transform
- Links: Color change, underline appearance

### Focus States
- Dropdowns: Blue ring, border highlight
- Date picker: Blue ring, clear focus indicator
- Buttons: Visible focus outline, keyboard accessible

### Loading States
- Submit button: Spinner animation, disabled state
- Results section: Fade in animation after load
- Cards: Stagger animation for visual interest

## Typography

- **Headlines**: Sora font, bold, 24px
- **Subheadings**: Sora font, semibold, 18px
- **Body Text**: System font, regular, 14-16px
- **Small Text**: System font, regular, 12px
- **Labels**: System font, semibold, 13px

## Accessibility Features

- ✓ Semantic HTML structure
- ✓ Proper heading hierarchy (h1 > h2 > h3)
- ✓ Form labels associated with inputs
- ✓ Color not sole indicator (text + emojis)
- ✓ Sufficient color contrast ratios
- ✓ Keyboard navigation support
- ✓ Screen reader friendly
- ✓ Focus indicators visible

---

This layout provides an intuitive, visually appealing interface for Panchang calculations while maintaining accessibility and responsive design across all devices!
