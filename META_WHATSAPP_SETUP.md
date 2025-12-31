# 📱 Meta WhatsApp Business Setup Guide - Swar Yoga CRM

**Your WhatsApp Number:** `9779006820` (Meta Verified)
**Date:** December 31, 2025
**Project:** Swar Yoga Recorded Workshops CRM

---

## 🎯 Current Setup Status

Your system is **fully prepared** for Meta WhatsApp Business API integration:

✅ **Database Schema Ready**
- WhatsAppAccount model in `lib/schemas/enterpriseSchemas.ts`
- Stores Meta credentials, phone IDs, access tokens
- Health check tracking and message statistics

✅ **API Endpoints Ready**
- `POST /api/admin/crm/whatsapp-accounts` - Create account
- `GET /api/admin/crm/whatsapp-accounts` - List accounts
- `PUT /api/admin/crm/whatsapp-accounts/[id]` - Update account
- `GET /api/admin/crm/whatsapp-accounts/[id]/health-check` - Verify connection

✅ **Message System Ready**
- WhatsAppMessage schema for tracking messages
- Support for templates, text, media, interactive messages
- Delivery and read status tracking
- Retry logic and bulk sending

✅ **Frontend Ready**
- Admin CRM dashboard at `/admin/crm/leads`
- WhatsApp action buttons in leads-followup page
- Message templates configured

---

## 📋 What You Need to Connect

To connect your **Meta verified WhatsApp number (9779006820)**, you'll need these 5 credentials from Meta:

### 1. **Phone Number ID** (`metaPhoneNumberId`)
```
Example: 120265123456789
Where to get: Meta Business Manager → WhatsApp Accounts → Phone Numbers
```

### 2. **Business Account ID** (`metaBusinessAccountId`)
```
Example: 100123456789012
Where to get: Meta Business Manager → Settings → WABA ID
```

### 3. **Access Token** (`metaAccessToken`)
```
Example: EAA...YZD (very long token)
Where to get: Meta App Dashboard → Settings → App Roles → Generate Token
```

### 4. **Webhook Verify Token** (`metaVerifyToken`)
```
Example: your_custom_verify_token_here
Where to create: You generate this (any random string, 20+ chars recommended)
```

### 5. **Your Phone Number** (`metaPhoneNumber`)
```
Already have: 9779006820 (with country code: +977-9006820)
```

---

## 🔧 Step-by-Step Setup Process

### Step 1: Get Meta Credentials (15 minutes)

#### 1a. Go to Meta Business Manager
1. Open: https://business.facebook.com/
2. Login with your business account
3. Click **Account Settings** (bottom left)
4. Navigate to **Accounts** → **WhatsApp Accounts**
5. Select your business WhatsApp account

#### 1b. Find Your Phone Number ID
1. In WhatsApp Accounts, click **Phone Numbers**
2. Find `+977-9006820`
3. Click on it → Copy the **Phone Number ID**
   - You'll see: `ID: 120265...` (this is your `metaPhoneNumberId`)

#### 1c. Find Your Business Account ID (WABA ID)
1. Still in WhatsApp Accounts
2. Look for **Business Account ID** or **WABA ID**
3. Copy it (this is your `metaBusinessAccountId`)

#### 1d. Generate Access Token
1. Go to: https://developers.facebook.com/apps/
2. Select your Swar Yoga app
3. Go to **Settings** → **Basic**
4. Find **App Access Token** section
5. Click **Generate Token**
6. Copy the token (this is your `metaAccessToken`)

**⚠️ IMPORTANT:** This token gives API access. Keep it secret!

#### 1e. Create Webhook Verify Token
1. This is a custom string YOU create (not from Meta)
2. Generate a secure random string:
   ```bash
   # Run in terminal:
   openssl rand -hex 32
   ```
3. Copy the generated string (this is your `metaVerifyToken`)
4. Save it safely - you'll use it in webhook setup later

---

### Step 2: Add Account to Your System (5 minutes)

#### Via API (Recommended for developers)

**POST** to `/api/admin/crm/whatsapp-accounts`

```bash
curl -X POST http://localhost:3000/api/admin/crm/whatsapp-accounts \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Swar Yoga WhatsApp",
    "accountType": "meta",
    "metaPhoneNumberId": "120265123456789",
    "metaPhoneNumber": "+977-9006820",
    "metaBusinessAccountId": "100123456789012",
    "metaAccessToken": "EAA...YZD",
    "metaVerifyToken": "your_webhook_verify_token_here",
    "isDefault": true,
    "isActive": true,
    "dailyMessageLimit": 50000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "abc123...",
    "accountName": "Swar Yoga WhatsApp",
    "status": "pending",
    "healthStatus": "down",
    "createdAt": "2025-12-31T..."
  }
}
```

