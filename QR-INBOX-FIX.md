# QR WhatsApp Inbox Messages Not Displaying - FIX

**Issue:** Incoming messages show in sidebar but not in main inbox area  
**Status:** 🔴 **CRITICAL** - Messages being saved to wrong collection  
**Date:** 2026-07-05

---

## 🔍 ROOT CAUSE ANALYSIS

### The Problem:

```
Incoming Message Flow:
1. Bridge receives message → sends to webhook
2. Webhook (line 303) saves to: WhatsAppMessage collection ✅
3. Frontend fetches from: /api/admin/crm/whatsapp/qr/messages
4. API queries from: QrWhatsAppMessage collection (DIFFERENT!) ❌
5. Result: API returns EMPTY messages
6. Sidebar shows messages (from bridge cache) but inbox stays empty
```

### Why Sidebar Shows But Inbox Doesn't:

- **Sidebar:** Loads from bridge WebSocket (`/chats` endpoint) - real-time
- **Inbox:** Loads from MongoDB API - but queries WRONG collection
- **Collection Mismatch:**  
  Webhook saves to: `WhatsAppMessage` (regular collection)  
  API queries from: `QrWhatsAppMessage` (QR-specific collection - EMPTY!)

---

## ✅ SOLUTION

### Step 1: Update Messages API Endpoint

**File:** `app/api/admin/crm/whatsapp/qr/messages/route.ts`

**Change:**
```typescript
// OLD - WRONG COLLECTION
import { getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
const QrMsg = getQrWhatsAppMessage();

// NEW - CORRECT COLLECTION (same as webhook saves to)
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
const WhatsAppMessage = getWhatsAppMessage();

// Also update the query to match incoming message schema
const messages = await WhatsAppMessage.find({
  phoneNumber: extractPhoneFromJid(chatJid),
  // No need to filter by connectedPhone - use direction instead
  direction: 'inbound'  // or 'outbound'
})
  .sort({ sentAt: -1 })
  .limit(limit)
  .lean();

// Map to match frontend expected format
return apiSuccess({
  messages: messages.map((m: any) => ({
    id: m._id.toString(),
    from: m.phoneNumber + '@c.us',
    fromMe: m.direction === 'outbound',
    text: m.messageContent || '',
    type: m.messageType || 'text',
    timestamp: m.sentAt?.getTime() || 0,
    status: m.status === 'received' ? 0 : 1,
    participant: m.phoneNumber,
    pushName: m.contactName || '',
    hasMedia: m.hasMedia || false,
    mediaUrl: m.media?.url || null,
    mediaMimetype: m.media?.mimeType || null,
    mediaFileName: null,
    quoted: null,
    quotedId: null,
    reactions: {},
  }))
});
```

---

### Step 2: Fix Message Filtering

**Current Issue:** Messages API tries to filter by `connectedPhone` but webhook doesn't save that field.

**Solution:** Use `direction` field instead:

```typescript
// OLD - WRONG
const query: any = {
  userId,              // Not saved by webhook!
  connectedPhone,      // Not saved by webhook!
  chatJid,             // Not saved by webhook!
};

// NEW - CORRECT
const phoneFromJid = chatJid.split('@')[0];  // Extract phone from JID

const query: any = {
  phoneNumber: phoneFromJid,  // Saved by webhook ✓
  // Don't filter by userId/connectedPhone - they're not available
  // The frontend handles session isolation
};
```

---

### Step 3: Update Frontend Data Mapping

**File:** `app/admin/crm/qr/page.tsx` (line 1355-1374)

**Update database message mapping:**

```typescript
// Map MongoDB messages
const dbMessages: MessageItem[] = dbData?.messages
  ? dbData.messages.map((m: any) => ({
      id: m.id || m._id || '',
      from: m.from || (m.phoneNumber + '@c.us') || '',
      fromMe: m.fromMe !== undefined ? m.fromMe : m.direction === 'outbound',
      text: m.text || m.messageContent || '',
      type: m.type || m.messageType || 'text',
      timestamp: m.timestamp || (m.sentAt?.getTime ? m.sentAt.getTime() : 0) || 0,
      status: m.status || 0,
      participant: m.participant || m.phoneNumber || '',
      pushName: m.pushName || m.contactName || '',
      hasMedia: m.hasMedia || !!m.media?.url || false,
      mediaUrl: m.mediaUrl || m.media?.url || null,
      mediaMimetype: m.mediaMimetype || m.media?.mimeType || null,
      mediaFileName: m.mediaFileName || null,
      quoted: m.quoted || null,
      reactions: {},
      quotedId: m.quotedId || null,
    }))
  : [];
```

---

### Step 4: Complete Fixed Messages API

Here's the complete corrected endpoint:

