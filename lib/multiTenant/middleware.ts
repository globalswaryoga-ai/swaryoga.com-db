/**
 * Multi-Tenant Middleware & Utilities
 * Handles tenant context, validation, and request routing
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getTenant, getTenantAPIKey, SUBSCRIPTION_TIERS } from './schemas';
import crypto from 'crypto';

// ============================================================================
// TENANT CONTEXT (Extracted from request)
// ============================================================================

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  organizationName: string;
  subscriptionTier: keyof typeof SUBSCRIPTION_TIERS;
  subscriptionStatus: 'active' | 'trial' | 'suspended' | 'cancelled';
  isAdmin: boolean;
  userId: string;
  enabledModules: Record<string, boolean>;
  limits: {
    maxLeads: number;
    maxUsers: number;
    storageQuotaMB: number;
  };
}

// ============================================================================
// EXTRACT TENANT FROM REQUEST
// ============================================================================

/**
 * Extract tenant slug from request
 * Priority: custom domain header > subdomain > query param > path param
 */
export async function extractTenantSlug(request: NextRequest): Promise<string | null> {
  // Check custom domain header (set by reverse proxy)
  const customDomainHeader = request.headers.get('x-tenant-slug');
  if (customDomainHeader) {
    return customDomainHeader.toLowerCase().trim();
  }

  // Check query parameter
  const { searchParams } = new URL(request.url);
  const queryParam = searchParams.get('tenant');
  if (queryParam) {
    return queryParam.toLowerCase().trim();
  }

  // Check subdomain (e.g., my-studio.app.swaryoga.com)
  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'app' && subdomain !== 'www') {
    return subdomain.toLowerCase();
  }

  return null;
}

/**
 * Load tenant from database
 */
async function loadTenant(tenantSlug: string) {
  await connectDB();
  const TenantModel = getTenant();
  const tenant = await TenantModel.findOne({
    tenantSlug: tenantSlug.toLowerCase(),
    isActive: true,
  }).lean();

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  if (tenant.subscriptionStatus === 'suspended') {
    throw new Error('This tenant account has been suspended');
  }

  return tenant;
}

/**
 * Build tenant context for use in request handlers
 */
export async function buildTenantContext(
  request: NextRequest,
  userId?: string
): Promise<TenantContext> {
  const tenantSlug = await extractTenantSlug(request);
  if (!tenantSlug) {
    throw new Error('No tenant identified in request');
  }

  const tenant = await loadTenant(tenantSlug);

  return {
    tenantId: tenant._id.toString(),
    tenantSlug: tenant.tenantSlug,
    organizationName: tenant.organizationName,
    subscriptionTier: tenant.subscriptionTier,
    subscriptionStatus: tenant.subscriptionStatus,
    isAdmin: userId === tenant.adminUserId,
    userId: userId || '',
    enabledModules: tenant.enabledModules,
    limits: tenant.limits,
  };
}

// ============================================================================
// API KEY AUTHENTICATION
// ============================================================================

/**
 * Hash API key for secure comparison
 */
export function hashAPIKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
}

/**
 * Verify API key and return tenant context
 */
export async function verifyAPIKey(keyHeader: string): Promise<TenantContext> {
  if (!keyHeader) {
    throw new Error('API key is required');
  }

  const plainKey = keyHeader.replace(/^Bearer\s+/i, '').trim();
  const keyHash = hashAPIKey(plainKey);

  await connectDB();
  const APIKeyModel = getTenantAPIKey();
  const apiKey = await APIKeyModel.findOne({
    keyHash,
    isActive: true,
    revokedAt: { $exists: false },
  })
    .lean()
    .exec();

  if (!apiKey) {
    throw new Error('Invalid or expired API key');
  }

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw new Error('API key has expired');
  }

  // Check IP whitelist
  if (apiKey.allowedIPs && apiKey.allowedIPs.length > 0) {
    const clientIP = ''; // Would be extracted from request in real implementation
    if (!apiKey.allowedIPs.includes(clientIP)) {
      throw new Error('IP address not whitelisted for this API key');
    }
  }

  // Load tenant
  const tenant = await loadTenant(apiKey.tenantSlug);

  // Update last used timestamp
  await APIKeyModel.updateOne(
    { _id: apiKey._id },
    {
      lastUsedAt: new Date(),
      $inc: { callCount: 1 },
    }
  );

  return {
    tenantId: tenant._id.toString(),
    tenantSlug: tenant.tenantSlug,
    organizationName: tenant.organizationName,
    subscriptionTier: tenant.subscriptionTier,
    subscriptionStatus: tenant.subscriptionStatus,
    isAdmin: false, // API keys are never admin by default
    userId: apiKey._id.toString(),
    enabledModules: tenant.enabledModules,
    limits: tenant.limits,
  };
}

