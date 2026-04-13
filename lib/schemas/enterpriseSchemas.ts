import mongoose from 'mongoose';

// CRM/Admin database selection
// This file contains CRM + enterprise schemas that you may want to keep separate from the main app DB.
// We keep one Atlas cluster, but allow routing these collections to a separate database via useDb().
//
// Configure via env:
// - MONGODB_CRM_DB_NAME (recommended)
//   Example: swaryoga_admin_crm (for separate DB) or swaryogaDB (same as main)
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// Use global to persist cache across Next.js hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _crmDbCache: any;
  // eslint-disable-next-line no-var
  var _crmModelCache: Record<string, any>;
}

// Initialize globals if not present
if (!global._crmModelCache) {
  global._crmModelCache = {};
}

function getCrmDb() {
  // Note: connectDB() should be called before using these models.
  // useDb() is safe and will reuse the underlying connection.
  // Use global cache to survive hot reloads
  if (!global._crmDbCache) {
    console.log('[enterpriseSchemas] Creating CRM DB connection to:', CRM_DB_NAME);
    global._crmDbCache = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
  }
  return global._crmDbCache;
}

/**
 * ENTERPRISE-LEVEL SCHEMAS
 * For CRM, WhatsApp integration, compliance, and advanced features
 */

// ============================================================================
// 0. LEAD SCHEMA (CRM)
// Basic lead/contact record used by CRM + WhatsApp message tracking
// ==========================================================================
const LeadSchema = new mongoose.Schema(
  {
    // =====================================================
    // UNIFIED USER LINKING
    // Links Lead to registered User account for unified profile view
    // =====================================================
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
    linkedProfileId: { type: String, trim: true, sparse: true, index: true }, // 6-digit profile ID from User
    isLinkedToAccount: { type: Boolean, default: false, index: true }, // Quick check if linked

    // Ownership / multi-user access control
    // - assignedToUserId: which CRM user owns/manages this lead (used for per-user filtering)
    // - createdByUserId: who created the lead (admin / user head / creator)
    assignedToUserId: { type: String, trim: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },

    // Permanent, human-friendly CRM Lead ID.
    // Stored as 6-digit string (e.g., "006999").
    // NOTE: Sparse unique so existing older docs without leadNumber don't break index creation.
    leadNumber: { type: String, trim: true, unique: true, sparse: true, index: true },

    name: { type: String, trim: true },

  // Human-readable user name (for admin/user display in CRM)
  // Example: "Mohan Kalburgi". This is separate from assignedToUserId.
  userName: { type: String, trim: true },

  // WhatsApp chat display helpers
  // We support a simple honorific/title selection (Mr/Miss) to render as:
  //   "Mr. Varun" / "Miss Turya"
  // If not set, UI can fall back to plain `name`.
  title: { type: String, enum: ['Mr', 'Miss', ''], default: '', trim: true },
  displayName: { type: String, trim: true },

    phoneNumber: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ['new_lead', 'contacted', 'interested', 'demo_trial', 'negotiation', 'enrolled', 'completed', 'inactive', 'repeater', 'old_sadhak', 'only_for_post', 'lead', 'hot', 'prospect', 'customer'],
      default: 'new_lead',
      index: true,
    },
    labels: { type: [String], default: [] },
    source: {
      type: String,
      // Keep this list permissive enough for all ingestion points (website forms, payments, Meta leadgen, etc.)
      enum: [
        'website',
        'website-form',
        'website-signup',
        'form-link',
        'import',
        'csv-import',
        'api',
        'manual',
        'whatsapp',
        'qr_whatsapp',
        'workshop_payment',
        'meta_leadgen',
        'referral',
        'social',
        'event',
        'facebook',
        'instagram',
        'youtube',
        'google',
        'other',
      ],
      default: 'manual',
      index: true,
    },
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopSchedule', sparse: true, index: true },
    workshopName: { type: String, sparse: true },
    workshops: { type: [String], default: [] }, // Array of workshop names (like labels)

    // Sales/workshop enrollment details (filled when lead progresses)
    sales: {
      stage: {
        type: String,
        enum: ['lead', 'sales', 'enrolled', 'closed_won', 'closed_lost'],
        default: 'lead',
        index: true,
      },
      enrolledAt: { type: Date },
      enrollmentNotes: { type: String, trim: true },
      workshop: {
        slug: { type: String, trim: true },
        scheduleId: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        mode: { type: String, enum: ['online', 'offline', 'hybrid', ''], default: '' },
        language: { type: String, trim: true },
      },
      payment: {
        status: {
          type: String,
          enum: ['unpaid', 'pending', 'paid', 'partial', 'refunded', 'failed'],
          default: 'unpaid',
          index: true,
        },
        currency: { type: String, trim: true },
        amount: { type: Number },
        paidAmount: { type: Number },
        method: { type: String, trim: true },
        provider: { type: String, trim: true },
        orderId: { type: String, trim: true },
        transactionId: { type: String, trim: true },
        paidAt: { type: Date },
        notes: { type: String, trim: true },
      },
    },

    // Country and language tracking for international funnels
    country: { type: String, trim: true, default: 'India', index: true },
    countryCode: { type: String, trim: true, default: 'IN', uppercase: true, index: true },
    // Region within India: 'North India' or 'South India' (auto-set from state)
    region: { type: String, trim: true, default: '', index: true },
    state: { type: String, trim: true, default: '', index: true },
    city: { type: String, trim: true, default: '' },
    language: { type: String, trim: true, default: 'Hindi', index: true },
    languageCode: { type: String, trim: true, default: 'hi', lowercase: true, index: true },

    // Funnel stage tracking (maps to FunnelConfig.stages[].key)
    funnelStage: { type: String, default: 'new_lead', trim: true, index: true },
    funnelStageChangedAt: { type: Date },

    // Admin "first touch" tracking — null means lead is new/untouched
    firstTouchedAt: { type: Date, default: null, index: true },
    firstTouchedBy: { type: String, trim: true },

    // Simple flag for UI routing (e.g., open a richer view once in sales)
    inSales: { type: Boolean, default: false, index: true },

    // Receipt linkage (created when moving into sales/enrolled)
    lastReceiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmReceipt', sparse: true, index: true },
    lastMessageAt: { type: Date, index: true },

    // =====================================================
    // CHAT STATUS TRACKING
    // Time-based: new (0-5h), open (5-12h), pending (12-24h), overdue (>24h)
    // Manual: closed (completed by user)
    // =====================================================
    chatStatus: {
      type: String,
      enum: ['new', 'open', 'pending', 'overdue', 'closed'],
      default: 'new',
      index: true,
    },
    chatStatusClosedAt: { type: Date }, // When user manually closed the chat
    chatStatusClosedBy: { type: String, trim: true }, // Who closed the chat (userId)

    // =====================================================
    // BLOCK / STOP SYSTEM
    // Blocks a lead so no messages are sent and inbound is filtered
    // Triggered manually or auto-detected via "stop" keyword
    // =====================================================
    isBlocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date },
    blockedBy: { type: String, trim: true }, // userId who blocked
    blockedReason: { type: String, trim: true }, // 'stop_keyword' | 'manual' | 'spam' | etc.
    unblockedAt: { type: Date },

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'leads' }
);

LeadSchema.index({ status: 1, lastMessageAt: -1 });
LeadSchema.index({ labels: 1 });
LeadSchema.index({ assignedToUserId: 1, lastMessageAt: -1 });
LeadSchema.index({ country: 1, funnelStage: 1 });
LeadSchema.index({ languageCode: 1, funnelStage: 1 });
LeadSchema.index({ region: 1, funnelStage: 1 });
LeadSchema.index({ state: 1 });

// ============================================================================
// 0b. CRM COUNTERS - Atomic sequences for human-friendly IDs
// ============================================================================
const CrmCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true },
  },
  { timestamps: true, collection: 'crm_counters' }
);

// ============================================================================
// 0c. DELETED LEADS LOG - Snapshot deleted lead info for audit/restore visibility
// ============================================================================
const DeletedLeadSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    leadNumber: { type: String, trim: true, index: true },

    // Snapshot fields
    assignedToUserId: { type: String, trim: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    deletedByUserId: { type: String, trim: true, index: true },

    name: { type: String, trim: true },
    phoneNumber: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    workshopName: { type: String, trim: true },
    status: { type: String, trim: true },
    labels: { type: [String], default: [] },
    source: { type: String, trim: true },

    createdAtOriginal: { type: Date },
    updatedAtOriginal: { type: Date },

    deletedAt: { type: Date, default: Date.now, index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'deleted_leads' }
);

DeletedLeadSchema.index({ assignedToUserId: 1, deletedAt: -1 });
DeletedLeadSchema.index({ deletedByUserId: 1, deletedAt: -1 });

// ============================================================================
// 1. WHATSAPP MESSAGE SCHEMA - Track all WhatsApp messages sent
// ============================================================================
const WhatsAppMessageSchema = new mongoose.Schema(
  {
    // leadId is optional because admin ad-hoc sends and some inbound messages
    // may not map to a Lead record.
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false, index: true },
    phoneNumber: { type: String, required: true, index: true },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      default: 'outbound',
      index: true,
    },
    messageContent: String,

    // Optional richer message structure for WhatsApp Web bridge / future providers
    // (kept flexible via metadata so we don't break existing text flow).
    headerText: String,
    footerText: String,
    media: {
      kind: { type: String, enum: ['image', 'video', 'document', 'audio', 'sticker'] },
      url: String,
      fileName: String,
      mimeType: String,
      sizeBytes: Number,
      error: String, // Track media processing errors
    },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
    templateVariables: mongoose.Schema.Types.Mixed, // For template parameter substitution
    messageType: {
      type: String,
      enum: ['text', 'template', 'media', 'interactive'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'received'],
      default: 'queued',
      index: true,
    },
    failureReason: String,
    waMessageId: String, // WhatsApp message ID from Meta API
    // Message styling for UI display
    backgroundColor: { type: String, default: '#ffffff' }, // bg color (e.g., '#22c55e' for green)
    textColor: { type: String, default: '#000000' }, // text color (e.g., '#ffffff' for white)
    borderColor: String, // optional border color
    borderRadius: { type: String, default: '8px' }, // border radius for rounded corners
    // Optional because admin JWTs may not map to a User document.
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    sentByLabel: String,
    sentByUserId: { type: String, trim: true, index: true }, // Admin userId string

  // For WhatsApp CRM UI: display label to show in conversation bubble
  // (Admin fixed as "Mohan Sir" in UI by default).
  senderDisplayName: String,

  // NEW: Source tracking to avoid confusion between different WhatsApp numbers
  // - senderNumber: our own phone number that sent/received this message
  // - provider: 'meta' or 'whatsapp_web_bridge'
  senderNumber: { type: String, index: true },
  provider: { type: String, index: true },

    sentAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    readAt: Date,
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt: Date,
    bulkBatchId: String, // For tracking bulk send operations
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'whatsapp_messages' }
);

WhatsAppMessageSchema.index({ leadId: 1, sentAt: -1 });
WhatsAppMessageSchema.index({ phoneNumber: 1, status: 1 });
WhatsAppMessageSchema.index({ sentBy: 1, sentAt: -1 });
WhatsAppMessageSchema.index({ waMessageId: 1 });
WhatsAppMessageSchema.index({ direction: 1, sentAt: -1 });

// Idempotency for inbound webhook retries: meta message IDs (waMessageId) should not create duplicate
// rows for the same direction. Sparse so older docs without waMessageId are allowed.
WhatsAppMessageSchema.index({ waMessageId: 1, direction: 1 }, { unique: true, sparse: true });

// ============================================================================
// 1a-QR. QR WHATSAPP MESSAGES — Persistent storage for QR bridge messages
// Separate from Meta WhatsApp messages. Keyed by userId + connectedPhone for session isolation.
// ============================================================================
const QrWhatsAppMessageSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },         // CRM admin userId
    connectedPhone: { type: String, required: true, index: true }, // WhatsApp number connected via QR (e.g. '919075358557')
    chatJid: { type: String, required: true, index: true },        // Chat JID (e.g. '919876543210@s.whatsapp.net')
    messageId: { type: String, required: true },                   // Baileys message ID (key.id)
    direction: { type: String, enum: ['inbound', 'outbound'], required: true, index: true },
    fromMe: { type: Boolean, default: false },
    text: { type: String, default: '' },                           // Extracted text content
    type: { type: String, default: 'text' },                       // text, image, video, audio, document, sticker, etc.
    participant: { type: String, default: '' },                    // For group messages
    pushName: { type: String, default: '' },                       // Sender's push name
    timestamp: { type: Number, required: true, index: true },      // Unix timestamp (seconds)
    status: { type: Number, default: 0 },                          // Baileys message status
    // Media fields
    hasMedia: { type: Boolean, default: false },
    mediaUrl: { type: String, default: '' },                       // CDN URL after upload
    mediaMimetype: { type: String, default: '' },
    mediaFileName: { type: String, default: '' },
    // Quoted message
    quotedId: { type: String, default: '' },
    quotedText: { type: String, default: '' },
    quotedParticipant: { type: String, default: '' },
    // Raw Baileys message (for re-processing if needed)
    rawMessage: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'qr_whatsapp_messages' }
);
QrWhatsAppMessageSchema.index({ userId: 1, connectedPhone: 1, chatJid: 1, timestamp: -1 });
QrWhatsAppMessageSchema.index({ userId: 1, connectedPhone: 1, timestamp: -1 });
QrWhatsAppMessageSchema.index({ messageId: 1, chatJid: 1 }, { unique: true, sparse: true }); // Dedupe

// ============================================================================
// 1a-QR-CHATS. QR WHATSAPP CHATS — Persistent chat list with metadata
// ============================================================================
const QrWhatsAppChatSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },         // CRM admin userId
    connectedPhone: { type: String, required: true, index: true }, // WhatsApp number connected via QR
    chatJid: { type: String, required: true, index: true },        // Chat JID
    name: { type: String, default: '' },                           // Contact/group name
    isGroup: { type: Boolean, default: false },
    lastMessage: { type: String, default: '' },                    // Last message text preview
    lastMessageTime: { type: Date },                               // Last message timestamp
    lastMessageFromMe: { type: Boolean, default: false },
    unreadCount: { type: Number, default: 0 },
    conversationTimestamp: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    profilePicUrl: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'qr_whatsapp_chats' }
);
QrWhatsAppChatSchema.index({ userId: 1, connectedPhone: 1, conversationTimestamp: -1 });
QrWhatsAppChatSchema.index({ userId: 1, connectedPhone: 1, chatJid: 1 }, { unique: true });

// ============================================================================
// 1a-SOCIAL. SOCIAL INBOX CONVERSATIONS — Messenger / Instagram DM threads
// ============================================================================
const SocialInboxConversationSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['messenger', 'instagram'],
      required: true,
      index: true,
    },
    accountScopeType: {
      type: String,
      enum: ['super_admin', 'tenant'],
      default: 'super_admin',
      index: true,
    },
    accountScopeKey: { type: String, default: 'super_admin', index: true },
    accountId: { type: String, required: true, index: true },
    accountName: { type: String, default: '' },
    accountHandle: { type: String, default: '' },
    conversationKey: { type: String, required: true, index: true },
    participantId: { type: String, required: true, index: true },
    participantName: { type: String, default: '' },
    participantUsername: { type: String, default: '' },
    participantProfilePic: { type: String, default: '' },
    createdByUserId: { type: String, index: true },
    assignedToUserId: { type: String, index: true },
    status: {
      type: String,
      enum: ['new_lead', 'contacted', 'interested', 'demo_trial', 'negotiation', 'enrolled', 'completed', 'inactive', 'repeater', 'old_sadhak', 'only_for_post'],
      default: 'new_lead',
      index: true,
    },
    labels: { type: [String], default: [] },
    notes: { type: String, default: '' },
    unreadCount: { type: Number, default: 0, index: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, index: true },
    lastMessageDirection: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound',
    },
    lastExternalMessageId: { type: String, default: '' },
    isBlocked: { type: Boolean, default: false, index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'social_inbox_conversations' }
);
SocialInboxConversationSchema.index({ accountScopeType: 1, accountScopeKey: 1, platform: 1, lastMessageAt: -1 });
SocialInboxConversationSchema.index({ conversationKey: 1, accountScopeType: 1, accountScopeKey: 1 }, { unique: true });

