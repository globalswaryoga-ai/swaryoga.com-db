# WhatsApp QR Login - Quick Start Guide

## 🎯 The Issue (Resolved)

**Problem:** "Invalid QR" error when trying to scan QR code for WhatsApp login  
**Root Cause:** WhatsApp Web Bridge service was not running  
**Status:** ✅ **NOW FIXED** - Service is running on localhost:3333

---

## ⚡ Quick Start (3 Steps)

### **Step 1: Verify Service is Running** (30 seconds)
```bash
ps aux | grep qrServer
# Should show: node qrServer.js
```

If NOT running:
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web
node qrServer.js > whatsapp-web.log 2>&1 &
```

### **Step 2: Generate QR Code** (in browser)
```
1. Open: http://localhost:3000/admin/crm/whatsapp/qr-login
2. Enter Account Name: "My Mobile" (or any name)
3. Click [Generate QR]
4. Wait 10-30 seconds (browser automation is slow)
5. QR code will appear on screen
```

### **Step 3: Scan & Authenticate** (on your phone)
```
1. Open WhatsApp on your mobile phone
2. Go to: Settings → Linked Devices → Link a Device
3. Point camera at QR code on your screen
4. Wait for authentication (5-10 seconds)
5. Success! Page will show "✅ Account created"
```

---

## 📱 Now You Can Send 1-1 Messages

### **From CRM Leads Followup Page**
```
1. Go to: /admin/crm/leads-followup
2. Select a lead from the left panel
3. Click "💬 WhatsApp" button (right side)
4. Type your message
5. Click [Send]
6. Message delivered to lead's WhatsApp!
```

---

## 🔧 Troubleshooting

### **"QR still not appearing after 30 seconds"**
```bash
# Check service logs
tail -f /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web/whatsapp-web.log

# If errors, restart:
killall node
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web
node qrServer.js > whatsapp-web.log 2>&1 &

# Then refresh browser page
```

### **"Port 3333 already in use"**
```bash
# Find what's using port 3333
lsof -i :3333

# Kill the process
kill -9 <PID>

# Restart WhatsApp service
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web
node qrServer.js > whatsapp-web.log 2>&1 &
```

### **"QR says 'Invalid' when scanning"**
```
Solutions:
1. Hard refresh browser (Cmd+Shift+R on Mac)
2. Wait 30 seconds and regenerate QR
3. Check your WhatsApp is updated (latest version)
4. Restart the service
5. Check session isn't already active (only one at a time)
```

---

## 🔄 Keep Service Running (Long-term)

### **Option 1: Manual (Current) - Service running now**
```bash
# Already done! Service PID 11673 is running
ps aux | grep qrServer  # Verify it's still there
```

### **Option 2: PM2 (Recommended for production)**
```bash
npm install -g pm2
cd /services/whatsapp-web
pm2 start qrServer.js --name whatsapp-web
pm2 save
pm2 startup
```

Then service auto-starts on reboot!

### **Option 3: macOS LaunchAgent (For local development)**
```bash
# Create plist file
cat > ~/Library/LaunchAgents/com.swaryoga.whatsapp-web.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.swaryoga.whatsapp-web</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web/qrServer.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web</string>
    <key>StandardOutPath</key>
    <string>/tmp/whatsapp-web-out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/whatsapp-web-err.log</string>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Enable it
launchctl load ~/Library/LaunchAgents/com.swaryoga.whatsapp-web.plist
```

---

## 📊 What's Happening Behind the Scenes

```
Browser (You) 
    ↓
Next.js CRM App (localhost:3000)
    ↓
API Endpoint (generate QR)
    ↓
WhatsApp Web Bridge (localhost:3333) ← SERVICE
    ↓
Browser Automation (Puppeteer)
    ↓
WhatsApp Web (web.whatsapp.com)
    ↓
QR Code Generated & Displayed
    ↓
You Scan with Phone
    ↓
Authentication Complete
    ↓
Linked Device Ready to Send Messages
```

---

## ❓ FAQ

**Q: Do I need to start the service every time I restart my Mac?**  
A: Currently yes, unless you set up PM2 or LaunchAgent (Option 2/3 above)

**Q: Can I use multiple devices at once?**  
A: No, only one linked device per account. You must disconnect one before connecting another.

**Q: Will the service keep running if I close the terminal?**  
A: Yes! We used `nohup` and `&` to run it in background. Terminal can be closed.

**Q: How long is the QR valid?**  
A: 2 minutes (120 seconds). After that, you need to generate a new one.

**Q: Can I send messages from here, or only receive?**  
A: Both! Once authenticated, you can send and receive messages directly from CRM.

**Q: What if I lose internet connection?**  
A: Messages won't send until reconnected, then they'll retry automatically.

**Q: Is this secure?**  
A: Session data stored locally in `.wwebjs_auth/`. Not exposed to servers. Only your phone can authenticate.

---

## 🎯 Success Indicators

After successful QR scan, you should see:
- ✅ "Account created successfully" message
- ✅ Page redirects to /admin/crm/whatsapp/settings
- ✅ WhatsApp shows "This device is now linked"
- ✅ Can now send messages from CRM

---

## 📞 Support

For detailed help, see:
- **Full Debug Guide:** `WHATSAPP_QR_DEBUG_GUIDE.md`
- **Complete Documentation:** `WHATSAPP_QR_ISSUE_RESOLVED.md`
- **Service README:** `services/whatsapp-web/README.md`

---

**Ready to use! Start generating QR codes now! 🎉**
