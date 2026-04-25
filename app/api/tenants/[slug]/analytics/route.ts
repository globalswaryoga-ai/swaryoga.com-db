/**
 * Tenant Analytics Routes
 * GET /api/tenants/:slug/analytics - Get usage analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getTenantBySlug, getTenantAnalytics } from '@/lib/multiTenant/handlers';
import { tenantError, tenantSuccess } from '@/lib/multiTenant/middleware';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Parse optional date range
    const startDateStr = request.nextUrl.searchParams.get('startDate');
    const endDateStr = request.nextUrl.searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days default
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    await connectDB();

    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Authorization required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const tenant = await getTenantBySlug(slug) as any;
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    const isAdmin =
      isSuperAdmin(decoded) || decoded?.userId === tenant.adminUserId?.toString();
    if (!isAdmin) {
      return tenantError('Unauthorized', 403);
    }

    // Get analytics for this tenant
    const analytics = await getTenantAnalytics(
      tenant._id?.toString(),
      startDate,
      endDate
    );

    // Aggregate totals
    const totals = {
      leadsCreated: 0,
      messagesSent: 0,
      callsPlaced: 0,
      logins: 0,
      apiCalls: 0,
    };

    analytics.forEach((day) => {
      totals.leadsCreated += day.leadsCreated || 0;
      totals.messagesSent += day.messagesSent || 0;
      totals.callsPlaced += day.callsPlaced || 0;
      totals.logins += day.logins || 0;
      totals.apiCalls += day.apiCalls || 0;
    });

    return tenantSuccess({
      tenantSlug: slug,
      period: {
        startDate,
        endDate,
      },
      totals,
      dailyMetrics: analytics,
      currentUsage: {
        leadsCount: tenant.usage?.leadsCount || 0,
        messagesCount: tenant.usage?.messagesCount || 0,
        callsCount: tenant.usage?.callsCount || 0,
        storageUsedMB: tenant.usage?.storageUsedMB || 0,
        teamMembersCount: tenant.usage?.teamMembersCount || 1,
      },
      limits: tenant.limits,
    });
  } catch (error: any) {
    console.error('[GET /api/tenants/:slug/analytics] Error:', error);
    return tenantError(error.message || 'Failed to fetch analytics', 400);
  }
}
