# 🔄 WhatsApp Meta Inbox Restructure Plan

**Objective**: Rebuild Meta WhatsApp chat inbox to properly display incoming messages

**Date**: January 7, 2026  
**Status**: Planning Phase  
**Impact**: Chat display, message routing, inbox organization

---

## 📊 Current Structure Analysis

### **Components**:
1. **Frontend**: `/app/admin/crm/whatsapp/page.tsx` (4281 lines)
2. **API - Conversations**: `/app/api/admin/crm/whatsapp/meta/conversations/route.ts`
3. **API - Messages**: `/app/api/admin/crm/whatsapp/meta/messages/route.ts`
4. **Database**: `WhatsAppMessage`, `BroadcastRun` collections
5. **Inbound Handler**: `/app/api/admin/crm/whatsapp/inbound/route.ts`

### **Message Flow**:
```
Incoming WhatsApp Message
    ↓
/api/admin/crm/whatsapp/inbound (webhook)
    ↓
WhatsAppMessage collection (stored)
    ↓
/api/admin/crm/whatsapp/meta/conversations (list)
    ↓
/api/admin/crm/whatsapp/meta/messages (detail)
    ↓
Frontend: /app/admin/crm/whatsapp/page.tsx (display)
```

---

## 🎯 Issues to Fix

### **1. Old Inbox Structure**
- Multiple storage layers (WebhookMessage, WhatsAppMessage, ConversationRecord)
- Inconsistent data synchronization
- Duplicate message entries
- Stale cache

### **2. Incoming Message Display**
- Messages not showing in real-time
- Unread counts not updating
- Message ordering issues
- Missing metadata (sender, timestamp)

### **3. Data Consistency**
- No deduplication of messages
- Missing phone number normalization
- Inconsistent status tracking
- Orphaned conversations

---

## 🔧 Restructure Plan

### **Phase 1: Clean Old Data**

#### Step 1.1: Backup existing data
```javascript
// Keep old collections for reference (don't delete immediately)
// Collections to preserve:
// - webhookmessages (for audit trail)
// - broadcastrunmessages (for broadcast tracking)

// Collections to consolidate:
// - whatsappmessages (primary message store)
// - conversations (metadata + last message)
```

#### Step 1.2: Deduplicate messages
```javascript
// Remove duplicate entries in whatsappmessages
// Keep by (phoneNumber, sentAt, messageContent) uniqueness
// Preserve oldest entry for each message
```

### **Phase 2: Rebuild Data Structure**

#### Step 2.1: Unified WhatsAppMessage Schema
```typescript
{
  _id: ObjectId,
  
  // Message identity
  messageId: String,          // UUID or Meta message ID
  conversationId: String,     // Group by conversation
  
  // Sender/Recipient
  leadId: ObjectId,           // Link to Lead
  phoneNumber: String,        // Normalized +countrycode digits
  senderPhoneNumber: String,  // Who sent it (for meta)
  
  // Message content
  messageType: String,        // 'text' | 'media' | 'template' | 'interactive'
  messageContent: String,     // Body text
  mediaUrl?: String,          // Media URL
  mediaType?: String,         // 'image' | 'video' | 'document' | 'audio'
  
  // Direction & Status
  direction: String,          // 'inbound' | 'outbound'
  status: String,             // 'queued' | 'sent' | 'delivered' | 'failed' | 'read'
  
  // Timestamps
  sentAt: Date,               // When sent
  deliveredAt?: Date,         // When delivered
  readAt?: Date,              // When read
  createdAt: Date,            // When stored
  updatedAt: Date,
  
  // Metadata
  provider: String,           // 'meta' | 'bridge' | 'test'
  isRead: Boolean,            // For unread count
  threadId?: String,          // Conversation thread
  
  // Meta-specific
  metaMessageId?: String,     // Message ID from Meta API
  metaStatus?: String,        // Meta delivery status
  metaError?: String,         // Error if failed
  
  // Indexes for performance
  // Indexes: leadId, phoneNumber, sentAt, conversationId, direction
}
```

#### Step 2.2: Unified Conversation Schema
```typescript
{
  _id: ObjectId,
  
  // Conversation identity
  conversationId: String,     // Unique per conversation
  
  // Participants
  leadId: ObjectId,           // Link to Lead
  phoneNumber: String,        // Normalized
  userAssignedId?: String,    // Assigned admin user
  
  // Lead metadata (denormalized)
  leadName?: String,
  leadEmail?: String,
  leadStatus?: String,
  leadLabels?: String[],
  
  // Conversation state
  unreadCount: Number,        // Unread inbound messages
  
  // Last message (denormalized for list view)
  lastMessageId?: ObjectId,
  lastMessage?: String,       // Preview text
  lastMessageType?: String,
  lastDirection?: String,     // 'inbound' | 'outbound'
  lastMessageTime: Date,      // For sorting
  lastStatus?: String,
  
  // Metadata
  provider: String,           // 'meta' | 'bridge'
  status: String,             // 'open' | 'archived' | 'closed'
  archivedAt?: Date,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  
  // Indexes: phoneNumber, leadId, lastMessageTime, unreadCount
}
```

### **Phase 3: Implement New APIs**

#### Step 3.1: Update conversations API
```typescript
// GET /api/admin/crm/whatsapp/meta/conversations
// Return: Aggregated conversation list with proper sorting
// Sort: lastMessageTime DESC, unreadCount DESC
// Limit: 100 per page
// Fields: All from Conversation + last message preview
```

#### Step 3.2: Update messages API
```typescript
// GET /api/admin/crm/whatsapp/meta/messages?phoneNumber=...
// Return: Messages sorted chronologically (ASC)
// Pagination: limit, skip
// Fields: All message fields for display
```

