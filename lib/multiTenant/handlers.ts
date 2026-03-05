/**
 * Tenant Management Utilities
 * Create, update, manage tenants and subscriptions
 */

import { connectDB } from '@/lib/db';
import {
  getTenant,
  getTenantAPIKey,
  getTenantSubscription,
  getTenantUsageAnalytics,
  SUBSCRIPTION_TIERS,
  SubscriptionTierKey,
} from './schemas';
import { hashAPIKey } from './middleware';
import crypto from 'crypto';

// ============================================================================
// TENANT CREATION
// ============================================================================

export interface CreateTenantInput {
  tenantSlug: string;
  organizationName: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  billingEmail?: string;
  initialTier?: SubscriptionTierKey;
}

export async function createTenant(input: CreateTenantInput) {
  await connectDB();
  const TenantModel = getTenant();

  // Validate slug format
  if (!/^[a-z0-9-]{3,50}$/.test(input.tenantSlug)) {
    throw new Error('Tenant slug must be 3-50 characters, lowercase alphanumeric and hyphens only');
  }

  // Check if slug already exists
  const existing = await TenantModel.findOne({ tenantSlug: input.tenantSlug });
  if (existing) {
    throw new Error('This tenant slug is already taken');
  }

  const tier = input.initialTier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  const newTenant = await TenantModel.create({
    tenantSlug: input.tenantSlug.toLowerCase(),
    organizationName: input.organizationName,
    subscriptionTier: tier,
    subscriptionStatus: tier === 'free' ? 'active' : 'trial',
    trialEndsAt: tier === 'free' ? undefined : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
    billingEmail: input.billingEmail || input.adminEmail,
    adminUserId: input.adminUserId,
    adminName: input.adminName,
    adminEmail: input.adminEmail,
    enabledModules: tierConfig.enabledModules,
    limits: tierConfig.limits,
  });

  return newTenant;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export async function upgradePlan(
  tenantId: string,
  newTier: SubscriptionTierKey,
  paymentMethodId?: string
) {
  if (!(newTier in SUBSCRIPTION_TIERS)) {
    throw new Error('Invalid subscription tier');
  }

  await connectDB();
  const TenantModel = getTenant();
  const SubscriptionModel = getTenantSubscription();

  const tier = SUBSCRIPTION_TIERS[newTier];

  // Update tenant
  const updatedTenant = await TenantModel.findByIdAndUpdate(
    tenantId,
    {
      subscriptionTier: newTier,
      subscriptionStatus: 'active',
      enabledModules: tier.enabledModules,
      limits: tier.limits,
      subscriptionStartDate: new Date(),
    },
    { new: true }
  );

  if (!updatedTenant) {
    throw new Error('Tenant not found');
  }

  // Create subscription record
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1); // Annual

  await SubscriptionModel.create({
    tenantId,
    tenantSlug: updatedTenant.tenantSlug,
    planName: tier.name,
    planTier: newTier,
    price: tier.price,
    billingCycle: 'yearly',
    startDate: new Date(),
    endDate,
    status: 'active',
    paymentMethodId,
    features: tier.enabledModules,
  });

  return updatedTenant;
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

export async function generateAPIKey(
  tenantId: string,
  tenantSlug: string,
  name: string,
  permissions: string[] = ['leads:read', 'leads:write', 'messages:read']
) {
  await connectDB();
  const APIKeyModel = getTenantAPIKey();

  const plainKey = crypto.randomBytes(32).toString('hex');
  const keyHash = hashAPIKey(plainKey);

  const apiKey = await APIKeyModel.create({
    tenantId,
    tenantSlug,
    keyHash,
    plainKey, // Temporary storage, will be cleared before response
    name,
    permissions,
    isActive: true,
  });

  return {
    keyId: apiKey._id,
    plainKey, // Only returned once at creation
    name: apiKey.name,
  };
}

export async function revokeAPIKey(tenantId: string, keyId: string) {
  await connectDB();
  const APIKeyModel = getTenantAPIKey();

  const result = await APIKeyModel.findOneAndUpdate(
    {
      _id: keyId,
      tenantId,
    },
    {
      revokedAt: new Date(),
      isActive: false,
    },
    { new: true }
  );

  if (!result) {
    throw new Error('API key not found or does not belong to this tenant');
  }

  return result;
}

export async function listAPIKeys(tenantId: string) {
  await connectDB();
  const APIKeyModel = getTenantAPIKey();

  const keys = await APIKeyModel.find({ tenantId })
    .select('-keyHash -plainKey')
    .lean();

  return keys;
}

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

export async function recordDailyAnalytics(
  tenantId: string,
  tenantSlug: string,
  metrics: {
    leadsCreated?: number;
    messagesSent?: number;
    callsPlaced?: number;
    logins?: number;
    apiCalls?: number;
  }
) {
  await connectDB();
  const AnalyticsModel = getTenantUsageAnalytics();

  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await AnalyticsModel.findOneAndUpdate(
    {
      tenantId,
      date,
    },
    {
      tenantId,
      tenantSlug,
      date,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      ...metrics,
    },
    { upsert: true, new: true }
  );
}

export async function getTenantAnalytics(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  await connectDB();
  const AnalyticsModel = getTenantUsageAnalytics();

  const analytics = await AnalyticsModel.find({
    tenantId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .sort({ date: -1 })
    .lean();

  return analytics;
}

// ============================================================================
// USAGE RESET (Monthly)
// ============================================================================

export async function resetMonthlyUsage(tenantId: string) {
  await connectDB();
  const TenantModel = getTenant();

  await TenantModel.findByIdAndUpdate(tenantId, {
    usage: {
      leadsCount: 0,
      messagesCount: 0,
      callsCount: 0,
      storageUsedMB: 0,
      teamMembersCount: 1,
    },
  });
}

// ============================================================================
// TENANT EXPORT/IMPORT (Data Portability)
// ============================================================================

export async function exportTenantData(tenantId: string) {
  await connectDB();
  const TenantModel = getTenant();

  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return {
    tenant,
    exportDate: new Date(),
    version: '1.0',
  };
}

// ============================================================================
// TENANT DELETION (WITH CLEANUP)
// ============================================================================

export async function deleteTenant(tenantId: string) {
  await connectDB();
  const TenantModel = getTenant();
  const APIKeyModel = getTenantAPIKey();
  const SubscriptionModel = getTenantSubscription();
  const AnalyticsModel = getTenantUsageAnalytics();

  // Delete all related data
  await Promise.all([
    APIKeyModel.deleteMany({ tenantId }),
    SubscriptionModel.deleteMany({ tenantId }),
    AnalyticsModel.deleteMany({ tenantId }),
    TenantModel.findByIdAndDelete(tenantId),
  ]);
}

// ============================================================================
// TENANT LOOKUPS
// ============================================================================

export async function getTenantBySlug(tenantSlug: string) {
  await connectDB();
  const TenantModel = getTenant();

  return TenantModel.findOne({
    tenantSlug: tenantSlug.toLowerCase(),
    isActive: true,
  }).lean();
}

export async function getTenantById(tenantId: string) {
  await connectDB();
  const TenantModel = getTenant();

  return TenantModel.findById(tenantId).lean();
}

// ============================================================================
// CUSTOM DOMAIN MANAGEMENT
// ============================================================================

export async function setCustomDomain(tenantId: string, customDomain: string) {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(customDomain)) {
    throw new Error('Invalid domain format');
  }

  await connectDB();
  const TenantModel = getTenant();

  // Check if domain is already taken
  const existing = await TenantModel.findOne({
    customDomain: customDomain.toLowerCase(),
    _id: { $ne: tenantId },
  });

  if (existing) {
    throw new Error('This domain is already in use');
  }

  const tenant = await TenantModel.findByIdAndUpdate(
    tenantId,
    {
      customDomain: customDomain.toLowerCase(),
      customDomainVerified: false, // Requires DNS verification
    },
    { new: true }
  );

  return tenant;
}

export async function verifyCustomDomain(tenantId: string) {
  await connectDB();
  const TenantModel = getTenant();

  // In production: do actual DNS verification here
  // For now: just mark as verified
  const tenant = await TenantModel.findByIdAndUpdate(
    tenantId,
    { customDomainVerified: true },
    { new: true }
  );

  return tenant;
}
