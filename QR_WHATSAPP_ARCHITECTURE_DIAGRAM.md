# QR WhatsApp System Architecture Diagram

## 🏗️ Complete Message Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    QR WHATSAPP INTEGRATION                       │
│                  (waofficialapi.in Provider)                     │
└─────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════
                         INCOMING FLOW
════════════════════════════════════════════════════════════════════

External QR Provider                  Your Application
(waofficialapi.in)                   (Next.js on Vercel)
    │
    │ Webhook Delivery
    ├─ POST to /api/whatsapp/qr/webhook
    ├─ With X-QR-Chat-Secret header
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Route: /app/api/whatsapp/qr/webhook/route.ts           │
    │  ✅ ACTIVE & OPERATIONAL                                │
    ├──────────────────────────────────────────────────────────┤
    │ 1. Validate webhook secret (optional)                    │
    │ 2. Parse JSON payload                                    │
    │ 3. logQREvent() → whatsapp_webhook_events (audit)       │
    │                                                          │
    │    ┌─ Handles Multiple Formats:                         │
    │    ├─ payload.messages[]                                │
    │    ├─ payload.data.messages[]                           │
    │    ├─ payload.message (single)                          │
    │    ├─ payload.from / payload.sender / payload.phone     │
    │    └─ payload.content.text (nested)                     │
    │                                                          │
    │ 4. normalizeIncomingMessages()                           │
    │    └─ Extract: from, to, text, messageId, timestamp     │
    │                                                          │
    │ 5. Deduplication Check                                  │
    │    └─ If waMessageId exists: skip (avoid duplicates)   │
    │                                                          │
    │ 6. ingestQRPayload()                                     │
    │    └─ WhatsAppMessage.create({                          │
    │        provider: 'whatsapp_qr',                         │
    │        direction: 'inbound',                            │
    │        phoneNumber: sender,                             │
    │        messageContent: text,                            │
    │        messageType: 'text',                             │
    │        status: 'delivered',                             │
    │        waMessageId: providerMsgId,                      │
    │        sentAt: timestamp,                               │
    │        metadata: { channel, rawProvider, instanceId }   │
    │      })                                                  │
    │                                                          │
    │ 7. Response: { ok: true, ingested: { count: N } }      │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Database: MongoDB (CRM DB)                              │
    │  Collection: whatsapp_messages                           │
    ├──────────────────────────────────────────────────────────┤
    │ {                                                        │
    │   _id: ObjectId,                                         │
    │   provider: 'whatsapp_qr',                              │
    │   direction: 'inbound',                                 │
    │   phoneNumber: '919876543210',   ← Sender's number      │
    │   messageContent: 'Hello!',       ← Message text        │
    │   messageType: 'text',                                  │
    │   status: 'delivered',                                  │
    │   waMessageId: 'unique_provider_id',                    │
    │   sentAt: Date,                                         │
    │   metadata: {                                           │
    │     channel: 'qr',                                      │
    │     rawProvider: 'waofficialapi',                       │
    │     instanceId: '...'                                   │
    │   },                                                    │
    │   createdAt: Date                                       │
    │ }                                                        │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  CRM UI: /app/admin/crm/whatsapp/page.tsx               │
    ├──────────────────────────────────────────────────────────┤
    │  ✅ Message appears in conversation list                │
    │  ✅ Shows with GREEN background (inbound)               │
    │  ✅ Triggers unread badge                               │
    │  ✅ Auto-links to Lead (from phone number)              │
    └──────────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════
                        OUTGOING FLOW
════════════════════════════════════════════════════════════════════

CRM Admin User                        Your Application
(Web Browser)                         (Next.js)
    │
    │ 1. Opens /admin/crm/whatsapp/meta
    │    Selects conversation
    │    Types message in composer
    │    Clicks "Send Reply"
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Composer Component (Frontend)                           │
    ├──────────────────────────────────────────────────────────┤
    │ POST /api/admin/crm/messages                             │
    │ {                                                        │
    │   "to": "919876543210",                                 │
    │   "text": "Thanks for reaching out!",                   │
    │   "provider": "whatsapp_qr"  ← Optional provider hint   │
    │ }                                                        │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Route: /app/api/admin/crm/messages/route.ts            │
    ├──────────────────────────────────────────────────────────┤
    │ 1. Verify admin authentication                           │
    │ 2. Determine provider (QR or Meta)                       │
    │ 3. Call qrSendText() ← Our function                     │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Library: /lib/qrChatProvider.ts                         │
    │  Function: qrSendText()                                  │
    │  ✅ ACTIVE & READY                                      │
    ├──────────────────────────────────────────────────────────┤
    │ 1. Normalize phone (remove non-digits)                   │
    │ 2. Build request to provider API:                        │
    │    POST /api/send                                        │
    │    {                                                     │
    │      number: "919876543210",                            │
    │      type: "text",                                       │
    │      message: "Thanks for reaching out!",               │
    │      instance_id: env.QR_CHAT_INSTANCE_ID,              │
    │      access_token: env.QR_CHAT_ACCESS_TOKEN             │
    │    }                                                     │
    │ 3. Provider processes (uploads to WhatsApp)              │
    │ 4. Return { waMessageId, ok, status, ... }             │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Database: Store Outbound Message                        │
    ├──────────────────────────────────────────────────────────┤
    │ WhatsAppMessage.create({                                 │
    │   provider: 'whatsapp_qr',                              │
    │   direction: 'outbound',                                │
    │   phoneNumber: '919876543210',   ← Recipient            │
    │   messageContent: 'Thanks...',                          │
    │   status: 'sent',                                        │
    │   waMessageId: provider_msg_id,                         │
    │   sentAt: now,                                           │
    │   metadata: { ... }                                      │
    │ })                                                       │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  CRM UI Updates                                          │
    ├──────────────────────────────────────────────────────────┤
    │  ✅ Message appears in conversation                      │
    │  ✅ Shows with GRAY background (outbound)                │
    │  ✅ Status shows "queued" → "sent" → "delivered"        │
    │  ✅ Message appears on customer's WhatsApp              │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    Provider (WhatsApp)
    Customer's WhatsApp Receives Message


