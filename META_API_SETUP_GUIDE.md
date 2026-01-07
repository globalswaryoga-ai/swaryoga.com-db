# ✅ Meta API Selected - Implementation Guide

**Date**: January 7, 2026  
**Decision**: Keep Meta API, Disable EC2 Bridge  
**Status**: Ready to Deploy

---

## 🎯 What We're Doing

1. ✅ Keep **Meta API** as the primary WhatsApp system
2. ✅ Disable **EC2 Bridge** to prevent duplicates
3. ✅ Test Meta webhook integration
4. ✅ Verify messages flow correctly

---

## 📋 Environment Variables Status

### **Meta API - ACTIVE**
```
✅ WHATSAPP_WEBHOOK_VERIFY_TOKEN: SET
✅ META_APP_SECRET: SET
✅ WHATSAPP_PHONE_NUMBER_ID: SET
✅ WHATSAPP_ACCESS_TOKEN: SET
```

### **EC2 Bridge - DISABLED**
```
❌ WHATSAPP_WEB_BRIDGE_SECRET: TO BE CLEARED
❌ WHATSAPP_BRIDGE_SECRET: TO BE CLEARED
```

---

## 🔧 Implementation Steps

### **Step 1: Disable EC2 Bridge (DO NOT USE)**

In your `.env` or environment variables, clear these:
```bash
# Clear EC2 bridge secrets (set to empty)
WHATSAPP_WEB_BRIDGE_SECRET=
WHATSAPP_BRIDGE_SECRET=
```

**Note**: The endpoint `/api/admin/crm/whatsapp/inbound` will still exist but won't process messages (no secret configured).

### **Step 2: Verify Meta Webhook is Configured**

Go to Meta Business Platform and verify:
```
1. Navigate to: https://business.facebook.com/
2. Settings → WhatsApp → Configuration
3. Check Webhook Callback URL is set to:
   https://your-production-domain.com/api/whatsapp/webhook
   
4. Verify Event Subscriptions include:
   ☑️ messages
   ☑️ message_status (optional)
   ☑️ message_template_status_update (optional)
```

### **Step 3: Test Meta Webhook Locally**

#### Option A: Using curl
```bash
# Save this as test-payload.json
cat > test-payload.json << 'PAYLOAD'
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "919999999999",
          "id": "wamid.test.local.123",
          "timestamp": "1767768181",
          "text": { "body": "Test message from Meta API" },
          "type": "text"
        }],
        "metadata": {
          "phone_number_id": "733788303156745",
          "display_phone_number": "+91-9999999999"
        }
      }
    }]
  }]
}
PAYLOAD

# Compute signature and send
node -e "
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const payload = fs.readFileSync('test-payload.json', 'utf8');
const secret = process.env.META_APP_SECRET;
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

console.log('Signature:', sig);
"
```

#### Option B: Using provided test script
```bash
# Already prepared:
node test-meta-webhook.js        # Shows payload + signature
node test-meta-integration.js    # Sends test message (requires server running)
```

### **Step 4: Start Dev Server and Test**

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Send test message
node test-meta-integration.js
```

**Expected Output**:
```
✅ Response Status: 200
📋 Response Body: {"success":true,"data":{...}}
✅ WEBHOOK TEST PASSED
```

### **Step 5: Verify Message in Database**

```bash
# Check if message was stored
node check-whatsapp-state.js

# Expected:
# ✅ WhatsAppMessage count: 1 (or more)
# ✅ Incoming messages (last 24h): 1 (or more)
```

### **Step 6: Check Message Display in UI**

```
1. Open: http://localhost:3000/admin/crm/whatsapp
2. Expected to see:
   - New conversation in list
   - Message thread with incoming message
   - Message bubble on LEFT side (inbound)
```

---

## 🔄 Message Flow Diagram

```
Meta Cloud API
    ↓ (sends POST to your webhook)
/api/whatsapp/webhook
    ↓ (GET: verification, POST: message ingestion)
✅ Signature verification (HMAC-SHA256)
    ↓
