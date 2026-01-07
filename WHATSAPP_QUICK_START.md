# ⚡ WhatsApp Meta API - Quick Start

**What Happened**: You chose Meta API as your primary WhatsApp system.

---

## 📋 What You Need To Do

### **Step 1: Clear EC2 Bridge Secrets** (5 min)
Go to your environment variables and clear:
- `WHATSAPP_WEB_BRIDGE_SECRET` → set to empty
- `WHATSAPP_BRIDGE_SECRET` → set to empty

**Where**: Vercel / EC2 / Your hosting platform

### **Step 2: Verify Meta Webhook URL** (5 min)
Go to https://business.facebook.com/
- Settings → Configuration
- Callback URL: `https://your-domain.com/api/whatsapp/webhook`
- Should match your production domain

### **Step 3: Test Locally (Optional)** (10 min)
```bash
npm run dev
node test-meta-webhook.js
node test-meta-integration.js
node check-whatsapp-state.js
```

### **Step 4: Deploy to Production** (5 min)
- Changes already committed to main branch
- Just deploy/restart your app

### **Step 5: Test Real Message** (5 min)
Send a WhatsApp message to your business number.
Should appear in `/admin/crm/whatsapp` within seconds.

---

## ✅ Done?

If everything works:
- ✅ You're using Meta API
- ✅ EC2 Bridge is disabled
- ✅ No duplicate messages will be created
- ✅ WhatsApp messages flow directly to your CRM

---

## 📖 Need More Details?

- **META_API_SETUP_GUIDE.md** - Full setup guide
- **WHATSAPP_DEPLOYMENT_CHECKLIST.md** - Detailed deployment steps
- **WHATSAPP_DUAL_SYSTEM_ANALYSIS.md** - System comparison

---

## �� Issues?

See **META_API_SETUP_GUIDE.md** → Troubleshooting section

**Status**: ✅ Ready for Production
**Time to Deploy**: ~30 minutes
