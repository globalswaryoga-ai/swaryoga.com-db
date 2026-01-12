# 🎮 WhatsApp QR Inbox - Testing Guide

## Quick Start - Test in 5 Minutes

### Step 1: Start Dev Server
```bash
cd /Users/mohankalburgi/swaryoga.com-db
npm run dev
```

### Step 2: Open QR Page
Open in browser: `http://localhost:3020/admin/crm/qr`

### Step 3: Test Connect Button
- If bridge is offline, click **green "Connect" button**
- Should show spinner/loading animation
- Wait for bridge to initialize

### Step 4: Test QR Modal
- Click **black QR code button** in header
- Beautiful modal should open with:
  - ✓ Large QR code in center
  - ✓ Step-by-step instructions
  - ✓ Download button
  - ✓ Connection status
  - ✓ Close button

### Step 5: Test with WhatsApp
- Open WhatsApp on your phone
- Go to: **Settings → Linked Devices → Link a Device**
- Point camera at QR code
- Should connect automatically!

---

## 🎯 Feature Testing Checklist

### Header Section
- [ ] "Connect" button visible when disconnected
- [ ] "Disconnect" button visible when connected
- [ ] QR code button always visible
- [ ] Status indicator shows correct color:
  - 🟢 Green = Connected
  - 🟡 Yellow = Loading
  - 🔴 Red = Offline
- [ ] Status text matches indicator color

### QR Modal
- [ ] Opens smoothly with fade-in animation
- [ ] QR code is clear and visible
- [ ] Corner markers visible (decorative)
- [ ] Step-by-step instructions are clear
- [ ] Download button works (saves as PNG)
- [ ] Close button (✕) works
- [ ] Modal closes when scan successful
- [ ] Connection status updates in modal
- [ ] Works in light and dark themes

### Connection Flow
- [ ] Click "Connect" → shows loading
- [ ] Bridge initializes successfully
- [ ] QR appears on screen
- [ ] Scanning with phone triggers connection
- [ ] Status changes from 🟡 to 🟢
- [ ] "Disconnect" button now appears
- [ ] Messages can be sent/received

### Disconnect Flow
- [ ] Click "Disconnect" button
- [ ] Status changes to 🔴 Red
- [ ] "Connect" button reappears
- [ ] Chat list clears (optional)
- [ ] Selected messages clear
- [ ] Bridge logs out properly

### Messaging (End-to-End)
- [ ] Can receive messages from WhatsApp
- [ ] Messages appear in real-time
- [ ] Can send messages from web
- [ ] Messages appear in WhatsApp
- [ ] Timestamps are correct
- [ ] Unread badges show properly
- [ ] Chat list updates live

### Responsive Design
- [ ] Test on mobile (375px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1920px width)
- [ ] Buttons remain clickable on all sizes
- [ ] Text is readable on all sizes
- [ ] Modal scales properly

### Theme Support
- [ ] Light theme looks good
- [ ] Dark theme looks good
- [ ] Green theme looks good
- [ ] Blue theme looks good
- [ ] Lavender theme looks good
- [ ] Buttons visible in all themes
- [ ] QR code visible in all themes

### Error Handling
- [ ] Bridge offline → shows error gracefully
- [ ] No network → shows appropriate message
- [ ] Failed scan → allows retry
- [ ] Expired QR → can refresh
- [ ] Connection timeout → shows retry button

---

## 📸 Visual Inspection Points

### Header Should Show
```
┌─────────────────────────────────────────────────────┐
│ [Avatar] Contact Name        [QR] [Green Button] [×] │
│          ✓ Connected         [Status Indicator]      │
└─────────────────────────────────────────────────────┘
```

### QR Modal Should Show
```
┌────────────────────────────────────────┐
│  WhatsApp Link              [✕]        │
│  Scan to connect your phone              │
│                                          │
│  ┌──────────────────────────────┐       │
│  │   ┐              ┌           │       │
│  │   │    QR CODE   │           │       │
│  │   │              │           │       │
│  │   │   (Clear)    │           │       │
│  │   │              │           │       │
│  │   └              └           │       │
│  └──────────────────────────────┘       │
│                                          │
│  1. Open WhatsApp on your phone          │
│  2. Settings → Linked Devices            │
│  3. Tap "Link a Device"                  │
│  4. Point camera at QR code              │
│                                          │
│  [Close]          [Download]             │
│  🟢 Connected                            │
└────────────────────────────────────────┘
```

### Button States

**Connect Button (When Offline)**
```
┌──────────────────┐
│ 📱 Connect       │  ← Emerald green
│ (clickable)      │
└──────────────────┘
```

**Disconnect Button (When Connected)**
```
┌──────────────────┐
│ 🔌 Disconnect    │  ← Rose red
│ (clickable)      │
└──────────────────┘
```

**QR Button (Always Visible)**
```
┌────┐
│ ◊◊ │  ← Black with QR icon
│ ◊◊ │  (clickable)
└────┘
```

---

