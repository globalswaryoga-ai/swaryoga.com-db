# WhatsApp Incoming Messages - Quick Checklist

## ✅ What's Working
- [x] Webhook endpoint running at `/api/whatsapp/webhook`
- [x] Webhook accepts both SHA256 and SHA1 signatures
- [x] Incoming message styling: **White text on green background** (#22c55e green, #ffffff white)
- [x] Lead auto-creation from incoming messages
- [x] Webhook events are logged to database
- [x] Test messages successfully processed (verified with test phone 918765432100)

## ❌ What Needs Fixing (Meta Configuration)
Messages from your other mobile aren't arriving because:

### Step 1: Register Webhook in Meta App Dashboard
```
Go to developers.facebook.com
→ Your App → WhatsApp → Configuration → Webhooks
→ Edit webhook
→ Set Callback URL: https://your-production-domain.com/api/whatsapp/webhook
→ Set Verify Token: ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d
→ Select webhook fields: ✅ messages, ✅ message_status
→ Click "Verify and Save"
```

### Step 2: Test Webhook Verification
Meta will send a GET request to verify. Your webhook should respond with the challenge.

### Step 3: Verify Business Account
- Check that your phone number is linked to WhatsApp Business Account
- Verify the business account is active (may need ID verification with Meta)

### Step 4: Test Sending & Receiving
- Send a message from your admin UI → should reach your test phone
- Send a message from test phone → should appear in CRM with green background

---

## Database Queries to Verify

### Check webhook events:
```javascript
db.whatsapp_webhook_events.find({}).sort({ receivedAt: -1 }).limit(10)
```

### Check incoming messages:
```javascript
db.whatsappmessages.find({ direction: 'inbound' }).sort({ sentAt: -1 })
```

### Check auto-created leads:
```javascript
db.leads.find({ source: 'whatsapp' }).sort({ createdAt: -1 })
```

---

## Message Styling Verification

All incoming messages are styled with:
- **Background:** Green (#22c55e)
- **Text Color:** White (#ffffff)
- **Border Radius:** 8px

This is set in `app/api/whatsapp/webhook/route.ts` lines 375-378

---

## Support Resources

- Meta WhatsApp Cloud API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Webhook Events: https://developers.facebook.com/docs/whatsapp/webhooks/webhook-reference
- Business Account Setup: https://www.whatsapp.com/business/get-started
