# Quick Reference - New Features & How to Use

## 🔑 Key Features Added

### 1. **Smart Disconnect/Reconnect**
```
If Connection Drops:
1. See red error message at top
2. Click [Reconnect Now] button
3. Or click [▲Login (QR)] to scan QR again
```

### 2. **Professional Header Layout**
```
LEFT SIDE              │  RIGHT SIDE (in box)
- Profile Picture     │  - [▲Login (QR)] or [→Logout]
- Name                │  - [⊕ New Number]
- Status Indicator    │  - Separator | between action groups
```

**Status Indicators:**
- 🟢 Green = Connected & Ready
- ⚫ Gray = Disconnected 
- 🔵 Blue (pulsing) = Connecting...
- 🟠 Orange (pulsing) = Scan QR Code

### 3. **Media Tools Menu**
```
Click [+] button to see options:
├─ 🖼️  Photos & Videos  (attach images/video)
├─ 📄  Document         (attach PDF, Word, etc)
├─ 🎤  Audio            (attach audio files)
├─ 👥  Contact          (share contact card)
└─ 📍  Location         (share location)
```

### 4. **Emoji Picker**
```
Click [😊] button to open emoji grid:
Choose from 30+ common emojis:
😊 😂 🥰 😍 🎉 🔥 👍 ❤️ 😢 😡 🤔 👏 
💪 🚀 ⭐ ✨ 💯 🎈 🎁 🌟 💝 😎 🤗 😘 
😌 😴 😷 🥳 💕 ... and more!

Selected emoji automatically inserts into message
```

---

## 📋 Step-by-Step Guides

### Connect Your WhatsApp
```
1. Click [▲Login (QR)] button (green, top right)
2. QR code appears in modal dialog
3. Open WhatsApp on your phone
4. Go to Settings → Linked Devices
5. Scan QR code with your phone camera
6. Approve access on phone
7. Status changes to "Connected ●"
```

### Send a Message with Emoji
```
1. Click on a chat to open it
2. Type your message in the input field
3. Want to add emoji?
   - Click [😊] button
   - Select emoji from grid
   - Emoji appears in message box
4. Continue typing or click [➤] to send
5. Press ENTER or click [➤] to send
```

### Send Media (Photo, Video, Document)
```
1. In chat, click [+] button
2. Choose option:
   - Photos & Videos (for images/videos)
   - Document (for PDF, Word, etc)
   - Audio (for audio files)
   - Contact (to share contact)
   - Location (to share location)
3. Select file from your computer
4. File will be attached to message
5. Add optional text message
6. Click [➤] to send
```

### Logout & Switch to New Number
```
Option A - Clean Logout:
1. Click [→Logout] button (appears when connected)
2. Confirm the logout
3. Status changes to "Disconnected"
4. Chat list clears
5. Click [▲Login (QR)] to reconnect with same number

Option B - New Number:
1. Click [⊕ New] button
2. Opens QR for a DIFFERENT WhatsApp number
3. Scan with different phone/number
4. New session replaces old one
```

### Handle Connection Issues
```
If you see ⚠ red error message:

1. Read error details
2. Click [Reconnect Now] button to retry
3. If still failing:
   - Click [▲Login (QR)] to re-scan QR
   - Or [⊕ New] to start fresh
4. Check if WhatsApp bridge service is running

Still not working?
- Close browser tab and reopen
- Check internet connection
- Restart WhatsApp on phone
- Try different browser
```

---

## 🎮 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send Message | ENTER |
| Open Chat | Click chat name |
| Close Chat | Click [×] or ESC |
| Search Chats | Type in search box |
| Open Emoji Picker | Click [😊] or press : |
| Open Media Menu | Click [+] |

---

## ⚙️ Troubleshooting

### Problem: "Bridge issue" error
**Solution**:
- Click [Reconnect Now]
- Check bridge service is running: `ps aux | grep whatsapp`
- Check `.env.local` has correct bridge URL and secret

### Problem: QR doesn't appear after clicking Login
**Solution**:
- Wait 3-5 seconds, might be loading
- Click [Reconnect Now] to retry
- Hard refresh page (Cmd+Shift+R on Mac)
- Check browser console for errors

### Problem: Can't send messages
**Solution**:
- Verify status is "Connected" (green ●)
- Try clicking [Reconnect Now]
- Check if your message text is empty
- Try different browser

### Problem: Media files won't attach
**Solution**:
- Check file size isn't too large
- Try different file format
- Ensure "Photos & Videos" option is selected
- Check internet connection

### Problem: Emojis not appearing
**Solution**:
- Click [😊] button again to refresh grid
- Try different emoji from grid
- Check if browser supports emoji rendering

---

## 🔐 Security Notes

- **QR Codes Expire**: Scan QR within 2 minutes
- **Session Persistence**: Your login stays active in bridge storage
- **One Active Session**: Only one WhatsApp number at a time per bridge
- **Logout Clears**: Clicking "Logout" clears all stored messages
- **Bridge Secret**: Configured in `.env.local`, not exposed to browser

---

## 💾 Data Storage

| Item | Stored Where | Persists After Reload |
|------|--------------|----------------------|
| Messages | Bridge Session | Only while connected |
| Chat List | Bridge Cache | Only while connected |
| Status | Bridge Service | Yes |
| Profile | WhatsApp API | Yes |
| Emoji History | Browser Memory | No (cleared) |
| Media Attachments | Not stored locally | Sent to WhatsApp |

---

## 📊 Feature Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Send Messages | ✅ Complete | Works instantly |
| Receive Messages | ✅ Complete | Real-time updates |
| Message Status Ticks | ✅ Complete | ✓=sent, ✓✓=delivered, blue=read |
| Group Chats | ✅ Complete | Shows member count |
| Profile Pictures | ✅ Complete | Auto-fetches, gradient fallback |
| Emoji Picker | ✅ Complete | 30+ emoji grid |
| Media Tools Menu | ✅ Complete | 5 attachment options |
| File Upload | 🔄 In Progress | Will integrate with AWS S3 |
| Contact Details Panel | 🔄 In Progress | Will show info when name clicked |
| Chat History (MongoDB) | 🔄 In Progress | Will persist messages in database |
| Auto-Start Services | ✅ Complete | Launches on Mac reboot |

---

## 🚀 Next Features Coming

1. **Contact Details Panel** - Click name to see contact info, mute options, last seen
2. **Media Upload to S3** - Upload images/videos to AWS S3, stream from cloud
3. **Chat Persistence** - Save all messages to MongoDB, access history anytime
4. **Group Admin Features** - Manage group, add/remove members, change settings
5. **Message Search** - Search through all conversations by keyword or date

---

**Last Updated**: January 12, 2026  
**Version**: 2.0 - Professional UI/UX Overhaul  
**Status**: Production Ready ✅
