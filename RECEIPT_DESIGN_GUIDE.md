# Professional Receipt Template - Upamnyu International Education

## 🎨 Receipt Design Features

### ✅ Company Branding
- **Company Name:** UPAMNYU INTERNATIONAL EDUCATION
- **Division:** Swar Yoga Sessions  
- **Tagline:** Transform your life
- **Color Theme:** Navy Blue (#001f3f) with Light Navy accents (#1a5490)
- **Logo:** Circular Navy Blue placeholder (ready for your official logo)

### ✅ Receipt Layout (A4 Print-Ready)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              [LOGO - Navy Blue Circle]              │
│                                                     │
│         UPAMNYU INTERNATIONAL EDUCATION             │
│              Swar Yoga Sessions                     │
│            Transform your life                      │
│                                                     │
│                    RECEIPT                          │
│                                                     │
├──────────────────────────────────────────────────────┤
│ RECEIPT #: ORD-12345  |  DATE: 12/19/2025          │
├──────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ PERSONAL DETAILS                                │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Name:  John Doe                                │ │
│ │ Email: john@example.com                        │ │
│ │ Phone: +91-9999999999                          │ │
│ │ City:  Delhi                                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ COURSE DETAILS                                  │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ COURSE NAME        │ QTY │ PRICE │ TOTAL       │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Yoga Fundamentals  │ 1   │ 999.99 │ 999.99    │ │
│ ├─────────────────────────────────────────────────┤ │
│ │                          Subtotal: ₹ 968.65    │ │
│ │                    Platform Fee: ₹ 31.96      │ │
│ │                                                │ │
│ │                  ╔═══════════════════════════╗ │ │
│ │                  ║ TOTAL: ₹ 1,000.61        ║ │ │
│ │                  ╚═══════════════════════════╝ │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ PAYMENT DETAILS                                 │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Payment Mode: PAYU                             │ │
│ │ Status: COMPLETED                              │ │
│ │ Transaction ID: TXN-123456789                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
├──────────────────────────────────────────────────────┤
│                                                     │
│  Authorized Signatory          Official Seal       │
│  ___________________           ┌──────────────┐    │
│  Signature                     │ Navy Circle  │    │
│                                │   Seal Here  │    │
│                                └──────────────┘    │
│                                                     │
├──────────────────────────────────────────────────────┤
│  Thank you for choosing Upamnyu International       │
│  Education - Swar Yoga Sessions                    │
│                                                     │
│  This is a computer-generated receipt. No          │
│  signature required. | www.swaryoga.com            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Receipt Sections

### 1. Header (Top)
- **Logo**: Navy blue circular placeholder (60x60px)
  - Ready to replace with your official logo
- **Company Details**: 
  - Organization name in bold navy blue
  - Division name in light navy
  - Tagline in italic grey
- **Receipt Title**: Large, centered, navy blue

### 2. Receipt Info Bar
- Receipt number and order date side-by-side
- Clear visual separation with top border

### 3. Personal Details Section
- **Navy blue left border** (4px thick)
- Light blue background
- Fields: Name, Email, Phone, City
- Professional formatting

### 4. Course Details Section (Main Content)
- **Course table** with columns:
  - Course Name (45% width)
  - Quantity (15% width)
  - Price (20% width)
  - Total (20% width)
- **Light blue header row** with navy text
- **Alternating white rows** for readability
- **Professional calculations**:
  - Subtotal = Total ÷ 1.033
  - Platform Fee = Subtotal × 0.033
  - Grand Total with double-line border
  - Navy blue background for total row

### 5. Payment Details Section
- Payment Mode (PayU / Nepal QR)
- Payment Status (COMPLETED / PENDING)
- Transaction ID
- Navy left border for consistency

### 6. Footer (Signature & Seal)
- **Left side**: Authorized Signatory
  - Line for manual signature
  - Label: "Signature"
- **Right side**: Official Seal
  - Navy blue circular placeholder
  - Label: "Official Seal"
- **Bottom**: Thank you message
- **Fine print**: Computer-generated disclaimer

---

## 🌈 Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Primary (Headers) | Navy Blue | #001f3f |
| Secondary (Accents) | Light Navy | #1a5490 |
| Section Backgrounds | Light Blue | #f9fbfc |
| Borders | Light Blue | #c0d9e8 |
| Table Header | Light Blue | #e8f0f8 |
| Text | Dark Grey | #333333 |
| Labels | Navy Blue | #001f3f |
| Subtle Text | Medium Grey | #666666 |
| Light Text | Light Grey | #999999 |

---

## 📐 Layout Specifications

**Paper Size:** A4 (210mm × 297mm)  
**Margins:** 30mm all sides  
**Font:** Helvetica  
**Line Height:** 1.5

### Section Spacing
- Header section: 25mm bottom margin
- Sections: 12mm bottom margin
- Footer: 20mm top margin

### Print Settings
- **Orientation:** Portrait
- **Margins:** 0.5 inches on all sides (default)
- **Scale:** 100% (no scaling)
- **Paper Size:** A4
- **Background Graphics:** Enable for blue backgrounds

---

## 🔧 How to Customize

### Replace Logo
The circular navy blue placeholder is ready for your logo:
```
Location in PDF: Top center, 50x50px
Replace with: Your company logo (square or circular)
Recommended size: 200x200px (will be scaled down)
Format: PNG or JPG
```

### Replace Seal/Signature
The circular seal on the right is ready for your official seal:
```
Location in PDF: Bottom right
Size: 60x60px
Replace with: Your official seal/stamp image
Current style: Navy blue circular outline
Recommended: Upload actual seal stamp image
```

### Update Company Details
Edit in `app/profile/page.tsx` - Receipt generation code:
- Line ~130: Company names
- Line ~132: Tagline text
- Line ~485: Footer company name
- Line ~487: Website URL

### Add Company Contact
Current footer has placeholder:
```
This is a computer-generated receipt. No signature required. | www.swaryoga.com
```

Can be updated to include:
- Phone number
- Email address
- Office address
- Website URL

---

## 💾 File Information

**File:** `Swar-Yoga-Receipt-{OrderID}.pdf`  
**Format:** PDF (100% compatible with all readers)  
**Size:** ~50-100 KB per receipt  
**Printing:** Direct print or save for later

---

## ✨ Features

✅ **Professional Layout**
- Corporate branding throughout
- Consistent navy blue color scheme
- Clear section divisions
- Easy to read and understand

✅ **A4 Print-Ready**
- Perfect margins (30mm)
- All text fits on single page
- Optimized for standard printers
- No content cut off

✅ **Complete Information**
- Company details with tagline
- Personal customer information
- Course/Product details
- Payment breakdown
- Transaction details
- Signature and seal areas

✅ **User-Friendly**
- Clear labels and values
- Proper alignment
- Professional typography
- Color coding for different sections

✅ **Audit Trail**
- Receipt number (Order ID)
- Transaction ID
- Date and status
- Payment mode

---

## 🎨 Branding Elements Ready for Customization

### 1. **Logo** (Top Center)
- Current: Navy blue circle placeholder
- Update with: Your official company logo
- Size: 50x50px (in PDF)

### 2. **Seal/Stamp** (Bottom Right)
- Current: Navy blue circle outline
- Update with: Your official seal/stamp
- Size: 60x60px (in PDF)

### 3. **Colors**
- Theme color: Navy Blue (#001f3f)
- Accents: Light Navy (#1a5490)
- Can be updated in StyleSheet

### 4. **Signature Line** (Bottom Left)
- Ready for manual signature
- "Authorized Signatory" label
- Professional appearance

---

## 📋 Receipt Content Structure

```
RECEIPT FORMAT:
├── HEADER SECTION
│   ├── Logo (Navy Circle)
│   ├── Organization Name
│   ├── Division/Department
│   ├── Tagline
│   └── "RECEIPT" Title
│
├── RECEIPT INFO
│   ├── Receipt Number
│   └── Date
│
├── PERSONAL DETAILS
│   ├── Name
│   ├── Email
│   ├── Phone
│   └── City
│
├── COURSE DETAILS
│   ├── Course Table
│   │   ├── Course Name
│   │   ├── Quantity
│   │   ├── Price
│   │   └── Total
│   └── Amount Summary
│       ├── Subtotal
│       ├── Platform Fee
│       └── Total Amount
│
├── PAYMENT DETAILS
│   ├── Payment Mode
│   ├── Status
│   └── Transaction ID
│
└── FOOTER SECTION
    ├── Signature Area
    ├── Seal Area
    ├── Thank You Message
    └── Legal Disclaimer
```

---

## 🚀 Ready for Production

✅ **Build Status:** Passed  
✅ **PDF Generation:** Working  
✅ **Download Feature:** Functional  
✅ **A4 Printing:** Optimized  
✅ **Branding:** Professional  
✅ **Customization:** Ready for your assets  

---

## Next Steps

1. **Add Your Logo**
   - Prepare logo image (PNG, 200x200px)
   - Update code to load your logo

2. **Add Your Seal**
   - Prepare seal/stamp image
   - Replace circular placeholder

3. **Test Printing**
   - Download a receipt
   - Print on A4 paper
   - Verify alignment and quality

4. **Customize Contact Info**
   - Update website URL
   - Add phone number
   - Add office address

---

**Receipt System Status:** ✅ Ready to Download  
**Printing:** ✅ A4 Optimized  
**Branding:** ✅ Professional  
**Customization:** ✅ Easy to Update

