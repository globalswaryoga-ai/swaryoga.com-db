/**
 * Multi-Tenant SaaS — MongoDB Schemas (Master Registry)
 *
 * These collections live in the **primary** database (swaryogaDB) because they
 * are the single source of truth used to locate and route to per-tenant DBs.
 *
 * Collections:
 *   tenants           – Master tenant registry
 *   tenant_api_keys   – Encrypted per-tenant secrets vault
 *   tenant_usage      – Daily usage snapshots (for limit enforcement & billing)
 */

import mongoose from 'mongoose';
import type { ITenant, ITenantApiKey, ITenantUsage } from './types';
import { PlanTier, TenantModule } from './types';

// ---------------------------------------------------------------------------
// Global model cache (survives Next.js hot reloads in dev)
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var _tenantModelCache: Record<string, any>;
}

if (!global._tenantModelCache) {
  global._tenantModelCache = {};
}

/**
 * Lazily register a model on the *main* mongoose connection (swaryogaDB).
 * This mirrors the pattern used in enterpriseSchemas.ts but targets the
 * default connection instead of CRM useDb().
 */
function getMainModel<T>(name: string, schema: mongoose.Schema): mongoose.Model<T> {
  if (global._tenantModelCache[name]) {
    return global._tenantModelCache[name] as mongoose.Model<T>;
  }
  const model =
    mongoose.connection.models[name] ??
    mongoose.connection.model<T>(name, schema);
  global._tenantModelCache[name] = model;
  return model;
}

// ============================================================================
// 1. TENANT SCHEMA
// ============================================================================

const TenantSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/,  // 3-50 chars, URL-safe
    },
    name: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    ownerUserId: { type: String, required: true, trim: true },

    // Plan & billing
    plan: {
      type: String,
      enum: Object.values(PlanTier),
      default: PlanTier.FREE,
    },
    customLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    enabledModules: {
      type: [{ type: String, enum: Object.values(TenantModule) }],
      default: [],
    },

    // Granular module catalog keys (groups + sub-pages) — see moduleCatalog.ts.
    // This is the source of truth for which pages/bundles a tenant can access.
    moduleKeys: {
      type: [String],
      default: [],
    },

    // Per-tenant pricing & promo (overrides plan defaults when set)
    pricing: {
      monthlyPriceINR: { type: Number, default: null },   // null = use plan price
      storageIncludedMB: { type: Number, default: null },  // free storage allowance
      extraStoragePriceINR: { type: Number, default: 0 },  // price per extra block / month
      promoCode: { type: String, trim: true, default: '' },
      promoDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
      billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'half_yearly', 'annual'],
        default: 'monthly',
      },
    },

    // Database isolation
    dbName: { type: String, required: true, unique: true, trim: true },

    // Domain routing
    subdomain: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    customDomain: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    customDomainVerified: { type: Boolean, default: false },

    // Lifecycle
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending', 'archived'],
      default: 'pending',
    },
    subscriptionEndsAt: { type: Date },

    // Cached usage counters (updated by periodic jobs)
    currentLeadCount: { type: Number, default: 0 },
    currentUserCount: { type: Number, default: 0 },
    currentStorageMB: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'tenants',
  },
);

TenantSchema.index({ ownerEmail: 1 });
TenantSchema.index({ ownerUserId: 1 });
TenantSchema.index({ status: 1, plan: 1 });
TenantSchema.index({ customDomain: 1 }, { sparse: true });
TenantSchema.index({ subdomain: 1 }, { sparse: true });

// ============================================================================
// 2. TENANT API KEY SCHEMA (encrypted vault)
// ============================================================================

const TenantApiKeySchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    keyName: { type: String, required: true, trim: true },
    encryptedValue: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'tenant_api_keys',
  },
);

TenantApiKeySchema.index({ tenantId: 1, keyName: 1 }, { unique: true });

// ============================================================================
// 3. TENANT USAGE SCHEMA (daily snapshots)
// ============================================================================

const TenantUsageSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    date: { type: String, required: true },  // YYYY-MM-DD
    leadsCreated: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    broadcastsSent: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 },
    storageDeltaMB: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'tenant_usage',
  },
);

TenantUsageSchema.index({ tenantId: 1, date: -1 }, { unique: true });

// ============================================================================
// LAZY GETTER FUNCTIONS (call after connectDB())
// ============================================================================

export function getTenantModel() {
  return getMainModel<ITenant>('Tenant', TenantSchema);
}

export function getTenantApiKeyModel() {
  return getMainModel<ITenantApiKey>('TenantApiKey', TenantApiKeySchema);
}

export function getTenantUsageModel() {
  return getMainModel<ITenantUsage>('TenantUsage', TenantUsageSchema);
}

export { TenantSchema, TenantApiKeySchema, TenantUsageSchema };
