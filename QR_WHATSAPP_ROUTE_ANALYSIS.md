# ✅ QR WhatsApp Route Analysis Report
**Date**: January 11, 2026  
**Status**: Configuration complete, stubs ready for activation

---

## 📋 Executive Summary

The QR WhatsApp integration has a **complete infrastructure** for incoming/outgoing messages with three distinct entry points:

| Component | Status | Notes |
|-----------|--------|-------|
| **Webhook Route** | ✅ ACTIVE | `/api/whatsapp/qr/webhook` - Receives & stores messages |
| **Connect Function** | ⚠️ STUB | `/api/admin/crm/whatsapp/qr/connect` - OAuth redirect ready |
| **Disconnect Function** | ⚠️ STUB | `/api/admin/crm/whatsapp/qr/disconnect` - Cleanup ready |
| **Message Processing** | ✅ ACTIVE | Normalizes, deduplicates, stores in WhatsAppMessage DB |
| **Database Connection** | ✅ VERIFIED | Uses `connectDB()` + model getters safely |

---

## 🔌 Route Connections & Data Flow

### 1. **Incoming Messages Route** ✅ **ACTIVE**
**Path**: `/api/whatsapp/qr/webhook/route.ts`

#### Request Flow:
```
External QR Provider (waofficialapi.in)
  ↓
POST /api/whatsapp/qr/webhook
  ↓
Secret validation (x-qr-chat-secret header)
  ↓
normalizeIncomingMessages() - Parse vendor-agnostic payload
  ↓
WhatsAppMessage.create() - Store in CRM DB (swaryoga_admin_crm)
  ↓
logQREvent() - Audit trail in whatsapp_webhook_events
  ↓
Response: { ok: true, ingested: { count: N } }
```

#### Key Features:
- **Vendor Flexibility**: Handles multiple QR provider payload shapes
  - Single message: `payload.message` or `payload.from`
  - Array format: `payload.messages[]` or `payload.data.messages[]`
  - Media support: `payload.content.text` or nested structures

- **Timestamp Normalization**:
  ```typescript
  // Handles both seconds and milliseconds
  if (tsRaw < 10_000_000_000) timestamp = new Date(tsRaw * 1000)
  else timestamp = new Date(tsRaw)
  ```

- **Deduplication**:
  ```typescript
  if (m.messageId) {
    const existing = await WhatsAppMessage.findOne({
      provider: 'whatsapp_qr',
      waMessageId: m.messageId,
      direction: 'inbound',
    });
    if (existing) continue; // Skip duplicate
  }
  ```

#### Database Schema (WhatsAppMessage document):
```javascript
{
  provider: 'whatsapp_qr',           // Identifies source
  direction: 'inbound',               // Direction
  phoneNumber: '919876543210',        // Sender's phone
  messageContent: 'Hello',            // Text body
  messageType: 'text',                // Type (text, media, etc)
  status: 'delivered',                // Status tracking
  waMessageId: 'provider_msg_id',    // Provider's message ID
  sentAt: 2026-01-11T10:30:00Z,      // Timestamp
  metadata: {
    channel: 'qr',
    rawProvider: 'waofficialapi',
    instanceId: process.env.QR_CHAT_INSTANCE_ID,
    to: '919876543210'  // Optional receiver
  },
  createdAt: 2026-01-11T10:30:05Z,   // DB timestamp
}
```

#### Environment Variables Required:
```env
QR_CHAT_WEBHOOK_SECRET=<optional-secret>    # Validates X-QR-Chat-Secret header
QR_CHAT_INSTANCE_ID=<provider-instance>     # Optional metadata
```

#### Testing the Route:
```bash
curl -X POST http://localhost:3000/api/whatsapp/qr/webhook \
  -H "Content-Type: application/json" \
  -H "x-qr-chat-secret: your-secret" \
  -d '{
    "messages": [{
      "from": "919876543210",
      "id": "msg_123",
      "timestamp": 1705000200,
      "text": "Hello from QR",
      "type": "text"
    }]
  }'
```

---

### 2. **Connect Function** ⚠️ **STUB (Ready to Wire)**
**Path**: `/api/admin/crm/whatsapp/qr/connect/route.ts`