```typescript
// app/api/admin/crm/whatsapp/qr/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';  // ✓ FIXED
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

function extractPhoneFromJid(jid: string): string {
  return String(jid || '').split('@')[0].split(':')[0];
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('Unauthorized', 401);

    const userId = getViewerUserId(decoded);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const chatJid = searchParams.get('chatJid');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const before = searchParams.get('before');

    if (!chatJid) {
      return apiError('Missing chatJid', 400);
    }

    // ✅ FIXED: Query correct collection with correct fields
    const WhatsAppMessage = getWhatsAppMessage();
    const phoneNumber = extractPhoneFromJid(chatJid);

    // Build query - FIXED to match schema
    const query: any = {
      phoneNumber,  // ✅ Field actually saved by webhook
    };

    if (before) {
      query.sentAt = { $lt: new Date(parseInt(before)) };
    }

    // ✅ FIXED: Use sentAt instead of timestamp
    const messages = await WhatsAppMessage.find(query)
      .sort({ sentAt: -1 })  // Most recent first
      .limit(limit)
      .lean();

    return apiSuccess({
      messages: messages.map((m: any) => ({
        id: m._id?.toString() || m.id || '',
        from: m.phoneNumber + '@c.us',
        fromMe: m.direction === 'outbound',  // ✅ FIXED: Use direction field
        text: m.messageContent || '',
        type: m.messageType || 'text',
        timestamp: m.sentAt ? m.sentAt.getTime() : 0,
        status: m.status === 'sent' ? 1 : 0,
        participant: m.phoneNumber,
        pushName: '',  // Not available in WhatsAppMessage schema
        hasMedia: m.hasMedia || false,
        mediaUrl: m.media?.url || null,
        mediaMimetype: m.media?.mimeType || null,
        mediaFileName: null,
        quoted: null,
        quotedId: null,
        reactions: {},
      })),
      source: 'mongodb',
      phoneNumber,
      count: messages.length,
    });
  } catch (err: any) {
    console.error('[QR Messages API]', err.message);
    return apiError(err.message, 500);
  }
}
```

---

## 🔧 IMPLEMENTATION CHECKLIST

- [ ] Update imports in messages API (use `getWhatsAppMessage`)
- [ ] Fix database query to use correct collection name
- [ ] Update field mappings (sentAt → timestamp, messageContent → text)
- [ ] Fix direction filtering (direction === 'inbound/outbound')
- [ ] Remove userId/connectedPhone filters
- [ ] Update frontend data mapping in page.tsx
- [ ] Test: Send message to QR WhatsApp
- [ ] Verify: Message appears in sidebar (already working)
- [ ] Verify: Message appears in inbox (should now work!)
- [ ] Test: Multiple messages show correctly
- [ ] Test: Message order is correct (newest at bottom)
- [ ] Test: Clearing/switching chats works

---

## 📋 FILES TO MODIFY

1. **app/api/admin/crm/whatsapp/qr/messages/route.ts**
   - Line 3: Change import to `getWhatsAppMessage`
   - Line 43: Update query builder
   - Line 56-59: Update sort and field names
   - Line 62-79: Update message mapping

2. **app/admin/crm/qr/page.tsx**
   - Line 1355-1374: Update dbMessages mapping
   - Line 1323-1326: Verify API endpoint URL is correct

---

## 🧪 TESTING

### Test Case 1: Simple Text Message
```
1. Open QR WhatsApp page
2. Send "Hello" from connected phone to any contact
3. Receive "Hi there!" reply
4. ✅ Expected: "Hi there!" appears in inbox
5. ✅ Expected: Message appears in sidebar last position
```

### Test Case 2: Multiple Messages
```
1. Send 5 messages in rapid succession
2. ✅ Expected: All 5 appear in inbox
3. ✅ Expected: Ordered chronologically (oldest → newest)
4. ✅ Expected: Can scroll up to see older messages
```

### Test Case 3: Clear Cache
```
1. Send message, see it in inbox
2. Close page, reopen
3. ✅ Expected: Message still appears (persisted in DB)
```

### Test Case 4: Bridge vs DB Merge
```
1. Send message while WebSocket connected
2. ✅ Expected: Shows from bridge (real-time)
3. Refresh page
4. ✅ Expected: Shows from DB (persistent)
5. ✅ Expected: No duplicates (merge deduplication works)
```

---

## 🔍 DEBUGGING

If messages still don't appear:

1. **Check API response:**
```bash
curl "http://localhost:3000/api/admin/crm/whatsapp/qr/messages?chatJid=919309986820@c.us" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: `{ messages: [...], count: N }`

2. **Check MongoDB:**
```bash
db.whatsappmessages.find({ phoneNumber: "919309986820" }).pretty()
```
Expected: Messages appear here

3. **Check console logs:**
- Frontend: DevTools → Console
- Backend: Vercel logs or terminal output

4. **Verify schema:**
```bash
db.whatsappmessages.findOne() // Check actual field names
```

---

## 🎯 AFTER FIX

✅ Messages received from WhatsApp will show in inbox  
✅ Messages will display in correct order  
✅ Messages will persist across page refreshes  
✅ Media will show properly  
✅ Message timestamps will be accurate  
✅ Both inbound and outbound messages will display  

---

## 📞 DEPLOYMENT

1. Make the 3 code changes above
2. Test locally
3. `git add app/api/admin/crm/whatsapp/qr/messages/route.ts app/admin/crm/qr/page.tsx`
4. `git commit -m "Fix: Show QR WhatsApp inbox messages from DB collection"`
5. `git push`
6. Vercel auto-deploys

---

**Priority:** 🔴 **CRITICAL** - Messages not showing in production  
**Difficulty:** ⭐ **EASY** - Simple collection/field mapping fix  
**Time to fix:** ~30 minutes

