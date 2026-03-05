/**
 * Multi-Tenant Schemas
 * Manages tenant registry, subscriptions, and API keys for SaaS
 */
import mongoose from 'mongoose';

const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

declare global {
  // eslint-disable-next-line no-var
  var _tenantModelCache: Record<string, any>;
}

if (!global._tenantModelCache) {
  global._tenantModelCache = {};
}

function getMainDb() {
  // Ensure connectDB() is called before using these models
  return mongoose.connection.useDb(MAIN_DB_NAME, { useCache: true });
}

// ============================================================================
// TENANT SCHEMA (Organization/SaaS Customer)
// ============================================================================
const TenantSchema = new mongoose.Schema(
  {
    // Unique tenant identifier (slug format: my-yoga-studio)
    tenantSlug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },

    // Display name for the organization
    organizationName: { type: String, required: true, trim: true },

    // Subscription tier: free | plan1 | plan2 | plan3 | plan4
    subscriptionTier: {
      type: String,
      enum: ['free', 'plan1', 'plan2', 'plan3', 'plan4'],
      default: 'free',
      index: true,
    },

    // Subscription status
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trial', 'suspended', 'cancelled'],
      default: 'active',
      index: true,
    },

    // Trial period info
    trialEndsAt: { type: Date, sparse: true },
    subscriptionStartDate: { type: Date, default: Date.now },
    subscriptionEndDate: { type: Date, sparse: true },

    // Billing & contact info
    billingEmail: { type: String, trim: true, lowercase: true },
    billingPhone: { type: String, trim: true },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    // Admin user (tenant owner)
    adminUserId: { type: String, required: true, trim: true, index: true },
    adminName: { type: String, trim: true },
    adminEmail: { type: String, trim: true, lowercase: true },

    // Custom domain support (CNAME)
    customDomain: { type: String, sparse: true, lowercase: true, unique: true, index: true },
    customDomainVerified: { type: Boolean, default: false },

    // Feature flags (which modules are enabled)
    enabledModules: {
      leads: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      aiCalls: { type: Boolean, default: false },
      broadcasting: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
      community: { type: Boolean, default: false },
      templates: { type: Boolean, default: false },
      callRecording: { type: Boolean, default: false },
    },

    // Usage tracking (reset monthly)
    usage: {
      leadsCount: { type: Number, default: 0, index: true },
      messagesCount: { type: Number, default: 0 },
      callsCount: { type: Number, default: 0 },
      storageUsedMB: { type: Number, default: 0 },
      teamMembersCount: { type: Number, default: 1 },
    },

    // Limits based on tier (cached for performance)
    limits: {
      maxLeads: { type: Number, required: true },
      maxUsers: { type: Number, required: true },
      storageQuotaMB: { type: Number, required: true },
    },

    // Payment & Billing Info
    stripeCustomerId: { type: String, sparse: true, trim: true },
    stripeSubscriptionId: { type: String, sparse: true, trim: true },
    nextBillingDate: { type: Date, sparse: true },

    // API rate limiting
    rateLimitPerHour: { type: Number, default: 1000 },
    apiCallsThisHour: { type: Number, default: 0 },
    apiCallsResetAt: { type: Date, default: Date.now },

    // Metadata
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// ============================================================================
// TENANT API KEY SCHEMA (For programmatic access)
// ============================================================================
const TenantAPIKeySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tenantSlug: { type: String, required: true, index: true }, // Denormalized for quick lookup

    // Hashed API key (never store plaintext)
    keyHash: { type: String, required: true, unique: true, index: true },

    // Plaintext key returned only on creation (shown once)
    plainKey: { type: String, required: true }, // Store temporarily, clear after response

    // Key metadata
    name: { type: String, required: true, trim: true }, // e.g., "Production", "Testing"
    description: { type: String, trim: true },

    // Permissions
    permissions: {
      type: [String],
      enum: ['leads:read', 'leads:write', 'messages:read', 'messages:write', 'calls:read', 'calls:write'],
      default: ['leads:read', 'leads:write', 'messages:read'],
    },

    // Usage tracking
    lastUsedAt: { type: Date, sparse: true },
    callCount: { type: Number, default: 0 },

    // Lifecycle
    isActive: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, sparse: true },
    revokedAt: { type: Date, sparse: true },

    // IP whitelisting (optional)
    allowedIPs: { type: [String], default: [] },
  },
  { timestamps: true }
);