#### Current Implementation:
```typescript
export async function POST(request: NextRequest) {
  // 1. Validates admin token
  // 2. Returns OAuth redirect URL
  // 3. Minimal stub for UI parity
  
  return apiSuccess({
    ok: true,
    connected: false,
    next: {
      kind: 'oauth',
      url: 'https://wa.waofficialapi.in/whatsapp_profiles/oauth',
    },
  });
}
```

#### What It Should Do:
1. **Verify Admin Access**: ✅ Already implemented
   ```typescript
   const token = request.headers.get('authorization')?.slice('Bearer '.length);
   const decoded = verifyToken(token);
   if (!decoded?.isAdmin) return apiError('UNAUTHORIZED', 'Unauthorized');
   ```

2. **Call QR Provider to Create Instance**: ⚠️ STUB
   ```typescript
   // Should use: qrCreateInstance() from lib/qrChatProvider.ts
   // Then: qrSetWebhook() to configure webhook URL
   // Then: Return OAuth URL or QR code
   ```

3. **Store Provider Credentials**: ⚠️ STUB
   ```typescript
   // Should save:
   // - instanceId in database
   // - accessToken in env or secure storage
   // - webhookUrl configured
   ```

#### Next Steps to Activate:
```typescript
import { qrCreateInstance, qrSetWebhook } from '@/lib/qrChatProvider';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return apiError('UNAUTHORIZED', 'Unauthorized');
  
  try {
    // 1. Create instance on provider
    const instance = await qrCreateInstance();
    
    // 2. Configure webhook
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/whatsapp/qr/webhook`;
    await qrSetWebhook(webhookUrl, instance.instanceId, true);
    
    // 3. Save to database for tracking
    // TODO: Create QRInstance collection in CRM DB
    
    return apiSuccess({
      ok: true,
      instanceId: instance.instanceId,
      next: {
        kind: 'qr_code',
        qrCodeUrl: instance.qrCodeUrl,
        expiresIn: 30000,
      },
    });
  } catch (err) {
    return apiError('SERVER_ERROR', err?.message);
  }
}
```

---

### 3. **Disconnect Function** ⚠️ **STUB (Ready to Wire)**
**Path**: `/api/admin/crm/whatsapp/qr/disconnect/route.ts`

#### Current Implementation:
```typescript
export async function POST(request: NextRequest) {
  // 1. Validates admin token
  // 2. Returns stub response
  // 3. Minimal stub for UI parity
  
  return apiSuccess({ ok: true, connected: false });
}
```

#### What It Should Do:
1. **Verify Admin Access**: ✅ Already implemented
2. **Call QR Provider to Disconnect**: ⚠️ STUB
3. **Disable Webhook**: ⚠️ STUB
4. **Clean Up Local State**: ⚠️ STUB

#### Next Steps to Activate:
```typescript
import { qrSetWebhook } from '@/lib/qrChatProvider';
import { getInstanceId } from '@/lib/schemas/enterpriseSchemas';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return apiError('UNAUTHORIZED', 'Unauthorized');
  
  try {
    await connectDB();
    
    // 1. Get current instance
    const instanceId = process.env.QR_CHAT_INSTANCE_ID;
    if (!instanceId) {
      return apiError('NOT_FOUND', 'No QR instance configured');
    }
    
    // 2. Disable webhook
    await qrSetWebhook('', instanceId, false);
    
    // 3. Cleanup database (optional)
    // TODO: Mark instance as inactive
    
    return apiSuccess({
      ok: true,
      connected: false,
      message: 'QR instance disconnected',
    });
  } catch (err) {
    return apiError('SERVER_ERROR', err?.message);
  }
}
```

---

### 4. **Outgoing Messages** ✅ **ACTIVE via qrChatProvider**
**Path**: `/lib/qrChatProvider.ts`

#### Available Functions:
```typescript
// 1. Send text message
export async function qrSendText(
  numberRaw: string,      // Recipient phone
  message: string,        // Text body
  instanceId?: string     // Optional instance override
): Promise<any>

// 2. Send media message
export async function qrSendMedia(
  numberRaw: string,      // Recipient phone
  message: string,        // Caption
  mediaUrl: string,       // URL to media
  filename?: string,      // Optional filename
  instanceId?: string     // Optional instance override
): Promise<any>

// 3. Get QR code for new session
export async function qrGetQrCode(
  instanceId?: string     // Optional instance override
): Promise<any>

// 4. Create new provider instance
export async function qrCreateInstance(): Promise<any>

