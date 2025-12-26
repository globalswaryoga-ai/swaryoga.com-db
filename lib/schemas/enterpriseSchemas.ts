import mongoose from 'mongoose';

// CRM/Admin database selection
// This file contains CRM + enterprise schemas that you may want to keep separate from the main app DB.
// We keep one Atlas cluster, but allow routing these collections to a separate database via useDb().
//
// Configure via env:
// - MONGODB_CRM_DB_NAME (recommended)
//   Example: swaryoga_admin_crm
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

function getCrmDb() {
  // Note: connectDB() should be called before using these models.
  // useDb() is safe and will reuse the underlying connection.
  return mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
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
    // Ownership / multi-user access control
    // - assignedToUserId: which CRM user owns/manages this lead (used for per-user filtering)
    // - createdByUserId: who created the lead (admin / user head / creator)
    assignedToUserId: { type: String, trim: true, index: true },
    createdByUserId: { type: String, trim: true, index: true },

    name: { type: String, trim: true },
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
      enum: ['website', 'import', 'api', 'manual', 'whatsapp', 'referral', 'social', 'event'],
      default: 'manual',
      index: true,
    },
    workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopSchedule', sparse: true, index: true },
    workshopName: { type: String, sparse: true },
    lastMessageAt: { type: Date, index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'leads' }
);

LeadSchema.index({ status: 1, lastMessageAt: -1 });
LeadSchema.index({ labels: 1 });
LeadSchema.index({ assignedToUserId: 1, lastMessageAt: -1 });

// ============================================================================
// 1. WHATSAPP MESSAGE SCHEMA - Track all WhatsApp messages sent
// ============================================================================
const WhatsAppMessageSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    phoneNumber: { type: String, required: true, index: true },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      default: 'outbound',
      index: true,
    },
    messageContent: String,
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
    templateVariables: mongoose.Schema.Types.Mixed, // For template parameter substitution
    messageType: {
      type: String,
      enum: ['text', 'template', 'media', 'interactive'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'queued',
      index: true,
    },
    failureReason: String,
    waMessageId: String, // WhatsApp message ID from Meta API
    // Optional because admin JWTs may not map to a User document.
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    sentByLabel: String,
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
      enum: ['queued', 'sent', 'failed', 'delivered', 'read'],
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
// 5. WHATSAPP TEMPLATE SCHEMA - Manage Meta API templates
// ============================================================================
const WhatsAppTemplateSchema = new mongoose.Schema(
  {
    templateName: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ['MARKETING', 'OTP', 'TRANSACTIONAL', 'ACCOUNT_UPDATE'],
      default: 'MARKETING',
    },
    language: { type: String, default: 'en', index: true },
    templateContent: String, // Template body with {{variable}} placeholders
    headerFormat: { type: String, enum: ['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO'] },
    headerContent: String,
    footerText: String,
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
    saleAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMode: {
      type: String,
      enum: ['payu', 'card', 'bank_transfer', 'cash', 'other'],
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
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'sales_reports' }
);

SalesReportSchema.index({ userId: 1, saleDate: -1 });
SalesReportSchema.index({ saleDate: 1, paymentMode: 1 });

// ============================================================================
// EXPORT MODELS
// ============================================================================
const crmDb = getCrmDb();

export const Lead = crmDb.models.Lead || crmDb.model('Lead', LeadSchema);
export const WhatsAppMessage = crmDb.models.WhatsAppMessage || crmDb.model('WhatsAppMessage', WhatsAppMessageSchema);
export const UserConsent = crmDb.models.UserConsent || crmDb.model('UserConsent', UserConsentSchema);
export const MessageStatus = crmDb.models.MessageStatus || crmDb.model('MessageStatus', MessageStatusSchema);
export const AuditLog = crmDb.models.AuditLog || crmDb.model('AuditLog', AuditLogSchema);
export const WhatsAppTemplate = crmDb.models.WhatsAppTemplate || crmDb.model('WhatsAppTemplate', WhatsAppTemplateSchema);
export const RateLimit = crmDb.models.RateLimit || crmDb.model('RateLimit', RateLimitSchema);
export const Backup = crmDb.models.Backup || crmDb.model('Backup', BackupSchema);
export const Permission = crmDb.models.Permission || crmDb.model('Permission', PermissionSchema);
export const AnalyticsEvent = crmDb.models.AnalyticsEvent || crmDb.model('AnalyticsEvent', AnalyticsEventSchema);
export const SalesReport = crmDb.models.SalesReport || crmDb.model('SalesReport', SalesReportSchema);