════════════════════════════════════════════════════════════════════
                    ADMIN CONTROL FLOW (STUBS)
════════════════════════════════════════════════════════════════════

Admin Dashboard                       Your Application
    │
    │ Connect Instance
    │ (Initialize QR session)
    │
    ├─ POST /api/admin/crm/whatsapp/qr/connect
    │
    ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Route: /api/admin/crm/whatsapp/qr/connect/route.ts     │
    │  ⚠️  STUB (Ready to wire)                               │
    ├──────────────────────────────────────────────────────────┤
    │ ✅ 1. Verify admin token                                │
    │                                                          │
    │ ⚠️  2. Call qrCreateInstance()     [CURRENTLY STUB]     │
    │       └─ Should: Create new session on provider         │
    │       └─ Should: Get instance ID & OAuth URL            │
    │                                                          │
    │ ⚠️  3. Call qrSetWebhook()         [CURRENTLY STUB]     │
    │       └─ Should: Configure webhook URL at provider      │
    │       └─ Should: Enable incoming message delivery       │
    │                                                          │
    │ ⚠️  4. Save instance metadata      [CURRENTLY STUB]     │
    │       └─ Should: Store in QRInstance collection         │
    │       └─ Should: Update env vars                        │
    │                                                          │
    │ 5. Response: {                                           │
    │    ok: true,                                             │
    │    next: {                                               │
    │      kind: 'oauth' | 'qr_code',                         │
    │      url: '...',                                         │
    │      qrCodeUrl: '...'                                    │
    │    }                                                     │
    │  }                                                       │
    └──────────────────────────────────────────────────────────┘
    │
    ▼
    Workaround (Current):
    └─ Manually set QR_CHAT_INSTANCE_ID in .env.local


════════════════════════════════════════════════════════════════════
                    ENVIRONMENT VARIABLES
════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  .env.local Configuration                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QR_CHAT_ENABLED=true                                          │
│  │ └─ Enable/disable entire QR system                          │
│                                                                 │
│  QR_CHAT_BASE_URL=https://wa.waofficialapi.in                  │
│  │ └─ Provider API base URL                                    │
│                                                                 │
│  QR_CHAT_ACCESS_TOKEN=<from-provider-dashboard>                │
│  │ └─ Provider API authentication token                        │
│                                                                 │
│  QR_CHAT_INSTANCE_ID=<instance-id>                             │
│  │ └─ Active WhatsApp Web instance ID                          │
│  │ └─ Set by connect endpoint (or manually)                    │
│                                                                 │
│  QR_CHAT_WEBHOOK_SECRET=<random-32-chars>                      │
│  │ └─ Optional: Validates X-QR-Chat-Secret header             │
│  │ └─ Recommended for production security                      │
│                                                                 │
│  MONGODB_CRM_DB_NAME=swaryoga_admin_crm                         │
│  │ └─ CRM database name (for message storage)                  │
│                                                                 │
│  NEXTAUTH_URL=https://your-domain.com                          │
│  │ └─ Used to build webhook callback URL                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════
                     DATABASE SCHEMA
════════════════════════════════════════════════════════════════════

MongoDB (swaryoga_admin_crm database)

┌─ Collection: whatsapp_messages
│  ├─ Document Structure:
│  │  ├─ _id: ObjectId
│  │  ├─ provider: 'whatsapp_qr'              ← QR-specific
│  │  ├─ direction: 'inbound' | 'outbound'
│  │  ├─ phoneNumber: String                  ← Sender (in) or recipient (out)
│  │  ├─ messageContent: String               ← Message text
│  │  ├─ messageType: 'text' | 'media'
│  │  ├─ status: 'pending'|'sent'|'delivered'
│  │  ├─ waMessageId: String                  ← For dedup
│  │  ├─ sentAt: Date
│  │  ├─ metadata: {
│  │  │   channel: 'qr',
│  │  │   rawProvider: 'waofficialapi',
│  │  │   instanceId: String,
│  │  │   to?: String
│  │  │ }
│  │  └─ createdAt: Date
│  │
│  └─ Indexes:
│     ├─ { provider, direction, createdAt }
│     ├─ { phoneNumber, createdAt }
│     └─ { waMessageId } [unique, sparse]
│
├─ Collection: whatsapp_webhook_events
│  ├─ Document Structure:
│  │  ├─ _id: ObjectId
│  │  ├─ source: 'qr'                         ← QR-specific
│  │  ├─ kind: 'inbound_message' | 'error'
│  │  ├─ ok: Boolean
│  │  ├─ message: String
│  │  ├─ sample: {                            ← Full payload logged
│  │  │   payload: Object,
│  │  │   channel: 'qr',
│  │  │   provider: 'waofficialapi'
│  │  │ }
│  │  └─ receivedAt: Date
│  │
│  └─ Index: { source, kind, receivedAt }
│
└─ Collection: leads
   └─ Auto-linked from phoneNumber in messages


