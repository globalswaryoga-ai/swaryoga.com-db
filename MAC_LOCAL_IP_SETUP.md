# Mac Local IP Setup - WhatsApp QR Bridge

**Date**: January 13, 2026  
**Status**: ✅ **ACTIVE**

---

## 🎯 Overview

The WhatsApp QR bridge runs on your **Mac OS** at `http://localhost:3333` and is exposed to your local network via your Mac's IP address: **`192.168.1.100`**

**No ngrok tunnel needed!** The bridge is directly accessible from:
- Your domain: `crm.swaryoga.com`
- Your local network: Any device on 192.168.1.0/24

---

## ✅ Configuration

### `.env.local` (Updated)
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL_SECRET=swar-bridge-secret-2024
```

### Vercel Environment Variables (MUST UPDATE)

**Go to**: https://vercel.com/swaryogaprojects/swar-yoga-web-mohan/settings/environment-variables

**Update for Production:**
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL` → `http://192.168.1.100:3333`
- `WHATSAPP_BRIDGE_HTTP_URL` → `http://192.168.1.100:3333`

**Update for Preview:**
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL` → `http://192.168.1.100:3333`
- `WHATSAPP_BRIDGE_HTTP_URL` → `http://192.168.1.100:3333`

---

## 🔌 System Status

| Component | Status | Details |
|-----------|--------|---------|
| **Bridge Server** | ✅ Running | `http://localhost:3333` (local) |
| **Bridge on Network** | ✅ Running | `http://192.168.1.100:3333` (Mac IP) |
| **QR Code** | ✅ Active | Valid base64 PNG generated |
| **MongoDB Atlas** | ✅ Connected | 10GB storage, 2MB speed |
| **Dev Server** | ✅ Running | Port 3020 |
| **ngrok Tunnel** | ❌ Stopped | Not needed - using local IP |

---

## 🧪 Verification Tests

### Test 1: Local Bridge
```bash
curl -s -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://localhost:3333/status | jq '.'
```
✅ **Expected**: `{"status":"qr","hasQr":true,...}`

### Test 2: Network IP
```bash
curl -s -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://192.168.1.100:3333/status | jq '.'
```
✅ **Expected**: Same response as Test 1

### Test 3: QR Endpoint (Dev Server)
```bash
curl -s "http://localhost:3020/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus" | jq '.'
```
✅ **Expected**: QR endpoint proxy working

---

## 📋 Requirements for Production

### Must-Have
- ✅ Mac must be **powered on and connected to network**
- ✅ Bridge server must be **running** (`node server.js`)
- ✅ Mac IP **must remain `192.168.1.100`** (check if DHCP is stable)
- ✅ Firewall **must allow port 3333 inbound** on local network

### Network Setup
- Your Mac is on the same network as the domain router
- `crm.swaryoga.com` domain **must resolve to your Mac's IP** or be configured to access it
- Local network devices can reach `http://192.168.1.100:3333` directly

---

## ⚠️ Important Notes

### IP Address Stability
**⚠️ WARNING**: If your Mac's IP changes, Vercel will lose connection to the bridge!

**Solutions**:
1. **Set Static IP on Mac** (Recommended)
   - System Settings → Network → Wi-Fi → Details → TCP/IP
   - Set "Configure IPv4" to "Manual"
   - Enter IP: `192.168.1.100`
   - Subnet Mask: `255.255.255.0`
   - Router: `192.168.1.1`

2. **Set IP Reservation on Router** (Alternative)
   - Router admin panel
   - Reserve IP `192.168.1.100` for your Mac's MAC address

### Firewall Configuration
Make sure your Mac's firewall allows port 3333:
```bash
# Check if port 3333 is open
lsof -i :3333

# If firewall is blocking, allow it via:
# System Settings → Security & Privacy → Firewall Options
```

### Bridge Uptime
For production, the bridge must be:
- Running 24/7 on your Mac
- Mac must not sleep (disable sleep mode if possible)
- Monitor bridge process regularly

---

## 🚀 Next Steps

### Immediate Actions
1. **Update Vercel Environment Variables** with `http://192.168.1.100:3333`
2. **Set Static IP** on your Mac (recommended)
3. **Test Production Domain**: `https://crm.swaryoga.com/admin/crm/qr`

### Monitoring Commands
```bash
# Check bridge is running
curl -s -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://192.168.1.100:3333/status

# Check dev server
curl -s http://localhost:3020/api/health

# Monitor bridge process
ps aux | grep "node server.js" | grep -v grep
```

---

## 💾 Architecture

```
┌─────────────────────────────────────────────────────┐
│           Your Mac OS (192.168.1.100)                │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │ Bridge Server (port 3333)                    │   │
│  │ - WhatsApp Web connection                    │   │
│  │ - QR Code generation                        │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐   │
│  │ Dev Server (port 3020)                       │   │
│  │ - Next.js app for testing                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│         Internet / Vercel Deployment                 │
├─────────────────────────────────────────────────────┤
│  crm.swaryoga.com                                    │
│  ↓                                                   │
│  /api/admin/crm/whatsapp/qr-bridge                   │
│  ↓                                                   │
│  Proxies to: http://192.168.1.100:3333              │
└─────────────────────────────────────────────────────┘
```

---

## 📞 Troubleshooting

### Bridge not responding
```bash
# Restart bridge
pkill -f "node server.js"
cd ~/swaryoga.com-db/deploy/wa-bridge
npm start
```

### IP changed
```bash
# Find new IP
ifconfig | grep "inet " | grep -v "127.0.0.1"

# Update Vercel and .env.local with new IP
```

### Port 3333 in use
```bash
lsof -i :3333
kill -9 <PID>
```

---

## ✨ Status

**✅ System Ready for Production Testing**

All components configured and verified:
- Bridge running on Mac
- Local IP configured
- MongoDB connected
- Dev server active

**Next**: Update Vercel environment variables and test production domain.

---

*Setup Guide - January 13, 2026*