// 5. Configure webhook
export async function qrSetWebhook(
  webhookUrl: string,     // URL to receive events
  instanceId?: string,    // Optional instance override
  enable = true           // Enable or disable
): Promise<any>
```

#### How to Send QR Messages from CRM:
```typescript
// In API route or component
import { qrSendText, qrSendMedia } from '@/lib/qrChatProvider';

// Text
const result = await qrSendText('919876543210', 'Hello via QR!');

// Media
const result = await qrSendMedia(
  '919876543210',
  'Check this out',
  'https://example.com/image.jpg',
  'photo.jpg'
);
```

#### Integration Point - CRM Send API:
Current route: `/app/api/admin/crm/whatsapp/send/route.ts`

Already supports QR detection:
```typescript
// Line ~230 in route.ts shows error message:
const friendly =
  msg.includes('Cloud API is not configured') || 
  msg.includes('Web bridge') || 
  msg.includes('WHATSAPP')
    ? `WhatsApp sending failed: ${msg}. ` +
      `Option 1: Send via WhatsApp Web QR - use /api/admin/crm/whatsapp/qr and /api/admin/crm/whatsapp/send endpoints.`
```

---

## 📊 Database Schema

### Collections Used:

#### 1. **whatsapp_messages** (CRM DB)
```javascript
{
  _id: ObjectId,
  provider: 'whatsapp_qr' | 'meta' | 'whatsapp_web_bridge',
  direction: 'inbound' | 'outbound',
  phoneNumber: String,        // Normalized phone
  messageContent: String,     // Text or caption
  messageType: 'text' | 'media' | 'button' | 'template',
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed',
  waMessageId: String,        // Provider's message ID
  sentAt: Date,              // Message timestamp
  deliveredAt: Date,         // When delivered
  readAt: Date,              // When read
  metadata: {                 // Provider-specific
    channel: String,
    rawProvider: String,
    instanceId: String,
    to?: String,
  },
  createdAt: Date,
  updatedAt: Date,
}

// Indexes for performance:
db.whatsapp_messages.createIndex({ provider: 1, direction: 1, createdAt: -1 })
db.whatsapp_messages.createIndex({ phoneNumber: 1, createdAt: -1 })
db.whatsapp_messages.createIndex({ waMessageId: 1 }, { unique: true, sparse: true })
```

#### 2. **whatsapp_webhook_events** (CRM DB)
```javascript
{
  _id: ObjectId,
  source: 'qr' | 'meta',
  kind: 'verify' | 'inbound_message' | 'status_update' | 'error' | 'unknown',
  ok: Boolean,
  message: String,
  phoneNumber?: String,
  waMessageId?: String,
  sample: {
    payload: Object,
    channel: String,
    provider: String,
    instanceId: String,
  },
  receivedAt: Date,
}

// Index for queries
db.whatsapp_webhook_events.createIndex({ source: 1, kind: 1, receivedAt: -1 })
```

#### 3. **leads** (CRM DB)
```javascript
{
  _id: ObjectId,
  phoneNumber: String,        // Normalized
  name?: String,
  email?: String,
  status: 'new' | 'contacted' | 'qualified' | 'converted',
  createdAt: Date,
  // ... other fields
}

// Unique phone per lead
db.leads.createIndex({ phoneNumber: 1 }, { unique: true })
```

---

## 🔐 Security & Authentication

### 1. **Webhook Verification**
```typescript
// Optional secret validation
const secret = (process.env.QR_CHAT_WEBHOOK_SECRET || '').trim();
if (secret) {
  const received = req.headers.get('x-qr-chat-secret') || '';
  if (received !== secret) return apiError('UNAUTHORIZED', 'Unauthorized webhook');
}
```

### 2. **Admin-Only API Access**
```typescript
// Connect/Disconnect routes verify admin token
const decoded = verifyToken(token);
if (!decoded?.isAdmin) return apiError('UNAUTHORIZED', 'Unauthorized');
```

### 3. **Environment Variables**
All sensitive data in `.env.local`:
```env
QR_CHAT_ENABLED=true                      # Enable/disable QR system
QR_CHAT_BASE_URL=https://wa.waofficialapi.in  # Provider base URL
QR_CHAT_ACCESS_TOKEN=<provider-token>    # API authentication
QR_CHAT_INSTANCE_ID=<instance-id>        # Active instance ID
QR_CHAT_WEBHOOK_SECRET=<optional-secret> # Webhook validation secret
MONGODB_CRM_DB_NAME=swaryoga_admin_crm   # CRM database name
```

---

## 🧪 Testing & Verification

### Test 1: Webhook Receives Message
```bash
# 1. Start local dev
npm run dev

