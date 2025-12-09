# 🎨 Quick Image Customization Guide

## Fast Track: Replace Images in 3 Steps

### Step 1: Prepare Your Images
- Create 4 custom images (200×200px PNG recommended)
- Name them: `online.png`, `offline.png`, `residential.png`, `recorded.png`
- Keep them simple and clear

### Step 2: Upload to Project
```
Your Images → /public/workshop-modes/
```

**Via Terminal:**
```bash
# Navigate to project
cd /Users/mohankalburgi/Downloads/swar-yoga-latest-latest-prod-version

# Copy your PNG files (if they're on Desktop)
cp ~/Desktop/online.png public/workshop-modes/
cp ~/Desktop/offline.png public/workshop-modes/
cp ~/Desktop/residential.png public/workshop-modes/
cp ~/Desktop/recorded.png public/workshop-modes/
```

### Step 3: Update Configuration
**File:** `/src/utils/workshopModes.ts`

Change all `.svg` to `.png`:
```typescript
// BEFORE:
icon: '/workshop-modes/online.svg'

// AFTER:
icon: '/workshop-modes/online.png'
```

---

## 📍 Where Images Appear

### 1️⃣ Workshop List Page
```
Workshop Card Thumbnail
└── Bottom-left corner
    ├── 40×40px badges
    └── Shows all available modes
```

### 2️⃣ Workshop Detail - Mode Selector
```
Batch Selection Card
└── 2×2 Grid of Mode Buttons
    ├── 40×40px badges
    ├── Clickable to select
    └── Shows labels when hovered
```

### 3️⃣ Workshop Detail - Selected Mode Info
```
Selected Batch Box
└── Top Section
    ├── 64×64px large badge
    ├── Mode name
    └── All batch details
```

---

## 🎯 Icon Design Tips

### Online (Blue)
**Ideas:** 
- Video camera icon
- Computer with waves
- WiFi symbol
- Laptop screen

**Colors:** Use blues #0066CC or lighter

### Offline (Orange)  
**Ideas:**
- Building or location pin
- Classroom/studio icon
- Map marker
- Physical location symbol

**Colors:** Use oranges #FF8C00 or lighter

### Residential (Green)
**Ideas:**
- Bed or hotel icon
- Building with multiple floors
- Accommodation symbol
- Mountain retreat

**Colors:** Use greens #22C55E or lighter

### Recorded (Purple)
**Ideas:**
- Play button
- Video file icon
- Film reel
- Video player

**Colors:** Use purples #9C27B0 or lighter

---

## 🔄 Easy Edit: Modify SVG Directly

If you want to edit the existing SVG files:

**File Paths:**
- `/public/workshop-modes/online.svg`
- `/public/workshop-modes/offline.svg`
- `/public/workshop-modes/residential.svg`
- `/public/workshop-modes/recorded.svg`

**Edit With:**
- Any text editor (VS Code, Notepad, etc.)
- SVG editors (Figma, Inkscape, Adobe Illustrator)
- Draw.io

**Example SVG Structure:**
```xml
<svg width="200" height="200" viewBox="0 0 200 200">
  <!-- Background -->
  <circle cx="100" cy="100" r="100" fill="#E8F5FF"/>
  
  <!-- Change color here -->
  <rect fill="CHANGE_TO_YOUR_COLOR" />
  
  <!-- Add your custom content -->
</svg>
```

---

## 🎨 Color Reference

| Mode | Icon | Background | Text |
|------|------|-----------|------|
| Online | #0066CC | #E8F5FF | #0066CC |
| Offline | #FF8C00 | #FFF4E8 | #FF8C00 |
| Residential | #22C55E | #E8F5E9 | #22C55E |
| Recorded | #9C27B0 | #F3E5F5 | #9C27B0 |

**In `/src/utils/workshopModes.ts`:**
```typescript
export const WORKSHOP_MODES = {
  online: {
    icon: '/workshop-modes/online.svg',
    color: '#0066CC',          // ← Change here
    bgColor: '#E8F5FF',        // ← Change here
    textColor: '#0066CC',      // ← Change here
    label: 'Online',
    description: '...'
  },
  // ... same for offline, residential, recorded
};
```