// ============================================================================
// 1a-SOCIAL-MSG. SOCIAL INBOX MESSAGES — Messenger / Instagram DM messages
// ============================================================================
const SocialInboxMessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialInboxConversation', required: true, index: true },
    conversationKey: { type: String, required: true, index: true },
    platform: {
      type: String,
      enum: ['messenger', 'instagram'],
      required: true,
      index: true,
    },
    accountScopeType: {
      type: String,
      enum: ['super_admin', 'tenant'],
      default: 'super_admin',
      index: true,
    },
    accountScopeKey: { type: String, default: 'super_admin', index: true },
    accountId: { type: String, required: true, index: true },
    externalMessageId: { type: String, sparse: true, index: true },
    senderId: { type: String, default: '' },
    recipientId: { type: String, default: '' },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound',
      index: true,
    },
    messageContent: { type: String, default: '' },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'postback', 'unsupported'],
      default: 'text',
    },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
    sentAt: { type: Date, default: Date.now, index: true },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    error: { type: String, default: '' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'social_inbox_messages' }
);
SocialInboxMessageSchema.index({ conversationId: 1, sentAt: 1 });
SocialInboxMessageSchema.index({ platform: 1, accountScopeType: 1, accountScopeKey: 1, sentAt: -1 });
SocialInboxMessageSchema.index({ platform: 1, accountScopeType: 1, accountScopeKey: 1, externalMessageId: 1 }, { unique: true, sparse: true });

// ============================================================================
// 1b. WHATSAPP WEBHOOK EVENTS — Store recent webhook summaries for debugging
// ==========================================================================
// This is intentionally small: we store a compact summary (not the full payload)
// so admins can confirm whether Meta is calling the webhook in production.
const WhatsAppWebhookEventSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['meta'], default: 'meta', index: true },
    kind: {
      type: String,
      enum: ['verify', 'inbound_message', 'status_update', 'error', 'unknown'],
      required: true,
      index: true,
    },

    // A few helpful correlation fields
    phoneNumber: { type: String, trim: true, index: true },
    waMessageId: { type: String, trim: true, index: true },
    status: { type: String, trim: true, index: true },

    // Admin-facing diagnostics
    ok: { type: Boolean, default: true, index: true },
    message: { type: String, trim: true },

    // Tiny sample, never full payload
    sample: mongoose.Schema.Types.Mixed,

    receivedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: 'whatsapp_webhook_events' }
);

WhatsAppWebhookEventSchema.index({ receivedAt: -1, kind: 1 });

// ============================================================================
// 2. USER CONSENT SCHEMA - Track opt-in/opt-out status per lead
// ============================================================================
const UserConsentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false, index: true },
    phoneNumber: { type: String, required: true, unique: true, index: true },

    // Channel-specific consent (used by admin CRM consent APIs + tests)
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email'],
      default: 'whatsapp',
      index: true,
    },

    // Canonical status for APIs/tests (underscore format)
    status: {
      type: String,
      enum: ['opted_in', 'opted_out', 'pending'],
      default: 'pending',
      index: true,
    },

    // Legacy status (hyphen format) kept for backward compatibility
    consentStatus: {
      type: String,
      enum: ['opted-in', 'opted-out', 'pending'],
      default: 'pending',
      index: true,
    },
    consentDate: Date,
    consentMethod: {
      type: String,
      enum: ['manual', 'api', 'form', 'import'],
      default: 'manual',
    },
    optOutDate: Date,
    optOutReason: String,
    optOutKeyword: { type: String, enum: ['STOP', 'UNSUBSCRIBE', 'OPTOUT'] },
    blockedUntil: Date, // For temporal blocking (cooldown after STOP)
    consentExpiryDate: Date, // Auto re-consent after period
    consentSource: String, // Where consent came from (website, form, etc)
    recordedByUserId: { type: String, trim: true, index: true }, // Admin who recorded/manages this consent
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'user_consents' }
);

UserConsentSchema.index({ phoneNumber: 1, status: 1, channel: 1 });
UserConsentSchema.index({ phoneNumber: 1, consentStatus: 1 });
UserConsentSchema.index({ recordedByUserId: 1 });

// ============================================================================
// 3. MESSAGE STATUS TRACKING SCHEMA
// ============================================================================
const MessageStatusSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppMessage', required: true },
    phoneNumber: String,
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'failed', 'delivered', 'read'],
    },
    statusChangedAt: { type: Date, default: Date.now },
    failureCode: String,
    failureDescription: String,
    retryAttempt: Number,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'message_statuses' }
);

MessageStatusSchema.index({ messageId: 1, statusChangedAt: -1 });

// ============================================================================
// 4. AUDIT LOG SCHEMA - Track all admin and user actions
// ============================================================================
const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actionType: {
      type: String,
      enum: [
        'login',
        'logout',
        'lead_create',
        'lead_update',
        'lead_delete',
        'lead_export',
        'message_send',
        'bulk_send',
        'funnel_update',
        'sales_update',
        'user_create',
        'user_delete',
        'permission_assign',
        'template_create',
        'template_approve',
        'template_reject',
        'backup_trigger',
        'data_restore',
        'admin_action',
      ],
      index: true,
    },
    resourceType: String, // 'lead', 'message', 'user', 'template', etc
    resourceId: mongoose.Schema.Types.ObjectId,
    description: String,
    changesBefore: mongoose.Schema.Types.Mixed,
    changesAfter: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    errorMessage: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'audit_logs' }
);

AuditLogSchema.index({ userId: 1, actionType: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

// ============================================================================
// 4a-2. MEDIA FILE SCHEMA - Track S3 Uploads
// ============================================================================
const MediaFileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    s3Key: { type: String, required: true, unique: true },
    s3Bucket: { type: String, required: true },
    contentType: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: { type: String, default: 'social_media' },
    isPublic: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'media_files' }
);

MediaFileSchema.index({ s3Key: 1 });
MediaFileSchema.index({ uploadedBy: 1 });
MediaFileSchema.index({ category: 1 });

// ============================================================================
// 4b. WHATSAPP ACCOUNT SCHEMA - Manage WhatsApp numbers (Common + Meta)
// ============================================================================
const WhatsAppAccountSchema = new mongoose.Schema(
  {
    // Account identification
    accountName: { type: String, required: true, trim: true, index: true }, // e.g., "Support Team", "Sales"
    accountType: {
      type: String,
      enum: ['common', 'meta'],
      required: true,
      index: true,
    }, // 'common' = Twilio/third-party, 'meta' = WhatsApp Business API

    // Common Gateway (Twilio, MSG91, etc.)
    commonProvider: {
      type: String,
      enum: ['manual', 'twilio', 'msg91', 'vonage', 'aws_sns', 'custom'],
      sparse: true,
    },
    commonPhoneNumber: { type: String, trim: true, sparse: true, unique: true, index: true }, // E.g., +919876543210
    commonProviderId: { type: String, trim: true, sparse: true }, // Account ID from provider (Twilio SID, etc.)
    commonApiKey: { type: String, sparse: true }, // Encrypted API key (should encrypt before saving)
    commonApiSecret: { type: String, sparse: true }, // Encrypted API secret
    commonWebhookUrl: { type: String, sparse: true }, // Webhook for delivery/read status

    // Meta WhatsApp Business API
    metaPhoneNumberId: { type: String, trim: true, sparse: true, index: true }, // Meta phone_number_id
    metaPhoneNumber: { type: String, trim: true, sparse: true, unique: true, index: true }, // Display phone number
    metaBusinessAccountId: { type: String, trim: true, sparse: true }, // Meta WABA ID
    metaAccessToken: { type: String, sparse: true }, // Encrypted Meta access token
    metaVerifyToken: { type: String, sparse: true }, // Verify token for webhooks
    metaWebhookUrl: { type: String, sparse: true }, // Meta webhook URL

    // Connection status
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'pending', 'error'],
      default: 'disconnected',
      index: true,
    },
    connectionError: { type: String, sparse: true }, // Last error message
    lastHealthCheck: { type: Date, sparse: true },
    healthStatus: {
      type: String,
      enum: ['healthy', 'degraded', 'down'],
      default: 'down',
    },

    // Configuration
    isDefault: { type: Boolean, default: false, index: true }, // Default account for sending
    isActive: { type: Boolean, default: true, index: true }, // Enable/disable this account
    dailyMessageLimit: { type: Number, default: 10000 }, // Rate limiting
    dailyMessagesSent: { type: Number, default: 0 },
    dailyMessagesReset: { type: Date, default: () => new Date() }, // Reset daily counter

    // Usage statistics
    totalMessagesSent: { type: Number, default: 0 },
    totalMessagesDelivered: { type: Number, default: 0 },
    totalMessagesFailed: { type: Number, default: 0 },
    avgDeliveryTime: { type: Number, default: 0 }, // milliseconds
    lastMessageSentAt: { type: Date, sparse: true },

    // Owner & permissions
    createdByUserId: { type: String, trim: true, required: true, index: true },
    managedByUserIds: { type: [String], default: [] }, // Multiple users can manage
    tags: { type: [String], default: [] }, // For categorization

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'whatsapp_accounts' }
);

WhatsAppAccountSchema.index({ accountType: 1, isActive: 1 });
WhatsAppAccountSchema.index({ createdByUserId: 1, isActive: 1 });
WhatsAppAccountSchema.index({ isDefault: 1, accountType: 1 });

// ============================================================================
// 5. WHATSAPP TEMPLATE SCHEMA - Manage Meta API templates
// ============================================================================
const WhatsAppTemplateSchema = new mongoose.Schema(
  {
    templateName: { type: String, required: true, index: true },
    // Provider: 'meta' = Meta-approved templates (can use in both Meta & QR)
    //           'qr' = QR-only templates (no Meta approval needed, only for QR WhatsApp)
    //           'telegram' = Telegram-only templates (for Telegram Bot broadcasts)
    provider: {
      type: String,
      enum: ['meta', 'qr', 'telegram'],
      default: 'meta',
      index: true,
    },
    category: {
      type: String,
      enum: ['MARKETING', 'OTP', 'UTILITY', 'ACCOUNT_UPDATE'],
      default: 'MARKETING',
    },
    language: { type: String, default: 'en', index: true },
    templateContent: String, // Template body with {{variable}} placeholders
    headerFormat: { type: String, enum: ['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO'] },
    headerContent: String,
    footerText: String,
    // Builder support (CRM UI): store structured pieces so we can render/send rich templates.
    // This is optional for backwards compatibility.
    buttons: [
      {
        type: { type: String, enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'], default: 'QUICK_REPLY' },
        title: { type: String },
        url: { type: String },         // For URL buttons
        phoneNumber: { type: String }, // For PHONE_NUMBER buttons
      },
    ],
    // Media fields - images (JPG/PNG/WebP), documents (PDF/Word/Excel/PowerPoint/ZIP), videos (URL only)
    imageFile: {
      url: { type: String },           // S3 URL
      fileName: { type: String },
      mimeType: { type: String },      // image/jpeg, image/png, etc
      sizeBytes: { type: Number },
      uploadedAt: { type: Date, default: Date.now },
    },
    documents: [
      {
        url: { type: String },         // S3 URL
        fileName: { type: String },
        mimeType: { type: String },    // application/pdf, application/msword, etc
        sizeBytes: { type: Number },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    videoUrl: { type: String },        // YouTube, Vimeo, or any video URL (NO file upload)
    
    // Legacy media field (kept for backward compatibility)
    headerMedia: {
      kind: { type: String, enum: ['image', 'video'] },
      url: { type: String },
      fileName: { type: String },
      mimeType: { type: String },
      sizeBytes: { type: Number },
    },
    variables: [
      {
        name: String,
        type: String, // 'text', 'number', 'date', etc
        required: Boolean,
      },
    ],
    metaTemplateId: String, // ID from Meta API
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'rejected', 'disabled'],
      default: 'draft',
      index: true,
    },
    approvalReason: String,
    rejectionReason: String,
    createdBy: { type: String, required: true }, // Admin userId string like 'admincrm'
    approvedBy: { type: String }, // Admin userId string who approved
    approvalDate: Date,
    rejectionDate: Date,
    version: { type: Number, default: 1 },
    previousVersionId: mongoose.Schema.Types.ObjectId, // For versioning
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'whatsapp_templates' }
);

WhatsAppTemplateSchema.index({ templateName: 1, language: 1 });
WhatsAppTemplateSchema.index({ status: 1, createdAt: -1 });

// ============================================================================
// 6. RATE LIMIT TRACKER SCHEMA - Track WhatsApp API limits
// ============================================================================
const RateLimitSchema = new mongoose.Schema(
  {
    limitType: {
      type: String,
      enum: ['hourly', 'daily', 'per_phone'],
      required: true,
      index: true,
    },
    limitKey: { type: String, required: true, index: true }, // e.g., "user_123:daily"
    messagesSent: { type: Number, default: 0 },
    messagesLimit: { type: Number, required: true },
    warningThreshold: { type: Number, default: 0.8 }, // 80%
    isPaused: { type: Boolean, default: false },
    pausedReason: String,
    pausedAt: Date,
    resumeAt: Date,
    warningAlertSent: { type: Boolean, default: false },
    resetAt: { type: Date, required: true }, // When limit resets
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'rate_limits' }
);

RateLimitSchema.index({ limitKey: 1, limitType: 1 });

// ============================================================================
// 7. BACKUP SCHEMA - Track database backups
// ============================================================================
const BackupSchema = new mongoose.Schema(
  {
    backupName: { type: String, required: true },
    backupType: {
      type: String,
      enum: ['automatic', 'manual'],
      default: 'automatic',
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress',
      index: true,
    },
    backupSize: Number, // in MB
    backupLocation: String, // S3, cloud storage path
    backupHash: String, // For integrity verification
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: Date,
    endTime: Date,
    duration: Number, // in seconds
    errorMessage: String,
    collectionsIncluded: [String],
    documentsBackedUp: Number,
    restoreTest: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'backups' }
);

BackupSchema.index({ backupType: 1, createdAt: -1 });

// ============================================================================
// 8. PERMISSION SCHEMA - Role-based access control
// ============================================================================
const PermissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'team_lead', 'sales_rep', 'operator', 'viewer'],
      default: 'viewer',
      index: true,
    },
    permissions: {
      messages: {
        canSendBulkMessages: { type: Boolean, default: false },
        canScheduleMessages: { type: Boolean, default: false },
        canRetryMessages: { type: Boolean, default: false },
        canViewMessageAnalytics: { type: Boolean, default: false },
      },
      leads: {
        canCreateLeads: { type: Boolean, default: false },
        canEditLeads: { type: Boolean, default: false },
        canDeleteLeads: { type: Boolean, default: false },
        canImportLeads: { type: Boolean, default: false },
        canExportLeads: { type: Boolean, default: false },
        canViewAllLeads: { type: Boolean, default: false },
        canViewOwnLeads: { type: Boolean, default: true },
      },
      sales: {
        canRecordSales: { type: Boolean, default: false },
        canEditSales: { type: Boolean, default: false },
        canDeleteSales: { type: Boolean, default: false },
        canViewSalesAnalytics: { type: Boolean, default: false },
        canExportSalesReports: { type: Boolean, default: false },
      },
      templates: {
        canCreateTemplates: { type: Boolean, default: false },
        canApproveTemplates: { type: Boolean, default: false },
        canRejectTemplates: { type: Boolean, default: false },
        canDeleteTemplates: { type: Boolean, default: false },
      },
      accounts: {
        canManageWhatsAppAccounts: { type: Boolean, default: false },
        canUpdateAccountSettings: { type: Boolean, default: false },
        canViewAccountAnalytics: { type: Boolean, default: false },
      },
      admin: {
        canManageUsers: { type: Boolean, default: false },
        canAssignPermissions: { type: Boolean, default: false },
        canViewAuditLogs: { type: Boolean, default: false },
        canManageBackups: { type: Boolean, default: false },
        canManageRateLimits: { type: Boolean, default: false },
      },
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    expiryDate: Date, // Permission auto-revoke after date
    customRules: mongoose.Schema.Types.Mixed, // For complex permission logic
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'permissions' }
);

PermissionSchema.index({ userId: 1, role: 1 });

