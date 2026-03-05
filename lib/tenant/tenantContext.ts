/**
 * Multi-Tenant SaaS — Request-Scoped Tenant Context
 *
 * Uses Node.js `AsyncLocalStorage` to make the resolved TenantContext
 * available anywhere in the call stack without prop-drilling.
 *
 * Usage in API route handlers:
 *
 * ```ts
 * import { withTenantContext, getCurrentTenant } from '@/lib/tenant/tenantContext';
 *
 * export async function GET(request: NextRequest) {
 *   await connectDB();
 *   return withTenantContext(request, async (ctx) => {
 *     // ctx is the resolved TenantContext
 *     const Lead = getTenantModel(getTenantDb(ctx.tenantId), 'Lead', LeadSchema);
 *     const leads = await Lead.find().limit(10);
 *     return apiSuccess(leads);
 *   });
 * }
 * ```
 *
 * Or retrieve the context from deeper in the call stack:
 *
 * ```ts
 * function someHelper() {
 *   const ctx = getCurrentTenant(); // throws if called outside withTenantContext
 * }
 * ```
 */

import { AsyncLocalStorage } from 'async_hooks';
import type { NextRequest } from 'next/server';
import type { TenantContext } from './types';
import { resolveTenant, TENANT_HEADER } from './tenantResolver';
import { verifyToken } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const tenantStorage = new AsyncLocalStorage<TenantContext>();

// ---------------------------------------------------------------------------
// Context accessors
// ---------------------------------------------------------------------------

/**
 * Get the current request's TenantContext.
 * Throws if called outside of `withTenantContext`.
 */
export function getCurrentTenant(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error(
      '[tenantContext] getCurrentTenant() called outside withTenantContext(). ' +
      'Wrap your API handler with withTenantContext() first.',
    );
  }
  return ctx;
}

/**
 * Get the current request's TenantContext, or `null` if not in a tenant scope.
 * Use this for code paths that may or may not be tenant-aware.
 */
export function tryGetCurrentTenant(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

/**
 * Execute an async callback within a resolved TenantContext.
 *
 * This function:
 *   1. Extracts tenant signal from the request (header / hostname / JWT).
 *   2. Resolves the full tenant from the database.
 *   3. Runs the callback with the context stored in AsyncLocalStorage.
 *
 * @param request — Next.js request object
 * @param callback — the handler body that receives the TenantContext
 * @returns The return value of `callback`
 */
export async function withTenantContext<T>(
  request: NextRequest,
  callback: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  // Extract optional tenantId from JWT
  const authHeader = request.headers.get('authorization');
  const decoded = authHeader ? verifyToken(authHeader) : null;
  const tokenTenantId = (decoded as any)?.tenantId as string | undefined;

  const ctx = await resolveTenant(
    request.headers,
    request.nextUrl?.hostname,
    tokenTenantId,
  );

  if (!ctx) {
    throw new Error('[tenantContext] Could not resolve tenant for this request.');
  }

  return tenantStorage.run(ctx, () => callback(ctx));
}

/**
 * Manually run a callback in a specific tenant context.
 * Useful for background jobs, cron tasks, or scripts.
 */
export async function runAsTenant<T>(
  ctx: TenantContext,
  callback: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  return tenantStorage.run(ctx, () => callback(ctx));
}
