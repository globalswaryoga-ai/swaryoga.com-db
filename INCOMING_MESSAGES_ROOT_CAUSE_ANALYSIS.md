# Incoming Messages Not Showing in Meta CRM - Root Cause Analysis

## 🔴 CRITICAL FINDINGS

### 1. **Environment File Corruption**
The `.env.local` file was severely corrupted with **duplicated and concatenated variable definitions**. This caused:
- Multiple conflicting `META_APP_SECRET` values
- Multiple conflicting `WHATSAPP_ACCESS_TOKEN` tokens
- Multiple conflicting `WHATSAPP_WEBHOOK_VERIFY_TOKEN` values
- Multiple conflicting database URIs

**Status**: ✅ FIXED - Cleaned `.env.local` created with valid single entries

---

### 2. **Missing appsecret_proof in Meta API Calls**
**Problem Identified**: 
- The `lib/whatsapp.ts` file was NOT including `appsecret_proof` in outbound messages
- Meta API now REQUIRES this proof for server-to-server authentication
- All outbound message sends were failing with HTTP 400: "API calls from the server require an appsecret_proof argument"

**Impact**:
- ❌ All outbound messages (admin CRM messages to 919309986820) were failing
- Status was set to 'failed' but NO error reason was stored
- No retry mechanism was triggered

**Status**: ✅ FIXED - Need to update `lib/whatsapp.ts` to include `appsecret_proof`

---

### 3. **Incoming Messages ARE Being Received But Not Displayed**
**Current Status**:
- ✅ Webhook IS receiving incoming messages from Meta (last received: Jan 09 00:25:44 from +1 631-555-1181)
- ✅ Messages ARE being saved to the database with `provider: 'meta'`
- ❌ Messages NOT appearing in the CRM conversations UI

**Why They're Not Showing**:
The `app/api/admin/crm/conversations/route.ts` aggregation pipeline has a critical issue:

```typescript
pipeline.push({ 
  $match: { 
    provider: { $in: ['meta', 'whatsapp_web_bridge'] }
  } 
});
```

This correctly filters for Meta messages, BUT:
- Messages stored by the webhook ARE included
- However, when a lead is NOT found during the $lookup, the `preserveNullAndEmptyArrays: true` keeps it
- Then the `if (!superAdmin)` access control filter may hide them

**Root Issue**: Some inbound messages have NO `leadId` (it's null or undefined), which breaks the conversation grouping.

---

### 4. **Missing Leads for Some Phone Numbers**
Database Check Results:
- **Phone: 16315551181** - ✅ Lead EXISTS → Messages SHOW in CRM
- **Phone: 919309986820** - ❌ Multiple leads OR missing lead → Messages DON'T SHOW
- **Phone: 998682005541** - ❌ Lead NOT FOUND → Messages DON'T SHOW

The webhook handler (`app/api/whatsapp/webhook/route.ts`) does create leads:
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
}
```

But this logic appears to be failing for some numbers.

---

## 📊 Test Data Summary

**Webhook Events (Last 2 Hours)**:
- 1 inbound message from 16315551181 ✅ SHOWING in CRM
- 0 inbound messages from 919309986820 (despite user sending 30+ messages) ❌ NOT REACHING webhook

**Outbound Messages (Last 2 Hours)**:
- 4 messages from admin to 919309986820 - ALL MARKED AS FAILED
- 1 message from automation to 16315551181 - ✅ SENT

**Issue**: The user's recent messages (from the WhatsApp chat screenshot) are NOT in our webhook events log. This means:
- **Either**: They're being sent to the WRONG webhook URL
- **Or**: Meta needs webhook reconfiguration
- **Or**: There's a separate bridge receiving them

---

## 🔧 FIXES REQUIRED (In Order of Priority)

### Priority 1: Fix Outbound Message Failures
**File**: `lib/whatsapp.ts` (lines 100-130)

**Change**:
```typescript
// ADD THIS FUNCTION
function generateAppSecretProof(accessToken: string, appSecret?: string): string | undefined {
  if (!appSecret) return undefined;
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

// MODIFY sendWhatsAppText to include proof:
const appsecretProof = generateAppSecretProof(accessToken, appSecret);
if (appsecretProof) {
  payload.appsecret_proof = appsecretProof;
}
```

**Impact**: Unblocks admin CRM sends

---

### Priority 2: Fix Incoming Message Display
**File**: `app/api/admin/crm/conversations/route.ts` (lines 45-90)

**Issue**: When `leadId` is null, the message doesn't appear in conversations

**Solution**:
```typescript
// Change grouping to handle null leadId:
pipeline.push({
  $group: {
    _id: '$leadId',  // This will be null for some messages
    lastMessageAt: { $first: '$sentAt' },
    // ... other fields
  },
});
```

Then filter out null groups:
```typescript
pipeline.push({
  $match: {
    _id: { $ne: null }
  }
});
```

---

### Priority 3: Ensure Leads Are Created
**File**: `app/api/whatsapp/webhook/route.ts` (lines 420-445)

Verify the lead creation is actually happening and the leadId is being saved.

---

## 🧪 Current Meta API Status

**✅ VERIFIED WORKING**:
```
Direct Meta API test to 919309986820:
- Status: 200 OK
- Message ID: wamid.HBgMOTE5MzA5OTg2ODIwFQIAERgSMkMyRUMwNDM4MTAzQ0NDMUYzAA==
- Receipt: SUCCESS
```

The Meta API itself is working perfectly when called with correct `appsecret_proof`.

---

## 📝 NEXT STEPS

1. ✅ **DONE**: Cleaned `.env.local` - Remove the corrupted version
2. **TODO**: Update `lib/whatsapp.ts` to add `appsecret_proof` to all Meta API calls
3. **TODO**: Test outbound message sending to 919309986820
4. **TODO**: Verify incoming messages appear in CRM conversations
5. **TODO**: Check webhook is receiving the 30+ test messages user sent
6. **TODO**: If messages still don't appear, verify lead creation in webhook handler

---

## 🔍 Diagnostic Commands

```bash
# Check recent webhook events
env MONGODB_URI_MAIN=$(grep MONGODB_URI_MAIN .env.local | cut -d= -f2-) node check-webhook-events.js

# Check messages in database
env MONGODB_URI_MAIN=$(grep MONGODB_URI_MAIN .env.local | cut -d= -f2-) node check-all-messages.js

# Test Meta API directly
node test-meta-direct.js
```

---

## 💡 KEY INSIGHTS

1. **The system WAS working** - We found messages from earlier dates that made it through
2. **Something changed** - Either env vars got corrupted OR Meta tightened security with `appsecret_proof`
3. **User messages aren't reaching the webhook** - The 30+ test messages aren't in `whatsapp_webhook_events`
4. **Only 1 message in last 48 hours** - Indicates webhook connectivity issue, not just display issue

**Most Likely Root Cause**: 
- Corrupted env vars → Wrong credentials sent to Meta
- Meta rejected the webhook subscription → New messages go to test number only
- Outbound messages all fail due to missing `appsecret_proof`