---

## ✅ Verification

After making changes:

1. **Visual Check:**
   - Open http://localhost:5173/workshop-list
   - Go to http://localhost:5173/workshop/[any-slug]
   - See images appear in all 3 locations

2. **No Errors:**
   - Check VS Code Problems panel (should be empty)
   - No console errors in browser DevTools

3. **Mobile Test:**
   - Resize browser to mobile size
   - Ensure badges stay visible and centered
   - Test touch interactions

---

## 🚀 Deploy Changes

```bash
# From project root
git add -A
git commit -m "Update workshop mode images"
git push origin main

# Vercel auto-deploys - wait 1-2 minutes
# Changes live at: https://swar-yoga-dec1.vercel.app/
```

---

## 📦 File Organization

```
Your Custom Images Can Go To:
├── /public/workshop-modes/     ← Recommended (local)
└── External URL                 ← If preferred (Cloudinary, Imgur, etc)

Local Storage (Recommended):
✅ Faster loading (no external API calls)
✅ Better for deployment
✅ Easy to manage versions
✅ Works offline in dev
```

---

## 🆘 Troubleshooting

**Problem:** Images don't show after changes
- Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Restart dev server: Stop and re-run `npm run dev`

**Problem:** Wrong colors/size
- Check `/src/utils/workshopModes.ts` for correct color codes
- Ensure image size is square (200×200px works best)

**Problem:** SVG path errors
- Verify filenames match: `online.svg`, `offline.svg`, etc.
- Check lowercase (case-sensitive on Mac/Linux)

**Problem:** Git/deployment issues
- Run: `git status` to see changes
- Run: `git log --oneline` to verify commits
- Check GitHub repository for latest push

---

## 📝 Configuration Template

Copy this template and update the image paths:

```typescript
// /src/utils/workshopModes.ts

export const WORKSHOP_MODES = {
  online: {
    icon: '/workshop-modes/online.YOUR_FORMAT',      // svg or png
    color: '#0066CC',
    bgColor: '#E8F5FF',
    textColor: '#0066CC',
    label: 'Online',
    description: 'Live interactive sessions via video conference',
  },
  offline: {
    icon: '/workshop-modes/offline.YOUR_FORMAT',     // svg or png
    color: '#FF8C00',
    bgColor: '#FFF4E8',
    textColor: '#FF8C00',
    label: 'Offline',
    description: 'In-person sessions at our location',
  },
  residential: {
    icon: '/workshop-modes/residential.YOUR_FORMAT', // svg or png
    color: '#22C55E',
    bgColor: '#E8F5E9',
    textColor: '#22C55E',
    label: 'Residential',
    description: 'Immersive experience with accommodation included',
  },
  recorded: {
    icon: '/workshop-modes/recorded.YOUR_FORMAT',    // svg or png
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    textColor: '#9C27B0',
    label: 'Recorded',
    description: 'Self-paced video content access anytime',
  },
};
```

---

## 💡 Pro Tips

1. **Use AI Image Generator:** 
   - Midjourney, DALL-E, Stable Diffusion
   - Prompt: "[mode] icon for online yoga workshop, 200x200px, transparent background"

2. **Free Icon Sources:**
   - Freepik.com (search for mode icons)
   - Flaticon.com (free SVG/PNG downloads)
   - Unsplash.com (free photos - resize as icons)

3. **Brand Consistency:**
   - Match your brand colors
   - Use consistent icon style across all 4 modes
   - Test on both light and dark backgrounds

4. **Performance:**
   - Keep file size under 50KB per image
   - Use PNG or SVG (no heavy JPEGs)
   - Compress before uploading (TinyPNG.com)

---

**Ready to customize? Pick your approach:**
- ✏️ **Edit SVG Files** → Quickest (5 minutes)
- 🖼️ **Replace with PNG** → Best quality (15 minutes)
- 🌐 **Use External URLs** → Maximum flexibility (5 minutes)

**Need Help?** Check `WORKSHOP_MODE_IMAGES_GUIDE.md` for detailed instructions!
