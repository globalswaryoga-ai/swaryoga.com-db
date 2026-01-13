# 🚀 WHATSAPP BRIDGE - QUICK REFERENCE

## **Current Status** ✅
```
Code:        ✅ Built & Deployed (Vercel)
Bridge:      ✅ Ready to deploy (EC2)
Database:    ✅ MongoDB Atlas connected
Docs:        ✅ Complete setup guides
```

---

## **READY FOR EC2? Just Run:**

```bash
cd /Users/mohankalburgi/swaryoga.com-db
chmod +x setup-ec2-from-mac.sh
./setup-ec2-from-mac.sh
```

**That's it! Script does everything automatically.**

---

## **What You'll Get**
- ✅ EC2 instance running (t2.micro - FREE)
- ✅ Node.js + PM2 installed
- ✅ WhatsApp bridge deployed
- ✅ Public IP address
- ✅ Vercel updated with bridge IP
- ✅ QR page working in 6-7 minutes

---

## **Verify It Works**

```bash
# Wait 2 minutes for Vercel redeploy, then open:
https://crm.swaryoga.com/admin/crm/qr

# Or test via curl:
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://[EC2_IP]:3333/status
```

---

## **After Setup: Monitor Bridge**

```bash
# SSH into EC2
ssh -i ~/.ssh/swar-yoga-bridge-key.pem ubuntu@[EC2_IP]

# View logs
pm2 logs whatsapp-bridge

# Restart
pm2 restart whatsapp-bridge

# Update code
cd ~/swaryoga.com-db && git pull && pm2 restart whatsapp-bridge
```

---

## **Backup Plan If Script Fails**

See `EC2_BRIDGE_SETUP.md` for manual step-by-step instructions.

---

## **Files You Have**
- `setup-ec2-from-mac.sh` ← Run this!
- `EC2_FAST_SETUP.md` ← Quick guide
- `EC2_BRIDGE_SETUP.md` ← Detailed guide  
- `WHATSAPP_BRIDGE_COMPLETE.md` ← Full summary

---

## **Costs**
- Year 1: **FREE** (AWS free tier)
- Year 2+: **~$10/month**

---

## **ONE LINE TO RUN EVERYTHING:**

```bash
cd /Users/mohankalburgi/swaryoga.com-db && chmod +x setup-ec2-from-mac.sh && ./setup-ec2-from-mac.sh
```

---

**🎉 Ready? Let's do this! 🎉**