// ============================================================================
// MODULE GATING
// ============================================================================

/**
 * Check if a module is enabled for tenant
 */
export function isModuleEnabled(
  tenantContext: TenantContext,
  moduleName: keyof typeof SUBSCRIPTION_TIERS['free']['enabledModules']
): boolean {
  return tenantContext.enabledModules[moduleName] === true;
}

/**
 * Enforce module access
 */
export function enforceModule(
  tenantContext: TenantContext,
  moduleName: string
): void {
  if (!isModuleEnabled(tenantContext, moduleName as any)) {
    throw new Error(
      `Module '${moduleName}' is not available in ${tenantContext.subscriptionTier} plan`
    );
  }
}

// ============================================================================
// USAGE LIMITS ENFORCEMENT
// ============================================================================

/**
 * Check if usage is within limits
 */
export async function checkUsageLimit(
  tenantId: string,
  resourceType: 'leads' | 'users' | 'storage',
  currentCount: number
): Promise<boolean> {
  await connectDB();
  const TenantModel = getTenant();
  const tenant = await TenantModel.findById(tenantId).lean();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const limits = tenant.limits;
  const usage = tenant.usage;

  switch (resourceType) {
    case 'leads':
      return usage.leadsCount < limits.maxLeads;
    case 'users':
      return usage.teamMembersCount < limits.maxUsers;
    case 'storage':
      return usage.storageUsedMB < limits.storageQuotaMB;
    default:
      return true;
  }
}

/**
 * Increment usage counter
 */
export async function recordUsage(
  tenantId: string,
  metric: 'leadsCount' | 'messagesCount' | 'callsCount' | 'storageUsedMB',
  amount: number = 1
): Promise<void> {
  await connectDB();
  const TenantModel = getTenant();

  await TenantModel.findByIdAndUpdate(
    tenantId,
    {
      $inc: { [`usage.${metric}`]: amount },
    },
    { new: true }
  );
}

// ============================================================================
// TENANT ISOLATION HELPERS
// ============================================================================

/**
 * Build MongoDB filter for tenant data isolation
 */
export function buildTenantFilter(tenantId: string): Record<string, any> {
  return { tenantId };
}

/**
 * Build MongoDB filter that combines tenant + user access
 */
export function buildUserAccessFilter(
  tenantId: string,
  userId: string,
  isAdmin: boolean
): Record<string, any> {
  const baseFilter = { tenantId };

  if (isAdmin) {
    return baseFilter; // Admins see all tenant data
  }

  return {
    ...baseFilter,
    $or: [
      { assignedToUserId: userId },
      { createdByUserId: userId },
      { sharedWith: userId },
    ],
  };
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export function tenantError(message: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: `TENANT_ERROR_${status}`,
    },
    { status }
  );
}

export function tenantSuccess(data: any, message: string = 'Success', status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Wrap API handler to extract and validate tenant
 */
export function withTenantContext(handler: any) {
  return async (request: NextRequest) => {
    try {
      const tenantContext = await buildTenantContext(request);
      // Store in request for use in handler
      (request as any).tenantContext = tenantContext;
      return handler(request);
    } catch (error: any) {
      console.error('[Tenant Middleware]', error.message);
      return tenantError(error.message, 401);
    }
  };
}

/**
 * Wrap API handler to validate API key
 */
export function withAPIKeyAuth(handler: any) {
  return async (request: NextRequest) => {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return tenantError('Authorization header is required', 401);
      }

      const tenantContext = await verifyAPIKey(authHeader);
      (request as any).tenantContext = tenantContext;
      return handler(request);
    } catch (error: any) {
      console.error('[API Key Auth]', error.message);
      return tenantError(error.message, 401);
    }
  };
}
