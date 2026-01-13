# 🔧 QUICK START: Fix WhatsApp QR on crm.swaryoga.com

## Problem
❌ QR code won't display when accessing `crm.swaryoga.com/admin/crm/qr`

## Why
Bridge at `192.168.1.100:3333` (local IP) can't be reached from domain browser

## Solution (3 Steps - 5 Minutes)

### Step 1️⃣: Start ngrok
```bash
ngrok http 3333 --subdomain=swar-yoga-bridge
```
Wait for it to show:
```
Forwarding                    https://swar-yoga-bridge.ngrok.io -> http://localhost:3333
```

### Step 2️⃣: Update `.env.local`
Find these two lines:
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
```

Replace with:
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
```

### Step 3️⃣: Restart server
```bash
# In terminal running dev server
Ctrl+C  # Stop
npm run dev -- --port 3020  # Restart
```

## Test
1. Open: `https://crm.swaryoga.com/admin/crm/qr`
2. Click: "Login (QR)"
3. See: 📱 QR code appears ✅

---

## Done! 🎉

Your QR code should now work on the production domain.

**Note**: ngrok token expires after 2 hours. For permanent setup, deploy bridge to EC2 (see `EC2_BRIDGE_CHECKLIST.md`).
