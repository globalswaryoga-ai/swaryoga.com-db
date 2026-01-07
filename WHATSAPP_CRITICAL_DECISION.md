# ⚠️ CRITICAL DECISION REQUIRED - WhatsApp System

**Date**: January 7, 2026  
**Status**: **ACTION REQUIRED**  
**Issue**: Both WhatsApp systems are configured (causes duplicates)

---

## 🚨 Problem Summary

Your environment has **BOTH systems active**:

| System | Status | Active |
|--------|--------|--------|
| Meta API | ✅ Configured | **YES** |
| EC2 Bridge | ✅ Configured | **YES** |

**Risk**: When messages arrive, they'll be stored **TWICE** - once from each system with different message IDs.

---

## 🎯 Choose ONE System (Required Now)

### **Option A: Meta API (RECOMMENDED) ✅**

**Pros**:
- ✅ Official Meta WhatsApp Business API
- ✅ Production-grade reliability
- ✅ Scales easily (cloud-based)
- ✅ Better compliance & security
- ✅ Official support from Meta
- ✅ No EC2 server required

**Cons**:
- ❌ Requires Meta business account setup
- ❌ May require approval process
- ❌ Has API costs
- ⚠️ Takes longer to set up

**Current Status**: 
- ✅ WHATSAPP_WEBHOOK_VERIFY_TOKEN: Set
- ✅ META_APP_SECRET: Set
- ✅ WHATSAPP_PHONE_NUMBER_ID: Set
- ✅ WHATSAPP_ACCESS_TOKEN: Set
- **Ready to use!**

**Action**: Keep Meta, disable EC2

---

### **Option B: EC2 Bridge ⚡**

**Pros**:
- ✅ Works immediately (no approval needed)
- ✅ Full WhatsApp Web access
- ✅ Cheap to run (EC2 costs only)
- ✅ Complete control

**Cons**:
- ❌ Community solution (not official)
- ❌ Requires EC2 instance running 24/7
- ⚠️ May have stability issues
- ⚠️ No official Meta support
- ❌ Uses WhatsApp Web (against ToS)

**Current Status**:
- ✅ WHATSAPP_WEB_BRIDGE_SECRET: Set
- ❓ EC2 server running? (Unknown)
- **Partially ready**

**Action**: Keep EC2, disable Meta

---

## 📋 Step-by-Step Fix

### **If You Choose: META API** (Option A)

#### Step 1: Disable EC2 Bridge
```bash
# In .env or environment:
WHATSAPP_WEB_BRIDGE_SECRET=  # Clear this

# Or in code (option):
# Mark /api/admin/crm/whatsapp/inbound as disabled
```

#### Step 2: Verify Meta Webhook is Configured
```bash
# Check in Meta Business Platform:
1. Go to https://business.facebook.com/
2. Settings → WhatsApp → Configuration
3. Webhook callback URL: https://your-domain.com/api/whatsapp/webhook
4. Verify token: should match WHATSAPP_WEBHOOK_VERIFY_TOKEN
```

#### Step 3: Send Test Message
```bash
# Test the Meta webhook with sample message
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "919999999999",
            "id": "meta-msg-test-123",
            "timestamp": "1704700000",
            "text": { "body": "Test message from Meta" },
            "type": "text"
          }]
        }
      }]
    }]
  }'
```

---

### **If You Choose: EC2 BRIDGE** (Option B)

#### Step 1: Disable Meta API
```bash
# In .env or environment:
WHATSAPP_WEBHOOK_VERIFY_TOKEN=  # Clear this
META_APP_SECRET=                # Clear this
```

#### Step 2: Verify EC2 Server is Running
```bash
# On your EC2 instance:
1. Check if WhatsApp Web bridge is running
2. Verify it has the correct webhook URL configured
3. Verify WHATSAPP_WEB_BRIDGE_SECRET matches

# Test connection:
curl -X POST https://your-domain.com/api/admin/crm/whatsapp/inbound \
  -H "Content-Type: application/json" \
  -H "X-WhatsApp-Bridge-Secret: $(echo $WHATSAPP_WEB_BRIDGE_SECRET)" \
  -d '{
    "from": "919999999999",
    "body": "Test message from EC2",
    "timestamp": 1704700000,
    "waMessageId": "bridge-msg-test-123"
  }'
```

#### Step 3: Check EC2 Server Health
```bash
# SSH into EC2:
ssh -i your-key.pem ubuntu@your-ec2-ip

# Check if bridge is running:
ps aux | grep whatsapp

# Check logs:
tail -f /path/to/whatsapp-bridge/logs
```

---

## 🧪 Testing After Choice

### **For EITHER system:**

#### Test 1: Database Check
```bash
# Check if message was stored:
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
node check-whatsapp-state.js

# Expected output:
# ✅ WhatsAppMessage count: 1 (or more)
# ✅ Incoming messages (last 24h): 1 (or more)
```

#### Test 2: UI Display
```bash
# Open in browser:
http://localhost:3000/admin/crm/whatsapp

# Expected:
- Message appears in conversation list
- Message shows in chat thread
- Correct direction (incoming = left bubble)
```

#### Test 3: Real Message
Send a real WhatsApp message to your configured number and verify it appears immediately.

---

## 📝 Quick Reference - What to Do

### **Path A: Keep Meta API**
1. [ ] Disable EC2: `WHATSAPP_WEB_BRIDGE_SECRET=` (empty)
2. [ ] Verify Meta webhook URL in Meta dashboard
3. [ ] Run test webhook POST
4. [ ] Check database for message
5. [ ] Open UI and verify display
6. [ ] Send real message and verify

### **Path B: Keep EC2 Bridge**
1. [ ] Disable Meta: `WHATSAPP_WEBHOOK_VERIFY_TOKEN=` (empty)
2. [ ] Verify EC2 server is running
3. [ ] Run test webhook POST
4. [ ] Check database for message
5. [ ] Open UI and verify display
6. [ ] Send real message and verify

---

## ❓ Questions to Help You Decide

**Q: Do you have Meta business account set up?**
- A: YES → Use Meta API (Option A)
- A: NO → Use EC2 Bridge (Option B)

**Q: Is your EC2 instance running?**
- A: YES → Could use EC2 Bridge
- A: NO → Must use Meta API

**Q: What's your priority?**
- A: Stability & official support → Meta API
- A: Speed to deploy → EC2 Bridge

**Q: What's your cost budget?**
- A: More cost-effective → EC2 Bridge
- A: Don't care about cost → Meta API

---

## 🚀 Ready?

**Please choose:**

1. **[A] Keep Meta API, disable EC2** 
2. **[B] Keep EC2 Bridge, disable Meta**

Once you decide, I will:
1. Disable the unused system
2. Test the chosen system
3. Fix any issues
4. Commit changes
5. Verify everything works

**Timeline**: 20-30 minutes for testing + verification

---

## 📌 Current Environment Variables

```
✅ Meta API:
   WHATSAPP_WEBHOOK_VERIFY_TOKEN: SET (ce353ae0e9...)
   META_APP_SECRET: SET (94d214b93b...)
   WHATSAPP_PHONE_NUMBER_ID: SET (7337883031...)
   WHATSAPP_ACCESS_TOKEN: SET (EAAZA17SDR...)

✅ EC2 Bridge:
   WHATSAPP_WEB_BRIDGE_SECRET: SET (Db_1707_We...)

⚠️ Both are active - creating risk of duplicates
```

---

**Your choice:**  
Choose **A** or **B** above and I'll implement the fix immediately.