## 🧪 Detailed Test Scenarios

### Scenario 1: Fresh Connection
```
1. Open page → Bridge offline
2. See red status 🔴
3. Click "Connect" button
4. Loading state appears 🟡
5. QR appears
6. Scan with phone
7. See green status 🟢
8. Chat list loads
9. Can send/receive messages
✓ PASS if: Everything flows smoothly
```

### Scenario 2: QR Code Download
```
1. Click QR button
2. Modal opens
3. Click "Download" button
4. Browser shows save dialog
5. File saves as "whatsapp-qr.png"
✓ PASS if: File downloads successfully
```

### Scenario 3: Real Message Send/Receive
```
1. Connect successfully (green status)
2. Message arrives from WhatsApp
3. See in chat list within 2 seconds
4. Click chat to open
5. Message appears with timestamp
6. Type reply message
7. Click send
8. See checkmark ✓
9. Message appears in WhatsApp
✓ PASS if: All steps complete in order
```

### Scenario 4: Theme Switching
```
1. Start with white theme
2. Test QR modal (should look clean)
3. Switch to dark theme
4. Test QR modal (should look good)
5. Switch to green theme
6. Verify buttons are visible
✓ PASS if: Looks good in all 5 themes
```

### Scenario 5: Mobile Responsiveness
```
1. Open dev tools (F12)
2. Set to iPhone 12 (390x844)
3. Test all interactions
4. Buttons should be easily tappable
5. Modal should be readable
6. QR should be centered
✓ PASS if: All elements accessible on mobile
```

---

## 🔍 What to Look For (Quality Checks)

### Visual Quality
- [ ] Buttons have proper shadows
- [ ] Colors match the design mockup
- [ ] No weird spacing or alignment issues
- [ ] Animations are smooth (no jank)
- [ ] Text is readable (proper contrast)
- [ ] Icons are crisp and clear

### Functionality
- [ ] All buttons are clickable
- [ ] No console errors (F12 → Console)
- [ ] No network errors (F12 → Network)
- [ ] Modals close properly
- [ ] Loading states show correctly
- [ ] Status updates in real-time

### Performance
- [ ] Page loads quickly
- [ ] No lag when clicking buttons
- [ ] Modal opens smoothly
- [ ] Messages appear instantly
- [ ] No battery drain (animations optimized)

### UX/Accessibility
- [ ] Buttons have hover effects
- [ ] Focus states are visible
- [ ] Tooltips appear on hover
- [ ] Error messages are clear
- [ ] Success states are obvious
- [ ] Status is always visible

---

## 📊 Expected Behavior

### Status Transitions
```
┌─────────────┐
│ Disconnected│
│   (🔴 Red)  │
└──────┬──────┘
       │ Click "Connect"
       ▼
┌─────────────┐
│  Connecting │
│ (🟡 Yellow) │
└──────┬──────┘
       │ Bridge initializes
       ▼
┌─────────────┐
│ Connected   │
│ (🟢 Green)  │
└──────┬──────┘
       │ Click "Disconnect"
       ▼
┌─────────────┐
│ Disconnected│
│   (🔴 Red)  │
└─────────────┘
```

### Button Visibility
```
Status: Disconnected
┌─────────────────────────────────┐
│ [Connect Button] [QR] [Phone]   │
└─────────────────────────────────┘

Status: Connecting
┌─────────────────────────────────┐
│ [Loading...] [QR] [Phone]       │
└─────────────────────────────────┘

Status: Connected
┌─────────────────────────────────┐
│ [Disconnect Button] [QR] [Phone]│
└─────────────────────────────────┘
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| QR not showing | Make sure bridge is running: `qa-bridge-status` |
| Modal won't close | Refresh page, try again |
| Buttons unclickable | Check if bridge is responding |
| Messages not syncing | Check MongoDB connection |
| Can't scan QR | Make sure camera has permission |
| Status won't update | Check browser console for errors |

---

## ✅ Sign-Off Checklist

Before marking as complete, verify:

- [ ] All 4 main features working (Connect/Disconnect/QR/Status)
- [ ] QR modal beautiful and functional
- [ ] Can connect and receive messages
- [ ] Can send messages back
- [ ] Works on mobile phone
- [ ] Works in dark theme
- [ ] No console errors
- [ ] Build passes (`npm run build`)
- [ ] No memory leaks (test in DevTools)
- [ ] Performance is good (smooth animations)

---

## 🎉 If All Tests Pass

You're ready to use the WhatsApp QR Inbox with:
✅ Professional UI
✅ Easy connection flow
✅ Real-time messaging
✅ Team ready!

---

## 📞 Support

If you encounter issues:

1. **Check bridge status**: `qa-vps-bridge-status`
2. **View bridge logs**: `qa-vps-bridge-logs`
3. **Test locally**: `qa-bridge-start`
4. **Check MongoDB**: `qa-db-check`
5. **Run diagnostics**: `qa-diagnose`

---

**Happy testing! 🚀**