#### Step 3.3: Add message sync API
```typescript
// POST /api/admin/crm/whatsapp/meta/sync
// Purpose: Sync conversation state
// Actions:
//   - Mark messages as read
//   - Update unread counts
//   - Refresh last message preview
```

### **Phase 4: Update Inbound Handler**

#### Step 4.1: Normalize incoming messages
```typescript
// app/api/admin/crm/whatsapp/inbound/route.ts
// 1. Parse incoming webhook (from Meta Cloud API)
// 2. Normalize phone number
// 3. Find/create Lead
// 4. Create WhatsAppMessage document
// 5. Update Conversation document
// 6. Mark message as unread (if inbound)
// 7. Trigger real-time update (Socket.io or polling)
```

#### Step 4.2: Deduplication
```typescript
// Check: messageId already exists? Skip.
// Check: (phoneNumber, sentAt, content) duplicate? Skip.
// Otherwise: Insert new message
```

### **Phase 5: Update Frontend**

#### Step 5.1: Message display
```typescript
// Show incoming messages:
// - Blue/green bubble (left side)
// - Sender name: Lead name
// - Timestamp: sentAt
// - Status: (N/A for inbound)
// - Real-time: Auto-scroll + update unread count

// Show outgoing messages:
// - Gray/white bubble (right side)
// - Sender name: "You" or admin name
// - Timestamp: sentAt
// - Status: Queued/Sent/Delivered/Read
// - Read receipts: ✓ (sent) ✓✓ (delivered) ✓✓ (read)
```

#### Step 5.2: Conversation list
```typescript
// Sort by:
// 1. Has unread messages? (DESC)
// 2. Last message time (DESC)
// 3. Lead name (ASC)

// Display:
// - Avatar with initials
// - Lead name
// - Last message preview (truncated)
// - Time (relative: "5m ago" or "Today")
// - Unread badge (red circle with count)
// - Status indicator (online/offline)
```

### **Phase 6: Real-time Updates**

#### Option A: Polling (Current)
```typescript
// Frontend polls: /api/admin/crm/whatsapp/meta/conversations
// Frequency: Every 5 seconds (when inbox is open)
// Load: WhatsAppMessage aggregation
// Pro: Simple, no server state
// Con: Slight delay, more bandwidth
```

#### Option B: WebSocket (Recommended for future)
```typescript
// Frontend connects: ws://localhost:3000/api/whatsapp/ws
// Server pushes: New messages in real-time
// Events: message.new, message.update, message.read
// Pro: Instant updates, less bandwidth
// Con: Server state management needed
```

---

## 📋 Migration Steps

### **Step 1: Create Migration Script**
```bash
npm run migrate:whatsapp-inbox
```

**Actions**:
1. Backup current whatsappmessages collection
2. Deduplicate by (phoneNumber, sentAt, content)
3. Create Conversation documents from WhatsAppMessage
4. Set unread counts
5. Denormalize last message data

### **Step 2: Update Database Indexes**
```javascript
// WhatsAppMessage
db.whatsappmessages.createIndex({ conversationId: 1, sentAt: -1 })
db.whatsappmessages.createIndex({ leadId: 1, sentAt: -1 })
db.whatsappmessages.createIndex({ phoneNumber: 1, direction: 1 })

// Conversation
db.conversations.createIndex({ leadId: 1 })
db.conversations.createIndex({ phoneNumber: 1 })
db.conversations.createIndex({ lastMessageTime: -1 })
db.conversations.createIndex({ unreadCount: -1, lastMessageTime: -1 })
```

### **Step 3: Deploy APIs**
1. Update `/app/api/admin/crm/whatsapp/meta/conversations/route.ts`
2. Update `/app/api/admin/crm/whatsapp/meta/messages/route.ts`
3. Update `/app/api/admin/crm/whatsapp/inbound/route.ts`
4. Test with curl/Postman

### **Step 4: Update Frontend**
1. Update conversation list rendering
2. Update message display
3. Add real-time refresh
4. Add unread badge styling
5. Test in browser

### **Step 5: Monitor & Optimize**
1. Check for slow queries
2. Monitor message latency
3. Verify unread counts
4. Test with 100+ conversations

---

## ✅ Verification Checklist

- [ ] Incoming messages display immediately in chat
- [ ] Unread count updates in real-time
- [ ] Conversation list sorted correctly
- [ ] Message ordering (chronological)
- [ ] No duplicate messages shown
- [ ] Phone numbers normalized correctly
- [ ] Sender/recipient labels correct
- [ ] Timestamps accurate
- [ ] Status indicators (sent/delivered/read) working
- [ ] Can filter conversations
- [ ] Can assign conversations
- [ ] Can broadcast from conversations
- [ ] Performance: < 200ms load time
- [ ] No console errors

---

## 🚀 Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Backup & clean old data | 30 min | Not started |
| 2 | Implement new schema | 1 hour | Not started |
| 3 | Update APIs | 2 hours | Not started |
| 4 | Update inbound handler | 1 hour | Not started |
| 5 | Update frontend | 2 hours | Not started |
| 6 | Testing & optimization | 1 hour | Not started |
| 7 | Monitor & production | 1 hour | Not started |

**Total**: ~8-9 hours for complete rebuild

---

## 📝 Notes

- **Backward Compatibility**: Old message data will be preserved
- **No Data Loss**: All existing messages will be migrated
- **User Impact**: Brief downtime during migration (< 5 min)
- **Rollback**: Can revert if needed (keep old collection)

---

## 🎯 Next Steps

User to confirm:
1. Should we proceed with migration?
2. When to schedule? (off-peak hours recommended)
3. Need backup first?
4. Should we test in staging first?

---

**Ready to proceed?** Continue with next phase of implementation.
