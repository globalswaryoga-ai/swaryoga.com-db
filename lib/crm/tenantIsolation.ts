/**
 * Tenant Isolation Layer for CRM
 *
 * This module ensures complete data separation between CRM tenants (independent admins).
 *
 * ISOLATION STRATEGY:
 * ==================
 * 1. Each CRM admin user (tenant) is identified by their unique userId
 * 2. All tenant data is stored with createdByUserId = tenantUserId
 * 3. Leads, messages, broadcasts, etc. belong ONLY to their creating tenant
 * 4. Super-admin (userId: 'admin'/'admincrm') can view all tenants' data with filters
 * 5. Regular admins ONLY see their own tenant's data - strict filtering enforced
 *
 * DATA ISOLATION:
 * ===============
 * - Admin Leads: Independent list, not visible to other admins
 * - Tenant Leads: Start at zero, grow from WhatsApp/manual adds
 * - WhatsApp Messages: Auto-create leads under tenant who owns the WhatsApp account
 * - Broadcasts: Only visible to creating tenant
 * - Reports: Show only tenant's own data
 *
 * IMPLEMENTATION:
 * ===============
 * - All API routes use getViewerUserId(decoded) to get current tenant userId
 * - All queries filter by: { createdByUserId: viewerUserId }
 * - WhatsApp webhook assigns leads to the tenant who configured that phone
 */

import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

/**
 * Tenant isolation filter for database queries
 * - Super admin: returns empty object (no filter - see all)
 * - Regular tenant: returns { createdByUserId: tenantId }
 */
export function getTenantFilter(decoded: any): Record<string, any> {
  if (isSuperAdmin(decoded)) {
    return {}; // Super admin sees all
  }
  const tenantId = getViewerUserId(decoded);
  if (!tenantId) {
    return { createdByUserId: '__never_match__' }; // Safety - match nothing if no tenant
  }
  return { createdByUserId: tenantId };
}

/**
 * Get tenant ID from request token
 * Returns null if unauthorized
 */
export function getTenantIdFromRequest(request: NextRequest): string | null {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) return null;
    return getViewerUserId(decoded);
  } catch {
    return null;
  }
}

/**
 * Ensure all tenant data (leads, messages, etc.) includes createdByUserId
 * Call this when creating new records to guarantee isolation
 */
export function enrichTenantData(tenantId: string, data: Record<string, any>): Record<string, any> {
  return {
    ...data,
    createdByUserId: tenantId, // Ensure tenant is recorded
    assignedToUserId: data.assignedToUserId || tenantId, // Default to creator if not assigned
  };
}

/**
 * Verify that a record belongs to the current tenant
 * Useful for permission checks before updating/deleting
 */
export function isTenantOwner(record: any, tenantId: string, superAdminAllowed = true): boolean {
  if (superAdminAllowed && tenantId === 'admin') return true; // Super admin bypass
  return record?.createdByUserId === tenantId || record?.assignedToUserId === tenantId;
}

/**
 * Build a multi-user access control filter for team scenarios
 * - Super admin: see all
 * - Manager: see team members' data
 * - Regular tenant: see own data only
 */
export function buildTenantAccessFilter(decoded: any): Record<string, any> {
  if (isSuperAdmin(decoded)) {
    return {}; // No filter
  }

  const tenantId = getViewerUserId(decoded);
  if (!tenantId) {
    return { createdByUserId: '__never_match__' };
  }

  return {
    $or: [
      { createdByUserId: tenantId },
      { assignedToUserId: tenantId },
    ],
  };
}

/**
 * Sample audit log entry for tenant actions
 * Use this to track who created/modified what in each tenant
 */
export interface TenantAuditLog {
  tenantId: string;
  action: 'create' | 'update' | 'delete' | 'view';
  model: 'Lead' | 'Message' | 'Broadcast' | 'Report' | 'Settings';
  recordId: string;
  timestamp: Date;
  changes?: Record<string, any>;
}