// ============================================================================
// TENANT SUBSCRIPTION SCHEMA (Historical tracking)
// ============================================================================
const TenantSubscriptionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tenantSlug: { type: String, required: true, index: true },

    // Subscription details
    planName: { type: String, required: true },
    planTier: { type: String, enum: ['free', 'plan1', 'plan2', 'plan3', 'plan4'], required: true },
    price: { type: Number, required: true }, // In USD or local currency
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },

    // Period
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },

    // Status
    status: { type: String, enum: ['active', 'expired', 'cancelled', 'upgraded', 'downgraded'], default: 'active' },

    // Payment reference
    paymentMethodId: { type: String, sparse: true },
    invoiceId: { type: String, sparse: true, unique: true },

    // Included features
    features: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Notes
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// ============================================================================
// TENANT USAGE ANALYTICS SCHEMA
// ============================================================================
const TenantUsageAnalyticsSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tenantSlug: { type: String, required: true, index: true },

    // Time period
    date: { type: Date, default: Date.now, index: true },
    year: { type: Number, index: true },
    month: { type: Number, index: true },
    day: { type: Number },

    // Daily metrics
    leadsCreated: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    callsPlaced: { type: Number, default: 0 },
    logins: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },

    // Costs (for analytics)
    estimatedCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTenant() {
  const key = 'Tenant';
  if (!global._tenantModelCache[key]) {
    global._tenantModelCache[key] = getMainDb().model(key, TenantSchema);
  }
  return global._tenantModelCache[key];
}

export function getTenantAPIKey() {
  const key = 'TenantAPIKey';
  if (!global._tenantModelCache[key]) {
    global._tenantModelCache[key] = getMainDb().model(key, TenantAPIKeySchema);
  }
  return global._tenantModelCache[key];
}

export function getTenantSubscription() {
  const key = 'TenantSubscription';
  if (!global._tenantModelCache[key]) {
    global._tenantModelCache[key] = getMainDb().model(key, TenantSubscriptionSchema);
  }
  return global._tenantModelCache[key];
}

export function getTenantUsageAnalytics() {
  const key = 'TenantUsageAnalytics';
  if (!global._tenantModelCache[key]) {
    global._tenantModelCache[key] = getMainDb().model(key, TenantUsageAnalyticsSchema);
  }
  return global._tenantModelCache[key];
}

// ============================================================================
// SUBSCRIPTION TIER DEFINITIONS
// ============================================================================

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      maxLeads: 250,
      maxUsers: 1,
      storageQuotaMB: 10,
    },
    enabledModules: {
      leads: true,
      whatsapp: false,
      aiCalls: false,
      broadcasting: false,
      reports: false,
      community: false,
      templates: false,
      callRecording: false,
    },
  },
  plan1: {
    name: 'Plan 1',
    price: 99,
    limits: {
      maxLeads: 500,
      maxUsers: 2,
      storageQuotaMB: 100,
    },
    enabledModules: {
      leads: true,
      whatsapp: true,
      aiCalls: false,
      broadcasting: true,
      reports: false,
      community: false,
      templates: false,
      callRecording: false,
    },
  },
  plan2: {
    name: 'Plan 2',
    price: 299,
    limits: {
      maxLeads: 2000,
      maxUsers: 3,
      storageQuotaMB: 500,
    },
    enabledModules: {
      leads: true,
      whatsapp: true,
      aiCalls: true,
      broadcasting: true,
      reports: true,
      community: false,
      templates: true,
      callRecording: false,
    },
  },
  plan3: {
    name: 'Plan 3',
    price: 799,
    limits: {
      maxLeads: 10000,
      maxUsers: 5,
      storageQuotaMB: 2000,
    },
    enabledModules: {
      leads: true,
      whatsapp: true,
      aiCalls: true,
      broadcasting: true,
      reports: true,
      community: true,
      templates: true,
      callRecording: false,
    },
  },
  plan4: {
    name: 'Plan 4',
    price: 1999,
    limits: {
      maxLeads: 100000,
      maxUsers: 10,
      storageQuotaMB: 10000,
    },
    enabledModules: {
      leads: true,
      whatsapp: true,
      aiCalls: true,
      broadcasting: true,
      reports: true,
      community: true,
      templates: true,
      callRecording: true,
    },
  },
};

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;
