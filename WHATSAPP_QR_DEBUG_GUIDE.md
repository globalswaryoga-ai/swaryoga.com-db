# WhatsApp QR Code Issue - Diagnosis & Solutions

## 🔴 THE PROBLEM

You've been experiencing "Invalid QR" errors for 8 days because:

### **Root Cause:**
The WhatsApp 1-1 QR login feature requires a **separate Node.js service** to be running:
- **Service File:** `/services/whatsapp-web/qrServer.js`
- **Current Status:** ⚠️ **NOT RUNNING**
- **Result:** QR codes cannot be generated → "Invalid QR" error

---

## 📊 How the System Works (Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Web Application                       │
│                                                                  │
│  /admin/crm/whatsapp/qr-login/page.tsx (React Frontend)        │
│         ↓ (User clicks "Generate QR")                           │
│  POST /api/admin/crm/whatsapp/qr-login/generate                │
│         ↓ (API Endpoint)                                         │
│  app/api/admin/crm/whatsapp/qr-login/generate/route.ts         │
│         ↓ (Tries to fetch from WhatsApp Bridge)                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                    ❌ NO CONNECTION
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│          WhatsApp Web Bridge (Separate Service) ❌               │
│                                                                  │
│  /services/whatsapp-web/qrServer.js                            │
│  - Port: 3333                                                  │
│  - WebSocket: ws://localhost:3333                             │
│  - Handles: QR generation, WhatsApp session, message sending  │
│  - Status: 🔴 NOT RUNNING                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ SOLUTION 1: Start the WhatsApp Web Bridge (IMMEDIATE FIX)

### **Step 1: Install Dependencies**
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web
npm install
```

**What it installs:**
- `whatsapp-web.js` - WhatsApp Web automation library
- `qrcode` - QR code generation
- `ws` - WebSocket for real-time QR updates
- `express` - HTTP server for API endpoints
- `puppeteer` - Browser automation

### **Step 2: Start the Service in Background**
```bash
# Option A: Using Node directly
cd services/whatsapp-web
node qrServer.js &

# Option B: Using npm (if script is configured)
npm start &

# Option C: Using nohup (so it keeps running after terminal closes)
cd services/whatsapp-web
nohup node qrServer.js > whatsapp-web.log 2>&1 &
```

### **Step 3: Verify it's Running**
```bash
# Check if service is listening on port 3333
lsof -i :3333

# Or test with curl
curl http://localhost:3333/health

# Expected output:
# {"ok":true,"authenticated":false}
```

### **Step 4: Now try the QR Login**
1. Go to: `/admin/crm/whatsapp/qr-login`
2. Enter account name: e.g., "Personal Mobile"
3. Click **Generate QR**
4. Wait 10-30 seconds (first initialization takes time)
5. QR code should appear
6. Scan with WhatsApp mobile → Linked devices → Link a device

---

## 🔧 SOLUTION 2: Auto-Start with PM2 (Recommended for Production)

### **Step 1: Install PM2 Globally**
```bash
npm install -g pm2
```

### **Step 2: Create PM2 Configuration**
Create `ecosystem.config.js` in the `/services/whatsapp-web` folder:
```javascript
module.exports = {
  apps: [
    {
      name: 'whatsapp-web-bridge',
      script: './qrServer.js',
      cwd: '/Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        WHATSAPP_WEB_PORT: 3333,
        WHATSAPP_CLIENT_ID: 'crm-whatsapp-session',
      },
      error_file: '/tmp/whatsapp-web-error.log',
      out_file: '/tmp/whatsapp-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    }
  ]
};
```

### **Step 3: Start with PM2**
```bash
pm2 start /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web/ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs whatsapp-web-bridge

# Stop if needed
pm2 stop whatsapp-web-bridge

# Start on boot
pm2 startup
pm2 save
```

---

## 📋 Required Environment Variables

Create `.env` file in `/services/whatsapp-web/`:
```bash
# Port where the QR bridge runs
WHATSAPP_WEB_PORT=3333

# Session ID (keep for consistency)
WHATSAPP_CLIENT_ID=crm-whatsapp-session