// ============================================================================
// 9. ANALYTICS EVENT SCHEMA - Track user actions for analytics
// ============================================================================
const AnalyticsEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        'lead_added',
        'lead_converted',
        'message_sent',
        'message_delivered',
        'message_read',
        'sale_recorded',
        'funnel_stage_changed',
      ],
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    source: {
      type: String,
      enum: ['website', 'import', 'api', 'manual', 'whatsapp', 'referral', 'social', 'event'],
    },
    funnelStage: String, // 'awareness', 'consideration', 'decision', 'conversion'
    value: mongoose.Schema.Types.Mixed, // Sale value, etc
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'analytics_events' }
);

AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });

// ============================================================================
// 10. SALES REPORT SCHEMA - Track sales and conversions
// ============================================================================
const SalesReportSchema = new mongoose.Schema(
  {
    // Optional for manual CRM entries where no Order exists yet
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    // Optional because admin JWTs may not map to a User document
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false },

    // Customer snapshot fields (for manual/admin sales entries)
    // These make the Sales UI usable even when lead/user relationships are missing.
    customerId: { type: String, trim: true, index: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true, index: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    customerAddress: { type: String, trim: true },
    workshopName: { type: String, trim: true, index: true },
    batchDate: { type: Date, index: true },

    // Admin identity (string) who recorded the sale (e.g., "admincrm").
    // This is separate from `userId` (ObjectId) which may be missing for admin JWTs.
    reportedByUserId: { type: String, trim: true, index: true },

    saleAmount: { type: Number, required: true },
    // Payment breakdown fields
    workshopFee: { type: Number }, // Total workshop fee
    paidAmount: { type: Number }, // Amount paid so far
    dueAmount: { type: Number }, // Remaining amount due
    paymentType: {
      type: String,
      enum: ['full', 'part', 'advance'],
      default: 'full',
      index: true,
    },
    // Payment history for part payments
    paymentHistory: [{
      amount: { type: Number },
      date: { type: Date },
      mode: { type: String },
      transactionId: { type: String },
      note: { type: String },
    }],
    transactionId: { type: String, trim: true },
    currency: { type: String, default: 'INR' },
    // Business status of the sale record (not payment gateway status).
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded', 'cancelled', 'failed'],
      default: 'completed',
      index: true,
    },
    // Optional labels/tags to segment sales (e.g., "online", "offline", "referral").
    labels: { type: [String], default: [], index: true },
    paymentMode: {
      type: String,
      enum: ['payu', 'cashfree', 'card', 'bank_transfer', 'cash', 'upi', 'other'],
      index: true,
    },
    saleDate: { type: Date, default: Date.now, index: true },
    funnelStage: String,
    conversionPath: [
      {
        stage: String,
        timestamp: Date,
      },
    ],
    daysToConversion: Number,
    touchpointCount: Number, // Number of messages/interactions before sale
    targetAchieved: { type: Boolean, default: false },
    // Super admin approval for sales records
    superAdminApproved: { type: Boolean, default: false, index: true },
    superAdminApprovedAt: { type: Date },
    superAdminApprovedBy: { type: String, trim: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Tally Prime integration
    tallySynced: { type: Boolean, default: false, index: true },
    tallySyncedAt: { type: Date },
    tallySyncedBy: { type: String, trim: true },
    tallyVoucherId: { type: String, trim: true },
    tallyError: { type: String, trim: true },

    // Receipt linkage
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmReceipt', sparse: true },
    receiptNumber: { type: String, trim: true },

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'sales_reports' }
);

SalesReportSchema.index({ userId: 1, saleDate: -1 });
SalesReportSchema.index({ saleDate: 1, paymentMode: 1 });
SalesReportSchema.index({ reportedByUserId: 1, saleDate: -1 });

// ============================================================================
// 10b. EXPENSE TRACKING - Marketing, Utility, WhatsApp costs
// ============================================================================
const ExpenseSchema = new mongoose.Schema(
  {
    // Expense category
    category: {
      type: String,
      enum: ['marketing', 'utility', 'whatsapp_api', 'software', 'other'],
      required: true,
      index: true,
    },
    // Sub-category for detailed tracking
    subCategory: { type: String, trim: true, index: true },
    
    // Amount details
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR', trim: true },
    
    // Description and notes
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    
    // Date of expense (for monthly reporting)
    expenseDate: { type: Date, required: true, index: true },
    
    // Meta WhatsApp message cost tracking
    metaMessageCount: { type: Number, default: 0 },
    metaCostPerMessage: { type: Number, default: 0 },
    
    // Receipt/invoice reference
    receiptUrl: { type: String, trim: true },
    receiptId: { type: String, trim: true },
    
    // Who recorded this
    createdByUserId: { type: String, trim: true, index: true },
    
    // Approval workflow
    approved: { type: Boolean, default: false, index: true },
    approvedByUserId: { type: String, trim: true },
    approvedAt: { type: Date },
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'expenses' }
);

ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ category: 1, expenseDate: -1 });
ExpenseSchema.index({ createdByUserId: 1, expenseDate: -1 });

// ============================================================================
// 11. WHATSAPP SCHEDULED JOBS - One-time, delayed, scheduled, recurring campaigns
// ============================================================================
const WhatsAppScheduledJobSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, index: true },

    // Admin identity (string from JWT) who created this job.
    createdByUserId: { type: String, trim: true, index: true },

    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled', 'failed'],
      default: 'active',
      index: true,
    },

    // Target group selection
    targetType: { type: String, enum: ['leadIds', 'filter'], default: 'leadIds' },
    targetLeadIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    targetFilter: mongoose.Schema.Types.Mixed, // { status, labelsAny, labelsAll, workshopName, assignedToUserId, createdByUserId }

    // Message payload (we currently execute text in scheduler; other types can be queued)
    messageType: {
      type: String,
      enum: ['text', 'template', 'media', 'interactive'],
      default: 'text',
    },
    messageContent: String,
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
    templateVariables: mongoose.Schema.Types.Mixed,

    // Scheduling
    timezone: { type: String, default: 'Asia/Kolkata' },
    nextRunAt: { type: Date, index: true },
    lastRunAt: Date,
    runCount: { type: Number, default: 0 },
    maxRuns: { type: Number, default: 0 }, // 0 means unlimited

    // Recurrence
    recurrence: {
      frequency: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
        default: 'none',
      },
      interval: { type: Number, default: 1 }, // every N units
      // For weekly: 0=Sun .. 6=Sat
      weekdays: { type: [Number], default: [] },
      // For monthly: days of month 1..31
      monthDays: { type: [Number], default: [] },
      // Custom: minutes between runs
      customMinutes: { type: Number, default: 0 },
    },

    lastError: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'whatsapp_scheduled_jobs' }
);

WhatsAppScheduledJobSchema.index({ status: 1, nextRunAt: 1 });
WhatsAppScheduledJobSchema.index({ createdByUserId: 1, nextRunAt: -1 });

// ============================================================================
// 11b. BROADCAST RUNS - Track a broadcast campaign and per-lead outcomes
// ============================================================================
const BroadcastRunSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },

    createdByUserId: { type: String, trim: true, index: true },
    createdByLabel: { type: String, trim: true },

    mode: { type: String, enum: ['now', 'schedule', 'delay'], default: 'now', index: true },
    scheduledAt: { type: Date, index: true },

    // Provider: 'meta' (Cloud API) or 'qr' (WhatsApp Web Bridge)
    provider: { type: String, enum: ['meta', 'qr'], default: 'meta', index: true },

    // Message interval settings (random delay between messages in seconds)
    // Following WhatsApp guidelines to avoid spam detection
    messageInterval: {
      minSeconds: { type: Number, default: 30 },  // Minimum delay between messages
      maxSeconds: { type: Number, default: 60 },  // Maximum delay between messages
    },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'cancelled', 'failed'],
      default: 'draft',
      index: true,
    },

    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate', required: true, index: true },
    templateSnapshot: mongoose.Schema.Types.Mixed,

    // Filter + targeting inputs used to create this run.
    target: {
      type: {
        type: String,
        enum: ['leadIds', 'filters', 'broadcastList'],
        default: 'filters',
      },
      leadIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
      filters: mongoose.Schema.Types.Mixed,
      broadcastListId: { type: mongoose.Schema.Types.ObjectId, ref: 'BroadcastList' },
    },

    stats: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      blocked: { type: Number, default: 0 }, // User blocked or invalid number
    },

    // Cost tracking (Meta API charges per message, QR is free)
    cost: {
      currency: { type: String, default: 'INR' },
      totalCost: { type: Number, default: 0 },
      perMessageCost: { type: Number, default: 0 },
      breakdown: mongoose.Schema.Types.Mixed, // { marketing: X, utility: Y, etc }
    },

    startedAt: Date,
    completedAt: Date,
    lastError: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'broadcast_runs' }
);

BroadcastRunSchema.index({ status: 1, scheduledAt: 1 });
BroadcastRunSchema.index({ createdByUserId: 1, createdAt: -1 });

const BroadcastRunMessageSchema = new mongoose.Schema(
  {
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'BroadcastRun', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    phoneNumber: { type: String, required: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped', 'blocked'],
      default: 'pending',
      index: true,
    },
    
    // Delivery tracking
    deliveredAt: Date,
    readAt: Date,
    
    // Failure details
    failureReason: String,
    failureCode: String, // e.g., 'invalid_number', 'blocked', 'rate_limit', 'network_error'
    
    // WhatsApp message tracking
    waMessageId: String,
    provider: { type: String, enum: ['meta', 'qr'], default: 'meta' },
    sentAt: Date,

    // Link to actual WhatsAppMessage doc created by the send pipeline.
    whatsappMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppMessage' },
    
    // Cost for this message (Meta charges vary by category)
    cost: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      category: String, // 'marketing', 'utility', 'authentication', 'service'
    },
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'broadcast_run_messages' }
);

BroadcastRunMessageSchema.index({ runId: 1, status: 1 });
BroadcastRunMessageSchema.index({ leadId: 1, createdAt: -1 });
BroadcastRunMessageSchema.index({ waMessageId: 1 }); // For webhook status updates

// ============================================================================
// 12. WHATSAPP AUTOMATION RULES - Welcome/greetings/chatbot/AI agent
// ============================================================================
const WhatsAppAutomationRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    enabled: { type: Boolean, default: true, index: true },

    createdByUserId: { type: String, trim: true, index: true },

    // Trigger types
    triggerType: {
      type: String,
      enum: ['welcome', 'greeting', 'chatbot', 'ai_agent', 'keyword'],
      default: 'welcome',
      index: true,
    },
    keywords: { type: [String], default: [] }, // used when triggerType=keyword

    // Target/conditions
    conditions: mongoose.Schema.Types.Mixed, // { statuses, labelsAny, labelsAll, workshopName, assignedToUserId }
    throttleMinutesPerLead: { type: Number, default: 5 },

    // Action
    actionType: {
      type: String,
      enum: ['send_text', 'send_template', 'update_lead', 'ai_reply'],
      default: 'send_text',
    },
    actionText: String,
    actionTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
    actionTemplateVariables: mongoose.Schema.Types.Mixed,
    actionLeadUpdates: mongoose.Schema.Types.Mixed,

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'whatsapp_automation_rules' }
);

WhatsAppAutomationRuleSchema.index({ enabled: 1, triggerType: 1, createdAt: -1 });

// ============================================================================
// 13. LEAD NOTES - Internal notes for operators (not sent to WhatsApp)
// ============================================================================
const LeadNoteSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    note: { type: String, required: true },
    pinned: { type: Boolean, default: false, index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'lead_notes' }
);

LeadNoteSchema.index({ leadId: 1, createdAt: -1 });

// ============================================================================
// 14. LEAD FOLLOW-UPS / REMINDERS - Tasks for follow-up with due date/time
// ============================================================================
const LeadFollowUpSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    assignedToUserId: { type: String, trim: true, index: true },
    title: { type: String, trim: true },
    description: { type: String },
    dueAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    status: { type: String, enum: ['open', 'done', 'cancelled'], default: 'open', index: true },
    completedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'lead_followups' }
);

LeadFollowUpSchema.index({ assignedToUserId: 1, status: 1, dueAt: 1 });

// ============================================================================
// 15. QUICK REPLIES - Saved replies / canned responses
// ============================================================================
const QuickReplySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    shortcut: { type: String, trim: true, index: true }, // e.g. "/pricing"
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    createdByUserId: { type: String, trim: true, index: true },
    enabled: { type: Boolean, default: true, index: true },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'quick_replies' }
);

QuickReplySchema.index({ enabled: 1, createdAt: -1 });

// ============================================================================
// 16. BROADCAST LISTS - Named lists for broadcasting messages to groups
// ============================================================================
const BroadcastListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'broadcast_lists' }
);

BroadcastListSchema.index({ createdByUserId: 1, name: 1 }, { unique: true });

