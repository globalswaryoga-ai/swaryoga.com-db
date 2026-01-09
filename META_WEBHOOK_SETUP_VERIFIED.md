# ✅ Meta WhatsApp Webhook Configuration - Verification Status

**Current Date:** January 8, 2026  
**Status:** READY TO RECEIVE MESSAGES

---

## 🔧 Backend Configuration Status

### ✅ Webhook Verification (GET)
```
Endpoint: https://crm.swaryoga.com/api/whatsapp/webhook
Test Result: PASS ✅
Verify Token: ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d
Challenge Response: Returns correct challenge string
```

### ✅ Webhook Receiving (POST)
```
Endpoint: https://crm.swaryoga.com/api/whatsapp/webhook
Test Result: PASS ✅
Response: {"success":true}
Signature Verification: DISABLED (SKIP_WEBHOOK_SIGNATURE=true)
```

### ✅ Database Connection
```
Database: swaryoga_admin_crm
Collection: meta_messages
Status: CONNECTED ✅
```

---

## 📋 Meta Dashboard Configuration Checklist

NOW GO TO META BUSINESS MANAGER AND VERIFY:

### Step 1: Go to App Configuration
```
📍 Meta Business Manager
   → Your Business Accounts
   → WhatsApp Business Account
   → Configuration (or Webhook Settings)
```

### Step 2: Configure Callback URL
- [ ] **Callback URL:** `https://crm.swaryoga.com/api/whatsapp/webhook`
- [ ] **Verify Token:** `ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d`
- [ ] Click **"Verify and Save"**
- [ ] Status should show: ✅ VERIFIED

### Step 3: Subscribe to Webhook Fields
- [ ] Select **Webhook Subscriptions** or **Manage Subscriptions**
- [ ] Subscribe to these fields:
  - [x] **messages** ← MOST IMPORTANT
  - [x] **message_status**
  - [x] **message_template_status_update**
  - [x] **message_template_quality_status_update**

### Step 4: Verify App Selection
- [ ] Confirm this app is **SELECTED/ACTIVE**
- [ ] Check app shows: "Webhook Configured" ✅
- [ ] Subscribed to "messages" field ✅

---

## 🧪 Test Instructions

Once Meta dashboard is configured:

### Test 1: Manual Test from Meta
1. Go to Meta Business Manager
2. Click "Test Webhook" or "Send Test"
3. You should see test data arrive in your system

### Test 2: Send Real Message
1. Send a message to your WhatsApp Business number from any phone
2. Run this command in terminal:
```bash
node check-incoming-meta-messages.js
```
3. You should see your message in the database

### Test 3: Verify Message Storage
```bash
node -e "
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI_MAIN;
mongoose.connect(uri).then(async () => {
  const metaMessageSchema = new mongoose.Schema({}, { strict: false });
  const MetaMessage = mongoose.model('meta_messages', metaMessageSchema);
  const count = await MetaMessage.countDocuments();
  console.log('✅ Total messages in database:', count);
  process.exit(0);
});
"
```

---

## 📞 Your WhatsApp Configuration

**App ID:** (from Meta)  
**App Secret:** 94d214b93b4586f8d2aada3bf9c0ad92  
**Access Token:** EAAZA17SDRZATgBQVYvi8NeGSvKZAfh2ao2621D9hDRVyJTBa2aAGfTnMuzm4EKshA3mgfVKdiFi4v7MFt3AKgQFay4LbJkQenFK32a3gN70cZCbSrUkCkAKr4vqZCZCGQwWHXpqMfZCc0SyB0t8ES4GZBLp65y5JPr1V3yLGLIGzcnlNezyZBFwZCwiahRB77QbZAV1vgZDZD  
**Phone Number ID:** 733788303156745  
**Verify Token:** ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d  

---

## ⚠️ Important Notes

1. **Webhook is READY** - Backend code is correct and tested
2. **Meta Dashboard Configuration** - You must configure this manually in Meta Business Manager
3. **Callback URL must match exactly:**
   ```
   https://crm.swaryoga.com/api/whatsapp/webhook
   ```
4. **Verify Token must match exactly:**
   ```
   ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d
   ```
5. **Subscribe to "messages" field** - Critical for receiving incoming messages
6. **No typos allowed** - One character difference and Meta won't connect

---

## 🚀 What Happens After Configuration

1. Customer sends message to your WhatsApp number
2. Meta receives the message
3. Meta calls your webhook URL (GET for verification, then POST for data)
4. Your endpoint stores message in database
5. Your frontend (CRM) retrieves and displays message
6. Team can reply through your system

---

## ❓ Troubleshooting

### Problem: "Failed to verify callback URL"
- Copy-paste verify token again exactly
- Make sure HTTPS (not HTTP)
- Check for trailing spaces or newlines

### Problem: Messages not arriving
- Go back to Step 3 - Subscribe to "messages" field
- Verify the app is SELECTED (not another app)
- Check app status is "ACTIVE"

### Problem: Still not working?
Run this to test webhook manually:
```bash
# Test verification
curl "https://crm.swaryoga.com/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d"

# Test message receipt
curl -X POST https://crm.swaryoga.com/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"id":"123456789","changes":[{"value":{"messaging_product":"whatsapp","messages":[{"from":"919309986820","id":"wamid.test123","timestamp":"1234567890","text":{"body":"Test message"}}]},"field":"messages"}]}]}'
```

---

## ✅ Confirmation

- [x] GET endpoint returns challenge → WORKING
- [x] POST endpoint accepts messages → WORKING
- [x] Database connection → WORKING
- [x] Environment variables → CORRECT
- [ ] Meta dashboard webhook configured → **AWAITING YOUR ACTION**
- [ ] Meta subscribed to messages field → **AWAITING YOUR ACTION**

**Next Step:** Configure in Meta Business Manager using the checklist above.

