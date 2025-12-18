# Quick Receipt Customization - Code Reference

## 🎯 Easy Updates (Copy-Paste Ready)

### 1. Company Details Update

**File:** `/app/profile/page.tsx`  
**Location:** Around line 130-132 in `downloadReceipt` function

**Current Code:**
```typescript
<Text style={styles.companyName}>UPAMNYU INTERNATIONAL EDUCATION</Text>
<Text style={styles.companyNameSecond}>Swar Yoga Sessions</Text>
<Text style={styles.tagline}>Transform your life</Text>
```

**To Change - Replace With:**
```typescript
<Text style={styles.companyName}>YOUR COMPANY NAME</Text>
<Text style={styles.companyNameSecond}>YOUR DIVISION NAME</Text>
<Text style={styles.tagline}>YOUR TAGLINE HERE</Text>
```

---

### 2. Footer Contact Info Update

**File:** `/app/profile/page.tsx`  
**Location:** Around line 460-463

**Current Code:**
```typescript
<Text style={styles.thankYouText}>
  Thank you for choosing Upamnyu International Education - Swar Yoga Sessions
</Text>
<Text style={styles.footerNote}>
  This is a computer-generated receipt. No signature required. | www.swaryoga.com
</Text>
```

**To Change - Replace With:**
```typescript
<Text style={styles.thankYouText}>
  Thank you for choosing [YOUR COMPANY] - [YOUR BRAND]
</Text>
<Text style={styles.footerNote}>
  Phone: +91-XXXXX-XXXXX | Email: support@yourcompany.com | www.yourcompany.com
</Text>
```

---

### 3. Add Your Logo

**File:** `/app/profile/page.tsx`  
**Location:** Around line 120

**Current Code:**
```typescript
const { Document, Page, Text, View, StyleSheet, Line, Rect } = await import('@react-pdf/renderer');
```

**Update To:**
```typescript
const { Document, Page, Text, View, StyleSheet, Line, Rect, Image } = await import('@react-pdf/renderer');
```

Then find (around line 300):
```typescript
<View style={{ ...styles.logoPlaceholder, marginLeft: 'auto', marginRight: 'auto' }} />
```

**Replace With:**
```typescript
<Image 
  src="/logo.png"
  style={{ width: 50, height: 50, marginLeft: 'auto', marginRight: 'auto', marginBottom: 8 }}
/>
```

---

### 4. Add Your Seal/Stamp

**File:** `/app/profile/page.tsx`  
**Location:** Around line 450

**Current Code:**
```typescript
<View style={styles.sealPlaceholder} />
```

**Replace With:**
```typescript
<Image 
  src="/seal.png"
  style={{ width: 60, height: 60, marginLeft: 'auto', marginRight: 'auto' }}
/>
```

---

### 5. Change Navy Blue Color

**File:** `/app/profile/page.tsx`  
**Location:** In `StyleSheet.create()` around line 140-160

**All Navy Blue Color References:**

Find and replace these hex codes throughout the StyleSheet:

| What | Current | Replace With | Example |
|------|---------|--------------|---------|
| Primary Navy | `#001f3f` | Your primary color | `#22c55e` |
| Light Navy | `#1a5490` | Your secondary | `#15803d` |
| Light BG | `#e8f0f8` | Your light bg | `#f0fdf4` |
| Border | `#c0d9e8` | Your light border | `#bbf7d0` |

**Quick Find & Replace:**
```
Find: #001f3f → Replace with: #YOUR_PRIMARY_COLOR
Find: #1a5490 → Replace with: #YOUR_SECONDARY_COLOR
Find: #e8f0f8 → Replace with: #YOUR_LIGHT_COLOR
Find: #c0d9e8 → Replace with: #YOUR_BORDER_COLOR
```

---

## 📋 Complete Receipt Structure

### Full Code Section Location

**File:** `/app/profile/page.tsx`

**Function:** `downloadReceipt` (starts around line 91)

**Key sections in order:**

1. **Line 91-120**: Function declaration and imports
2. **Line 121-445**: StyleSheet definition (colors, fonts, layouts)
3. **Line 447-465**: Receipt document JSX
   - Line 450-455: Header with logo
   - Line 457-463: Company details
   - Line 464-467: Receipt info bar
   - Line 469-483: Personal details section
   - Line 485-525: Course details section
   - Line 527-542: Payment details section
   - Line 544-570: Footer with signature & seal
4. **Line 572+**: PDF generation and download

---

## 🖼️ Asset File Locations

### Where to Put Images

```
project/
├── public/
│   ├── logo.png              ← Your company logo
│   ├── seal.png              ← Your official seal/stamp
│   └── favicon.ico
├── app/
│   ├── profile/
│   │   └── page.tsx          ← Receipt code here
│   └── ...
└── ...
```