const BroadcastListMemberSchema = new mongoose.Schema(
  {
    broadcastListId: { type: mongoose.Schema.Types.ObjectId, ref: 'BroadcastList', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    phoneNumber: { type: String, required: true, trim: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'broadcast_list_members' }
);

BroadcastListMemberSchema.index({ broadcastListId: 1, leadId: 1 }, { unique: true });

// ============================================================================
// 17. CHATBOT FLOW — Full chatbot conversation builder
// ============================================================================
const ChatbotFlowSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    
    // Trigger keywords: when a user sends any of these words, this flow auto-starts
    triggerKeywords: { type: [String], default: [] },
    
    // Starting node (first message in flow)
    startNodeId: { type: String, trim: true },
    
    // Nodes array (questions, buttons, templates, conditions, etc)
    nodes: [
      {
        nodeId: { type: String, required: true },
        type: {
          type: String,
          enum: [
            // Basic nodes
            'message', 'question', 'buttons', 'template', 'condition', 'delay', 'end', 'wait_reply',
            // Advanced nodes - Actions
            'api_call', 'webhook', 'crm_update', 'assign_agent', 'notification',
            // Advanced nodes - Logic
            'branch', 'loop', 'variable', 'random',
            // Advanced nodes - Media
            'image', 'document', 'audio', 'video', 'location',
            // Advanced nodes - Integration
            'knowledge_base', 'ai_response', 'calendar', 'payment'
          ],
          default: 'message',
        },
        
        // Content depending on type
        messageText: String,
        templateId: mongoose.Schema.Types.ObjectId,
        templateName: String,
        questionText: String,
        questionType: { type: String, enum: ['text', 'multiple_choice', 'number', 'email', 'phone', 'date'] },
        
        // Presence / Delay features
        presenceType: { type: String, enum: ['composing', 'recording', 'paused', 'none'], default: 'none' },
        presenceDelay: { type: Number, default: 0 },
        spintaxEnabled: { type: Boolean, default: false },
        
        // Buttons/options (for questions or button-choice nodes)
        options: [
          {
            label: String,
            value: String,
            nextNodeId: String,
            icon: String,
          },
        ],
        
        // Routing
        nextNodeId: String,
        fallbackNodeId: String, // Used when condition fails or timeout
        
        // Delay in seconds before showing this node
        delaySeconds: { type: Number, default: 0 },
        
        // Labels to assign to conversation
        assignLabels: { type: [String], default: [] },
        removeLabels: { type: [String], default: [] },
        
        // Timer (minutes until this node expires or triggers action)
        timerMinutes: Number,
        timerAction: String, // e.g. 'escalate_to_human', 'end_flow', 'goto_node'
        timerTargetNodeId: String,
        
        // Condition node settings
        conditionField: String, // 'text', 'label', 'phone', 'variable', 'time', 'lead_status'
        conditionOp: String, // 'contains', 'equals', 'startsWith', 'endsWith', 'regex', 'gt', 'lt'
        conditionValue: String,
        conditionBranches: [{
          condition: String,
          value: String,
          nextNodeId: String,
        }],
        
        // API/Webhook node settings
        apiUrl: String,
        apiMethod: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
        apiHeaders: mongoose.Schema.Types.Mixed,
        apiBody: mongoose.Schema.Types.Mixed,
        apiResponseVariable: String,
        
        // CRM Update node settings
        leadUpdates: mongoose.Schema.Types.Mixed, // { status: 'prospect', workshopName: '...' }
        
        // Assign Agent node settings
        assignToUserId: String,
        assignToTeam: String,
        assignRoundRobin: Boolean,
        
        // Notification node settings
        notificationType: { type: String, enum: ['email', 'sms', 'push', 'webhook'], default: 'email' },
        notificationRecipient: String,
        notificationSubject: String,
        notificationBody: String,
        
        // Variable node settings
        variableName: String,
        variableValue: String,
        variableSource: String, // 'input', 'api_response', 'fixed', 'random'
        
        // Media node settings
        mediaUrl: String,
        mediaCaption: String,
        mediaFilename: String,
        
        // Knowledge Base node settings
        kbCategory: String,
        kbFallbackText: String,
        
        // AI Response node settings
        aiPrompt: String,
        aiModel: String,
        aiMaxTokens: Number,
        
        // Calendar node settings
        calendarAction: String, // 'show_slots', 'book', 'cancel'
        calendarEventType: String,
        
        // Payment node settings
        paymentAmount: Number,
        paymentCurrency: String,
        paymentDescription: String,
        paymentSuccessNodeId: String,
        paymentFailNodeId: String,
        
        // Visual position (for flow builder)
        position: {
          x: Number,
          y: Number,
        },
        
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],
    
    // Global variables for the flow
    variables: mongoose.Schema.Types.Mixed,
    
    // Triggers that can start this flow
    triggers: [{
      type: { type: String, enum: ['keyword', 'first_message', 'button_click', 'api', 'scheduled'] },
      value: String,
      enabled: { type: Boolean, default: true },
    }],
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'chatbot_flows' }
);

ChatbotFlowSchema.index({ createdByUserId: 1, enabled: 1 });

// ============================================================================
// 18. CHATBOT SETTINGS — Global chatbot configuration
// ============================================================================
const ChatbotSettingsSchema = new mongoose.Schema(
  {
    createdByUserId: { type: String, trim: true, index: true, required: true },
    
    // Welcome message shown when user starts conversation
    welcomeEnabled: { type: Boolean, default: true },
    welcomeMessage: String,
    
    // After office hours message
    officeHoursEnabled: { type: Boolean, default: false },
    officeHoursStart: String, // "09:00" (HH:mm)
    officeHoursEnd: String, // "18:00" (HH:mm)
    officeHoursTimezone: { type: String, default: 'Asia/Kolkata' },
    afterHoursMessage: String,
    
    // Auto-escalate to human after N messages
    escalateAfterMessages: Number,
    escalateMessage: String,
    
    // Inactivity timeout
    inactivityMinutes: Number,
    inactivityMessage: String,
    
    // Global labels to add to all conversations
    globalLabels: { type: [String], default: [] },
    
    // Default response for unmatched input
    defaultResponse: String,
    
    // Enable AI fallback
    aiEnabled: { type: Boolean, default: false },
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'chatbot_settings' }
);

ChatbotSettingsSchema.index({ createdByUserId: 1 });

// ============================================================================
// 18B. KNOWLEDGE BASE — FAQ/Knowledge articles for AI auto-reply
// ============================================================================
const KnowledgeBaseArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    content: { type: String, required: true }, // The answer/response content
    shortAnswer: { type: String, trim: true }, // Quick reply version (optional)
    
    // Categorization
    category: { 
      type: String, 
      enum: ['general', 'workshops', 'pricing', 'schedule', 'booking', 'payment', 'refund', 'location', 'other'],
      default: 'general',
      index: true
    },
    subcategory: { type: String, trim: true },
    
    // Matching keywords & phrases (for semantic matching)
    keywords: { type: [String], default: [], index: true },
    triggerPhrases: { type: [String], default: [] }, // Exact phrases that trigger this article
    
    // Language support
    language: { type: String, enum: ['en', 'hi', 'mr', 'auto'], default: 'auto', index: true },
    
    // Priority for matching (higher = more important)
    priority: { type: Number, default: 0, index: true },
    
    // Usage tracking
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    
    // Status
    enabled: { type: Boolean, default: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    
    // Optional: Link to specific workshop or product
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'knowledge_base_articles' }
);

KnowledgeBaseArticleSchema.index({ enabled: 1, category: 1, priority: -1 });
KnowledgeBaseArticleSchema.index({ keywords: 1 });
KnowledgeBaseArticleSchema.index({ '$**': 'text' }); // Full-text search

// ============================================================================
// 18C. CHATBOT CONVERSATION STATE — Track user's position in chatbot flows
// ============================================================================
const ChatbotConversationStateSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    phoneNumber: { type: String, required: true, trim: true, index: true },
    
    // Current flow state
    activeFlowId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatbotFlow' },
    currentNodeId: { type: String, trim: true },
    flowStartedAt: { type: Date },
    
    // Conversation context
    collectedData: mongoose.Schema.Types.Mixed, // { name: 'John', interest: 'online', ... }
    previousResponses: { type: [String], default: [] },
    
    // Admin availability tracking
    adminLastSeenAt: { type: Date },
    waitingForAdmin: { type: Boolean, default: false },
    escalatedAt: { type: Date },
    
    // Bot vs Human mode
    mode: { 
      type: String, 
      enum: ['bot', 'human', 'hybrid'],
      default: 'bot',
      index: true
    },
    
    // Last activity
    lastMessageAt: { type: Date },
    lastBotReplyAt: { type: Date },
    messageCount: { type: Number, default: 0 },
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'chatbot_conversation_states' }
);

ChatbotConversationStateSchema.index({ phoneNumber: 1 }, { unique: true });
ChatbotConversationStateSchema.index({ leadId: 1 });
ChatbotConversationStateSchema.index({ mode: 1, waitingForAdmin: 1 });

// ============================================================================
// 18D. CHATBOT SCHEDULED ACTIONS — Delayed messages & wait-for-reply timeouts
// ============================================================================
const ChatbotScheduledActionSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    phoneNumber: { type: String, required: true, trim: true, index: true },
    flowId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatbotFlow', required: true },
    
    // Action type
    actionType: {
      type: String,
      enum: ['delayed_message', 'wait_reply_timeout', 'scheduled_node'],
      required: true,
      index: true,
    },
    
    // Current state
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    
    // Node info
    sourceNodeId: { type: String, trim: true }, // Node that created this action
    targetNodeId: { type: String, trim: true }, // Node to execute after action
    timeoutNodeId: { type: String, trim: true }, // Node for timeout fallback (wait_reply)
    
    // Timing
    executeAt: { type: Date, required: true, index: true }, // When to execute
    createdAt: { type: Date, default: Date.now },
    executedAt: { type: Date },
    
    // Wait for reply specific
    waitingForReply: { type: Boolean, default: false },
    replyDelayMinutes: { type: Number, default: 0 }, // Delay after user replies
    
    // Message content (for delayed messages)
    messageType: { type: String, enum: ['text', 'template', 'media'], default: 'text' },
    messageContent: { type: String },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
    templateVariables: mongoose.Schema.Types.Mixed,
    mediaUrl: { type: String },
    mediaCaption: { type: String },
    
    // Error tracking
    retryCount: { type: Number, default: 0 },
    lastError: { type: String },
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'chatbot_scheduled_actions' }
);

ChatbotScheduledActionSchema.index({ status: 1, executeAt: 1 });
ChatbotScheduledActionSchema.index({ leadId: 1, status: 1 });
ChatbotScheduledActionSchema.index({ phoneNumber: 1, waitingForReply: 1 });

// ============================================================================
// 19. CRM RECEIPTS — Printable receipts generated when a lead enters sales/enrolled
// ============================================================================
const CrmReceiptSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    leadNumber: { type: String, trim: true, index: true },

    // Human-friendly receipt number (optional; can be generated via CrmCounter)
    receiptNumber: { type: String, trim: true, unique: true, sparse: true, index: true },

    issuedByUserId: { type: String, trim: true, index: true },
    issuedAt: { type: Date, default: Date.now, index: true },

    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true, index: true },
    customerEmail: { type: String, trim: true, lowercase: true },

    workshopName: { type: String, trim: true },
    workshopSlug: { type: String, trim: true },
    scheduleId: { type: String, trim: true },

    payment: {
      status: { type: String, trim: true },
      currency: { type: String, trim: true },
      amount: { type: Number },
      paidAmount: { type: Number },
      method: { type: String, trim: true },
      provider: { type: String, trim: true },
      orderId: { type: String, trim: true },
      transactionId: { type: String, trim: true },
      paidAt: { type: Date },
    },

    // Snapshot of arbitrary extra details at time of issuance
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'crm_receipts' }
);

CrmReceiptSchema.index({ leadId: 1, issuedAt: -1 });
CrmReceiptSchema.index({ customerPhone: 1, issuedAt: -1 });

// ============================================================================
// TALLY SYNC SCHEMAS
// ACCOUNTING SYSTEM — Proper Double-Entry Bookkeeping (Tally Prime compatible)
// ============================================================================
// Rules:
// - Every voucher MUST have balanced Debit = Credit totals
// - 5 Account Groups: ASSET, LIABILITY, INCOME, EXPENSE, CAPITAL
// - Normal balances: Assets & Expenses = Debit, Liabilities/Income/Capital = Credit
// ============================================================================

// ── ACCOUNT GROUP (SubGroup hierarchy like Tally Prime) ─────────────
const AccGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Root category (one of 5)
    nature: {
      type: String,
      enum: ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'CAPITAL'],
      required: true,
      index: true,
    },
    // Parent group for hierarchy (null = root group)
    parentGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccGroup', sparse: true, index: true },
    // Where this group appears
    affectsGrossProfit: { type: Boolean, default: false },
    // e.g. "Balance Sheet" or "Profit & Loss"
    report: {
      type: String,
      enum: ['balance_sheet', 'profit_loss'],
      required: true,
    },
    financialYear: { type: String, required: true, trim: true, index: true },
    isSystemDefault: { type: Boolean, default: false },
    createdByUserId: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_groups' }
);
AccGroupSchema.index({ name: 1, financialYear: 1, ownerId: 1 }, { unique: true });
AccGroupSchema.index({ nature: 1, financialYear: 1 });

// ── LEDGER (Account) ────────────────────────────────────────────────
const AccLedgerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Which of the 5 root groups
    group: {
      type: String,
      enum: ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'CAPITAL'],
      required: true,
      index: true,
    },
    // Sub-group reference (optional, for hierarchy)
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccGroup', sparse: true, index: true },
    // Sub-group name (denormalized for quick display: "Bank Accounts", "Fixed Assets", etc.)
    subGroup: { type: String, trim: true },

    // Opening balance for the financial year
    openingBalance: { type: Number, default: 0 },
    openingBalanceType: { type: String, enum: ['DEBIT', 'CREDIT'], default: 'DEBIT' },

    financialYear: { type: String, required: true, trim: true, index: true },

    // Optional metadata
    description: { type: String, trim: true },
    gstin: { type: String, trim: true },
    pan: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    state: { type: String, trim: true },

    // Link to CRM lead (optional)
    linkedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', sparse: true, index: true },

    isActive: { type: Boolean, default: true, index: true },
    createdByUserId: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_ledgers' }
);
AccLedgerSchema.index({ name: 1, financialYear: 1, ownerId: 1 }, { unique: true });
AccLedgerSchema.index({ group: 1, financialYear: 1 });
AccLedgerSchema.index({ isActive: 1 });

// ── VOUCHER (Double-Entry Transaction) ──────────────────────────────
// RULE: Sum of all DEBIT entries === Sum of all CREDIT entries (always)
const AccVoucherSchema = new mongoose.Schema(
  {
    // Auto-generated voucher number per type per FY (e.g., REC-001, PAY-002)
    voucherNumber: { type: String, required: true, trim: true, index: true },

    date: { type: Date, required: true, index: true },

    type: {
      type: String,
      enum: [
        'RECEIPT',      // Cash/Bank receives money
        'PAYMENT',      // Cash/Bank pays money
        'JOURNAL',      // Adjustments (no cash movement)
        'CONTRA',       // Cash ⇆ Bank transfer
        'SALES',        // Customer Debit, Sales Credit
        'PURCHASE',     // Purchase Debit, Supplier Credit
        'DEBIT_NOTE',   // Purchase return
        'CREDIT_NOTE',  // Sales return
      ],
      required: true,
      index: true,
    },

    // Double-entry legs — MUST balance (sum of debits === sum of credits)
    entries: [
      {
        ledgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccLedger', required: true },
        ledgerName: { type: String, required: true, trim: true }, // Denormalized for perf
        amount: { type: Number, required: true, min: 0.01 },
        type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
        costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccCostCenter', sparse: true },
        costCenterName: { type: String, trim: true },
      },
    ],

    // Totals (denormalized — must always match entries)
    totalDebit: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 0 },

    narration: { type: String, trim: true },

    financialYear: { type: String, required: true, trim: true, index: true },

    // Optional party reference (for Receipt/Payment/Sales/Purchase)
    partyLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccLedger', sparse: true },
    partyName: { type: String, trim: true },

    // Audit
    createdByUserId: { type: String, trim: true },
    isReversed: { type: Boolean, default: false },
    reversedVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccVoucher', sparse: true },

    // Receipt file attachment
    receiptFileUrl: { type: String, trim: true },
    receiptFileName: { type: String, trim: true },

    metadata: mongoose.Schema.Types.Mixed,
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_vouchers' }
);
AccVoucherSchema.index({ voucherNumber: 1, financialYear: 1, ownerId: 1 }, { unique: true });
AccVoucherSchema.index({ type: 1, date: -1 });
AccVoucherSchema.index({ financialYear: 1, date: -1 });
AccVoucherSchema.index({ 'entries.ledgerId': 1, date: -1 });
AccVoucherSchema.index({ partyLedgerId: 1 });

// ── FINANCIAL YEAR ──────────────────────────────────────────────────
const AccFinancialYearSchema = new mongoose.Schema(
  {
    // e.g. "2023-24"
    code: { type: String, required: true, unique: true, trim: true, index: true },
    label: { type: String, trim: true }, // "FY 2023-24"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false, index: true },
    isClosed: { type: Boolean, default: false },
    companyName: { type: String, trim: true },
    createdByUserId: { type: String, trim: true },

    // ── Company / Proprietor / Individual Profile ─────────────────
    businessType: { type: String, enum: ['company', 'proprietor', 'individual', 'partnership', 'llp', 'trust', 'huf', ''], default: '' },
    legalName: { type: String, trim: true },       // Registered legal name
    tradeName: { type: String, trim: true },        // Trade / brand name
    ownerName: { type: String, trim: true },        // Proprietor / director / individual name
    fatherName: { type: String, trim: true },       // Father's name (for individual/proprietor)
    designation: { type: String, trim: true },      // Owner's designation
    gstin: { type: String, trim: true },            // GSTIN number
    pan: { type: String, trim: true },              // PAN number
    tan: { type: String, trim: true },              // TAN number
    cin: { type: String, trim: true },              // Company CIN
    udyam: { type: String, trim: true },            // Udyam / MSME registration
    phone: { type: String, trim: true },
    altPhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },          // Full registered address
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    bankName: { type: String, trim: true },
    bankAccountNo: { type: String, trim: true },
    bankIfsc: { type: String, trim: true },
    bankBranch: { type: String, trim: true },
    logo: { type: String, trim: true },             // URL to company logo
    notes: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_financial_years' }
);
AccFinancialYearSchema.index({ code: 1, ownerId: 1 }, { unique: true });

// ── VOUCHER NUMBERING SERIES (Tally Prime compatible) ───────────────
// Configurable per voucher type per FY — prefix, suffix, starting number,
// zero-padding width, whether to include FY code, and numbering method.
const AccVoucherNumberingSchema = new mongoose.Schema(
  {
    financialYear: { type: String, required: true, trim: true, index: true },
    voucherType: {
      type: String,
      required: true,
      enum: ['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE'],
    },

    // Tally Prime numbering settings
    method: {
      type: String,
      enum: ['Automatic', 'Manual', 'None'],
      default: 'Automatic',
    },
    prefix: { type: String, trim: true, default: '' },        // e.g. "REC", "PAY"
    suffix: { type: String, trim: true, default: '' },        // e.g. "/2425"
    startingNumber: { type: Number, default: 1, min: 1 },     // First number in the series
    width: { type: Number, default: 4, min: 1, max: 10 },     // Zero-padding width (e.g. 4 → 0001)
    separator: { type: String, trim: true, default: '-' },    // Between prefix and number, e.g. "-"
    includeFYCode: { type: Boolean, default: false },          // Whether to include FY code (e.g. "2425")
    fyPosition: {
      type: String,
      enum: ['after-prefix', 'after-number'],
      default: 'after-prefix',
    },

    // Current counter (atomically incremented)
    currentNumber: { type: Number, default: 0 },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },

    // Preview example
    // e.g. prefix="REC", separator="-", includeFYCode=true, fyPosition="after-prefix",
    //       width=4, suffix="" → REC-2425-0001
  },
  { timestamps: true, collection: 'acc_voucher_numbering' }
);
AccVoucherNumberingSchema.index({ financialYear: 1, voucherType: 1, ownerId: 1 }, { unique: true });

