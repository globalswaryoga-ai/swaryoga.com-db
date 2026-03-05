/**
 * Multi-Tenant SaaS — Barrel Export
 *
 * Import everything from `@/lib/tenant` instead of reaching into sub-modules.
 *
 * ```ts
 * import {
 *   PlanTier, TenantModule,
 *   getTenantDb, resolveTenant, getCurrentTenant,
 *   setTenantKey, getTenantKey,
 * } from '@/lib/tenant';
 * ```
 */

// Types
export {
  PlanTier,
  TenantModule,
  type PlanLimits,
  type PlanDefinition,
  type ITenant,
  type ITenantApiKey,
  type ITenantUsage,
  type TenantContext,
  type CreateTenantRequest,
} from './types';

// Plan configuration
export {
  PLAN_DEFINITIONS,
  getPlanDefinition,
  resolveEffectiveLimits,
  resolveEnabledModules,
  isModuleEnabled,
} from './plans';

// Database schemas (master registry)
export {
  getTenantModel,
  getTenantApiKeyModel,
  getTenantUsageModel,
} from './tenantSchemas';

// Per-tenant database manager
export {
  MASTER_TENANT_SLUG,
  tenantDbName,
  getTenantDb,
  getTenantModel as getTenantDbModel,
  provisionTenantDb,
  dropTenantDb,
  getMasterCrmDb,
} from './tenantDb';

// Tenant resolver
export {
  TENANT_HEADER,
  TENANT_RESPONSE_HEADER,
  extractTenantSlug,
  resolveTenant,
  resolveTenantDb,
} from './tenantResolver';

// Request-scoped context
export {
  getCurrentTenant,
  tryGetCurrentTenant,
  withTenantContext,
  runAsTenant,
} from './tenantContext';

// API key vault
export {
  setTenantKey,
  getTenantKey,
  deleteTenantKey,
  listTenantKeyNames,
  getTenantKeys,
} from './apiKeyVault';
