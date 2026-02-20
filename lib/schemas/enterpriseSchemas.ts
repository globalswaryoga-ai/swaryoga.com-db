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
      enum: ['lead', 'prospect', 'customer', 'inactive'],
      default: 'lead',
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
        'import',
        'api',
        'manual',
        'whatsapp',
        'workshop_payment',
        'meta_leadgen',
        'referral',
        'social',
        'event',
      ],
      default: 'manual',
      index: true,
    },
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopSchedule', sparse: true, index: true },
    workshopName: { type: String, sparse: true },

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

    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'leads' }
);

LeadSchema.index({ status: 1, lastMessageAt: -1 });
LeadSchema.index({ labels: 1 });
LeadSchema.index({ assignedToUserId: 1, lastMessageAt: -1 });

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
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'user_consents' }
);

UserConsentSchema.index({ phoneNumber: 1, status: 1, channel: 1 });
UserConsentSchema.index({ phoneNumber: 1, consentStatus: 1 });

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
    provider: {
      type: String,
      enum: ['meta', 'qr'],
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
        title: { type: String },
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
            'message', 'question', 'buttons', 'template', 'condition', 'delay', 'end',
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

// Export getter functions instead of Proxies for clarity and reliability
// Usage: const Lead = (await import('@/lib/schemas/enterpriseSchemas')).getLead();
// Or simply: const { getLead } = await import('@/lib/schemas/enterpriseSchemas'); const lead = getLead();

export function getLead() { return getModel('Lead', LeadSchema); }
export function getCrmCounter() { return getModel('CrmCounter', CrmCounterSchema); }
export function getDeletedLead() { return getModel('DeletedLead', DeletedLeadSchema); }
export function getWhatsAppMessage() { return getModel('WhatsAppMessage', WhatsAppMessageSchema); }
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
export function getZoomRecordingSync() { return getModel('ZoomRecordingSync', ZoomRecordingSyncSchema); }
export function getLeadAssignmentSettings() { return getModel('LeadAssignmentSettings', LeadAssignmentSettingsSchema); }

// LEGACY PROXY EXPORTS - For backward compatibility with existing code
// These use Proxies to defer initialization
export const Lead = createModelProxy('Lead', LeadSchema);
export const CrmCounter = createModelProxy('CrmCounter', CrmCounterSchema);
export const DeletedLead = createModelProxy('DeletedLead', DeletedLeadSchema);
export const WhatsAppMessage = createModelProxy('WhatsAppMessage', WhatsAppMessageSchema);
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
export const ZoomRecordingSync = createModelProxy('ZoomRecordingSync', ZoomRecordingSyncSchema);
export const LeadAssignmentSettings = createModelProxy('LeadAssignmentSettings', LeadAssignmentSettingsSchema);