# Optional: API key protection
WHATSAPP_WEB_BRIDGE_SECRET=your-secret-key-here
```

### In `/root/.env.local` (Main app config):
```bash
# URL where Next.js app can reach the WhatsApp bridge
WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
```

---

## 🐛 Troubleshooting

### **Issue 1: "QR code expired" or "Invalid QR"**
```
Solution: WhatsApp Web service crashed or not running
Fix: 
  ps aux | grep qrServer.js
  # If not in list, service crashed
  # Restart it: node qrServer.js &
```

### **Issue 2: "Waiting for QR... taking too long"**
```
Solution: Browser is taking too long to load WhatsApp Web
Reason: First-time initialization can take 20-30 seconds
Fix:
  1. Wait 30 seconds
  2. Refresh the page
  3. Try generating QR again
  
  Or check service logs:
  tail -f /tmp/whatsapp-web-out.log
```

### **Issue 3: "Connection refused" on port 3333**
```
Solution: Service is not running
Check: lsof -i :3333
If no output, service needs to start

Start with:
  cd services/whatsapp-web
  npm install
  node qrServer.js
```

### **Issue 4: "WhatsApp Web no longer supports..."**
```
Solution: WhatsApp may have blocked web access
Note: This is rare but can happen. If stuck:
  1. Clear session: rm -rf .wwebjs_auth/
  2. Restart service
  3. Try again

OR use official WhatsApp Cloud API instead (recommended for production)
```

---

## 📊 Data Flow When Working Correctly

```
1️⃣  USER SCANS QR
    └─ Open WhatsApp on phone
    └─ Go to Linked devices
    └─ Tap "Link a device"
    └─ Scan QR code shown on screen

2️⃣  QR VALIDATED
    └─ WhatsApp Web receives authentication
    └─ Session saved in .wwebjs_auth/ directory
    └─ QR code disappears
    └─ Status changes to "✅ Authenticated"

3️⃣  SEND 1-1 MESSAGES
    └─ Go to Leads Followup → Select Lead
    └─ Click "💬 WhatsApp" action
    └─ Type message
    └─ Click Send
    └─ Message sent via qrServer.js bridge
    └─ Delivered to WhatsApp (linked device)
```

---

## 🎯 Why This Architecture?

### **WhatsApp Restrictions:**
- Official Cloud API: Requires business account (strict approval process)
- WhatsApp Web: No approval needed, personal accounts work

### **This Project Uses:**
- ✅ WhatsApp Web (Personal accounts, 1-1 messaging)
- ✅ QR-based login (No password needed)
- ✅ WebSocket bridge (Real-time QR updates)
- ✅ Local session (Persisted, faster re-auth)

### **Limitations:**
- ⚠️ Not official API (WhatsApp can change Web UI anytime)
- ⚠️ Requires separate service (Must keep qrServer.js running)
- ⚠️ Single account only (One linked device at a time)
- ✅ Fine for CRM admin use (Not for bulk automation)

---

## ✅ Complete Setup Checklist

- [ ] **Navigate to service folder:** `cd services/whatsapp-web`
- [ ] **Install dependencies:** `npm install`
- [ ] **Create `.env` file** with `WHATSAPP_WEB_PORT=3333`
- [ ] **Start the service:** `node qrServer.js &` (background)
- [ ] **Test connection:** `curl http://localhost:3333/health`
- [ ] **Go to QR login:** `http://localhost:3000/admin/crm/whatsapp/qr-login`
- [ ] **Generate QR:** Click button, wait 10-30 seconds
- [ ] **Scan with phone:** Open WhatsApp → Linked devices → Link a device
- [ ] **Verify success:** Page should show "✅ Authenticated"
- [ ] **Test messaging:** Select lead → Click WhatsApp → Send test message

---

## 🚀 Quick Start Command

**Run this to start everything:**
```bash
# Terminal 1: Start Next.js (if not already running)
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
npm run dev

# Terminal 2: Start WhatsApp Web Bridge
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/services/whatsapp-web
npm install
node qrServer.js

# Then visit:
# http://localhost:3000/admin/crm/whatsapp/qr-login
```

---

## 📞 For Production Deployment

If you're deploying to production:

1. **Use PM2** to manage the WhatsApp Web service
2. **Use official Cloud API** instead of WhatsApp Web (more reliable)
3. **Keep .wwebjs_auth/ in persistent storage** (don't lose the session)
4. **Monitor logs** regularly for WhatsApp Web changes

---

**Status:** This is the root cause of your "Invalid QR" error ✅  
**Next Step:** Start the qrServer.js service and try again!
