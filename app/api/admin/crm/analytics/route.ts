import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead, SalesReport, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

/**
 * CRM Analytics dashboard API
 * GET with views: overview, leads, sales, messages, conversion, trends
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'overview'; // overview, leads, sales, messages, conversion, trends
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    await connectDB();

    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let analytics: any = {};

    if (view === 'overview' || view === 'all') {
      // Get summary metrics
      const [totalLeads, leadsByStatus, totalSales, totalMessages, avgResponseTime] = await Promise.all([
        Lead.countDocuments(),
        Lead.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        SalesReport.countDocuments(),
        WhatsAppMessage.countDocuments({ direction: 'inbound' }),
        WhatsAppMessage.aggregate([
          {
            $match: {
              direction: 'inbound',
              createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$responseTime' },
            },
          },
        ]),
      ]);

      analytics.overview = {
        totalLeads,
        leadsByStatus: Object.fromEntries(
          leadsByStatus.map((item: any) => [item._id || 'unknown', item.count])
        ),
        totalSales,
        totalMessages,
        avgResponseTime: avgResponseTime[0]?.avgTime || 0,
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
          { $group: { _id: '$stage', count: { $sum: 1 } } },
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
      const matchStage = startDate || endDate ? { $match: { createdAt: dateFilter } } : { $match: {} };

      const [totalSales, totalRevenue, avgSaleAmount, salesByPaymentMode, topPerformers] = await Promise.all([
        SalesReport.countDocuments(
          startDate || endDate ? { createdAt: dateFilter } : {}
        ),
        SalesReport.aggregate([
          matchStage,
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        SalesReport.aggregate([
          matchStage,
          { $group: { _id: null, avg: { $avg: '$amount' } } },
        ]),
        SalesReport.aggregate([
          matchStage,
          { $group: { _id: '$paymentMode', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
        ]),
        SalesReport.aggregate([
          matchStage,
          { $group: { _id: '$userId', count: { $sum: 1 }, total: { $sum: '$amount' } } },
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
      const matchStage = startDate || endDate ? { $match: { createdAt: dateFilter } } : { $match: {} };

      const [totalMessages, inboundCount, outboundCount, byStatus, avgRetryCount] = await Promise.all([
        WhatsAppMessage.countDocuments(
          startDate || endDate ? { createdAt: dateFilter } : {}
        ),
        WhatsAppMessage.countDocuments({
          direction: 'inbound',
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        }),
        WhatsAppMessage.countDocuments({
          direction: 'outbound',
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
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
            $match: startDate || endDate ? { createdAt: dateFilter } : {},
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
            $match: startDate || endDate ? { createdAt: dateFilter } : {},
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ]),
        WhatsAppMessage.aggregate([
          {
            $match: {
              direction: 'outbound',
              ...(startDate || endDate ? { createdAt: dateFilter } : {}),
            },
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

    return NextResponse.json({ success: true, data: analytics }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
