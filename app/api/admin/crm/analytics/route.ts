import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { BroadcastRunMessage, Lead, SalesReport, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin, getVisibleUserIds } from '@/lib/crm-handlers';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


/**
 * CRM Analytics dashboard API
 * GET with views: overview, leads, sales, messages, conversion, trends
 * 
 * Access Control (3-tier):
 * - Super admin: can see ALL data
 * - Manager (MR Admin): can see data for leads assigned to them OR their team
 * - Regular admin: can only see data for leads assigned to them
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
    const visibleUserIds = getVisibleUserIds(decoded);
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'overview'; // overview, leads, sales, messages, conversion, trends
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    try {
      await connectDB();
    } catch (dbErr: any) {
      console.error('❌ Database connection error in Analytics:', dbErr);
      return NextResponse.json(
        { error: 'Database connection failed', details: dbErr.message },
        { status: 503 }
      );
    }

    const dateRange: any = {};
    if (startDate) dateRange.$gte = new Date(startDate);
    if (endDate) dateRange.$lte = new Date(endDate);

    const hasDateRange = Object.keys(dateRange).length > 0;

    // Build user filter based on 3-tier access control
    let userLeadFilter: any = {};
    let userSalesFilter: any = {};
    
    if (visibleUserIds === null) {
      // Super admin: no filter
      userLeadFilter = {};
      userSalesFilter = {};
    } else if (visibleUserIds.length === 1) {
      // Regular admin: only their own data
      userLeadFilter = { 
        $or: [{ assignedToUserId: visibleUserIds[0] }, { createdByUserId: visibleUserIds[0] }] 
      };
      userSalesFilter = { reportedByUserId: visibleUserIds[0] };
    } else {
      // Manager: their team's data
      userLeadFilter = { 
        $or: [{ assignedToUserId: { $in: visibleUserIds } }, { createdByUserId: { $in: visibleUserIds } }] 
      };
      userSalesFilter = { reportedByUserId: { $in: visibleUserIds } };
    }

    let analytics: any = {};

    try {
      if (view === 'overview' || view === 'all') {
        // Get summary metrics (filtered by user for non-super-admins)
        const [totalLeads, leadsByStatus, totalSales, totalMessages, metaMessagesSent, qrWhatsappMessagesSent, broadcastAgg] = await Promise.all([
          Lead.countDocuments(userLeadFilter),
          Lead.aggregate([
            { $match: userLeadFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
          SalesReport.countDocuments({ ...userSalesFilter, ...(hasDateRange ? { saleDate: dateRange } : {}) }),
          // Messages are tied to leads - for non-super-admin, we need to join with leads
          // For simplicity, super admin sees all, others see estimated based on their leads
          superAdmin 
            ? WhatsAppMessage.countDocuments(hasDateRange ? { sentAt: dateRange } : {})
            : WhatsAppMessage.countDocuments({ 
                ...( hasDateRange ? { sentAt: dateRange } : {}),
                // Would need lead join for accurate count - use estimate for now
              }),
          // Count Meta messages - ONLY for superadmin (this is global business account data)
          superAdmin
            ? WhatsAppMessage.countDocuments({
                provider: 'meta',
                direction: 'outbound',
                ...(hasDateRange ? { sentAt: dateRange } : {}),
              })
            : Promise.resolve(0), // Non-superadmin sees 0
          // Count QR/Bridge messages - ONLY for superadmin
          superAdmin
            ? WhatsAppMessage.countDocuments({
                provider: 'whatsapp_web_bridge',
                direction: 'outbound',
                ...(hasDateRange ? { sentAt: dateRange } : {}),
              })
            : Promise.resolve(0), // Non-superadmin sees 0
          // Broadcast diagnostics: overall delivery outcomes across run messages.
          // We aggregate by status + a normalized reason bucket derived from failureReason.
          BroadcastRunMessage.aggregate([
            ...(hasDateRange ? [{ $match: { createdAt: dateRange } }] : []),
            {
              $project: {
                status: 1,
                reasonBucket: {
                  $let: {
                    vars: { r: { $toLower: { $ifNull: ['$failureReason', ''] } } },
                    in: {
                      $switch: {
                        branches: [
                          {
                            case: {
                              $or: [
                                { $regexMatch: { input: '$$r', regex: /blocked/ } },
                                { $regexMatch: { input: '$$r', regex: /opt\s*out/ } },
                                { $regexMatch: { input: '$$r', regex: /not\s*compliant/ } },
                                { $regexMatch: { input: '$$r', regex: /user\s*has\s*opted\s*out/ } },
                              ],
                            },
                            then: 'blocked',
                          },
                          {
                            case: {
                              $or: [
                                { $regexMatch: { input: '$$r', regex: /not\s*in\s*use/ } },
                                { $regexMatch: { input: '$$r', regex: /number\s*not\s*in\s*use/ } },
                                { $regexMatch: { input: '$$r', regex: /phone\s*number\s*.*not\s*valid/ } },
                                { $regexMatch: { input: '$$r', regex: /invalid\s*phone/ } },
                              ],
                            },
                            then: 'number_not_in_use',
                          },
                          {
                            case: {
                              $or: [
                                { $regexMatch: { input: '$$r', regex: /not\s*deliver/ } },
                                { $regexMatch: { input: '$$r', regex: /undeliver/ } },
                              ],
                            },
                            then: 'not_delivered',
                          },
                          {
                            case: {
                              $or: [
                                { $regexMatch: { input: '$$r', regex: /fail/ } },
                                { $regexMatch: { input: '$$r', regex: /error/ } },
                              ],
                            },
                            then: 'failed',
                          },
                        ],
                        default: { $cond: [{ $eq: ['$$r', ''] }, 'none', 'other'] },
                      },
                    },
                  },
                },
              },
            },
            {
              $group: {
                _id: { status: '$status', reasonBucket: '$reasonBucket' },
                count: { $sum: 1 },
              },
            },
          ]),
        ]);

        // Summarize broadcast breakdown.
        const broadcastByStatus: Record<string, number> = {};
        const broadcastByReason: Record<string, number> = {};
        for (const row of broadcastAgg || []) {
          const status = String(row?._id?.status || 'unknown');
          const reason = String(row?._id?.reasonBucket || 'unknown');
          broadcastByStatus[status] = (broadcastByStatus[status] || 0) + Number(row?.count || 0);
          broadcastByReason[reason] = (broadcastByReason[reason] || 0) + Number(row?.count || 0);
        }

        analytics.overview = {
          totalLeads,
          leadsByStatus: Object.fromEntries(leadsByStatus.map((item: any) => [item._id || 'unknown', item.count])),
          totalSales,
          totalMessages,
          metaMessagesSent,
          qrWhatsappMessagesSent,
          // Response-time tracking is not currently stored on WhatsAppMessage.
          avgResponseTime: 0,
          broadcast: {
            byStatus: broadcastByStatus,
            byReason: broadcastByReason,
          },
        };
      }

      if (view === 'leads' || view === 'all') {
        // Leads analytics
        const [totalLeads, leadsBySource, leadsByStage, newLeadsThisMonth] = await Promise.all([
          Lead.countDocuments(),
          Lead.aggregate([
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          Lead.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
          Lead.countDocuments({
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              $lte: new Date(),
            },
          }),
        ]);

        analytics.leads = {
          totalLeads,
          newLeadsThisMonth,
          bySource: Object.fromEntries(leadsBySource.map((item: any) => [item._id || 'unknown', item.count])),
          byStage: Object.fromEntries(leadsByStage.map((item: any) => [item._id || 'unknown', item.count])),
        };
      }

      if (view === 'sales' || view === 'all') {
        // Sales analytics
        const matchStage = hasDateRange ? { $match: { saleDate: dateRange } } : { $match: {} };

        const [totalSales, totalRevenue, avgSaleAmount, salesByPaymentMode, topPerformers] = await Promise.all([
          SalesReport.countDocuments(hasDateRange ? { saleDate: dateRange } : {}),
          SalesReport.aggregate([
            matchStage,
            { $group: { _id: null, total: { $sum: '$saleAmount' } } },
          ]),
          SalesReport.aggregate([
            matchStage,
            { $group: { _id: null, avg: { $avg: '$saleAmount' } } },
          ]),
          SalesReport.aggregate([
            matchStage,
            { $group: { _id: '$paymentMode', count: { $sum: 1 }, total: { $sum: '$saleAmount' } } },
            { $sort: { total: -1 } },
          ]),
          SalesReport.aggregate([
            matchStage,
            { $group: { _id: '$userId', count: { $sum: 1 }, total: { $sum: '$saleAmount' } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
          ]),
        ]);

        analytics.sales = {
          totalSales,
          totalRevenue: totalRevenue[0]?.total || 0,
          avgSaleAmount: avgSaleAmount[0]?.avg || 0,
          byPaymentMode: Object.fromEntries(
            salesByPaymentMode.map((item: any) => [
              item._id || 'unknown',
              { count: item.count, total: item.total },
            ])
          ),
          topPerformers: topPerformers.map((item: any) => ({
            userId: item._id,
            salesCount: item.count,
            totalAmount: item.total,
          })),
        };
      }

      if (view === 'messages' || view === 'all') {
        // Message analytics
        const matchStage = hasDateRange ? { $match: { sentAt: dateRange } } : { $match: {} };

        const [totalMessages, inboundCount, outboundCount, readCount, byStatus, avgRetryCount] = await Promise.all([
          WhatsAppMessage.countDocuments(hasDateRange ? { sentAt: dateRange } : {}),
          WhatsAppMessage.countDocuments({
            direction: 'inbound',
            ...(hasDateRange ? { sentAt: dateRange } : {}),
          }),
          WhatsAppMessage.countDocuments({
            direction: 'outbound',
            ...(hasDateRange ? { sentAt: dateRange } : {}),
          }),
          WhatsAppMessage.countDocuments({
            $or: [
              { isRead: true },
              { status: 'read' }
            ],
            ...(hasDateRange ? { sentAt: dateRange } : {}),
          }),
          WhatsAppMessage.aggregate([
            matchStage,
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
          WhatsAppMessage.aggregate([
            matchStage,
            { $group: { _id: null, avg: { $avg: '$retryCount' } } },
          ]),
        ]);

        analytics.messages = {
          totalMessages,
          inbound: inboundCount,
          outbound: outboundCount,
          read: readCount,
          byStatus: Object.fromEntries(byStatus.map((item: any) => [item._id || 'unknown', item.count])),
          avgRetryCount: avgRetryCount[0]?.avg || 0,
        };
      }

      if (view === 'conversion' || view === 'all') {
        // Conversion analytics
        const totalLeads = await Lead.countDocuments();
        const convertedLeads = await Lead.countDocuments({ status: 'customer' });
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

        const [timeToConversion, conversionBySource] = await Promise.all([
          Lead.aggregate([
            { $match: { status: 'customer' } },
            {
              $group: {
                _id: null,
                avgDays: {
                  $avg: {
                    $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60 * 24],
                  },
                },
              },
            },
          ]),
          Lead.aggregate([
            { $match: { status: 'customer' } },
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        ]);

        analytics.conversion = {
          totalLeads,
          convertedLeads,
          conversionRate: parseFloat(conversionRate as string),
          avgDaysToConversion: Math.round(timeToConversion[0]?.avgDays || 0),
          bySource: Object.fromEntries(conversionBySource.map((item: any) => [item._id || 'unknown', item.count])),
        };
      }

      if (view === 'trends' || view === 'all') {
        // Trends over time
        const [leadsPerDay, salesPerDay, messagesPerDay] = await Promise.all([
          Lead.aggregate([
            {
              $match: hasDateRange ? { createdAt: dateRange } : {},
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ]),
          SalesReport.aggregate([
            {
              $match: hasDateRange ? { saleDate: dateRange } : {},
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$saleDate' },
                },
                count: { $sum: 1 },
                total: { $sum: '$saleAmount' },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ]),
          WhatsAppMessage.aggregate([
            {
              $match: {
                direction: 'outbound',
                ...(hasDateRange ? { sentAt: dateRange } : {}),
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$sentAt' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ]),
        ]);

        analytics.trends = {
          leadsPerDay: leadsPerDay.map((item: any) => ({
            date: item._id,
            count: item.count,
          })),
          salesPerDay: salesPerDay.map((item: any) => ({
            date: item._id,
            count: item.count,
            total: item.total,
          })),
          messagesPerDay: messagesPerDay.map((item: any) => ({
            date: item._id,
            count: item.count,
          })),
        };
      }
    } catch (queryErr: any) {
      console.error('❌ Analytics Query Error:', queryErr);
      
      // If it's a connection/SSL error, attempt one retry
      if (queryErr.message.includes('SSL') || queryErr.message.includes('alert') || queryErr.message.includes('closed')) {
        return NextResponse.json(
          { error: 'Database handshake error. Please refresh.', details: queryErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch analytics', details: queryErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: analytics }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
