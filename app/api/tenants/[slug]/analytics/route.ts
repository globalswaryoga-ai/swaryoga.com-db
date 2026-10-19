/**
 * Tenant Analytics Routes (Pure BunnyDB)
 * GET /api/tenants/:slug/analytics - Get usage analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/tenant/bunnyTenantRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

function tenantError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function tenantSuccess(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Authorization required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    const isAdmin =
      isSuperAdmin(decoded) ||
      decoded?.userId === tenant.ownerUserId ||
      decoded?.email?.toLowerCase() === tenant.ownerEmail?.toLowerCase();

    if (!isAdmin) {
      return tenantError('Unauthorized', 403);
    }

    const ownerId = String(tenant.ownerUserId || '');

    // Query live metrics from BunnyDB
    let leadsCount = Number(tenant.currentLeadCount || 0);
    try {
      const res = await bunnyExecute({
        sql: 'SELECT COUNT(*) as count FROM leads_sql WHERE tenant_slug = ? OR created_by_user_id = ?',
        args: [slug, ownerId],
      });
      leadsCount = Math.max(leadsCount, Number(res.rows[0]?.count || 0));
    } catch {}

    let qrMessagesCount = 0;
    try {
      const res = await bunnyExecute({
        sql: 'SELECT COUNT(*) as count FROM qr_whatsapp_messages_sql WHERE user_id = ?',
        args: [ownerId],
      });
      qrMessagesCount = Number(res.rows[0]?.count || 0);
    } catch {}

    let metaMessagesCount = 0;
    try {
      const res = await bunnyExecute({
        sql: 'SELECT COUNT(*) as count FROM meta_messages_sql WHERE sent_by_user_id = ?',
        args: [ownerId],
      });
      metaMessagesCount = Number(res.rows[0]?.count || 0);
    } catch {}

    const totalMessages = qrMessagesCount + metaMessagesCount;

    return tenantSuccess({
      tenantSlug: slug,
      totals: {
        leadsCreated: leadsCount,
        messagesSent: totalMessages,
        callsPlaced: 0,
        logins: Number(tenant.currentUserCount || 1),
        apiCalls: 0,
      },
      currentUsage: {
        leadsCount,
        messagesCount: totalMessages,
        callsCount: 0,
        storageUsedMB: Number(tenant.currentStorageMB || 0),
        teamMembersCount: Number(tenant.currentUserCount || 1),
      },
      limits: tenant.customLimits || {
        maxLeads: 10000,
        maxUsers: 5,
        maxStorageMB: 1024,
      },
      plan: tenant.plan,
      status: tenant.status,
    });
  } catch (error: any) {
    console.error('[GET /api/tenants/:slug/analytics] Error:', error);
    return tenantError(error?.message || 'Failed to fetch analytics', 400);
  }
}
