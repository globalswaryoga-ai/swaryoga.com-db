/**
 * Tally Multi-Tenant Access Control
 *
 * ownerId = the account-holder admin who owns the Tally data.
 *
 * Hierarchy:
 *  - Super Admin (userId=admin/admincrm, role=superadmin) → sees ALL data (ownerId filter omitted)
 *  - Admin (account holder, e.g. crm user with isAdmin=true) → ownerId = their userId
 *  - Sub-user (admin user created under an account holder) → ownerId = their parent admin's userId
 *
 * Every Tally DB query is scoped by ownerId so one admin's data is invisible to another.
 */

import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

/**
 * Resolve the Tally ownerId from a decoded JWT token.
 *
 * - Super admin: returns null (no filter → sees all data)
 * - Account holder admin: returns their own userId
 * - Sub-user with parentAdminId: returns their parentAdminId
 *
 * When the result is null, the caller should NOT add an ownerId filter.
 * When a string is returned, ALL queries must filter by that ownerId.
 */
export function resolveTallyOwnerId(decoded: any): string | undefined {
  if (isSuperAdmin(decoded)) return undefined; // super admin sees everything

  // Sub-user created under an account holder
  if (decoded?.parentAdminId) {
    return String(decoded.parentAdminId).trim();
  }

  // Account holder admin — scope to their own userId
  return getViewerUserId(decoded);
}

/**
 * Get the ownerId to stamp on newly created Tally records.
 * Unlike resolveTallyOwnerId() which returns null for super-admin reads,
 * this ALWAYS returns a concrete ownerId string for writes.
 *
 * - Super admin → 'admin' (canonical super-admin ownerId)
 * - Account holder → their userId
 * - Sub-user → their parentAdminId
 */
export function getTallyOwnerIdForWrite(decoded: any): string {
  if (decoded?.parentAdminId) {
    return String(decoded.parentAdminId).trim();
  }

  const userId = getViewerUserId(decoded);

  // Super admin writes under the canonical 'admin' ownerId
  if (isSuperAdmin(decoded)) return userId || 'admin';

  return userId;
}

/**
 * Utility: add ownerId to a MongoDB query object (mutates in place).
 * If ownerId is null (super admin), the query is untouched.
 */
export function scopeQuery<T extends Record<string, any>>(query: T, ownerId: string | null | undefined): T {
  if (ownerId) {
    (query as any).ownerId = ownerId;
  }
  return query;
}
