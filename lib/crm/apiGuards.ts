/**
 * API Route Guards for Plan & Tenant Isolation
 *
 * Middleware functions for Next.js API routes to enforce:
 * 1. Plan-based feature access
 * 2. Tenant data isolation
 * 3. Lead source restrictions
 * 4. Cross-tenant prevention
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { canAccessMeta, validateLeadSourceForPlan } from './planGuards';
import { getTenantFilter, getTenantSourceFilter } from './tenantIsolation';
import type { PlanTier } from './planConfig';

interface ApiGuardContext {
  decoded: any;
  tenantId: string;
  plan: PlanTier;
  isSuperAdmin: boolean;
}

/**
 * Get API guard context from request
 */
export function getApiGuardContext(request: NextRequest): ApiGuardContext | null {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId && !decoded?.isAdmin) {
      return null;
    }

    const tenantId = getViewerUserId(decoded);
    if (!tenantId) {
      return null;
    }

    const plan = (decoded?.plan || 'free') as PlanTier;
    const superAdmin = isSuperAdmin(decoded);

    return {
      decoded,
      tenantId,
      plan,
      isSuperAdmin: superAdmin,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user can access Meta features
 * Returns error response if not allowed
 */
export function checkMetaAccess(context: ApiGuardContext): NextResponse | null {
  if (!canAccessMeta(context.plan)) {
    return NextResponse.json(
      {
        error: 'Unauthorized: Meta WhatsApp not available in your plan',
        message: `Meta access requires Copper plan or higher. Your plan: ${context.plan}`,
        code: 'PLAN_RESTRICTION',
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Check if user can access a specific lead source
 * Returns error response if not allowed
 */
export function checkLeadSourceAccess(
  context: ApiGuardContext,
  source: 'qr' | 'meta' | 'upload'
): NextResponse | null {
  const validation = validateLeadSourceForPlan(context.plan, source);

  if (!validation.allowed) {
    return NextResponse.json(
      {
        error: 'Unauthorized: Lead source not available in your plan',
        message: validation.message,
        code: 'PLAN_RESTRICTION',
        source,
        plan: context.plan,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Verify request is from authorized tenant
 * Prevents cross-tenant data access
 */
export function checkTenantAuthorization(
  context: ApiGuardContext,
  recordTenantId: string
): NextResponse | null {
  // Super admin can access all tenants
  if (context.isSuperAdmin) {
    return null;
  }

  // Regular tenant can only access their own data
  if (context.tenantId !== recordTenantId) {
    return NextResponse.json(
      {
        error: 'Forbidden: Cannot access other tenant data',
        code: 'TENANT_ISOLATION_VIOLATION',
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Verify request is for correct lead source
 * Prevents mixing of QR/Meta/Upload leads
 */
export function checkLeadSourceMatch(
  context: ApiGuardContext,
  leadSource: string,
  requestedSource: 'qr' | 'meta' | 'upload'
): NextResponse | null {
  if (leadSource !== requestedSource) {
    return NextResponse.json(
      {
        error: 'Bad Request: Lead source mismatch',
        code: 'SOURCE_MISMATCH',
        leadSource,
        requestedSource,
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Get database filter for user's plan and tenant
 * Combines plan restrictions + tenant isolation
 */
export function getLeadFilter(
  context: ApiGuardContext,
  source?: 'qr' | 'meta' | 'upload'
): Record<string, any> {
  const baseFilter = getTenantSourceFilter(context.decoded, source);

  // Add plan-based restrictions
  if (!context.isSuperAdmin && source === 'meta' && !canAccessMeta(context.plan)) {
    // If user doesn't have Meta access, exclude Meta leads
    return {
      ...baseFilter,
      source: { $in: ['qr', 'upload'] },
    };
  }

  return baseFilter;
}

/**
 * Get available funnel stages based on lead source
 */
export function getAvailableFunnelStages(source: 'qr' | 'meta' | 'upload'): string[] {
  const stages: Record<string, string[]> = {
    qr: ['inquiry', 'interested', 'decision', 'enrolled', 'sale', 'receipt'],
    meta: ['lead', 'engagement', 'consideration', 'purchase', 'sale', 'receipt'],
    upload: ['prospect', 'contact', 'qualified', 'converted', 'sale', 'receipt'],
  };

  return stages[source] || [];
}

/**
 * Validate funnel stage for a source
 */
export function validateFunnelStage(source: 'qr' | 'meta' | 'upload', stage: string): boolean {
  const stages = getAvailableFunnelStages(source);
  return stages.includes(stage);
}
