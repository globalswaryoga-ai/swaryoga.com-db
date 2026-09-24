import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { listEmailLogs } from '@/lib/emailBunnyRepository';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';


// GET /api/admin/crm/email/logs - List email logs with filters
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    const isSuperAdmin = decoded?.userId === 'admin' || 
                        decoded?.userId === 'admincrm' ||
                        (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));

    if (!isSuperAdmin && !hasPermission(decoded?.permissionsV2, 'email', 'read')) {
      return apiError('FORBIDDEN', 'You do not have permission to view email logs');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const campaignId = searchParams.get('campaignId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const allLogs = await listEmailLogs();
    
    // In-memory filter
    let filtered = allLogs;
    if (status && status !== 'all') filtered = filtered.filter(l => l.status === status);
    if (campaignId) filtered = filtered.filter(l => l.campaignId === campaignId);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(l => 
        (l.recipientEmail && l.recipientEmail.toLowerCase().includes(s)) ||
        (l.subject && l.subject.toLowerCase().includes(s))
      );
    }
    if (!isSuperAdmin) {
      filtered = filtered.filter(l => l.sentBy === decoded.userId);
    }

    const total = filtered.length;
    const logs = filtered.slice(skip, skip + limit);

    // Build status summary
    const statusCounts = allLogs
      .filter(l => isSuperAdmin ? true : l.sentBy === decoded.userId)
      .reduce((acc: any, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {});

    // Build status summary
    const summary: Record<string, number> = {
      total: 0, queued: 0, sent: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, clicked: 0,
    };
    for (const st in statusCounts) {
      summary[st] = statusCounts[st];
      summary.total += statusCounts[st];
    }

    return apiSuccess({
      logs,
      pagination: { total, limit, skip, hasMore: total > skip + limit },
      summary,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/crm/email/logs] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to fetch email logs');
  }
}