// ── COST CENTER ─────────────────────────────────────────────────────
const AccCostCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['department', 'project', 'branch', 'other'], default: 'department' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccCostCenter', sparse: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    isActive: { type: Boolean, default: true },
    budgetAmount: { type: Number, default: 0 },
    description: { type: String, trim: true },
    createdByUserId: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_cost_centers' }
);
AccCostCenterSchema.index({ name: 1, financialYear: 1, ownerId: 1 }, { unique: true });

// ── AUDIT TRAIL ─────────────────────────────────────────────────────
const AccAuditTrailSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'REVERSE', 'CLOSE_FY', 'CARRY_FORWARD', 'RECONCILE'], required: true, index: true },
    entityType: { type: String, enum: ['LEDGER', 'VOUCHER', 'GROUP', 'COST_CENTER', 'FINANCIAL_YEAR', 'STOCK_ITEM', 'TDS_ENTRY'], required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    entityName: { type: String, trim: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    userId: { type: String, trim: true, index: true },
    userName: { type: String, trim: true },
    changes: { type: mongoose.Schema.Types.Mixed }, // { field: { old, new } }
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_audit_trail' }
);
AccAuditTrailSchema.index({ createdAt: -1 });
AccAuditTrailSchema.index({ entityType: 1, entityId: 1 });

// ── TDS ENTRY ───────────────────────────────────────────────────────
const AccTdsEntrySchema = new mongoose.Schema(
  {
    deducteeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccLedger', required: true, index: true },
    deducteeName: { type: String, required: true, trim: true },
    deducteePan: { type: String, trim: true },
    section: { type: String, required: true, trim: true }, // e.g. 194C, 194J, 194H
    tdsRate: { type: Number, required: true, min: 0 },
    grossAmount: { type: Number, required: true, min: 0 },
    tdsAmount: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccVoucher', sparse: true },
    voucherNumber: { type: String, trim: true },
    certificateNumber: { type: String, trim: true },
    isChallanPaid: { type: Boolean, default: false },
    challanDate: { type: Date },
    challanBsr: { type: String, trim: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], index: true },
    isActive: { type: Boolean, default: true },
    createdByUserId: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_tds_entries' }
);
AccTdsEntrySchema.index({ financialYear: 1, section: 1 });
AccTdsEntrySchema.index({ deducteeId: 1, date: -1 });

// ── STOCK GROUP ─────────────────────────────────────────────────────
const AccStockGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccStockGroup', sparse: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    isActive: { type: Boolean, default: true },
    createdByUserId: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_stock_groups' }
);
AccStockGroupSchema.index({ name: 1, financialYear: 1, ownerId: 1 }, { unique: true });

// ── STOCK ITEM ──────────────────────────────────────────────────────
const AccStockItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    stockGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccStockGroup', sparse: true },
    stockGroupName: { type: String, trim: true },
    unit: { type: String, trim: true, default: 'Nos' }, // Nos, Kg, Ltrs, etc.
    hsnCode: { type: String, trim: true },
    gstRate: { type: Number, default: 0 },
    openingQty: { type: Number, default: 0 },
    openingRate: { type: Number, default: 0 },
    openingValue: { type: Number, default: 0 },
    currentQty: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    godown: { type: String, trim: true, default: 'Main Location' },
    financialYear: { type: String, required: true, trim: true, index: true },
    isActive: { type: Boolean, default: true },
    createdByUserId: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_stock_items' }
);
AccStockItemSchema.index({ name: 1, financialYear: 1, ownerId: 1 }, { unique: true });
AccStockItemSchema.index({ stockGroupId: 1 });

// ── STOCK TRANSACTION ───────────────────────────────────────────────
const AccStockTxnSchema = new mongoose.Schema(
  {
    stockItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccStockItem', required: true, index: true },
    stockItemName: { type: String, required: true, trim: true },
    txnType: { type: String, enum: ['IN', 'OUT', 'TRANSFER'], required: true },
    qty: { type: Number, required: true },
    rate: { type: Number, required: true },
    value: { type: Number, required: true },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccVoucher', sparse: true },
    voucherNumber: { type: String, trim: true },
    date: { type: Date, required: true, index: true },
    godownFrom: { type: String, trim: true },
    godownTo: { type: String, trim: true },
    narration: { type: String, trim: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    createdByUserId: { type: String, trim: true },
    // Multi-tenant: which admin account owns this data
    ownerId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true, collection: 'acc_stock_txns' }
);
AccStockTxnSchema.index({ stockItemId: 1, date: -1 });
AccStockTxnSchema.index({ financialYear: 1, date: -1 });

// ============================================================================
// EMAIL AUTOMATION SCHEMAS
// ============================================================================

// Email Template Schema
const EmailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String },
    variables: [{ type: String }],
    createdBy: { type: String },
  },
  { timestamps: true, collection: 'email_templates' }
);

EmailTemplateSchema.index({ name: 1 });
EmailTemplateSchema.index({ category: 1 });

// Email Campaign Schema
const EmailCampaignSchema = new mongoose.Schema(
  {
    name: { type: String },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    recipients: [{ type: String }], // Array of email addresses
    status: { 
      type: String, 
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      default: 'draft'
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, collection: 'email_campaigns' }
);

EmailCampaignSchema.index({ status: 1, scheduledAt: 1 });
EmailCampaignSchema.index({ createdBy: 1, createdAt: -1 });

// Follow-up Sequence Schema
const FollowUpSequenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    trigger: { 
      type: String, 
      enum: ['manual', 'lead_created', 'workshop_registered', 'payment_received', 'custom'],
      required: true 
    },
    steps: [{
      id: { type: String, required: true },
      delayDays: { type: Number, required: true, default: 1 },
      delayHours: { type: Number, default: 0 },
      templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
      subject: { type: String, required: true },
      body: { type: String, required: true },
      condition: { type: String },
    }],
    active: { type: Boolean, default: true },
    stats: {
      triggered: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
    },
    createdBy: { type: String },
  },
  { timestamps: true, collection: 'followup_sequences' }
);

FollowUpSequenceSchema.index({ active: 1, trigger: 1 });
FollowUpSequenceSchema.index({ createdBy: 1 });

// Follow-up Instance Schema (tracks individual follow-up executions)
const FollowUpInstanceSchema = new mongoose.Schema(
  {
    sequenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FollowUpSequence', required: true },
    leadId: { type: String, required: true },
    currentStep: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'], default: 'active' },
    nextExecutionAt: { type: Date },
    executedSteps: [{
      stepId: String,
      executedAt: Date,
      status: String,
    }],
  },
  { timestamps: true, collection: 'followup_instances' }
);

FollowUpInstanceSchema.index({ leadId: 1, status: 1 });
FollowUpInstanceSchema.index({ nextExecutionAt: 1, status: 1 });

// ============================================================================
// EMAIL LOG SCHEMA - Per-recipient delivery tracking
// ============================================================================
const EmailLogSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign' },
    leadId: { type: String },
    recipientEmail: { type: String, default: '' },
    recipientName: { type: String },
    subject: { type: String, required: true },
    body: { type: String },
    status: { 
      type: String, 
      enum: ['queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'],
      default: 'queued'
    },
    resendId: { type: String },
    error: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    sentBy: { type: String },
    source: { type: String, enum: ['bulk', 'followup', 'single', 'automation'], default: 'bulk' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'email_logs' }
);

EmailLogSchema.index({ campaignId: 1, status: 1 });
EmailLogSchema.index({ recipientEmail: 1, createdAt: -1 });
EmailLogSchema.index({ leadId: 1, createdAt: -1 });
EmailLogSchema.index({ status: 1, createdAt: -1 });
EmailLogSchema.index({ sentBy: 1, createdAt: -1 });

// ============================================================================
// EMAIL SETTINGS SCHEMA - Sender emails, API keys, connection status
// ============================================================================
const EmailSettingsSchema = new mongoose.Schema(
  {
    senderEmail: { type: String, required: true, trim: true },
    senderName: { type: String, default: 'Swar Yoga', trim: true },
    connectionType: { type: String, enum: ['smtp', 'resend'], default: 'smtp' },
    // SMTP fields
    smtpHost: { type: String, default: '', trim: true },
    smtpPort: { type: Number, default: 465 },
    smtpUser: { type: String, default: '', trim: true },
    smtpPass: { type: String, default: '', trim: true },
    smtpSecure: { type: Boolean, default: true },
    // Resend fields
    resendApiKey: { type: String, default: '', trim: true },
    isDefault: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    lastVerifiedAt: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);
EmailSettingsSchema.index({ senderEmail: 1 }, { unique: true });
EmailSettingsSchema.index({ isDefault: 1 });

// ============================================================================
// ZOOM RECORDING SYNC SCHEMA
// ============================================================================
// LEAD ASSIGNMENT SETTINGS - Round-robin assignment for new WhatsApp leads
// ============================================================================
const LeadAssignmentSettingsSchema = new mongoose.Schema(
  {
    settingKey: { type: String, default: 'lead_assignment', unique: true }, // Singleton config
    enabled: { type: Boolean, default: false },
    batchSize: { type: Number, default: 5, min: 1, max: 100 }, // Leads per admin before rotating
    adminUsers: [{ 
      userId: { type: String, required: true },  // Admin userId like 'admincrm'
      name: { type: String },                    // Display name
      email: { type: String },
      isActive: { type: Boolean, default: true }, // Can disable without removing
    }],
    // Track current position in round-robin
    currentAdminIndex: { type: Number, default: 0 },
    currentBatchCount: { type: Number, default: 0 }, // Leads assigned to current admin
    totalAssigned: { type: Number, default: 0 },
    lastAssignedAt: { type: Date },
    // Audit
    updatedBy: { type: String },
  },
  { timestamps: true, collection: 'lead_assignment_settings' }
);

LeadAssignmentSettingsSchema.index({ settingKey: 1 }, { unique: true });


// ============================================================================
// Tracks Zoom recordings synced to AWS S3

const ZoomRecordingSyncSchema = new mongoose.Schema(
  {
    zoomMeetingId: { type: Number, required: true },
    zoomMeetingUuid: { type: String, required: true, unique: true },
    topic: { type: String, required: true },
    hostId: { type: String },
    startTime: { type: Date },
    duration: { type: Number }, // in minutes
    totalSize: { type: Number }, // in bytes
    syncedFiles: [{
      recordingType: { type: String }, // speaker_view, gallery_view, etc.
      displayName: { type: String },
      s3Key: { type: String },
      s3Url: { type: String },
      fileSize: { type: Number },
    }],
    skippedFiles: [{ type: String }],
    errors: [{ type: String }],
    syncStatus: { 
      type: String, 
      enum: ['pending', 'completed', 'partial', 'failed'],
      default: 'pending'
    },
    syncedAt: { type: Date, default: Date.now },
    // Link to workshop if applicable
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop' },
  },
  { timestamps: true }
);

ZoomRecordingSyncSchema.index({ zoomMeetingUuid: 1 }, { unique: true });
ZoomRecordingSyncSchema.index({ syncedAt: -1 });
ZoomRecordingSyncSchema.index({ topic: 1 });


// ============================================================================
// FUNNEL CONFIGURATION - Editable 7-step sales funnel
// ============================================================================
const FunnelConfigSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Default Funnel', trim: true },
    isActive: { type: Boolean, default: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },
    stages: [
      {
        key: { type: String, required: true, trim: true },        // e.g. 'new_lead'
        name: { type: String, required: true, trim: true },       // e.g. 'New Lead'
        color: { type: String, default: '#6366F1' },              // Primary color
        colorGradient: { type: String, default: '' },             // Gradient end color
        order: { type: Number, required: true },
        icon: { type: String, default: '' },                      // Optional icon name
        isDefault: { type: Boolean, default: false },             // Stage new leads land in
        description: { type: String, default: '', trim: true },
      },
    ],
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'funnel_configs' }
);

FunnelConfigSchema.index({ isActive: 1 });

// ============================================================================
// ADMIN SESSION TRACKING - Login/logout, activity tracking
// ============================================================================
const AdminSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true, index: true },
    userName: { type: String, trim: true },
    loginAt: { type: Date, default: Date.now, index: true },
    logoutAt: { type: Date },
    lastActiveAt: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: true, index: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    // Today's activity counters (reset daily)
    todayStats: {
      leadsContacted: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 },
      stageChanges: { type: Number, default: 0 },
      salesRecorded: { type: Number, default: 0 },
      callsMade: { type: Number, default: 0 },
      leadsCreated: { type: Number, default: 0 },
      lastResetDate: { type: String, default: '' },  // YYYY-MM-DD
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'admin_sessions' }
);

AdminSessionSchema.index({ userId: 1, loginAt: -1 });
AdminSessionSchema.index({ isOnline: 1 });

// ============================================================================
// FUNNEL STAGE HISTORY - Track every stage change for analytics
// ============================================================================
const FunnelStageHistorySchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    fromStage: { type: String, trim: true },
    toStage: { type: String, required: true, trim: true },
    changedByUserId: { type: String, trim: true, index: true },
    changedByName: { type: String, trim: true },
    note: { type: String, trim: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'funnel_stage_history' }
);

FunnelStageHistorySchema.index({ leadId: 1, createdAt: -1 });
FunnelStageHistorySchema.index({ toStage: 1, createdAt: -1 });
FunnelStageHistorySchema.index({ changedByUserId: 1, createdAt: -1 });


// ─── CRM Filter Option (custom dropdown values for country, workshop, connection) ───
const CRMFilterOptionSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, enum: ['country', 'workshop', 'connection'], index: true },
    value: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
CRMFilterOptionSchema.index({ category: 1, value: 1 }, { unique: true });


// ─── CRM Lead Settings (per-user configurable settings for leads module) ───
const CrmLeadSettingsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true, trim: true },
    // Custom workshop names (user-defined list for dropdowns)
    workshopNames: { type: [String], default: [] },
    // Custom label names (user-defined list for dropdowns)
    labelNames: { type: [String], default: [] },
    // Lead ID number start (e.g., 1 means IDs start from 000001)
    leadNumberStart: { type: Number, default: null },
    // Custom admin user display names (map userId -> displayName)
    adminUserNames: { type: Map, of: String, default: {} },
  },
  { timestamps: true, collection: 'crm_lead_settings' }
);


// ─── AI Call Log (Retell.ai voice agent calls) ───
const AICallLogSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    retellCallId: { type: String, index: true }, // Retell's call ID
    agentId: { type: String }, // Retell agent ID used
    direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
    purpose: { type: String, default: 'custom' }, // e.g. follow_up, welcome, custom, or template key
    customPrompt: { type: String }, // Custom instructions for this call
    status: { type: String, enum: ['queued', 'ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'busy', 'canceled'], default: 'queued', index: true },
    phoneNumber: { type: String }, // Number called
    fromNumber: { type: String }, // Caller ID / virtual number used
    language: { type: String, default: 'hi-IN' }, // hi-IN, en-IN

    // Call results
    duration: { type: Number, default: 0 }, // seconds
    transcript: { type: String }, // Full call transcript
    summary: { type: String }, // AI-generated call summary
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative', ''] },
    callEndedReason: { type: String }, // Why call ended
    recordingUrl: { type: String }, // Call recording URL

    // Collected data (from info-gathering calls)
    collectedData: { type: mongoose.Schema.Types.Mixed, default: {} },

    // CRM updates made during/after call
    crmUpdates: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    }],

    startedAt: { type: Date },
    endedAt: { type: Date },
    initiatedBy: { type: String }, // admin userId who triggered the call

    // Batch / Broadcast tracking
    batchName: { type: String, index: true },       // Name of the broadcast batch
    retellBatchId: { type: String, index: true },    // Retell batch ID
    scheduledAt: { type: Date, index: true },        // Scheduled call time (if scheduled)
    templateId: { type: String },                    // AICallTemplate ID used
    templateKey: { type: String },                   // Template key (e.g. ob_welcome)
  },
  { timestamps: true }
);
AICallLogSchema.index({ leadId: 1, createdAt: -1 });
AICallLogSchema.index({ retellCallId: 1 }, { unique: true, sparse: true });
AICallLogSchema.index({ status: 1, createdAt: -1 });