#### Via Admin Dashboard (Coming Soon)
- We'll add UI form in `/admin/crm` in next iteration

---

### Step 3: Verify Connection (5 minutes)

**Test your credentials:**

```bash
curl -X GET http://localhost:3000/api/admin/crm/whatsapp-accounts/[ACCOUNT_ID]/health-check \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Expected Response (if credentials correct):**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "healthStatus": "healthy",
    "phoneNumber": "+977-9006820",
    "messagesSent": 0
  }
}
```

**If status is "error":**
- Check credentials are exact (copy-paste, no spaces)
- Verify token hasn't expired (Meta tokens last 60 days)
- Regenerate access token if needed

---

### Step 4: Setup Webhooks (10 minutes)

Meta needs to know where to send message events (delivery, read, replies).

#### 4a. Get Your Webhook URL

Your webhook endpoint is already created at:
```
https://yourdomain.com/api/webhooks/meta/whatsapp
```

Replace `yourdomain.com` with your actual domain (e.g., `swaryoga.com`)

#### 4b. Configure Webhook in Meta

1. Go to: https://developers.facebook.com/apps/[YOUR_APP_ID]/webhooks/
2. Select **WhatsApp** from dropdown
3. In **Webhook URL** field, enter:
   ```
   https://yourdomain.com/api/webhooks/meta/whatsapp
   ```
4. In **Verify Token** field, enter:
   ```
   [THE VERIFY TOKEN YOU CREATED IN STEP 1e]
   ```
5. Click **Verify and Save**

#### 4c. Subscribe to Webhook Events

1. Still in Webhooks page
2. Under **Webhook fields**, enable:
   - ✅ `messages`
   - ✅ `message_status`
   - ✅ `message_template_status_update`
3. Click **Subscribe**

---

## 🧪 Test the Integration

### Test 1: Send a Test Message

```bash
curl -X POST https://graph.instagram.com/v18.0/[PHONE_NUMBER_ID]/messages \
  -H "Authorization: Bearer [YOUR_ACCESS_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "9779006820",
    "type": "text",
    "text": {"body": "Hello! This is a test message from Swar Yoga CRM"}
  }'
```

**Expected Response:**
```json
{
  "messages": [
    {
      "id": "wamid.xxx",
      "message_status": "accepted"
    }
  ]
}
```

### Test 2: Check Webhook

Send a message to your WhatsApp number from another number:
- Message should appear in admin CRM
- Should be tracked in WhatsAppMessage database

---

## 📊 Your WhatsApp Account Fields

When you add your account, these fields get stored:

```typescript
{
  accountName: "Swar Yoga WhatsApp",
  accountType: "meta",
  metaPhoneNumberId: "120265123456789",      // From Meta
  metaPhoneNumber: "+977-9006820",            // Your number
  metaBusinessAccountId: "100123456789012",   // Your WABA ID
  metaAccessToken: "EAA...YZD",              // Keep secret!
  metaVerifyToken: "your_token_here",        // For webhooks
  isDefault: true,                            // Use for sending
  isActive: true,                             // Enable/disable
  status: "connected",                        // Auto-updated
  healthStatus: "healthy",                    // Health checks
  dailyMessageLimit: 50000,                   // Rate limit
  lastMessageSentAt: Date,                    // Auto-tracked
  createdByUserId: "admincrm",               // Who added it
  managedByUserIds: ["user1", "user2"]       // Who can manage
}
```

---

## 🔄 Send Messages Through CRM

Once connected, send WhatsApp messages to leads:

### Via Admin Dashboard
1. Go to `/admin/crm/leads`
2. Select a customer
3. Click **WhatsApp** button
4. Choose message type:
   - Text message
   - Template message
   - Media (image/video/document)
   - Interactive buttons
5. Click **Send**

### Via API

```bash
curl -X POST http://localhost:3000/api/admin/crm/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_id_here",
    "messageContent": "Hi! Ready for next yoga class?",
    "messageType": "text",
    "direction": "outbound"
  }'
```

---

## 📱 Message Templates

Pre-approved templates for common messages:

