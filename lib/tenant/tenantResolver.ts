/**
 * Multi-Tenant SaaS — Tenant Resolver
 *
 * Determines which tenant a request belongs to, using (in priority order):
 *   1. `x-tenant-id` header  (explicit, used by API clients & internal calls)
 *   2. Subdomain extraction  (e.g. acme.app.swaryoga.com → "acme")
 *   3. Custom domain lookup  (e.g. crm.acme-yoga.com → tenant with that customDomain)
 *   4. JWT token payload      (decoded.tenantId from auth token)
 *   5. Fallback to master     (original Swar Yoga instance)
 *
 * This module works in **both** Edge Middleware (lightweight, header-based)
 * and Node.js API routes (full DB lookup).
 */

import type { ITenant, TenantContext } from './types';
import { resolveEffectiveLimits, resolveEnabledModules } from './plans';
import { getTenantDb, tenantDbName } from './tenantDb';
import { getTenantModel } from './tenantSchemas';
import { MASTER_TENANT_SLUG } from './tenantDb';

// ---------------------------------------------------------------------------
// Header constants
// ---------------------------------------------------------------------------

/** Request header set by middleware or API client to identify the tenant. */
export const TENANT_HEADER = 'x-tenant-id';
/** Response header echoed back for client debugging.  */
export const TENANT_RESPONSE_HEADER = 'x-tenant-slug';

// ---------------------------------------------------------------------------
// App domain config
// ---------------------------------------------------------------------------

/** Base app domain — subdomains are `{slug}.{APP_DOMAIN}` */
const APP_DOMAIN = process.env.TENANT_APP_DOMAIN || 'app.swaryoga.com';

// ---------------------------------------------------------------------------
// Slug extraction (Edge-safe — no DB)
// ---------------------------------------------------------------------------

/**
 * Extract a tenant slug from request metadata **without** a database call.
 * Suitable for Edge Middleware where DB access is unavailable.
 *
 * Returns `null` if no tenant signal is present (will fall back to master).
 */
export function extractTenantSlug(headers: {
  get(name: string): string | null;
}, hostname?: string): string | null {
  // 1. Explicit header
  const headerSlug = headers.get(TENANT_HEADER);
  if (headerSlug) return headerSlug.trim().toLowerCase();

  // 2. Subdomain extraction
  if (hostname) {
    const lowerHost = hostname.toLowerCase();
    // e.g. "acme.app.swaryoga.com" → "acme"
    if (lowerHost.endsWith(`.${APP_DOMAIN}`)) {
      const sub = lowerHost.slice(0, -(APP_DOMAIN.length + 1));
      if (sub && sub !== 'www') return sub;
    }
  }

  // 3. Custom domain — cannot resolve without DB, return hostname as hint
  //    The full resolver (below) handles DB lookup.

  return null;
}

// ---------------------------------------------------------------------------
// Full resolution (Node.js — with DB)
// ---------------------------------------------------------------------------

/**
 * Fully resolve a tenant from a request, including DB lookup for custom domains.
 *
 * Call this from API route handlers (after `await connectDB()`).
 *
 * @param headers — request headers (or a plain object)
 * @param hostname — request hostname (e.g. from `request.nextUrl.hostname`)
 * @param tokenTenantId — optional tenant ID from decoded JWT
 *
 * @returns TenantContext or `null` if tenant not found / suspended.
 */
export async function resolveTenant(
  headers: { get(name: string): string | null },
  hostname?: string,
  tokenTenantId?: string,
): Promise<TenantContext | null> {
  const Tenant = getTenantModel();

  // Try lightweight extraction first
  let slug = extractTenantSlug(headers, hostname);

  // 4. Fall back to JWT tenantId
  if (!slug && tokenTenantId) {
    slug = tokenTenantId;
  }

  let tenant: ITenant | null = null;

  if (slug) {
    tenant = await Tenant.findOne({ slug, status: 'active' }).lean() as ITenant | null;
  }

  // 3. If still unresolved, try custom domain lookup
  if (!tenant && hostname) {
    const lowerHost = hostname.toLowerCase();
    // Skip if hostname is our own app domain
    if (!lowerHost.endsWith(APP_DOMAIN) && !lowerHost.includes('localhost')) {
      tenant = await Tenant.findOne({
        customDomain: lowerHost,
        customDomainVerified: true,
        status: 'active',
      }).lean() as ITenant | null;
    }
  }

  // 5. Fall back to master tenant
  if (!tenant) {
    tenant = await Tenant.findOne({
      slug: MASTER_TENANT_SLUG,
      status: 'active',
    }).lean() as ITenant | null;

    // If master tenant doesn't exist yet (pre-migration), create a synthetic context
    if (!tenant) {
      return createMasterFallbackContext();
    }
  }

  return buildTenantContext(tenant);
}

// ---------------------------------------------------------------------------
// Context builders
// ---------------------------------------------------------------------------

function buildTenantContext(tenant: ITenant): TenantContext {
  return {
    tenantId: tenant.slug,
    tenant,
    limits: resolveEffectiveLimits(tenant.plan, tenant.customLimits),
    modules: resolveEnabledModules(tenant.plan, tenant.enabledModules),
    dbName: tenant.dbName,
  };
}

/**
 * Pre-migration fallback: before the master tenant is seeded in the DB,
 * return a context that maps to the existing `swaryoga_admin_crm` database
 * with Enterprise-level access (i.e. all modules, high limits).
 */
function createMasterFallbackContext(): TenantContext {
  const { PlanTier } = require('./types');
  return {
    tenantId: MASTER_TENANT_SLUG,
    tenant: {
      slug: MASTER_TENANT_SLUG,
      name: 'Swar Yoga',
      ownerEmail: 'admin@swaryoga.com',
      ownerUserId: 'admincrm',
      plan: PlanTier.ENTERPRISE,
      enabledModules: [],
      dbName: tenantDbName(MASTER_TENANT_SLUG),
      status: 'active',
    },
    limits: resolveEffectiveLimits(PlanTier.ENTERPRISE),
    modules: resolveEnabledModules(PlanTier.ENTERPRISE),
    dbName: tenantDbName(MASTER_TENANT_SLUG),
  };
}

// ---------------------------------------------------------------------------
// Quick tenant-aware DB helper
// ---------------------------------------------------------------------------

/**
 * Shortcut: resolve tenant and return its mongoose Connection in one call.
 *
 * ```ts
 * const { ctx, db } = await resolveTenantDb(request.headers, request.nextUrl.hostname);
 * const Lead = db.model('Lead', LeadSchema);
 * ```
 */
export async function resolveTenantDb(
  headers: { get(name: string): string | null },
  hostname?: string,
  tokenTenantId?: string,
) {
  const ctx = await resolveTenant(headers, hostname, tokenTenantId);
  if (!ctx) return null;
  const db = getTenantDb(ctx.tenantId);
  return { ctx, db };
}