// ─── Call Workflow (Inbound/Outbound call preparation pipeline) ───
const CallWorkflowSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    workflowStatus: {
      type: String,
      enum: ['new', 'transcribed', 'rules_set', 'answer_ready', 'voice_ready', 'approved', 'scheduled', 'completed', 'cancelled'],
      default: 'new',
    },

    // ── Inbound fields ──
    voiceRecordingUrl: { type: String },          // Row 1: incoming voice recording
    transcribedText: { type: String },            // Row 2: voice-to-text transcription

    // ── Outbound fields ──
    lastQuery: { type: String },                  // Row 1: last question/context from lead
    scriptText: { type: String },                 // Row 2: text of what to say

    // ── Common fields ──
    rules: { type: String },                      // Do's and Don'ts
    preparedAnswer: { type: String },             // Prepared answer text (inbound) / final script (outbound)
    voiceUrl: { type: String },                   // Converted text-to-voice URL

    // ── Admin Approval ──
    adminApproved: { type: Boolean, default: false },
    approvedBy: { type: String },
    approvedAt: { type: Date },

    // ── Scheduling (outbound) ──
    scheduledAt: { type: Date },

    // ── AI Feedback / Analysis ──
    aiFeedback: {
      summary: { type: String },
      sentiment: { type: String, enum: ['positive', 'neutral', 'negative', ''] },
      suggestions: [{ type: String }],
      score: { type: Number, min: 0, max: 100 },
      analysedAt: { type: Date },
    },

    // ── Link to actual call ──
    aiCallLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'AICallLog' },

    // ── Lead snapshot (for display without populate) ──
    leadSnapshot: {
      name: { type: String },
      phone: { type: String },
      funnelStage: { type: String },
      country: { type: String },
    },

    notes: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);
CallWorkflowSchema.index({ direction: 1, workflowStatus: 1, createdAt: -1 });
CallWorkflowSchema.index({ leadId: 1, direction: 1 });


// ============================================================================
// FUNNEL & LABELS & SCHEDULED MESSAGES - CRM Feature Schemas
// ============================================================================

// ─── FUNNEL STAGE MAPPING - Link leads to specific funnel stages ───
const FunnelStageMappingSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    funnelConfigId: { type: mongoose.Schema.Types.ObjectId, ref: 'FunnelConfig', required: true, index: true },
    stageKey: { type: String, required: true, trim: true, index: true }, // e.g. 'new_lead', 'contacted'
    stageName: { type: String, trim: true }, // Denormalized for quick display
    color: { type: String, default: '#6366F1' }, // Color at assignment time
    movedByUserId: { type: String, trim: true, index: true }, // Who moved the lead
    moveNote: { type: String, trim: true }, // Reason/note for move
    daysInStage: { type: Number, default: 0 }, // Auto-updated periodically
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'funnel_stage_mappings' }
);
FunnelStageMappingSchema.index({ leadId: 1, funnelConfigId: 1 }, { unique: true });

// ─── SCHEDULED MESSAGE - WhatsApp messages scheduled for future delivery ───
const ScheduledMessageSchema = new mongoose.Schema(
  {
    // Target(s)
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false, index: true }, // Single lead OR
    leadIds: { type: [mongoose.Schema.Types.ObjectId], default: [], index: true }, // Multiple leads
    phoneNumbers: { type: [String], default: [], index: true }, // Direct phone numbers if no leads

    // Message content
    messageType: {
      type: String,
      enum: ['text', 'template', 'media'],
      default: 'text',
      index: true,
    },
    messageText: { type: String }, // For text messages
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' }, // For templates
    templateVariables: mongoose.Schema.Types.Mixed, // Variables for template
    
    // Media (for media type)
    mediaUrl: { type: String }, // URL to media file
    mediaCaption: { type: String }, // Caption for media
    mediaType: { type: String, enum: ['image', 'document', 'video', 'audio'] }, // Type of media

    // Scheduling
    scheduledFor: { type: Date, required: true, index: true }, // When to send
    timezone: { type: String, default: 'Asia/Kolkata' },
    
    // Status tracking
    status: {
      type: String,
      enum: ['scheduled', 'processing', 'sent', 'failed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    
    // Delivery tracking
    sentCount: { type: Number, default: 0 }, // How many actually sent
    failedCount: { type: Number, default: 0 }, // How many failed
    deliveredCount: { type: Number, default: 0 }, // How many delivered
    failureReasons: [{ type: String }], // List of failure reasons
    
    // Retries
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 2 },
    nextRetryAt: { type: Date },
    
    // Admin info
    createdByUserId: { type: String, trim: true, index: true },
    createdByName: { type: String, trim: true },
    cancelledByUserId: { type: String, trim: true },
    cancelledAt: { type: Date },
    
    // Execution
    processedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    
    // Tracking
    campaignName: { type: String, trim: true }, // Optional: part of a campaign
    tags: { type: [String], default: [] },
    
    // Recurring/Repeat settings
    isRecurring: { type: Boolean, default: false, index: true },
    recurrenceType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    },
    recurrenceInterval: { type: Number, default: 1 }, // Every X days/weeks/months/years
    customCronExpression: { type: String }, // For advanced custom schedules
    recurrenceEndDate: { type: Date }, // Stop recurring after this date
    recurrenceCount: { type: Number }, // OR stop after X executions
    executedCount: { type: Number, default: 0 }, // How many times this recurring message has been sent
    nextExecutionAt: { type: Date, index: true }, // Next scheduled execution for recurring
    
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'scheduled_messages' }
);
ScheduledMessageSchema.index({ status: 1, scheduledFor: 1 });
ScheduledMessageSchema.index({ createdByUserId: 1, createdAt: -1 });
ScheduledMessageSchema.index({ processedAt: 1 });
ScheduledMessageSchema.index({ isRecurring: 1, nextExecutionAt: 1 });

// ============================================================================
// MODEL INITIALIZATION (LAZY - DEFERRED TO FIRST USE)
// ============================================================================
// CRITICAL: We DO NOT call getCrmDb() at module load time!
// Instead, we use Proxy objects that defer initialization until
// the model is actually used (guaranteed after connectDB() is called).

function getModel(modelName: string, schema: any) {
  // Return cached model if available (using global to survive hot reloads)
  if (global._crmModelCache[modelName]) {
    console.log(`[enterpriseSchemas] Using cached model: ${modelName}`);
    return global._crmModelCache[modelName];
  }
  
  // Initialize on first use (safe because this happens after connectDB)
  const crmDb = getCrmDb();
  console.log(`[enterpriseSchemas] Creating new model: ${modelName} on db: ${crmDb.name}`);

  // PROACTIVE REGISTRATION:
  // If we are registering any CRM model other than Lead, ensure Lead is registered first on this connection.
  // This prevents "Schema hasn't been registered for model 'Lead'" errors during population/ref lookup.
  // LeadSchema is defined at the top of this file and is available here.
  if (modelName !== 'Lead' && !crmDb.models['Lead']) {
    crmDb.model('Lead', LeadSchema);
  }

  const model = crmDb.models[modelName] || crmDb.model(modelName, schema);
  global._crmModelCache[modelName] = model;
  console.log(`[enterpriseSchemas] Model ${modelName} created, db.name: ${model.db?.name}`);
  return model;
}

/**
 * Create a Proxy that lazy-loads a Mongoose model.
 * The Proxy defers initialization to the first property access,
 * which is guaranteed to be after connectDB() is called in route handlers.
 * 
 * This is critical for async operations like create(), updateOne(), findOne(), etc.
 * which require proper `this` binding to the Mongoose model instance.
 */
function createModelProxy(modelName: string, schema: any) {
  return new Proxy({} as any, {
    get: (target, prop) => {
      const model = getModel(modelName, schema);
      const value = model[prop];
      // For methods, we need to bind them to preserve Mongoose's internal state
      if (typeof value === 'function') {
        return value.bind(model);
      }
      return value;
    }
  });
}

// ============================================================================
// AUTO CONFIG SETTINGS — Unified runtime configuration (stored in DB, not env)
// ============================================================================
const AutoConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'auto_config', unique: true, index: true },

    // ---- Chatbot / Auto-Reply Master Switch ----
    chatbotEnabled: { type: Boolean, default: true },

    // ---- Welcome Message ----
    welcomeEnabled: { type: Boolean, default: true },
    welcomeMessage: {
      type: String,
      default: 'नमस्ते 🙏 Swar Yoga में आपका स्वागत है!\n\nHow can I help you today?',
    },

    // ---- Working Hours ----
    workingHoursEnabled: { type: Boolean, default: false },
    workingHoursStart: { type: String, default: '09:00' },
    workingHoursEnd: { type: String, default: '18:00' },
    workingHoursTimezone: { type: String, default: 'Asia/Kolkata' },
    offHoursMessage: {
      type: String,
      default: 'We are currently offline. Our team will respond during business hours (9 AM - 6 PM IST). 🙏',
    },

    // ---- Knowledge Base Auto-Reply ----
    kbAutoReplyEnabled: { type: Boolean, default: true },
    kbMinConfidence: { type: Number, default: 0.6, min: 0, max: 1 },

    // ---- AI Agent ----
    aiAgentEnabled: { type: Boolean, default: false },
    aiModel: { type: String, default: 'gpt-4o-mini' },
    aiSystemPrompt: {
      type: String,
      default: 'You are a helpful assistant for Swar Yoga. Be friendly, concise, and professional.',
    },
    aiMaxTokens: { type: Number, default: 250 },

    // ---- Auto Lead Assignment ----
    autoAssignEnabled: { type: Boolean, default: true },
    autoAssignStrategy: {
      type: String,
      enum: ['round-robin', 'least-active', 'manual'],
      default: 'round-robin',
    },

    // ---- Auto Add to Broadcast ----
    autoBroadcastEnabled: { type: Boolean, default: true },

    // ---- Inactivity Auto-Close ----
    autoCloseEnabled: { type: Boolean, default: false },
    autoCloseMinutes: { type: Number, default: 1440 },
    autoCloseMessage: {
      type: String,
      default: 'This chat has been closed due to inactivity. Feel free to message us again! 🙏',
    },

    // ---- Notification Settings ----
    notifyOnNewLead: { type: Boolean, default: true },
    notifyOnOffHoursMessage: { type: Boolean, default: true },
    notifyEmail: { type: String, trim: true },

    // ---- Rate Limiting ----
    rateLimitEnabled: { type: Boolean, default: false },
    rateLimitMaxPerMinute: { type: Number, default: 30 },

    // ---- Misc ----
    updatedBy: { type: String },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'auto_config' }
);

// Export getter functions instead of Proxies for clarity and reliability
// Usage: const Lead = (await import('@/lib/schemas/enterpriseSchemas')).getLead();
// Or simply: const { getLead } = await import('@/lib/schemas/enterpriseSchemas'); const lead = getLead();

export function getAutoConfig() { return getModel('AutoConfig', AutoConfigSchema); }
export function getLead() { return getModel('Lead', LeadSchema); }
export function getCrmCounter() { return getModel('CrmCounter', CrmCounterSchema); }
export function getDeletedLead() { return getModel('DeletedLead', DeletedLeadSchema); }
export function getWhatsAppMessage() { return getModel('WhatsAppMessage', WhatsAppMessageSchema); }
export function getQrWhatsAppMessage() { return getModel('QrWhatsAppMessage', QrWhatsAppMessageSchema); }
export function getQrWhatsAppChat() { return getModel('QrWhatsAppChat', QrWhatsAppChatSchema); }
export function getSocialInboxConversation() { return getModel('SocialInboxConversation', SocialInboxConversationSchema); }
export function getSocialInboxMessage() { return getModel('SocialInboxMessage', SocialInboxMessageSchema); }
export function getWhatsAppWebhookEvent() { return getModel('WhatsAppWebhookEvent', WhatsAppWebhookEventSchema); }
export function getWhatsAppAccount() { return getModel('WhatsAppAccount', WhatsAppAccountSchema); }
export function getUserConsent() { return getModel('UserConsent', UserConsentSchema); }
export function getMessageStatus() { return getModel('MessageStatus', MessageStatusSchema); }
export function getAuditLog() { return getModel('AuditLog', AuditLogSchema); }
export function getWhatsAppTemplate() { return getModel('WhatsAppTemplate', WhatsAppTemplateSchema); }
export function getRateLimit() { return getModel('RateLimit', RateLimitSchema); }
export function getBackup() { return getModel('Backup', BackupSchema); }
export function getPermission() { return getModel('Permission', PermissionSchema); }
export function getAnalyticsEvent() { return getModel('AnalyticsEvent', AnalyticsEventSchema); }
export function getSalesReport() { return getModel('SalesReport', SalesReportSchema); }
export function getExpense() { return getModel('Expense', ExpenseSchema); }
export function getWhatsAppScheduledJob() { return getModel('WhatsAppScheduledJob', WhatsAppScheduledJobSchema); }
export function getWhatsAppAutomationRule() { return getModel('WhatsAppAutomationRule', WhatsAppAutomationRuleSchema); }
export function getLeadNote() { return getModel('LeadNote', LeadNoteSchema); }
export function getLeadFollowUp() { return getModel('LeadFollowUp', LeadFollowUpSchema); }
export function getQuickReply() { return getModel('QuickReply', QuickReplySchema); }
export function getBroadcastList() { return getModel('BroadcastList', BroadcastListSchema); }
export function getBroadcastListMember() { return getModel('BroadcastListMember', BroadcastListMemberSchema); }
export function getBroadcastRun() { return getModel('BroadcastRun', BroadcastRunSchema); }
export function getBroadcastRunMessage() { return getModel('BroadcastRunMessage', BroadcastRunMessageSchema); }
export function getChatbotFlow() { return getModel('ChatbotFlow', ChatbotFlowSchema); }
export function getChatbotSettings() { return getModel('ChatbotSettings', ChatbotSettingsSchema); }
export function getKnowledgeBaseArticle() { return getModel('KnowledgeBaseArticle', KnowledgeBaseArticleSchema); }
export function getChatbotConversationState() { return getModel('ChatbotConversationState', ChatbotConversationStateSchema); }
export function getChatbotScheduledAction() { return getModel('ChatbotScheduledAction', ChatbotScheduledActionSchema); }
export function getCrmReceipt() { return getModel('CrmReceipt', CrmReceiptSchema); }
export function getMediaFile() { return getModel('MediaFile', MediaFileSchema); }
export function getEmailTemplate() { return getModel('EmailTemplate', EmailTemplateSchema); }
export function getEmailCampaign() { return getModel('EmailCampaign', EmailCampaignSchema); }
export function getFollowUpSequence() { return getModel('FollowUpSequence', FollowUpSequenceSchema); }
export function getFollowUpInstance() { return getModel('FollowUpInstance', FollowUpInstanceSchema); }
export function getEmailLog() { return getModel('EmailLog', EmailLogSchema); }
export function getEmailSettings() { return getModel('EmailSettings', EmailSettingsSchema); }
export function getZoomRecordingSync() { return getModel('ZoomRecordingSync', ZoomRecordingSyncSchema); }
export function getLeadAssignmentSettings() { return getModel('LeadAssignmentSettings', LeadAssignmentSettingsSchema); }
export function getFunnelConfig() { return getModel('FunnelConfig', FunnelConfigSchema); }
export function getAdminSession() { return getModel('AdminSession', AdminSessionSchema); }
export function getFunnelStageHistory() { return getModel('FunnelStageHistory', FunnelStageHistorySchema); }
export function getCRMFilterOption() { return getModel('CRMFilterOption', CRMFilterOptionSchema); }
export function getCrmLeadSettings() { return getModel('CrmLeadSettings', CrmLeadSettingsSchema); }
export function getAICallLog() { return getModel('AICallLog', AICallLogSchema); }
export function getCallWorkflow() { return getModel('CallWorkflow', CallWorkflowSchema); }

