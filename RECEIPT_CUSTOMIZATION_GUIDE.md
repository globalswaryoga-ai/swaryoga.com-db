# Receipt Customization Guide - Adding Your Logo & Seal

## 📸 Visual Preview

The receipt now includes:

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║                 [NAVY BLUE LOGO]                      ║
║              (Ready for your logo)                    ║
║                                                        ║
║           UPAMNYU INTERNATIONAL EDUCATION             ║
║              Swar Yoga Sessions                       ║
║             Transform your life                       ║
║                                                        ║
║                    RECEIPT                            ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║ RECEIPT #: ABC-123-456 | DATE: 19/12/2025            ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ PERSONAL DETAILS                                │ ║
║  ├──────────────────────────────────────────────────┤ ║
║  │ Name:  John Doe                                │ ║
║  │ Email: john@example.com                        │ ║
║  │ Phone: +91-9999999999                          │ ║
║  │ City:  Delhi                                   │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ COURSE DETAILS                                  │ ║
║  ├──────────────────────────────────────────────────┤ ║
║  │ COURSE NAME        QTY   PRICE    TOTAL        │ ║
║  ├──────────────────────────────────────────────────┤ ║
║  │ Yoga Fundamentals   1   ₹999.99  ₹999.99      │ ║
║  │                                                 │ ║
║  │                  Subtotal: ₹968.65            │ ║
║  │              Platform Fee: ₹31.96             │ ║
║  │                  ══════════════════            │ ║
║  │                 TOTAL: ₹1,000.61              │ ║
║  │                  ══════════════════            │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ PAYMENT DETAILS                                 │ ║
║  ├──────────────────────────────────────────────────┤ ║
║  │ Payment Mode:    PAYU                          │ ║
║  │ Status:          COMPLETED                     │ ║
║  │ Transaction ID:  TXN-20251219-12345           │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Authorized Signature        [SEAL PLACEHOLDER]      ║
║  ___________________          (Navy Blue Circle)      ║
║  Signature                    (Ready for your seal)   ║
║                                                        ║
║  Thank you for choosing Upamnyu International         ║
║  Education - Swar Yoga Sessions                      ║
║                                                        ║
║  This is a computer-generated receipt. No            ║
║  signature required. | www.swaryoga.com              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 🎨 Color Scheme Used

**Navy Blue Theme:**
- **Primary Navy:** #001f3f (Headings, borders)
- **Light Navy:** #1a5490 (Secondary text)
- **Light Background:** #f9fbfc (Section backgrounds)
- **Border Color:** #c0d9e8 (Light blue)

---

## 📝 Current Customization Points

### 1. Company Name (in code)
**Location:** `/app/profile/page.tsx` → `downloadReceipt` function

**Current:**
```typescript
<Text style={styles.companyName}>UPAMNYU INTERNATIONAL EDUCATION</Text>
<Text style={styles.companyNameSecond}>Swar Yoga Sessions</Text>
<Text style={styles.tagline}>Transform your life</Text>
```

**To change:**
- Edit these three lines with your company details
- Adjust `fontSize` values if needed

### 2. Logo Placeholder
**Current Implementation:**
```typescript
<View style={{ ...styles.logoPlaceholder, marginLeft: 'auto', marginRight: 'auto' }} />
```

This creates a 50x50px navy blue circle.

**To add your actual logo:**

You have two options:

#### Option A: Use Image File (Recommended)
```typescript
// Add this import at top of profile/page.tsx
import { Image } from '@react-pdf/renderer';

// Replace the View with Image in the receipt:
<Image 
  src="/path/to/your/logo.png"
  style={{ width: 50, height: 50, marginLeft: 'auto', marginRight: 'auto', marginBottom: 8 }}
/>
```

Steps:
1. Save your logo as PNG to `/public/logo.png`
2. Update the path in the code above
3. Recommended logo size: 200x200px (will be scaled to 50x50px)

#### Option B: Keep Navy Placeholder
Keep the current navy circle and add text:
```typescript
<View style={{ ...styles.logoPlaceholder, marginLeft: 'auto', marginRight: 'auto' }} />
<Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 'bold', color: '#001f3f' }}>
  YOUR LOGO
</Text>
```

### 3. Seal/Signature Area
**Current Implementation:**
```typescript
<View style={styles.sealPlaceholder} />
```

This creates a 60x60px navy blue circle outline.

**To add your seal stamp:**

#### Option A: Use Seal Image
```typescript
import { Image } from '@react-pdf/renderer';

// Replace the View with:
<Image 
  src="/public/seal.png"
  style={{ width: 60, height: 60, marginLeft: 'auto', marginRight: 'auto' }}
/>
```

Steps:
1. Prepare your seal/stamp as PNG (transparent background recommended)
2. Save to `/public/seal.png`
3. Update the path in code above
4. Size: 200x200px or larger (will be scaled to 60x60px in PDF)

#### Option B: Custom Navy Seal
Keep the navy circle and customize:
```typescript
<View style={styles.sealPlaceholder} />
<Text style={{ textAlign: 'center', fontSize: 7, color: '#001f3f', fontWeight: 'bold', marginTop: 5 }}>
  OFFICIAL SEAL
</Text>
```

### 4. Footer/Website
**Current:**
```typescript
<Text style={styles.footerNote}>
  This is a computer-generated receipt. No signature required. | www.swaryoga.com
</Text>
```

**To update:**
```typescript
<Text style={styles.footerNote}>
  Contact: +91-XXXXX-XXXXX | Email: support@swaryoga.com | www.swaryoga.com
</Text>
```