# 2. Send test message to webhook
node scripts/qr-chat-webhook-smoke.js

# 3. Check database
node check-incoming-messages.js

# Expected: Message in whatsapp_messages collection
```

### Test 2: Provider Integration
```bash
# 1. Configure QR provider (waofficialapi.in)
# 2. Set webhook URL: https://your-domain.com/api/whatsapp/qr/webhook
# 3. Use connect endpoint to create instance:

curl -X POST https://your-domain.com/api/admin/crm/whatsapp/qr/connect \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json"

# Expected: OAuth URL or QR code returned
```

### Test 3: Send Message
```bash
# From component or API route
import { qrSendText } from '@/lib/qrChatProvider';

const result = await qrSendText('919876543210', 'Test message');
console.log(result); // { ok: true, waMessageId: '...' }
```

### Test 4: Disconnect
```bash
curl -X POST https://your-domain.com/api/admin/crm/whatsapp/qr/disconnect \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json"

# Expected: { ok: true, connected: false }
```

---

## ⚠️ Known Issues & Limitations

| Issue | Impact | Workaround |
|-------|--------|-----------|
| **Connect/Disconnect are stubs** | Can't activate QR via UI yet | Manually configure env vars + provider dashboard |
| **No QRInstance collection** | Can't track multiple instances | Store instanceId in env for now |
| **No instance rotation** | Single active instance only | Plan for future multi-instance support |
| **Webhook secret optional** | Reduced security if not set | Always set QR_CHAT_WEBHOOK_SECRET |
| **No retry logic** | Failed sends not retried | Implement exponential backoff in future |
| **No message encryption** | Messages in plain text in DB | Use TLS for DB + API transport (already enabled) |

---

## 🚀 Activation Checklist

### For Next Phase (Implementation):
- [ ] Wire up `qrCreateInstance()` in connect route
- [ ] Wire up `qrSetWebhook()` in both connect/disconnect
- [ ] Create QRInstance collection schema
- [ ] Add UI components in `/app/admin/crm/whatsapp/` for QR management
- [ ] Implement retry logic for failed sends
- [ ] Add rate limiting for webhook receives
- [ ] Set up monitoring for webhook hits
- [ ] Document provider setup steps for users
- [ ] Add tests for payload normalization
- [ ] Implement message encryption for sensitive content

### Current Status:
- ✅ Webhook route active and storing messages
- ✅ Message normalization handling multiple vendors
- ✅ Database connection safe (connectDB → model getters)
- ✅ Auth validation in place
- ⚠️ Connect/Disconnect ready to wire (stubs in place)
- ⚠️ Outgoing via qrSendText/qrSendMedia available
- ⚠️ No UI for instance management yet

---

## 📞 Provider Integration Reference

### QR Provider: waofficialapi.in

**API Endpoints:**
- `POST /api/create_instance` - Create new WhatsApp Web instance
- `GET /api/get_qrcode` - Fetch QR code for scanning
- `POST /api/set_webhook` - Configure webhook URL
- `POST /api/send` - Send message
- `POST /api/send` (media) - Send media (image/video)

**Webhook Format (Incoming):**
```javascript
{
  messages: [
    {
      from: "919876543210",
      id: "msg_id",
      timestamp: 1705000200,
      text: "Message text",
      type: "text"
      // or media/button/interactive types
    }
  ]
}
```

**Required Env Vars for Provider:**
```env
QR_CHAT_ACCESS_TOKEN=<provider-access-token>
QR_CHAT_INSTANCE_ID=<created-instance-id>
QR_CHAT_BASE_URL=https://wa.waofficialapi.in
```

---

## 📝 Summary

**The QR WhatsApp system is architecturally complete:**

✅ **Receiving**: Messages from QR provider → Webhook → Database  
✅ **Sending**: CRM → qrSendText/Media → Provider → Customer  
✅ **Database**: Unified schema with provider tracking  
✅ **Auth**: Admin verification for management endpoints  

⚠️ **Next Steps**: Wire up Connect/Disconnect endpoints to activate instance management UI  
⚠️ **Testing**: Use smoke test script and provider dashboard to verify end-to-end flow

