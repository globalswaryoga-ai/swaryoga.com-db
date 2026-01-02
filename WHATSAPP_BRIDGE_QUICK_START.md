# 🚀 WhatsApp Bridge Deployment - Quick Start (5 Minutes)

**Status:** Bridge code ready ✅ | Deployment guides created ✅ | Awaiting your VPS details ⏳

---

## 📌 What Happened

You mentioned the bridge 404 error. **Root cause:** `/deploy/wa-bridge/` code exists but hasn't been deployed to any VPS yet.

**Solution:** Deploy the bridge Docker container to your VPS, then both WhatsApp pages will work.

---

## 🎯 What We Need From You (Copy-Paste Here)

```
VPS Provider: ________________ (e.g., AWS EC2, DigitalOcean, etc.)
VPS Public IP: ________________
VPS Username: ________________ (usually: ubuntu or admin)
SSH Key Path: ________________ (or "password auth" if using password)

Domain Setup:
  - Main domain: ________________ (swaryoga.com?)
  - Admin/CRM domain: ________________ (admin.swaryoga.com? or another?)
  - Bridge will be: wa-bridge.swaryoga.com ✅
```

---

## 📚 Documentation Files Created

| File | Purpose | Read This |
|------|---------|-----------|
| `WHATSAPP_VPS_DEPLOYMENT.md` | Full 50-step guide for deploying to VPS | 📖 **START HERE** |
| `WHATSAPP_VPS_DEPLOYMENT_CHECKLIST.md` | Checklist version (easy to follow) | ✅ **PRINT THIS** |

---

## ⚡ 30-Minute Deployment Overview

Once you give us VPS details, follow this timeline:

1. **SSH into VPS** (2 mins)
   - Run: `ssh ubuntu@YOUR_VPS_IP`

2. **Install Docker + Nginx** (3 mins)
   - Copy commands from guide Step 1

3. **Deploy Bridge** (10 mins)
   - Copy repo to VPS
   - Create `.env` file
   - Run `docker-compose up -d`

4. **Configure Nginx + SSL** (10 mins)
   - Copy Nginx config
   - Issue Let's Encrypt certificate
   - DNS must point to VPS IP

5. **Test QR Page** (5 mins)
   - Go to `/admin/crm?page=whatsapp-web`
   - Click "Open QR Login"
   - Scan with personal WhatsApp
   - Should show "Connected" ✅

---

## 🔧 Current File Structure

```
/deploy/wa-bridge/                 ← Ready to deploy
├── .env.example                   ← Update and copy to .env
├── docker-compose.yml             ← Defines bridge container
├── nginx-wa-bridge.conf           ← Copy to /etc/nginx/sites-available/
├── README.md                       ← Overview
└── swaryoga/
    ├── package.json               ← Node deps
    ├── qrServer.js                ← Main QR server
    ├── whatsappClient.js          ← WhatsApp Web logic
    ├── Dockerfile                 ← Docker image spec
    └── routes/                    ← API endpoints
```

---

## 🔑 Key Environment Variables

**In your VPS `.env`:**
```bash
WHATSAPP_WEB_ALLOWED_ORIGINS=https://admin.swaryoga.com,https://swaryoga.com
WHATSAPP_WEB_BRIDGE_SECRET=your_random_secret_here (32 chars, optional)
WHATSAPP_CLIENT_ID=crm-whatsapp-session
```

**In your local `.env.local` or Vercel Dashboard:**
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
```

---

## ✅ Success Checklist

After deployment:

- [ ] `curl https://wa-bridge.swaryoga.com/health` returns `{"status":"ok"}`
- [ ] QR code loads at `/admin/crm?page=whatsapp-web`
- [ ] Can scan QR with personal WhatsApp
- [ ] Status changes to "Connected"
- [ ] Can send test message
- [ ] Message arrives on personal WhatsApp ✅

---

## 🎯 Next Action

**Reply with:**
1. VPS provider name
2. VPS public IP address
3. SSH username
4. SSH key location (or if password auth)
5. Your CRM domain name

Example:
```
VPS Provider: AWS EC2
VPS IP: 54.123.45.67
Username: ubuntu
Key: /Users/mohan/.ssh/ec2-key.pem
CRM Domain: admin.swaryoga.com
Main Domain: swaryoga.com
```

Once we have these, I'll provide **exact commands to run on your VPS** to complete deployment.

---

**Estimated time to completion:** 30-45 minutes

**What works after:** Both WhatsApp pages fully functional! 🎉