```javascript
WHATSAPP_TEMPLATES = [
  {
    id: 'greeting',
    label: 'Welcome',
    text: 'Hi {{name}}! Welcome to Swar Yoga. We have {{count}} workshops available.'
  },
  {
    id: 'workshop_reminder',
    label: 'Workshop Reminder',
    text: 'Hi {{name}}, reminder: Your workshop {{workshop}} starts {{time}}.'
  },
  {
    id: 'follow_up',
    label: 'Follow-up',
    text: 'Hi {{name}}, we noticed you viewed {{workshop}}. Interested to join?'
  },
  {
    id: 'certificate',
    label: 'Certificate',
    text: 'Hi {{name}}, congratulations! Your certificate for {{workshop}} is ready.'
  }
]
```

---

## 🔐 Security Best Practices

⚠️ **CRITICAL - DO NOT:**
- ❌ Commit credentials to git
- ❌ Share access token in messages/email
- ❌ Use same token for multiple apps
- ❌ Store plaintext tokens in database

✅ **DO:**
- ✅ Store tokens in `.env` (encrypted in production)
- ✅ Rotate tokens every 60 days
- ✅ Use least-privilege access scopes
- ✅ Enable webhook verification
- ✅ Monitor API usage

---

## 📋 Configuration Checklist

Mark items as complete:

**Meta Setup:**
- [ ] Have Meta Business Manager access
- [ ] Found Phone Number ID (metaPhoneNumberId)
- [ ] Found Business Account ID (metaBusinessAccountId)
- [ ] Generated Access Token (metaAccessToken)
- [ ] Created Webhook Verify Token (metaVerifyToken)
- [ ] Phone number verified as "9779006820"

**System Setup:**
- [ ] Added WhatsApp account to database via API
- [ ] Got 201 success response
- [ ] Account shows in `GET /whatsapp-accounts`
- [ ] Health check returns "connected"
- [ ] Status field shows "connected"

**Webhook Setup:**
- [ ] Set webhook URL in Meta
- [ ] Set webhook verify token in Meta
- [ ] Subscribed to events (messages, message_status)
- [ ] Webhook endpoint created at `/api/webhooks/meta/whatsapp`

**Testing:**
- [ ] Sent test message successfully
- [ ] Message arrived on phone
- [ ] Message tracked in database
- [ ] Webhook events received from Meta

---

## 🚀 Next Steps

**Phase 1 (Complete):** ✅
- Infrastructure ready
- Database schemas created
- API endpoints built
- Credentials setup complete

**Phase 2 (Next):** ⏳
- Send first message to customer
- Test bulk messaging
- Setup message templates
- Monitor delivery rates

**Phase 3:** ⏳
- Community group broadcasting
- Automated follow-ups
- Customer sentiment analysis
- Analytics dashboard

---

## 📞 Troubleshooting

### "Invalid Access Token"
- ✓ Generate new token from Meta Dashboard
- ✓ Verify token hasn't expired (60 days)
- ✓ Copy-paste exactly (no extra spaces)

### "Phone number not verified"
- ✓ Go to Meta Business Manager
- ✓ Complete phone verification (OTP)
- ✓ Wait 24-48 hours for verification

### "Webhook not working"
- ✓ Verify domain is publicly accessible (not localhost)
- ✓ Check webhook URL in Meta is exact
- ✓ Verify token matches in Meta + your code
- ✓ Check application logs for errors

### "Message send failed"
- ✓ Check daily message limit not exceeded
- ✓ Verify recipient phone is valid
- ✓ Check account is marked isActive: true
- ✓ Verify access token still valid

### "Still having issues?"

Check logs:
```bash
# Check MongoDB for account details
db.whatsapp_accounts.find({metaPhoneNumber: "+977-9006820"})

# Check message send logs
db.whatsapp_messages.find({phoneNumber: "9779006820"})

# Check errors in application
tail -f app.log | grep whatsapp
```

---

## 📚 Resources

- **Meta Official Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **WhatsApp Business API:** https://www.whatsapp.com/business/api
- **Our CRM Guide:** See `DOCUMENTATION_INDEX.md`
- **API Reference:** See `/api/admin/crm/whatsapp-accounts` endpoint docs

---

## ✨ What This Gives You

Once fully setup, you get:

✅ **Direct WhatsApp communication** with all 1000s of customers
✅ **Message tracking** - see read/delivered status
✅ **Bulk messaging** - reach hundreds at once
✅ **Automated responses** - chatbot integration
✅ **Templates** - pre-approved messages for compliance
✅ **Analytics** - track engagement metrics
✅ **Integration** - works with your existing CRM

---

**Status:** 🟢 Ready to connect
**Time to complete setup:** ~30 minutes
**Support:** Check troubleshooting section or review Meta docs

---

Let me know when you have the 5 credentials from Meta, and I'll help you integrate them!