════════════════════════════════════════════════════════════════════
                      FILE STRUCTURE
════════════════════════════════════════════════════════════════════

src/
├── app/api/
│   ├── whatsapp/
│   │   └── qr/
│   │       └── webhook/
│   │           └── route.ts  ✅ INCOMING (ACTIVE)
│   │               └─ POST handler
│   │               └─ Receives messages from provider
│   │               └─ Normalizes + deduplicates
│   │               └─ Stores in DB
│   │
│   └── admin/crm/whatsapp/qr/
│       ├── connect/
│       │   └── route.ts  ⚠️  ADMIN CONTROL (STUB)
│       │       └─ POST handler
│       │       └─ Verify admin token ✅
│       │       └─ Call provider API [STUB]
│       │
│       └── disconnect/
│           └── route.ts  ⚠️  ADMIN CONTROL (STUB)
│               └─ POST handler
│               └─ Verify admin token ✅
│               └─ Call provider API [STUB]
│
├── lib/
│   ├── qrChatProvider.ts  ✅ OUTGOING (ACTIVE)
│   │   ├─ qrCreateInstance()       ✅ Ready
│   │   ├─ qrGetQrCode()             ✅ Ready
│   │   ├─ qrSetWebhook()            ✅ Ready
│   │   ├─ qrSendText()              ✅ Ready
│   │   └─ qrSendMedia()             ✅ Ready
│   │
│   ├── db.ts                        ✅ Safe DB connection
│   └── schemas/
│       └── enterpriseSchemas.ts     ✅ Model getters
│
└── scripts/
    ├── qr-chat-setup.js           🧪 Setup guide
    └── qr-chat-webhook-smoke.js   🧪 Test incoming


════════════════════════════════════════════════════════════════════
                       STATUS LEGEND
════════════════════════════════════════════════════════════════════

✅ ACTIVE & OPERATIONAL   - Working in production
⚠️  STUB / READY TO WIRE  - Framework in place, implementation pending
❌ NOT IMPLEMENTED        - Not started
🧪 TESTING / DEBUG        - For development verification

════════════════════════════════════════════════════════════════════
```

---

## 🎯 Quick Reference: All Three Connection Points

```
1. INCOMING (Webhook)          2. CONNECT (Admin)             3. DISCONNECT (Admin)
   ✅ ACTIVE                      ⚠️ STUB                        ⚠️ STUB
   
   External Provider              Admin Dashboard                Admin Dashboard
        ↓                               ↓                             ↓
   POST /api/whatsapp/         POST /api/admin/crm/         POST /api/admin/crm/
   qr/webhook                  whatsapp/qr/connect          whatsapp/qr/disconnect
        ↓                               ↓                             ↓
   Message stored              Verify admin token ✅        Verify admin token ✅
   in database                 Create instance [STUB]       Disable webhook [STUB]
        ↓                               ↓                             ↓
   ✅ WORKS NOW                 Returns OAuth URL             Returns success
                               ⚠️ WORKAROUND:                ⚠️ WORKAROUND:
                               Set env var manually         Remove env var manually
```

---

## 📊 Component Interaction Matrix

```
                    ┌──────────────────────────────────┐
                    │   External QR Provider           │
                    │   (waofficialapi.in)             │
                    └────────────┬─────────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   Webhook Handler Route       │
                    │   ✅ ACTIVE                  │
                    │   /api/whatsapp/qr/webhook   │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   Message Normalizer          │
                    │   ✅ Handles 5+ formats      │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   Database Layer              │
                    │   ✅ Safe connection          │
                    │   connectDB() → getters       │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   Collections                 │
                    │   whatsapp_messages           │
                    │   whatsapp_webhook_events     │
                    │   leads                       │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   CRM Frontend UI             │
                    │   /app/admin/crm/whatsapp     │
                    │   Shows conversations & msgs  │
                    └──────────────────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   Outgoing via Admin Send     │
                    │   /api/admin/crm/messages     │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   QR Chat Provider Library    │
                    │   ✅ qrSendText()             │
                    │   ✅ qrSendMedia()            │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────▼──────────────────┐
                    │   Back to Provider API        │
                    │   Provider sends to WhatsApp  │
                    │   Message reaches customer    │
                    └──────────────────────────────┘
```

