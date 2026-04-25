import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getEmailLog } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';


// GET /api/admin/crm/email/logs - List email logs with filters
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    const isSuperAdmin = decoded?.userId === 'admin' || 
                        decoded?.userId === 'admincrm' ||
                        (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));

    if (!isSuperAdmin && !hasPermission(decoded?.permissionsV2, 'email', 'read')) {
      return apiError('FORBIDDEN', 'You do not have permission to view email logs');
    }

    await connectDB();
    const EmailLog = getEmailLog();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const campaignId = searchParams.get('campaignId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (source && source !== 'all') filter.source = source;
    if (campaignId) filter.campaignId = campaignId;
    if (search) {
      filter.$or = [
        { recipientEmail: { $regex: search, $options: 'i' } },
        { recipientName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    // Non-super admins only see their own sent emails
    if (!isSuperAdmin) {
      filter.sentBy = decoded.userId;
    }

    const [logs, total, statusCounts] = await Promise.all([
      EmailLog.find(filter).sort({ createdAt: -1 }).limit(limit).skip(skip).lean(),
      EmailLog.countDocuments(filter),
      EmailLog.aggregate([
        { $match: isSuperAdmin ? {} : { sentBy: decoded.userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Build status summary
    const summary: Record<string, number> = {
      total: 0, queued: 0, sent: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, clicked: 0,
    };
    for (const item of statusCounts) {
      summary[item._id] = item.count;
      summary.total += item.count;
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