// ─── AI Call Template (Sakshi prompt scripts for inbound/outbound calls) ───
const AICallTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true }, // e.g. 'ob_welcome', 'ib_greeting'
    name: { type: String, required: true }, // Display name
    description: { type: String, default: '' },
    category: { type: String, enum: ['outbound', 'inbound'], required: true },
    language: { type: String, enum: ['hi', 'en', 'mr', 'ne', 'other'], required: true },
    stageOrder: { type: Number, default: 1 }, // 1-6 stage within category
    promptText: { type: String, default: '' }, // The full prompt script
    voiceRecordingUrl: { type: String, default: '' }, // URL to voice recording
    voiceRecordingName: { type: String, default: '' }, // Filename
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft',
    },
    approvalNote: { type: String, default: '' }, // Reviewer note
    approvedBy: { type: String }, // Admin who approved
    approvedAt: { type: Date },
    submittedAt: { type: Date }, // When submitted for approval
    isActive: { type: Boolean, default: false }, // Only true after approval
    isDefault: { type: Boolean, default: false },
    variables: [{ type: String }],
    tags: [{ type: String }],
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: 'ai_call_templates' }
);
AICallTemplateSchema.index({ category: 1, language: 1, stageOrder: 1 });
AICallTemplateSchema.index({ key: 1, language: 1 }, { unique: true });
AICallTemplateSchema.index({ approvalStatus: 1 });

export function getAICallTemplate() { return getModel('AICallTemplate', AICallTemplateSchema); }

// ─── Agent Language Mapping (auto-select Retell agent per language) ───
const AgentLanguageMappingSchema = new mongoose.Schema(
  {
    language: { type: String, required: true, unique: true, index: true },
    // e.g. 'hi', 'en', 'ne', 'mr', 'ta', 'te', 'bn', 'gu', 'ml', 'pa', 'ur', 'es', 'multi'
    agentId: { type: String, required: true },   // Retell agent_id
    agentName: { type: String, default: '' },     // Display name for UI
    voiceId: { type: String, default: '' },       // Retell voice_id (informational)
    isDefault: { type: Boolean, default: false }, // Fallback agent for unmapped languages
    isActive: { type: Boolean, default: true },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: 'agent_language_mappings' }
);

export function getAgentLanguageMapping() { return getModel('AgentLanguageMapping', AgentLanguageMappingSchema); }
export function getFunnelStageMapping() { return getModel('FunnelStageMapping', FunnelStageMappingSchema); }
export function getScheduledMessage() { return getModel('ScheduledMessage', ScheduledMessageSchema); }

// LEGACY PROXY EXPORTS - For backward compatibility with existing code
// These use Proxies to defer initialization
export const Lead = createModelProxy('Lead', LeadSchema);
export const CrmCounter = createModelProxy('CrmCounter', CrmCounterSchema);
export const DeletedLead = createModelProxy('DeletedLead', DeletedLeadSchema);
export const WhatsAppMessage = createModelProxy('WhatsAppMessage', WhatsAppMessageSchema);
export const SocialInboxConversation = createModelProxy('SocialInboxConversation', SocialInboxConversationSchema);
export const SocialInboxMessage = createModelProxy('SocialInboxMessage', SocialInboxMessageSchema);
export const WhatsAppWebhookEvent = createModelProxy('WhatsAppWebhookEvent', WhatsAppWebhookEventSchema);
export const WhatsAppAccount = createModelProxy('WhatsAppAccount', WhatsAppAccountSchema);
export const UserConsent = createModelProxy('UserConsent', UserConsentSchema);
export const MessageStatus = createModelProxy('MessageStatus', MessageStatusSchema);
export const AuditLog = createModelProxy('AuditLog', AuditLogSchema);
export const WhatsAppTemplate = createModelProxy('WhatsAppTemplate', WhatsAppTemplateSchema);
export const RateLimit = createModelProxy('RateLimit', RateLimitSchema);
export const Backup = createModelProxy('Backup', BackupSchema);
export const Permission = createModelProxy('Permission', PermissionSchema);
export const AnalyticsEvent = createModelProxy('AnalyticsEvent', AnalyticsEventSchema);
export const SalesReport = createModelProxy('SalesReport', SalesReportSchema);
export const Expense = createModelProxy('Expense', ExpenseSchema);
export const WhatsAppScheduledJob = createModelProxy('WhatsAppScheduledJob', WhatsAppScheduledJobSchema);
export const WhatsAppAutomationRule = createModelProxy('WhatsAppAutomationRule', WhatsAppAutomationRuleSchema);
export const LeadNote = createModelProxy('LeadNote', LeadNoteSchema);
export const LeadFollowUp = createModelProxy('LeadFollowUp', LeadFollowUpSchema);
export const QuickReply = createModelProxy('QuickReply', QuickReplySchema);
export const BroadcastList = createModelProxy('BroadcastList', BroadcastListSchema);
export const BroadcastListMember = createModelProxy('BroadcastListMember', BroadcastListMemberSchema);
export const BroadcastRun = createModelProxy('BroadcastRun', BroadcastRunSchema);
export const BroadcastRunMessage = createModelProxy('BroadcastRunMessage', BroadcastRunMessageSchema);
export const ChatbotFlow = createModelProxy('ChatbotFlow', ChatbotFlowSchema);
export const ChatbotSettings = createModelProxy('ChatbotSettings', ChatbotSettingsSchema);
export const KnowledgeBaseArticle = createModelProxy('KnowledgeBaseArticle', KnowledgeBaseArticleSchema);
export const ChatbotConversationState = createModelProxy('ChatbotConversationState', ChatbotConversationStateSchema);
export const ChatbotScheduledAction = createModelProxy('ChatbotScheduledAction', ChatbotScheduledActionSchema);
export const CrmReceipt = createModelProxy('CrmReceipt', CrmReceiptSchema);
export const MediaFile = createModelProxy('MediaFile', MediaFileSchema);
export const EmailTemplate = createModelProxy('EmailTemplate', EmailTemplateSchema);
export const EmailCampaign = createModelProxy('EmailCampaign', EmailCampaignSchema);
export const FollowUpSequence = createModelProxy('FollowUpSequence', FollowUpSequenceSchema);
export const FollowUpInstance = createModelProxy('FollowUpInstance', FollowUpInstanceSchema);
export const EmailLog = createModelProxy('EmailLog', EmailLogSchema);
export const ZoomRecordingSync = createModelProxy('ZoomRecordingSync', ZoomRecordingSyncSchema);
export const LeadAssignmentSettings = createModelProxy('LeadAssignmentSettings', LeadAssignmentSettingsSchema);
export const FunnelConfig = createModelProxy('FunnelConfig', FunnelConfigSchema);
export const AdminSession = createModelProxy('AdminSession', AdminSessionSchema);
export const FunnelStageHistory = createModelProxy('FunnelStageHistory', FunnelStageHistorySchema);
// Accounting system models (double-entry bookkeeping)
export const AccGroup = createModelProxy('AccGroup', AccGroupSchema);
export const AccLedger = createModelProxy('AccLedger', AccLedgerSchema);
export const AccVoucher = createModelProxy('AccVoucher', AccVoucherSchema);
export const AccFinancialYear = createModelProxy('AccFinancialYear', AccFinancialYearSchema);

// Accounting getter functions
export function getAccGroup() { return getModel('AccGroup', AccGroupSchema); }
export function getAccLedger() { return getModel('AccLedger', AccLedgerSchema); }
export function getAccVoucher() { return getModel('AccVoucher', AccVoucherSchema); }
export function getAccFinancialYear() { return getModel('AccFinancialYear', AccFinancialYearSchema); }
export function getAccVoucherNumbering() { return getModel('AccVoucherNumbering', AccVoucherNumberingSchema); }
export function getAccCostCenter() { return getModel('AccCostCenter', AccCostCenterSchema); }
export function getAccAuditTrail() { return getModel('AccAuditTrail', AccAuditTrailSchema); }
export function getAccTdsEntry() { return getModel('AccTdsEntry', AccTdsEntrySchema); }
export function getAccStockGroup() { return getModel('AccStockGroup', AccStockGroupSchema); }
export function getAccStockItem() { return getModel('AccStockItem', AccStockItemSchema); }
export function getAccStockTxn() { return getModel('AccStockTxn', AccStockTxnSchema); }

// ============================================================================
// TALLY INTEGRATION SCHEMAS
// ============================================================================

// ----- Tally Manual Balance -----
const TallyManualBalanceSchema = new mongoose.Schema(
  {
    ledgerName: { type: String, required: true, trim: true },
    parentGroup: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ['asset', 'liability', 'income', 'expense'] },
    amount: { type: Number, required: true, default: 0 },
    drCr: { type: String, required: true, enum: ['Dr', 'Cr'] },
    financialYear: { type: String, required: true },
    asOnDate: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: String },
  },
  { timestamps: true, collection: 'tally_manual_balances' }
);
TallyManualBalanceSchema.index({ financialYear: 1 });
TallyManualBalanceSchema.index({ category: 1, parentGroup: 1, ledgerName: 1 });

// ----- Tally Manual Voucher -----
const TallyManualVoucherSchema = new mongoose.Schema(
  {
    voucherType: { type: String, required: true, enum: ['Receipt', 'Payment', 'Journal', 'Contra', 'Sales', 'Purchase'] },
    voucherNumber: { type: String, default: '' },
    date: { type: String, required: true },
    partyName: { type: String, required: true, trim: true },
    ledgerName: { type: String, default: '', trim: true },
    amount: { type: Number, required: true },
    narration: { type: String, default: '', trim: true },
    paymentMode: { type: String, default: '', trim: true },
    financialYear: { type: String, required: true },
    createdBy: { type: String },
    entries: [
      {
        ledgerName: { type: String },
        drCr: { type: String, enum: ['Dr', 'Cr'] },
        amount: { type: Number },
      },
    ],
  },
  { timestamps: true, collection: 'tally_manual_vouchers' }
);
TallyManualVoucherSchema.index({ financialYear: 1 });
TallyManualVoucherSchema.index({ financialYear: 1, voucherType: 1 });

// ----- Tally Receipt File -----
const TallyReceiptFileSchema = new mongoose.Schema(
  {
    financialYear: { type: String, required: true },
    voucherId: { type: String },
    voucherType: { type: String, default: '' },
    voucherNumber: { type: String, default: '' },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    category: { type: String, default: 'other', enum: ['income', 'expense', 'other'] },
    partyName: { type: String, default: '' },
    amount: { type: Number },
    date: { type: String, default: '' },
    notes: { type: String, default: '' },
    uploadedBy: { type: String },
  },
  { timestamps: true, collection: 'tally_receipt_files' }
);
TallyReceiptFileSchema.index({ financialYear: 1 });
TallyReceiptFileSchema.index({ category: 1 });

// ----- Tally Invoice -----
const TallyInvoiceSchema = new mongoose.Schema(
  {
    tallyId: { type: String, required: true, unique: true },
    tallyInvoiceNumber: { type: String },
    tallyCustomerId: { type: String },
    linkedCustomerId: { type: mongoose.Schema.Types.ObjectId },
    date: { type: Date },
    dueDate: { type: Date },
    lineItems: [
      {
        description: { type: String },
        quantity: { type: Number },
        rate: { type: Number },
        amount: { type: Number },
      },
    ],
    subtotal: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    notes: { type: String },
    lastSyncedAt: { type: Date },
    syncStatus: { type: String },
    tallyRawData: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'tally_invoices' }
);
TallyInvoiceSchema.index({ tallyId: 1 }, { unique: true });
TallyInvoiceSchema.index({ tallyCustomerId: 1 });
TallyInvoiceSchema.index({ date: 1 });

// ----- Tally Customer -----
const TallyCustomerSchema = new mongoose.Schema(
  {
    tallyId: { type: String, required: true, unique: true },
    tallyName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    state: { type: String },
    gstin: { type: String },
    totalAmount: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    totalInvoices: { type: Number, default: 0 },
    lastSyncedAt: { type: Date },
    syncStatus: { type: String },
    tallyRawData: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'tally_customers' }
);
TallyCustomerSchema.index({ tallyId: 1 }, { unique: true });

// ----- Tally Payment -----
const TallyPaymentSchema = new mongoose.Schema(
  {
    tallyId: { type: String, required: true, unique: true },
    tallyPaymentVoucher: { type: String },
    tallyCustomerId: { type: String },
    tallyInvoiceIds: [{ type: String }],
    linkedInvoiceIds: [{ type: String }],
    paymentDate: { type: Date },
    paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'online', 'other'] },
    amount: { type: Number, default: 0 },
    referenceNumber: { type: String },
    notes: { type: String },
    lastSyncedAt: { type: Date },
    syncStatus: { type: String },
    tallyRawData: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'tally_payments' }
);
TallyPaymentSchema.index({ tallyId: 1 }, { unique: true });
TallyPaymentSchema.index({ tallyCustomerId: 1 });

// ----- Tally Sync Log -----
const TallySyncLogSchema = new mongoose.Schema(
  {
    syncType: { type: String, required: true, enum: ['customers', 'invoices', 'payments', 'all', 'auto'] },
    status: { type: String, required: true, enum: ['success', 'failed', 'partial'] },
    totalProcessed: { type: Number },
    totalSucceeded: { type: Number },
    totalFailed: { type: Number },
    errors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    endTime: { type: Date },
    details: { type: mongoose.Schema.Types.Mixed },
    ledgerCount: { type: Number },
    voucherCount: { type: Number },
    durationMs: { type: Number },
    from: { type: String },
    to: { type: String },
    error: { type: String },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'tally_sync_logs' }
);
TallySyncLogSchema.index({ syncedAt: -1 });
TallySyncLogSchema.index({ createdAt: -1 });

// Tally getter functions
export function getTallyManualBalance() { return getModel('TallyManualBalance', TallyManualBalanceSchema); }
export function getTallyManualVoucher() { return getModel('TallyManualVoucher', TallyManualVoucherSchema); }
export function getTallyReceiptFile() { return getModel('TallyReceiptFile', TallyReceiptFileSchema); }
export function getTallyInvoice() { return getModel('TallyInvoice', TallyInvoiceSchema); }
export function getTallyCustomer() { return getModel('TallyCustomer', TallyCustomerSchema); }
export function getTallyPayment() { return getModel('TallyPayment', TallyPaymentSchema); }
export function getTallySyncLog() { return getModel('TallySyncLog', TallySyncLogSchema); }

export const AutoConfig = createModelProxy('AutoConfig', AutoConfigSchema);

// ============================================================================
// CRM USER SETTINGS - Per-user funnel mappings, labels, preferences
// ============================================================================
const CRMUserSettingsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    // ── PERMANENT TENANT ID ──
    // Persistent user identifier (e.g., "USER0001", "USER0002")
    // Generated once when user first accesses CRM, never changes
    // Used in bridge path: http://localhost:3333/tenant/USER0001
    // Linked to: email, mobile, WhatsApp number scanned via QR
    permanentTenantId: { type: String, unique: true, sparse: true, index: true },  // e.g. "USER0001"
    chatFunnels: { type: mongoose.Schema.Types.Mixed, default: {} },   // { chatJid: stageKey }
    chatLabels: { type: mongoose.Schema.Types.Mixed, default: {} },    // { chatJid: [label1, label2] }
    labelPresets: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        color: { type: String, default: '' },
      },
    ],
    // QR-specific funnel stages (independent from leads/manage funnel)
    qrFunnelStages: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        color: { type: String, default: '' },
      },
    ],
    pinnedChats: { type: [String], default: [] },
    senderDisplayName: { type: String, default: '' },
    // Per-user QR WhatsApp bridge connection (each user runs their own bridge instance)
    // DEPRECATED: Old UUID-based URLs replaced by permanentTenantId
    qrBridgeUrl: { type: String, default: '' },      // e.g. https://my-bridge.up.railway.app (legacy)
    qrBridgeSecret: { type: String, default: '' },    // bridge auth secret
    // QR WhatsApp access control — only super admin can enable this for each user
    // When false/unset, non-super-admin users cannot access the shared bridge (privacy compartment)
    qrWhatsappEnabled: { type: Boolean, default: false },
    // Currently connected WhatsApp phone number (e.g. '919876543210')
    // Saved automatically when QR scan connects. Used for session isolation:
    // if bridge returns chats from a different phone, old chats are NOT shown.
    qrConnectedPhoneNumber: { type: String, default: '', index: true },
    // Timestamp of the last detected phone switch for the user's QR session.
    // Used to keep chats from an older scanned number out of the current inbox.
    qrPhoneChangedAt: { type: Date, default: null },
    // Per-user Telegram Bot configuration
    telegramBotToken: { type: String, default: '' },       // Bot token from @BotFather
    telegramBotUsername: { type: String, default: '' },     // e.g. 'my_bot'
    telegramBotName: { type: String, default: '' },         // e.g. 'My Bot'
    telegramBotId: { type: Number },                        // Telegram bot user ID
    telegramWebhookSet: { type: Boolean, default: false },  // Whether webhook is configured
    telegramWebhookSecret: { type: String, default: '' },   // Secret token for webhook verification
    telegramEnabled: { type: Boolean, default: false },     // Whether Telegram is enabled for this user
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'crm_user_settings' }
);