### Image File Names in Code

**Logo reference:**
```typescript
src="/logo.png"              // From /public/logo.png
```

**Seal reference:**
```typescript
src="/seal.png"              // From /public/seal.png
```

---

## 🔍 Find Exact Line Numbers

### To Find Sections Quickly

**In VS Code, use Ctrl+G (Go to Line):**

| What | Line Number |
|------|-------------|
| Download Receipt function | ~91 |
| Import PDF components | ~117 |
| StyleSheet definition | ~123 |
| Company name text | ~330 |
| Logo placeholder | ~327 |
| Receipt title | ~334 |
| Personal details | ~342 |
| Course details | ~354 |
| Payment details | ~423 |
| Signature area | ~443 |
| Seal placeholder | ~454 |
| Footer text | ~464 |

---

## 🧪 Testing Your Changes

### After Each Change:

1. **Save the file**
   ```
   Ctrl+S (Windows/Linux) or Cmd+S (Mac)
   ```

2. **Build the project**
   ```bash
   npm run build
   ```
   Should show: `✓ Compiled successfully`

3. **Start dev server**
   ```bash
   npm run dev
   ```

4. **Test in browser**
   - Go to profile page
   - Download a receipt
   - Check PDF for your changes

---

## 🎨 Color Quick Reference

### Navy Blue Theme (Current)
```typescript
// Headings and primary elements
color: '#001f3f'

// Secondary text and accents
color: '#1a5490'

// Section backgrounds
backgroundColor: '#f9fbfc'

// Borders
borderColor: '#c0d9e8'

// Table headers
backgroundColor: '#e8f0f8'

// Dark text
color: '#333333'

// Labels
color: '#001f3f'

// Subtle text
color: '#666666'

// Light text
color: '#999999'
```

### To Use Different Theme

**Example - Green Theme:**
```typescript
// Replace all Navy Blues with:
'#001f3f' → '#15803d' (Dark green)
'#1a5490' → '#22c55e' (Light green)
'#e8f0f8' → '#f0fdf4' (Very light green)
'#c0d9e8' → '#bbf7d0' (Light green border)
```

---

## 📝 Common Edits Checklist

### Minimal Customization (5 mins)
- [ ] Change company name (line 330)
- [ ] Change tagline (line 332)
- [ ] Update footer website (line 466)
- [ ] Build and test

### Full Customization (20 mins)
- [ ] All above
- [ ] Add logo image to /public/
- [ ] Update Image import (line 117)
- [ ] Replace logo placeholder (line 327)
- [ ] Add seal image to /public/
- [ ] Replace seal placeholder (line 454)
- [ ] Update footer contact info (line 465)
- [ ] Change colors if desired
- [ ] Build and print test

### Professional Setup (30 mins)
- [ ] All above
- [ ] Custom color theme
- [ ] Professional logo design
- [ ] Official seal/stamp image
- [ ] Verify A4 printing
- [ ] Test on multiple browsers
- [ ] Test on mobile

---

## 🚀 Quick Start Commands

```bash
# Start development server
npm run dev

# Build project
npm run build

# Check for errors
npm run lint

# Type check
npm run type-check
```

---

## 💾 Backup Before Changes

Before making changes, consider backing up:

```bash
# Backup the profile page
cp app/profile/page.tsx app/profile/page.tsx.backup
```

---

## ✅ Verification After Changes

### Build should pass:
```
✓ Compiled successfully
✓ Generating static pages
```

### Receipt should show:
- ✅ Your company name
- ✅ Your logo (if added)
- ✅ Navy blue theme (or your color)
- ✅ Your contact info
- ✅ Your seal (if added)
- ✅ Printable on A4

---

## 🎯 Section Summary

| Section | What It Contains | Easy to Change? |
|---------|------------------|-----------------|
| Header | Logo + Company name + Tagline | ✅ Yes (lines 325-335) |
| Receipt Info | Receipt # and Date | ✅ Auto-populated |
| Personal Details | Name, Email, Phone, City | ✅ Auto-populated |
| Course Details | Items table + totals | ✅ Auto-populated |
| Payment Details | Mode, Status, Transaction ID | ✅ Auto-populated |
| Footer | Signature + Seal + Thank you | ✅ Yes (lines 440-470) |

**Most common changes:** Header company info, colors, logo, seal

---

## 📞 Getting Help

**If something breaks:**
1. Check build output: `npm run build`
2. Look for error messages in terminal
3. Revert to backup: `cp app/profile/page.tsx.backup app/profile/page.tsx`
4. Try changes one at a time

**If PDF looks wrong:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server (Ctrl+C, then `npm run dev`)
3. Download receipt again
4. Print with "Background graphics" enabled

---

**Ready to customize!** Start with changing company name, then build and test. 🚀