---

## 🖼️ Logo Requirements

### Size & Format
- **Format:** PNG (preferred) or JPG
- **Size:** 200x200px or larger
- **Background:** Transparent PNG recommended
- **Color:** Works with navy theme
- **Quality:** High resolution (300 DPI minimum)

### File Location
```
project/
├── public/
│   ├── logo.png              ← Your company logo
│   ├── seal.png              ← Your official seal
│   └── [other assets]
```

### Where to Get Your Logo
- Design your own using tools like:
  - Canva (free)
  - Adobe Illustrator (professional)
  - Logo makers (Looka, Tailor Brands)
- Or use existing brand logo

---

## 🔧 Step-by-Step Implementation

### Step 1: Prepare Your Assets
1. **Logo Image**
   - Size: 200x200px (PNG with transparent background)
   - Filename: `logo.png`
   - Save to: `/public/logo.png`

2. **Seal/Stamp Image**
   - Size: 200x200px (PNG with transparent background)
   - Filename: `seal.png`
   - Save to: `/public/seal.png`

### Step 2: Update Receipt Code

Open `/app/profile/page.tsx` and find the `downloadReceipt` function (~line 91).

**Add Image import at the top:**
```typescript
const { Document, Page, Text, View, StyleSheet, Image } = await import('@react-pdf/renderer');
```

**Replace logo placeholder:**
Find this section (around line 300):
```typescript
<View style={{ ...styles.logoPlaceholder, marginLeft: 'auto', marginRight: 'auto' }} />
```

Replace with:
```typescript
<Image 
  src="/logo.png"
  style={{ width: 50, height: 50, marginLeft: 'auto', marginRight: 'auto', marginBottom: 8 }}
/>
```

**Replace seal placeholder:**
Find this section (around line 450):
```typescript
<View style={styles.sealPlaceholder} />
```

Replace with:
```typescript
<Image 
  src="/seal.png"
  style={{ width: 60, height: 60, marginLeft: 'auto', marginRight: 'auto' }}
/>
```

### Step 3: Update Footer Text
Find this line (around line 460):
```typescript
<Text style={styles.footerNote}>
  This is a computer-generated receipt. No signature required. | www.swaryoga.com
</Text>
```

Update to your details:
```typescript
<Text style={styles.footerNote}>
  Contact: +91-XXXXX-XXXXX | Email: support@swaryoga.com | www.swaryoga.com
</Text>
```

### Step 4: Test Receipt
1. Start dev server: `npm run dev`
2. Navigate to profile page
3. Download a receipt
4. Check PDF for:
   - ✅ Logo appears (top center)
   - ✅ Seal appears (bottom right)
   - ✅ All text is correct
   - ✅ A4 layout looks good

### Step 5: Test Printing
1. Download receipt
2. Print on A4 paper (Portrait, 100% scale)
3. Verify:
   - ✅ All content visible
   - ✅ No cut-off edges
   - ✅ Colors print correctly
   - ✅ Logo and seal are clear

---

## 🎯 Navy Blue Theme Implementation

The current receipt uses professional navy blue styling:

```typescript
// Navy Blue Color Scheme
const NAVY_PRIMARY = '#001f3f';      // Main navy
const NAVY_SECONDARY = '#1a5490';    // Light navy
const NAVY_LIGHT = '#e8f0f8';        // Very light navy
const NAVY_BORDER = '#c0d9e8';       // Light border

// Applied to:
- Headers: Navy Primary
- Section titles: Navy Primary
- Borders: Navy Primary (thick) or Navy Border (light)
- Labels: Navy Primary
- Backgrounds: Very Light Navy
```

### To Change Color Theme

If you want to change from Navy Blue to another color:

1. Find the color values in `StyleSheet.create()`
2. Replace with your preferred colors:

```typescript
// Example: Change to Green theme
const BRAND_PRIMARY = '#22c55e';     // Green
const BRAND_SECONDARY = '#15803d';   // Dark green
const BRAND_LIGHT = '#f0fdf4';       // Light green bg
const BRAND_BORDER = '#bbf7d0';      // Light green border
```

---

## ✅ Customization Checklist

- [ ] Logo image prepared (200x200px PNG)
- [ ] Seal image prepared (200x200px PNG)
- [ ] Files saved to `/public/` folder
- [ ] Image import added to receipt code
- [ ] Logo and seal Image components updated
- [ ] Footer contact info updated
- [ ] Build tested: `npm run build`
- [ ] Receipt downloaded and tested
- [ ] PDF printed on A4 paper
- [ ] All customizations verified

---

## 📞 Support & Troubleshooting

### Image not showing in receipt?
1. Check file path is correct
2. Verify file exists in `/public/` folder
3. Ensure file is PNG or JPG
4. Try using absolute path instead of relative

### PDF looks distorted?
1. Check image dimensions (should be square)
2. Reduce image file size if too large
3. Verify image quality is good

### Colors don't match?
1. Check hex color codes are correct
2. Test in browser first
3. Print with "Background graphics" enabled

### Text overlapping?
1. Reduce font size
2. Check section spacing
3. Verify page margins

---

## 🚀 Ready to Customize!

The receipt system is fully ready for customization:

✅ Navy blue theme already applied  
✅ Logo placeholder in place  
✅ Seal placeholder in place  
✅ All text easily editable  
✅ A4 printing optimized  
✅ Professional layout ready  

**Next:** Add your logo and seal, then download a test receipt!

