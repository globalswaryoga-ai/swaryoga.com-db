# WhatsApp QR Bridge - Production Setup

**Status**: Ready for Production  
**Date**: January 13, 2026

---

## 🔧 Current Configuration

### Bridge (Mac Local IP)
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
```

### Database
```
MongoDB Atlas (Cloud)
- Cluster: swaryogadb.dheqmu1
- Databases: swaryogaDB + swaryoga_admin_crm
- Status: ✅ Connected
```

---

## ✅ Verification Checklist

- ✅ Bridge running on Mac (port 3333)
- ✅ Local IP accessible (192.168.1.100:3333)
- ✅ MongoDB Atlas connected
- ✅ Dev server running (port 3020)
- ✅ QR endpoint working
- ✅ `.env.local` configured

---

## ⏳ To Deploy to Production

### Step 1: Update Vercel Environment Variables
Go to: https://vercel.com/swaryogaprojects/swar-yoga-web-mohan/settings/environment-variables

**Update for PRODUCTION and PREVIEW:**
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL = http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL = http://192.168.1.100:3333
```

### Step 2: Redeploy Vercel
- Deployment auto-triggers on env var change
- Or manually trigger: https://vercel.com/swaryogaprojects/swar-yoga-web-mohan/deployments

### Step 3: Test Production Domain
```bash
curl -s https://crm.swaryoga.com/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus
```
Expected: `{"status":"qr","hasQr":true,...}`

---

## 🚀 Production Requirements

**Mac must be:**
- Powered on 24/7
- Connected to network
- IP must remain `192.168.1.100` (set static IP)
- Bridge process running: `node server.js`

---

## 🔗 Architecture

```
crm.swaryoga.com → Vercel (Production)
         ↓
192.168.1.100:3333 (Bridge on Mac)
         ↓
WhatsApp Web Connection
         ↓
QR Code Generated ✅
```

---

## 📊 Test Results

| Component | Status | Command |
|-----------|--------|---------|
| Bridge | ✅ | `curl http://192.168.1.100:3333/status` |
| Dev Server | ✅ | `curl http://192.168.1.100:3020` |
| MongoDB | ✅ | `mongosh ping` |
| QR Endpoint | ✅ | `/api/admin/crm/whatsapp/qr-bridge` |

---

## 📞 Troubleshooting

**If domain returns 404:**
1. Check Vercel environment variables are updated
2. Verify Vercel redeployed successfully
3. Clear browser cache

**If bridge not responding:**
1. Check Mac is on network
2. Verify bridge is running: `ps aux | grep "node server.js"`
3. Test local IP: `curl http://192.168.1.100:3333/status`

---

*Ready for production testing. Update Vercel and redeploy.*
