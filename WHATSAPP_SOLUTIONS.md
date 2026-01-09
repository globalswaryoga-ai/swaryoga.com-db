# WhatsApp Messaging Solutions - Meta Live Mode Issue

## Problem
- **Meta App switched to LIVE MODE** (Jan 8, 2026)
- Messages sent but **webhooks not arriving** (status updates blocked)
- Phone number `919309986820` needs to be in "Test Recipients" list
- Current: Only Meta Cloud API is active, no fallback

## Solution Options

### **Option 1: Fix Meta Live Mode (Recommended Long-Term)**
**Timeline:** 5-10 minutes setup

**Steps:**
1. Go to: Meta Business Manager → Your WhatsApp App
2. Find the alert: "App Mode Change" → Click "Switch back to development"
3. OR: Add `919309986820` to **"Test Recipient Numbers"** in WhatsApp Business Account settings
4. Re-send test message
5. Check webhook: `node scripts/debug-webhooks-today.js`

**Pros:** Native Meta features, proper production setup
**Cons:** Takes time, requires Meta account access

---

### **Option 2: Use WhatsApp Web Bridge (Immediate, Working)**
**Timeline:** 2-3 minutes configuration

**Steps:**

#### A) Set Environment Variables
Edit `.env.local`:
```bash
WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3001
WHATSAPP_WEB_BRIDGE_SECRET=your_bridge_secret_here
```

#### B) Start the Bridge Server (if local)
```bash
# In separate terminal on your EC2 or local machine
node app.js  # whatsapp-web.js server
```

#### C) System Automatically Falls Back
- Code modified in `lib/whatsapp.ts` → `sendWhatsAppText()` now:
  1. **Tries Meta Cloud API first**
  2. **Falls back to Bridge** if Meta fails
  3. Stores message with correct provider tag

**Pros:** 
- ✅ Immediate working solution
- ✅ All old bridge messages visible in CRM
- ✅ No Meta configuration needed
- ✅ Automatic fallback if Meta goes down

**Cons:**
- ⚠️ Requires QR re-scan periodically
- ⚠️ Not production-recommended (browser-based)
- ⚠️ Single point of failure

---

### **Option 3: Hybrid (Recommended Short-Term)**
**Timeline:** 5 minutes

Use both:
1. **Keep Meta** → for webhooks (once live mode fixed)
2. **Enable Bridge** → as fallback while fixing Meta

Configuration:
```bash
# .env.local
WHATSAPP_PHONE_NUMBER_ID=733788303156745
WHATSAPP_ACCESS_TOKEN=EAAZA17...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=daaf8e1d...

# Fallback bridge (only if Meta fails)
WHATSAPP_BRIDGE_HTTP_URL=http://your-ec2:3001
WHATSAPP_WEB_BRIDGE_SECRET=your_secret
```

Flow:
```
Message Send Request
    ↓
Try Meta Cloud API
    ↓ (if fails)
Fall back to Bridge
    ↓ (if fails)
Return error to user
```

---

## Immediate Action Plan

### **Right Now (Fastest):**
```bash
# 1. Enable bridge fallback (already coded)
cp .env.local.bak .env.local

# 2. Edit .env.local and add:
#    WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3001
#    WHATSAPP_WEB_BRIDGE_SECRET=your_secret_here

# 3. Start bridge server (your EC2)
# 4. Test send from CRM
# 5. Messages should flow via bridge while Meta live mode is fixed
```

### **Parallel (Fix Meta):**
1. Log into Meta Business Manager
2. Switch app back to development mode OR add test recipients
3. Once done, Meta takes priority, bridge is fallback only

---

## Code Changes Made

### `lib/whatsapp.ts` - `sendWhatsAppText()`
- ✅ Tries Meta Cloud API first
- ✅ Falls back to Bridge if Meta fails
- ✅ Returns appropriate provider tag (`meta` or `whatsapp_web_bridge`)

### Database Handling
- ✅ Both providers stored correctly
- ✅ Messages from both sources visible in CRM Inbox
- ✅ Historical bridge messages still searchable

---

## Testing

After configuration:

```bash
# Send test message
# Then check webhook events:
node scripts/debug-webhooks-today.js

# Should show:
# [timestamp] Kind: inbound_message, OK: true, Inbound from 919...
```

---

## Next Steps

**Pick one:**

1. **Use Bridge Now** → Set env vars + start server + test
2. **Fix Meta Now** → Switch app mode + add test recipients
3. **Both** → Enable bridge as fallback while fixing Meta

Which would you prefer? I can help with any of these.