export function getCRMUserSettings() { return getModel('CRMUserSettings', CRMUserSettingsSchema); }
export const CRMUserSettings = createModelProxy('CRMUserSettings', CRMUserSettingsSchema);

// ============================================================================
// USER COMPARTMENT - Per-user isolated data compartment for MongoDB & Bunny CDN
// ============================================================================
const UserCompartmentSchema = new mongoose.Schema(
  {
    // User identification
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    
    // Compartment identification
    compartmentId: { type: String, required: true, unique: true, index: true }, // e.g., "comp_abc123"
    folderName: { type: String, required: true, unique: true, index: true },   // User-chosen name (lowercase, no spaces)
    
    // Bunny CDN Storage
    bunny: {
      folderPath: { type: String, default: '' },      // e.g., "users/folderName/"
      folderCreated: { type: Boolean, default: false },
      folderCreatedAt: { type: Date },
      cdnUrl: { type: String, default: '' },          // Public CDN URL for folder
    },
    
    // Storage quota (in MB)
    storage: {
      quotaMB: { type: Number, default: 0 },          // 0 = not purchased yet
      usedMB: { type: Number, default: 0 },
      plan: { type: String, enum: ['none', 'starter', 'growth', 'pro'], default: 'none' },
      purchasedAt: { type: Date },
      expiresAt: { type: Date },                      // Optional expiration for subscription model
    },
    
    // MongoDB data isolation (all queries use userId filter)
    mongodb: {
      setupComplete: { type: Boolean, default: false },
      indexesCreated: { type: Boolean, default: false },
      setupCompletedAt: { type: Date },
    },
    
    // Overall setup status
    setup: {
      isComplete: { type: Boolean, default: false, index: true },
      completedAt: { type: Date },
      steps: {
        folderNameChosen: { type: Boolean, default: false },
        storagePurchased: { type: Boolean, default: false },
        bunnyFolderCreated: { type: Boolean, default: false },
        mongodbConfigured: { type: Boolean, default: false },
        connectionVerified: { type: Boolean, default: false },
      },
      lastVerifiedAt: { type: Date },
    },
    
    // Subscription & Plan
    subscription: {
      plan: { type: String, enum: ['free', 'basic', 'starter', 'growth', 'professional'], default: 'free' },
      billing: { type: String, enum: ['monthly', 'quarterly', 'annual'], default: 'monthly' },
      status: { type: String, enum: ['active', 'trial', 'expired', 'cancelled', 'pending'], default: 'trial' },
      startDate: { type: Date },
      endDate: { type: Date },
      // Trial tracking
      trialStartDate: { type: Date, default: Date.now },
      trialEndDate: { type: Date },           // Auto-calculated: trialStartDate + 14 days
      trialUsed: { type: Boolean, default: false },
      // Payment
      lastPaymentDate: { type: Date },
      lastPaymentAmount: { type: Number },
      paymentMethod: { type: String },
      autopayEnabled: { type: Boolean, default: false },
    },

    // Activity tracking
    isActive: { type: Boolean, default: true },
    lastActivityAt: { type: Date },
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'user_compartments' }
);

// Compound indexes for efficient queries
UserCompartmentSchema.index({ 'setup.isComplete': 1, createdAt: -1 });
UserCompartmentSchema.index({ 'bunny.folderCreated': 1, userId: 1 });

export function getUserCompartment() { return getModel('UserCompartment', UserCompartmentSchema); }
export const UserCompartment = createModelProxy('UserCompartment', UserCompartmentSchema);

// ============================================================================
// PENDING PAYMENT SCHEMA - QR Code payments (Nepal/eSewa) awaiting admin approval
// ============================================================================
const PendingPaymentSchema = new mongoose.Schema(
  {
    // User info from form
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },

    // Product info
    productType: { type: String, required: true, enum: ['course', 'workshop'], index: true },
    productId: { type: String, required: true }, // Course ID or Workshop slug
    productName: { type: String, required: true },
    scheduleId: { type: String }, // For workshops with specific schedules
    scheduleDetails: { type: String }, // Batch, time, dates etc

    // Payment info
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'NPR' },
    paymentMethod: { type: String, default: 'esewa', enum: ['esewa', 'khalti', 'bank', 'other'] },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },

    // Admin tracking
    approvedBy: { type: String },
    approvedAt: { type: Date },
    rejectedBy: { type: String },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    adminNotes: { type: String },

    // Link to lead (auto-created or linked)
    linkedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

    // Metadata
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true, collection: 'pending_payments' }
);
PendingPaymentSchema.index({ status: 1, createdAt: -1 });
PendingPaymentSchema.index({ phone: 1, productId: 1 });

export function getPendingPayment() { return getModel('PendingPayment', PendingPaymentSchema); }
export const PendingPayment = createModelProxy('PendingPayment', PendingPaymentSchema);

// ============================================================================
// SERVICE CONNECTIONS — Central hub for all third-party service credentials
// ============================================================================
const ServiceConnectionSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },

    // ---- User / Business Details ----
    userDetails: {
      businessName: { type: String, default: '' },
      contactName: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
      contactEmail: { type: String, default: '' },
      address: { type: String, default: '' },
      connected: { type: Boolean, default: false },
    },

    // ---- Email Service ----
    email: {
      provider: { type: String, enum: ['smtp', 'sendgrid', 'mailgun', 'ses', 'other'], default: 'smtp' },
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: '' },
      smtpPass: { type: String, default: '' },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      connected: { type: Boolean, default: false },
      lastTestedAt: { type: Date },
      error: { type: String, default: '' },
    },

    // ---- Meta WhatsApp (Cloud API) ----
    metaWhatsApp: {
      phoneNumberId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      businessAccountId: { type: String, default: '' },
      webhookVerifyToken: { type: String, default: '' },
      appId: { type: String, default: '' },
      connected: { type: Boolean, default: false },
      lastTestedAt: { type: Date },
      error: { type: String, default: '' },
    },

    // ---- Community ----
    community: {
      groupName: { type: String, default: '' },
      platform: { type: String, enum: ['whatsapp', 'telegram', 'discord', 'other'], default: 'whatsapp' },
      groupLink: { type: String, default: '' },
      connected: { type: Boolean, default: false },
      error: { type: String, default: '' },
    },

    // ---- Domain ----
    domain: {
      existingDomain: { type: String, default: '' },
      wantToBuy: { type: Boolean, default: false },
      desiredDomain: { type: String, default: '' },
      status: { type: String, enum: ['not-configured', 'connected', 'pending-purchase', 'pending-dns'], default: 'not-configured' },
      connected: { type: Boolean, default: false },
      error: { type: String, default: '' },
    },

    // ---- SMS Service ----
    sms: {
      provider: { type: String, enum: ['twilio', 'msg91', 'textlocal', 'other'], default: 'msg91' },
      apiKey: { type: String, default: '' },
      senderId: { type: String, default: '' },
      panNumber: { type: String, default: '' },
      panName: { type: String, default: '' },
      entityId: { type: String, default: '' },
      connected: { type: Boolean, default: false },
      lastTestedAt: { type: Date },
      error: { type: String, default: '' },
    },

    // ---- Call Service ----
    call: {
      provider: { type: String, enum: ['exotel', 'knowlarity', 'twilio', 'other'], default: 'exotel' },
      apiKey: { type: String, default: '' },
      apiSecret: { type: String, default: '' },
      callerId: { type: String, default: '' },
      sipDomain: { type: String, default: '' },
      virtualNumber: { type: String, default: '' },
      connected: { type: Boolean, default: false },
      lastTestedAt: { type: Date },
      error: { type: String, default: '' },
    },

    // ---- QR WhatsApp (Baileys bridge) ----
    qrWhatsApp: {
      bridgeUrl: { type: String, default: '' },
      bridgeSecret: { type: String, default: '' },
      connected: { type: Boolean, default: false },
      lastTestedAt: { type: Date },
      error: { type: String, default: '' },
    },

    // ---- Tally (Accounting) ----
    tally: {
      companyName: { type: String, default: '' },
      gstRegistered: { type: Boolean, default: false },
      gstNumber: { type: String, default: '' },
      tallySerialNumber: { type: String, default: '' },
      tallyLicenseKey: { type: String, default: '' },
      // GST: ₹250/mo extra plan ; Non-GST: no fees
      billingPlan: { type: String, enum: ['non-gst-free', 'gst-monthly-250'], default: 'non-gst-free' },
      connected: { type: Boolean, default: false },
      lastTestedAt: { type: Date },
      error: { type: String, default: '' },
    },

    // ---- Payment Gateway ----
    payment: {
      provider: { type: String, enum: ['cashfree', 'payu', 'razorpay', 'stripe', 'other'], default: 'cashfree' },
      apiKey: { type: String, default: '' },
      apiSecret: { type: String, default: '' },
      merchantId: { type: String, default: '' },
      connected: { type: Boolean, default: false },
      lastTestedAt: { type: Date },
      error: { type: String, default: '' },
    },

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'service_connections' }
);
ServiceConnectionSchema.index({ ownerId: 1 }, { unique: true });

export function getServiceConnection() { return getModel('ServiceConnection', ServiceConnectionSchema); }
export const ServiceConnection = createModelProxy('ServiceConnection', ServiceConnectionSchema);

// ============================================================================
// TELEGRAM CONTACT — Tracks users who messaged a Telegram bot
// ============================================================================
const TelegramContactSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true }, // CRM user who owns the bot
    chatId: { type: Number, required: true, index: true },  // Telegram chat ID
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },
    chatType: { type: String, enum: ['private', 'group', 'supergroup', 'channel'], default: 'private' },
    groupTitle: { type: String, default: '' },              // For group/channel chats
    lastMessageAt: { type: Date },
    lastMessageText: { type: String, default: '' },
    messageCount: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    labels: [{ type: String }],                            // User-defined labels
    notes: { type: String, default: '' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'telegram_contacts' }
);
TelegramContactSchema.index({ ownerId: 1, chatId: 1 }, { unique: true });
TelegramContactSchema.index({ ownerId: 1, lastMessageAt: -1 });

export function getTelegramContact() { return getModel('TelegramContact', TelegramContactSchema); }

// ============================================================================
// TELEGRAM MESSAGE — Individual messages sent/received via Telegram bot
// ============================================================================
const TelegramMessageSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },   // CRM user who owns the bot
    chatId: { type: Number, required: true, index: true },     // Telegram chat ID
    messageId: { type: Number },                               // Telegram message_id
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    text: { type: String, default: '' },
    mediaType: { type: String, enum: ['none', 'photo', 'video', 'document', 'audio', 'voice', 'sticker'], default: 'none' },
    mediaUrl: { type: String, default: '' },
    mediaFileId: { type: String, default: '' },                // Telegram file_id
    mediaFileName: { type: String, default: '' },
    mediaMimeType: { type: String, default: '' },
    caption: { type: String, default: '' },
    fromName: { type: String, default: '' },
    fromUsername: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'delivered', 'failed', 'pending'], default: 'sent' },
    errorMessage: { type: String, default: '' },
    broadcastRunId: { type: String },                          // If sent via broadcast
    templateId: { type: String },                              // If sent via template
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'telegram_messages' }
);
TelegramMessageSchema.index({ ownerId: 1, chatId: 1, createdAt: -1 });
TelegramMessageSchema.index({ ownerId: 1, createdAt: -1 });
TelegramMessageSchema.index({ broadcastRunId: 1 });

export function getTelegramMessage() { return getModel('TelegramMessage', TelegramMessageSchema); }

// ============================================================================
// AFFILIATE PROGRAM - Referral & profit sharing
// ============================================================================
const AffiliateSchema = new mongoose.Schema(
  {
    // Affiliate user info
    userId: { type: String, required: true, index: true },          // CRM user who is the affiliate
    affiliateCode: { type: String, required: true, unique: true },  // Unique referral code
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    
    // Commission settings
    commissionPercent: { type: Number, default: 10 },               // Default 10% commission
    commissionType: { 
      type: String, 
      enum: ['percentage', 'fixed'], 
      default: 'percentage' 
    },
    fixedCommission: { type: Number, default: 0 },                  // Fixed amount per sale (if type is 'fixed')
    
    // Status
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'suspended', 'rejected'], 
      default: 'pending' 
    },
    approvedAt: { type: Date },
    approvedBy: { type: String },
    
    // Banking / Payment info
    paymentMethod: { 
      type: String, 
      enum: ['bank_transfer', 'upi', 'paypal', 'other'], 
      default: 'upi' 
    },
    bankDetails: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String, default: '' },
      paypalEmail: { type: String, default: '' },
    },
    
    // Stats (denormalized for quick display)
    totalReferrals: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },                       // Total sales amount (INR)
    totalEarnings: { type: Number, default: 0 },                    // Total commission earned
    pendingEarnings: { type: Number, default: 0 },                  // Pending payout
    paidEarnings: { type: Number, default: 0 },                     // Already paid out
    
    // Landing page / link
    customLandingPage: { type: String, default: '' },               // Custom landing page URL
    utmSource: { type: String, default: '' },
    utmMedium: { type: String, default: '' },
    utmCampaign: { type: String, default: '' },
    
    // Terms accepted
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date },
    
    notes: { type: String, default: '' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'affiliates' }
);
AffiliateSchema.index({ affiliateCode: 1 });
AffiliateSchema.index({ status: 1 });
AffiliateSchema.index({ email: 1 });

export function getAffiliate() { return getModel('Affiliate', AffiliateSchema); }
export const Affiliate = createModelProxy('Affiliate', AffiliateSchema);

// Affiliate Referrals - Track individual referrals/sales
const AffiliateReferralSchema = new mongoose.Schema(
  {
    affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    affiliateCode: { type: String, required: true, index: true },
    
    // Referred customer
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    
    // Sale details
    saleAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    productName: { type: String, default: '' },
    orderId: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    
    // Commission
    commissionPercent: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    
    // Status
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'paid', 'cancelled', 'refunded'], 
      default: 'pending' 
    },
    confirmedAt: { type: Date },
    paidAt: { type: Date },
    
    // Tracking
    referralSource: { type: String, default: '' },                  // landing_page, direct_link, etc.
    utmParams: mongoose.Schema.Types.Mixed,
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    
    notes: { type: String, default: '' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'affiliate_referrals' }
);
AffiliateReferralSchema.index({ affiliateId: 1, createdAt: -1 });
AffiliateReferralSchema.index({ status: 1 });
AffiliateReferralSchema.index({ orderId: 1 });

export function getAffiliateReferral() { return getModel('AffiliateReferral', AffiliateReferralSchema); }
export const AffiliateReferral = createModelProxy('AffiliateReferral', AffiliateReferralSchema);

// Affiliate Payouts - Track commission payouts
const AffiliatePayoutSchema = new mongoose.Schema(
  {
    affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    
    // Payout details
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    
    // Payment method used
    paymentMethod: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    
    // Status
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'], 
      default: 'pending' 
    },
    processedAt: { type: Date },
    processedBy: { type: String },
    
    // Reference to referrals included in this payout
    referralIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AffiliateReferral' }],
    
    notes: { type: String, default: '' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'affiliate_payouts' }
);
AffiliatePayoutSchema.index({ affiliateId: 1, createdAt: -1 });
AffiliatePayoutSchema.index({ status: 1 });

export function getAffiliatePayout() { return getModel('AffiliatePayout', AffiliatePayoutSchema); }
export const AffiliatePayout = createModelProxy('AffiliatePayout', AffiliatePayoutSchema);