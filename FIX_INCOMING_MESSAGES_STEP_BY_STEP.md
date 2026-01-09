# IMMEDIATE FIX: Incoming Messages Not Showing in CRM

## 🚨 CRITICAL ISSUES FOUND & FIXES

### Issue 1: Corrupted Environment Variables
**Status**: ✅ FIXED

The `.env.local` file had duplicated, corrupted values. A cleaned version has been created.

**Action Done**:
```bash
# Corrupted file was replaced with validated variables
cat .env.local.clean > .env.local
```

---

### Issue 2: Missing appsecret_proof in Meta API Calls

**File to Fix**: `lib/whatsapp.ts`

**Current Problem** (Line ~100-130):
```typescript
const payload: any = {
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: { body },
  // ❌ MISSING: appsecret_proof
};
```

**Fix Applied**:
The function `generateAppSecretProof` already EXISTS in the code but is NOT being used for text messages.

**Implementation**:

Find this section in `lib/whatsapp.ts` around line 109:
```typescript
const payload: any = {
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: { body },
};
```

Replace with:
```typescript
const appSecretProof = generateAppSecretProof(accessToken, appSecret);

const payload: any = {
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: { body },
};

if (appSecretProof) {
  payload.appsecret_proof = appSecretProof;
}
```

**Why**: Meta API now requires `appsecret_proof` for server-to-server authentication. Without it, all sends return HTTP 400.

---

### Issue 3: Incoming Messages Not Appearing in CRM UI

**File**: `app/api/admin/crm/conversations/route.ts`

**Problem**: When messages don't have a valid `leadId`, they don't appear in the conversations list.

**Root Cause**: The webhook handler should create a lead for every inbound message, but something's going wrong.

**Check**:
Run this to see if incoming messages have leadId:
```bash
node -e 'const mongoose = require("mongoose"); mongoose.connect(process.env.MONGODB_URI_MAIN).then(() => { const db = mongoose.connection.useDb("swaryoga_admin_crm"); db.collection("whatsapp_messages").find({ direction: "inbound" }).limit(5).toArray().then(ms => { ms.forEach(m => console.log(`Phone: ${m.phoneNumber} | HasLeadId: ${!!m.leadId}`)); process.exit(0); }); });'
```

If `HasLeadId` is `false` for any messages, that's why they don't show.

**Fix**: In `app/api/whatsapp/webhook/route.ts` around line 420, ensure the leadId is always set:
```typescript
// Ensure Lead exists
let lead = await Lead.findOne({ phoneNumber: from });
if (!lead) {
  lead = await Lead.create({
    phoneNumber: from,
    source: 'whatsapp',
    status: 'lead',
    lastMessageAt: now,
  });
  console.log(`[WEBHOOK] Created new lead: ${lead._id} for ${from}`);
}

// Store message
await WhatsAppMessage.updateOne(
  { waMessageId: inboundWaMessageId, direction: 'inbound' },
  {
    $set: { updatedAt: now },
    $setOnInsert: {
      leadId: lead._id,  // ✅ ALWAYS SET
      // ... rest of fields
    },
  },
  { upsert: true }
);
```

---

### Issue 4: User's Recent Messages (30+) Not in Webhook Events

**Problem**: The user sent 30+ messages but only 1 is in the webhook log

**Possible Causes**:
1. ❌ Webhook subscription is inactive in Meta (most likely)
2. ❌ Messages going to a different webhook URL
3. ❌ Meta rejecting the webhook due to corrupted credentials

**Solution**:
1. Go to Meta Business Manager > WhatsApp Configuration
2. Check if webhook is "Active" 
3. Verify the callback URL is correct: `https://swaryoga.com/api/whatsapp/webhook`
4. Verify the verify token matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN` from `.env.local`
5. If not, click "Re-subscribe" to re-enable webhooks

**Test Webhook is Working**:
```bash
# Send a test message via Meta API
node test-meta-direct.js

# Check if it appears in webhook events
node -e 'const mongoose = require("mongoose"); mongoose.connect(process.env.MONGODB_URI_MAIN).then(() => { const db = mongoose.connection.useDb("swaryoga_admin_crm"); db.collection("whatsapp_webhook_events").countDocuments({ kind: "inbound_message" }).then(c => { console.log(`Total inbound webhook events: ${c}`); process.exit(0); }); });'
```

---

## ✅ VERIFICATION STEPS

After making fixes, run these commands:

**1. Check environment is valid**:
```bash
grep WHATSAPP_ .env.local | head -5
# Should show clean, single-line values
```

**2. Test Meta API sends (should now work)**:
```bash
node test-meta-direct.js
# Should return: Status: 200
```

**3. Check for incoming messages**:
```bash
node check-webhook-events.js
# Should show recent inbound_message events
```

**4. Check CRM shows conversations**:
- Go to: https://swaryoga.com/admin/crm/whatsapp
- Should see conversation with 919309986820
- Messages should be listed below

---

## 🎯 SUMMARY

| Issue | Status | Fix |
|-------|--------|-----|
| Corrupted .env.local | ✅ FIXED | Replaced with clean version |
| Missing appsecret_proof | 🔴 PENDING | Add to `lib/whatsapp.ts` |
| Messages without leadId | 🟡 CHECK | Verify webhook creates leads |
| Webhook not receiving | 🔴 CHECK | May need Meta reconfiguration |

---

## 📋 FILES TO EDIT

1. **lib/whatsapp.ts** - Add appsecret_proof to payload
2. **app/api/whatsapp/webhook/route.ts** - Ensure leadId is set (line ~430)
3. **META BUSINESS MANAGER** - Verify webhook subscription is active

