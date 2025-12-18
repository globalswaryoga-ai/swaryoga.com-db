# Swar Yoga Design System

**Version:** 1.0  
**Last Updated:** December 18, 2025  
**Theme Philosophy:** "From Breath To Soul" - Healing, grounded, intentional design

---

## Color Palette

The design system uses a locked, intentional color palette inspired by yoga principles: energy, grounding, healing, and vitality.

| Color | Hex | RGB | Usage | Accessibility |
|-------|-----|-----|-------|---|
| **Primary Green** | #1E7F43 | rgb(30, 127, 67) | Headers, primary buttons, navigation, active states | WCAG AA contrast with white |
| **Soft Black (Text)** | #111111 | rgb(17, 17, 17) | All body text, labels, dark elements | Maximum readability |
| **Soft White (BG)** | #F9FAF9 | rgb(249, 250, 249) | Main background, card backgrounds | Reduces eye strain |
| **Saffron Orange (Accent)** | #F27A2C | rgb(242, 122, 44) | CTAs, highlights, emphasis (max 5-8% usage) | Energy, vitality |
| **Divider Green** | #2F6F4E | rgb(47, 111, 78) | Borders, separators, subtle dividers | Complements primary |

### Color Variants

**Primary Green (#1E7F43)**
- Light: #E6F4EC (for backgrounds, hover states)
- Hover: #166235 (darker for interactions)

**Orange Accent (#F27A2C)**
- Light: #FFF3E8 (soft background)
- Hover: #E26B1F (darker for interactions)

**Border Green (#2F6F4E)**
- Light: #E0EDE6 (subtle dividers)

---

## Typography

**Font Family:** Poppins (Google Fonts)  
**Font Weights:** 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold)

### Typographic Scale

| Element | Weight | Size | Line Height | Usage |
|---------|--------|------|-------------|-------|
| **H1** | 600 | 2.5rem | 1.2 | Page titles, hero headlines |
| **H2** | 600 | 2rem | 1.3 | Section headers |
| **H3** | 600 | 1.5rem | 1.4 | Subsection headers |
| **H4** | 600 | 1.25rem | 1.5 | Minor headers, card titles |
| **Body Large** | 400 | 1.125rem | 1.6 | Large text blocks |
| **Body Normal** | 400 | 1rem | 1.6 | Standard paragraph text |
| **Body Small** | 400 | 0.875rem | 1.6 | Caption, footnotes, small text |
| **Button** | 600 | 1rem | 1.2 | All button labels |
| **Label** | 500 | 0.875rem | 1.4 | Form labels, tags |

### Font Usage Rules

- **Poppins 300 (Light):** Only for secondary text or decorative elements
- **Poppins 400 (Regular):** Body text, paragraphs, descriptions
- **Poppins 500 (Medium):** Labels, secondary headings, form labels
- **Poppins 600 (SemiBold):** All main headings (H1-H4), button text
- **Poppins 700 (Bold):** Strong emphasis, important text
- **Poppins 800 (ExtraBold):** Special emphasis, hero text

---

## Component Colors

### Buttons

**Primary Button:**
- Background: #1E7F43 (Swar Primary Green)
- Text: White
- Hover: #166235
- Border: None
- Shadow: 0 4px 6px rgba(30, 127, 67, 0.2)

**Secondary Button:**
- Background: #F9FAF9 (Soft White) / #E6F4EC (Light Green on hover)
- Text: #111111 (Soft Black)
- Border: 2px solid #2F6F4E (Divider Green)
- Hover: #E6F4EC background, #1E7F43 border
- Shadow: 0 2px 4px rgba(0, 0, 0, 0.05)

**Accent Button (Orange):**
- Background: #F27A2C (Saffron Orange)
- Text: White
- Hover: #E26B1F
- Border: None
- Shadow: 0 4px 6px rgba(242, 122, 44, 0.2)

### Cards

- **Background:** #FFFFFF (White)
- **Border:** 1px solid #E0EDE6 (Light Border Green)
- **Text:** #111111 (Soft Black)
- **Hover Border:** #2F6F4E (Divider Green)
- **Hover Shadow:** 0 4px 12px rgba(30, 127, 67, 0.1)

### Forms

- **Input Background:** #FFFFFF (White)
- **Input Border:** 2px solid #2F6F4E (Divider Green)
- **Input Focus Border:** #1E7F43 (Primary Green)
- **Input Focus Shadow:** 0 0 0 3px #E6F4EC (Light Green)
- **Label Text:** #111111 (Soft Black), Weight 500
- **Placeholder Text:** #666666 (Gray)

---

## Tailwind CSS Custom Classes

The design system extends Tailwind with custom `swar-*` color classes:

```tailwindcss
/* Text Colors */
text-swar-text: #111111
text-swar-text-secondary: #333333
text-swar-text-tertiary: #666666

/* Background Colors */
bg-swar-primary: #1E7F43
bg-swar-primary-light: #E6F4EC
bg-swar-bg: #F9FAF9
bg-swar-bg-white: #FFFFFF
bg-swar-accent: #F27A2C
bg-swar-accent-light: #FFF3E8

/* Border Colors */
border-swar-primary: #1E7F43
border-swar-border: #2F6F4E
border-swar-border-light: #E0EDE6
border-swar-accent: #F27A2C
```

---

## Usage Rules

### ✅ DO

- Use Primary Green (#1E7F43) for main CTA buttons and headers
- Use Orange (#F27A2C) as accent for important highlights only (max 5-8% of page)
- Apply consistent padding: 1.5rem for cards, 1rem for button internals
- Use rounded corners: 0.5rem for buttons, 0.75rem for cards
- Keep text #111111 on light backgrounds, white on dark
- Use `text-swar-*` and `bg-swar-*` Tailwind classes for consistency
- Use Poppins 600 for all headings

### ❌ DON'T

- Don't use bright primary colors for large backgrounds
- Don't mix multiple accent colors on same page
- Don't use custom colors; always use design system palette
- Don't use font weights other than 300-800
- Don't apply drop shadows to text
- Don't change button border radius from 0.5rem
- Don't use all caps for body text

---

## Design Philosophy

The Swar Yoga design system embodies the principles of the brand:

- **Healing Green (#1E7F43):** Growth, healing, vitality - grounded in nature
- **Soft Black (#111111):** Peaceful, calm, minimal distractions  
- **Soft White (#F9FAF9):** Serene, airy, reduces visual fatigue
- **Saffron Orange (#F27A2C):** Energy, action, the sacred in yoga
- **Divider Green (#2F6F4E):** Subtle structure without harsh boundaries

Each color choice supports "From Breath To Soul" - guiding users through intentional, peaceful interaction.