Extract message details (from, text, timestamp, id)
    ↓
Normalize phone number (digits only)
    ↓
Find or create Lead
    ↓
Check idempotency (msg.id already stored?)
    ↓
Create WhatsAppMessage document
    ↓
Update Lead.lastMessageAt
    ↓
Response: {"success": true}
    ↓
/api/admin/crm/whatsapp/meta/conversations (aggregates)
    ↓
/app/admin/crm/whatsapp/page.tsx (displays in UI)
    ↓
Chat interface shows incoming message
```

---

## ✅ Testing Checklist

- [ ] Dev server started (`npm run dev`)
- [ ] Test payload generated (`node test-meta-webhook.js`)
- [ ] Test message sent (`node test-meta-integration.js`)
- [ ] Response status is 200/201
- [ ] Database shows 1+ messages (`node check-whatsapp-state.js`)
- [ ] UI shows conversation and message
- [ ] Message direction is correct (left bubble = inbound)
- [ ] Can send real WhatsApp message and see it appear

---

## 🚨 Troubleshooting

### **Issue: "Connection refused"**
```
❌ Error: connect ECONNREFUSED 127.0.0.1:3000
```
**Solution**: Start dev server first
```bash
npm run dev
```

### **Issue: "Invalid signature"**
```
❌ Response: 401 Unauthorized
```
**Solution**: Check META_APP_SECRET matches Meta platform
```bash
# Verify secret is set
echo $META_APP_SECRET
```

### **Issue: "Message not stored in database"**
```
❌ WhatsAppMessage count: 0
```
**Solution**: Check MongoDB connection
```bash
# Check connection
node check-whatsapp-state.js
```

### **Issue: "Message shows in DB but not in UI"**
```
✅ Database: 1 message
❌ UI: Empty conversation list
```
**Solution**: Refresh page, check browser console for errors
```
F12 → Console → Check for errors
```

---

## 📞 Real Message Testing

Once webhook is verified locally, test with real WhatsApp:

1. Send a real message to your WhatsApp business number
2. Check webhook delivery in Meta dashboard
3. Verify message appears in your CRM within seconds
4. Confirm message direction and content are correct

---

## 🔒 Security Notes

### **Signature Verification**
- ✅ Already implemented in `/api/whatsapp/webhook`
- ✅ Uses HMAC-SHA256 with META_APP_SECRET
- ✅ Protects against unauthorized message injection

### **Webhook Security**
- ✅ Only Meta can send to your webhook (signature required)
- ✅ Secret is never exposed in frontend
- ✅ All messages logged for audit trail

### **EC2 Bridge - DISABLED**
- ✅ Endpoint exists but won't accept messages (no secret)
- ✅ No risk of accidental activation
- ✅ Can be re-enabled anytime if needed

---

## 📝 Files for Reference

Created during diagnostics:
- `WHATSAPP_DUAL_SYSTEM_ANALYSIS.md` - System comparison
- `WHATSAPP_CRITICAL_DECISION.md` - Decision guide
- `check-env-vars.js` - Environment variable checker
- `check-whatsapp-state.js` - Database state checker
- `test-meta-webhook.js` - Test payload generator
- `test-meta-integration.js` - Integration tester

---

## 🚀 Next Actions

1. **Clear EC2 env variables** (if applicable)
2. **Run dev server**: `npm run dev`
3. **Test webhook**: `node test-meta-integration.js`
4. **Verify database**: `node check-whatsapp-state.js`
5. **Check UI**: Open `/admin/crm/whatsapp` in browser
6. **Send real message**: Test with actual WhatsApp business account

**Timeline**: 15-20 minutes for complete verification

---

## ✨ Success Criteria

- ✅ Dev server starts without errors
- ✅ Test message accepted by webhook (200 response)
- ✅ Message stored in WhatsAppMessage collection
- ✅ Message appears in conversation list
- ✅ Message displays in chat interface with correct direction
- ✅ No duplicate messages created
- ✅ Real WhatsApp message flows through system

**You're now using Meta API as your official WhatsApp system! 🎉**
