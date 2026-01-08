# 🚨 INCOMING MESSAGES FIX - WEBHOOK NOT CONFIGURED

## THE PROBLEM
✅ Outgoing messages: **WORKING**  
❌ Incoming messages: **NOT RECEIVING ANY**

Meta is **NOT calling your webhook** - no events are being received.

## ROOT CAUSE
Your webhook endpoint is **NOT registered with Meta** OR the URL is incorrect.

### What Meta should have:
- **Webhook URL**: `https://swaryoga.com/api/whatsapp/webhook`
- **Verify Token**: `daaf8e1d171343956249f5d7dca82609ed53296de40cd0ea96c0947c34769e5b`
- **Webhook Subscribe Fields**: 
  - `messages`
  - `message_status`

## STEPS TO FIX

### Step 1: Go to Meta Business Manager
1. Visit: https://business.facebook.com/
2. Navigate to: **Apps** → **Your WhatsApp App**
3. Click: **Configuration** or **Settings**

### Step 2: Configure Webhook
1. Find **Webhooks** section
2. Click **Edit** next to "Webhook URL"
3. Enter:
   - **Callback URL**: `https://swaryoga.com/api/whatsapp/webhook`
   - **Verify Token**: `daaf8e1d171343956249f5d7dca82609ed53296de40cd0ea96c0947c34769e5b`
4. Click **Verify and Save**

### Step 3: Subscribe to Events
1. Find **Subscribe Fields** section
2. Make sure these are checked:
   - ✅ `messages` (receive incoming messages)
   - ✅ `message_status` (receive delivery status updates)
3. Save

### Step 4: Test Webhook
After saving, Meta will send a test POST request to your webhook.
Check if it's received by running:
```bash
cd /Users/mohankalburgi/swaryoga.com-db && node << 'CMD'
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkWebhook() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'swaryoga_admin_crm' });
    const db = mongoose.connection.db;
    
    const events = await db.collection('webhook_events').countDocuments();
    const tests = await db.collection('system_webhook_tests').countDocuments();
    
    console.log(`\n✅ Webhook Events: ${events}`);
    console.log(`✅ System Tests: ${tests}`);
    
    if (events > 0 || tests > 0) {
      console.log('\n🎉 WEBHOOK IS WORKING!');
    } else {
      console.log('\n❌ Still no webhook calls');
    }
    
    await mongoose.disconnect();
  } catch (e) {
    console.error(e.message);
  }
}
checkWebhook();
CMD
```

## VERIFICATION URL
After setting up in Meta, test with:
```
https://swaryoga.com/api/whatsapp/webhook?debug=1&hub.mode=subscribe&hub.challenge=test123&hub.verify_token=daaf8e1d171343956249f5d7dca82609ed53296de40cd0ea96c0947c34769e5b
```

If you see success, the webhook is properly registered.

## WHAT HAPPENS NEXT
Once Meta is configured and sends webhooks:
1. Customer messages arrive at webhook
2. Database stores incoming messages
3. CRM shows customer conversations ✅

---
**Current Status**: Awaiting Meta webhook configuration
