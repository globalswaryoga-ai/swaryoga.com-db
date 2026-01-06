# WhatsApp Incoming Messages Diagnosis

## ❌ Problem: Messages from other mobile not reaching Meta

### What You Need to Check

#### 1. **Webhook URL Registration (CRITICAL)**
Your webhook is running at:
```
GET  /api/whatsapp/webhook   (for verification)
POST /api/whatsapp/webhook   (for incoming messages)
```

**But did you register this in Meta's App Dashboard?**

**Steps to register webhook:**
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your app → Settings → Configuration
3. Under "Webhooks", click "Edit"
4. For **Callback URL**, enter your production domain:
   ```
   https://your-domain.com/api/whatsapp/webhook
   ```
   (or `http://localhost:3000/api/whatsapp/webhook` for local testing)

5. For **Verify Token**, enter:
   ```
   ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d
   ```
   (This is your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)

6. For **Webhook fields**, select:
   - ✅ `messages` (for incoming messages)
   - ✅ `message_status` (for delivery status)

7. Click **Verify and Save**

---

#### 2. **Test Webhook Verification**
If webhook URL is registered, test it:

```bash
# Replace with your actual domain
curl -X GET "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d"
```

Should return: `test123` (the challenge value)

---

#### 3. **Check Phone Number Configuration**
Make sure your test phone number is associated with your WhatsApp Business Account:

1. In Meta Business Manager → WhatsApp → Phone Numbers
2. Verify the phone number: `+${WHATSAPP_PHONE_NUMBER_ID}` format
3. Send a test message to verify it's recognized by Meta

---

#### 4. **Check Message Status**
Your messages might be failing due to:

- ❌ **Invalid phone number format** → Should be E.164 (e.g., `+918765432100`)
- ❌ **Access token expired** → Regenerate token in Meta App Settings
- ❌ **Business account not verified** → Meta requires document verification
- ❌ **Message template not approved** → For template messages, use approved templates
- ❌ **Rate limiting** → Meta has hourly rate limits on business accounts

---

### Current Configuration Status ✅

Your environment has:
```
✅ WHATSAPP_ACCESS_TOKEN        (set)
✅ WHATSAPP_PHONE_NUMBER_ID     (set: 733788303156745)
✅ WHATSAPP_WEBHOOK_VERIFY_TOKEN (set)
✅ Webhook endpoint              (running at /api/whatsapp/webhook)
✅ Incoming message handler      (accepts both x-hub-signature-256 and x-hub-signature)
✅ Lead auto-creation            (creates leads from incoming messages)
```

---

### Verify Webhook Is Working Locally

Run this test from your dev environment:

```bash
# Start dev server
npm run dev

# In another terminal, send a test webhook
node /tmp/send-webhook.js
```

If you see ✅ success and the lead appears in DB, your **webhook processing is working correctly**.

The issue is likely that **Meta's Cloud API hasn't been configured to send webhooks to your URL**.

---

### Next Steps

1. **Check Meta App Dashboard:** Is webhook URL registered? Does verify token match?
2. **Test webhook verification:** Can Meta successfully verify your endpoint?
3. **Send a test message from your other phone** → Check if it arrives at your endpoint
4. **Check CRM database:** Query `whatsapp_webhook_events` for incoming message logs

---

### Files to Reference

- **Webhook Handler:** `app/api/whatsapp/webhook/route.ts`
- **Message Styling:** Incoming messages have `backgroundColor: '#22c55e'` (green) + `textColor: '#ffffff'` (white)
- **Verification Log:** Check `whatsapp_webhook_events` collection in MongoDB

