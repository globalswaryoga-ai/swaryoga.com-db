# 🚀 QUICK FIX: Re-Enable WhatsApp Webhook in Meta

## The Problem
Your .env.local was corrupted → Meta rejected your webhook → Messages stopped arriving

## The Solution (5 minutes)

### Step 1: Go to Meta Business Manager
https://business.facebook.com/

### Step 2: Find Your WhatsApp Business App
1. Click "Apps" in left sidebar
2. Select your app (should be "Swar Yoga" or similar)
3. Go to "Configuration" or "Settings"

### Step 3: Find Webhook Settings
Look for section called:
- "Webhooks" OR
- "Webhook Configuration" OR  
- "API Setup"

You should see something like:

```
📱 Webhook Configuration
Callback URL: https://swaryoga.com/api/whatsapp/webhook
Verify Token: ••••••••••••••••
Status: [INACTIVE] or [ERROR]

[Edit]  [Subscribe]  [Re-subscribe]
```

### Step 4: Update Settings
If currently showing errors or inactive:

**Click "Edit" (or create new):**
- Callback URL: `https://swaryoga.com/api/whatsapp/webhook`
- Verify Token: `SWAR_YOGA_MOHAN_WT_SETUP`

**Click "Subscribe" and select:**
- ✅ messages
- ✅ message_status
- ☐ message_template_status_update (optional)
- ☐ message_template_quality_update (optional)

### Step 5: Click "Verify and Save"
- Meta will send test request to your webhook
- Should show ✅ "Webhook verified"
- You may see "Status: Active"

### Step 6: Test It Works
Send a WhatsApp message to your business number

Then check database:
```bash
# In terminal:
cd /path/to/swaryoga.com-db
env MONGODB_URI_MAIN=$(grep MONGODB_URI_MAIN .env.local | cut -d= -f2-) \
  node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI_MAIN).then(() => {
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    db.collection('whatsapp_webhook_events').countDocuments().then(c => {
      console.log('Total webhook events:', c);
      process.exit(0);
    });
  });
  "
```

If count increases → **Working! ✅**

---

## 📋 Your Configuration Reference

| Setting | Value |
|---------|-------|
| **Webhook URL** | https://swaryoga.com/api/whatsapp/webhook |
| **Verify Token** | SWAR_YOGA_MOHAN_WT_SETUP |
| **Phone Number ID** | 733788303156745 |
| **Access Token** | (in .env.local) |
| **App Secret** | ce4bf92f6be0c7bace755a216cbf1ef2 |

---

## ❌ If Still Not Working

Check these:

1. **Is your domain accessible?**
   ```bash
   curl -I https://swaryoga.com/api/whatsapp/webhook
   # Should NOT return 404 or 500
   ```

2. **Is the app running?**
   ```bash
   npm run dev
   # Or check if deployed on Vercel
   ```

3. **Is webhook actually subscribed?**
   In Meta dashboard, status should show "Active" (not "Inactive" or "Error")

4. **Still having issues?**
   Check logs:
   ```bash
   node check-webhook-events.js
   ```

---

## ✅ Expected Result

After re-subscribing:
- New incoming messages appear in database within 5 seconds
- They show up in CRM chat interface
- Admin can reply from CRM and messages send to customer

---

**Timeline**: 5-10 minutes to re-subscribe + 1 minute to verify = working within 15 mins!

