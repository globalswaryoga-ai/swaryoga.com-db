import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin, getVisibleUserIds } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * Meta Dashboard Stats API
 * 
 * Returns aggregated statistics for:
 * - Messages: received vs sent counts
 * - Chat statuses: new, open, pending, overdue, closed
 * - User breakdown: stats by admin user
 * 
 * Query params:
 * - period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
 * - startDate: ISO date string (for custom)
 * - endDate: ISO date string (for custom)
 * - userId: filter by specific admin user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);
    const visibleUserIds = getVisibleUserIds(decoded);

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'daily';
    const userIdFilter = url.searchParams.get('userId');
    let startDate = url.searchParams.get('startDate');
    let endDate = url.searchParams.get('endDate');

    // Calculate date range based on period
    const now = new Date();
    if (period !== 'custom') {
      endDate = now.toISOString();
      switch (period) {
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }
    }

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Build user filter for leads
    let leadUserFilter: any = {};
    if (userIdFilter) {
      // Specific user filter requested
      leadUserFilter = { assignedToUserId: userIdFilter };
    } else if (!superAdmin && visibleUserIds) {
      // Non-super admin can only see their own or team's data
      leadUserFilter = { assignedToUserId: { $in: visibleUserIds } };
    }

    // Build message filter
    const messageFilter: any = {
      provider: 'meta', // Only Meta messages
      ...(Object.keys(dateFilter).length > 0 ? { sentAt: dateFilter } : {}),
    };

    // Aggregate message stats
    const [messageStats, chatStatusStats, userStats, totalLeads, dailyTrend] = await Promise.all([
      // 1. Messages: sent vs received
      WhatsAppMessage.aggregate([
        { $match: messageFilter },
        {
          $group: {
            _id: '$direction',
            count: { $sum: 1 },
          },
        },
      ]),

      // 2. Chat status breakdown
      Lead.aggregate([
        { $match: leadUserFilter },
        {
          $addFields: {
            computedChatStatus: {
              $cond: {
                if: { $eq: ['$chatStatus', 'closed'] },
                then: 'closed',
                else: {
                  $cond: {
                    if: { $eq: [{ $ifNull: ['$lastMessageAt', null] }, null] },
                    then: 'new',
                    else: {
                      $let: {
                        vars: {
                          hoursDiff: {
                            $divide: [
                              { $subtract: [new Date(), '$lastMessageAt'] },
                              1000 * 60 * 60,
                            ],
                          },
                        },
                        in: {
                          $cond: {
                            if: { $lt: ['$$hoursDiff', 5] },
                            then: 'new',
                            else: {
                              $cond: {
                                if: { $lt: ['$$hoursDiff', 12] },
                                then: 'open',
                                else: {
                                  $cond: {
                                    if: { $lt: ['$$hoursDiff', 24] },
                                    then: 'pending',
                                    else: 'overdue',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: '$computedChatStatus',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 3. Stats by admin user
      Lead.aggregate([
        { $match: leadUserFilter },
        {
          $group: {
            _id: '$assignedToUserId',
            totalLeads: { $sum: 1 },
            withMessages: {
              $sum: { $cond: [{ $ifNull: ['$lastMessageAt', false] }, 1, 0] },
            },
          },
        },
        { $sort: { totalLeads: -1 } },
        { $limit: 20 },
      ]),

      // 4. Total leads count
      Lead.countDocuments(leadUserFilter),

      // 5. Daily message trend (last 7 days)
      WhatsAppMessage.aggregate([
        {
          $match: {
            provider: 'meta',
            sentAt: {
              $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
              direction: '$direction',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

    // Format message stats
    const messages = {
      sent: messageStats.find((s: any) => s._id === 'outbound')?.count || 0,
      received: messageStats.find((s: any) => s._id === 'inbound')?.count || 0,
      total: messageStats.reduce((acc: number, s: any) => acc + s.count, 0),
    };

    // Format chat status stats
    const chatStatuses = {
      new: chatStatusStats.find((s: any) => s._id === 'new')?.count || 0,
      open: chatStatusStats.find((s: any) => s._id === 'open')?.count || 0,
      pending: chatStatusStats.find((s: any) => s._id === 'pending')?.count || 0,
      overdue: chatStatusStats.find((s: any) => s._id === 'overdue')?.count || 0,
      closed: chatStatusStats.find((s: any) => s._id === 'closed')?.count || 0,
    };

    // Format user stats
    const users = userStats.map((u: any) => ({
      userId: u._id || 'Unassigned',
      totalLeads: u.totalLeads,
      withMessages: u.withMessages,
    }));

    // Format daily trend
    const trendMap: Record<string, { sent: number; received: number }> = {};
    dailyTrend.forEach((t: any) => {
      const date = t._id.date;
      if (!trendMap[date]) trendMap[date] = { sent: 0, received: 0 };
      if (t._id.direction === 'outbound') trendMap[date].sent = t.count;
      if (t._id.direction === 'inbound') trendMap[date].received = t.count;
    });

    const trend = Object.entries(trendMap)
      .map(([date, data]) => ({
        date,
        ...data,
        total: data.sent + data.received,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        messages,
        chatStatuses,
        totalLeads,
        users,
        trend,
      },
    });
  } catch (error) {
    console.error('[meta-dashboard/stats] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
