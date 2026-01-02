# WhatsApp Integration: Quick Reference Card

## 🎯 What to Do Right Now

### Option 1: **Cloud API (Meta)** ← START HERE ✅
**Time:** 15 minutes | **Server:** Vercel | **Cost:** $0-100+/month

```bash
# 1. Get credentials from https://business.facebook.com
#    Copy: Access Token + Phone Number ID

# 2. Add to Vercel Dashboard (Settings → Environment Variables)
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=yyy

# 3. Redeploy (auto-deployed)

# 4. Test: CRM → Leads → Messages → Send
```

**Result:** Messages send immediately from CRM to WhatsApp ✅

---

### Option 2: **WhatsApp Web QR** ← LATER (Optional)
**Time:** 1-2 hours | **Server:** Self-hosted VPS | **Cost:** $5-20/month

```bash
# 1. Rent VPS (AWS EC2, DigitalOcean, etc.)

# 2. SSH into server
ssh your-server

# 3. Deploy bridge
cd swar-yoga/deploy/wa-bridge
docker-compose up -d

# 4. Set up SSL + subdomain
# Add: wa-bridge.swaryoga.com → HTTPS

# 5. Add to Vercel env
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com

# 6. Test: CRM → Scan QR Code with WhatsApp
```

**Result:** QR login + real WhatsApp Web messaging ✅

---

## 📋 Decision Matrix

| Need | Option | Recommendation |
|------|--------|-----------------|
| Quick test | Cloud API | ✅ Do this first |
| Personal account | Web QR | Need self-hosted server |
| High volume | Cloud API | Professional + reliable |
| No server access | Cloud API | Only option on Vercel |
| Want QR + backup | Both | Do Cloud API first, add QR later |

---

## 🔗 Important Links

- **Full Guide:** `WHATSAPP_QR_SETUP_GUIDE.md`
- **Implementation Summary:** `WHATSAPP_IMPLEMENTATION_SUMMARY.md`
- **Bridge Server Code:** `/deploy/wa-bridge/README.md`
- **Message API:** `app/api/admin/crm/messages/route.ts`
- **WhatsApp Helpers:** `lib/whatsapp.ts`

---

## ⚡ Technical Notes

**Why not QR on Vercel?**
- Next.js webpack tries to bundle `whatsapp-web.js`
- Bundling fails on missing internal dependencies
- **Solution:** Use separate self-hosted Node.js server

**Current Status:**
- ✅ Cloud API ready (just need credentials)
- ✅ Bridge server code ready (just need to deploy)
- ✅ Both documented and tested

---

## 🚀 Success Checklist

### Cloud API (Week 1)
- [ ] Create Meta Business Account
- [ ] Get Access Token
- [ ] Get Phone Number ID
- [ ] Add to Vercel env
- [ ] Test message send
- [ ] Message appears in WhatsApp

### Web QR (Week 2-3) Optional
- [ ] Rent VPS/EC2
- [ ] Deploy bridge server
- [ ] Set up SSL certificate
- [ ] Configure subdomain
- [ ] Add bridge URLs to env
- [ ] Scan QR in CRM
- [ ] Send test message

---

## 💬 What Users Will See

### With Cloud API
```
CRM Interface:
├─ Leads page
├─ Select a lead
├─ Messages tab
├─ Type message
├─ Click Send
└─ ✅ Message sent (instant)
```

### With Web QR
```
CRM Interface:
├─ Settings → WhatsApp
├─ Click "Scan QR Code"
├─ QR code appears
├─ Scan with phone
├─ ✅ Connected
└─ Now can send messages via WhatsApp Web
```

---

## 📞 Need Help?

1. **Decide:** Cloud API (Vercel) or Web QR (self-hosted)?
2. **Read:** Relevant section in `WHATSAPP_QR_SETUP_GUIDE.md`
3. **Follow:** Step-by-step instructions
4. **Test:** Use CRM interface to send message
5. **Debug:** Check troubleshooting section

---

**Status: ✅ Ready to implement - Choose one and start!**
