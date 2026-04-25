import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { BUILT_IN_REPORTS, REPORT_LIMITS, getDateRange, formatMetricValue } from '@/lib/crm-site/analyticsConfig';

export const dynamic = 'force-dynamic';


// GET - Get specific report data
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get('tenant');
    const reportId = searchParams.get('id');
    const timeRange = searchParams.get('timeRange') || '30d';

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const tenantsCol = crmDb.collection('crm_tenants');

    const tenantDoc = await tenantsCol.findOne({ slug: tenant });
    if (!tenantDoc) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plan = tenantDoc.subscription?.plan || 'free';
    const limits = REPORT_LIMITS[plan] || REPORT_LIMITS.free;
    const tenantId = tenantDoc._id.toString();

    // List available reports
    if (!reportId) {
      const availableReports = BUILT_IN_REPORTS.filter(r => limits.reports.includes(r.id));
      return NextResponse.json({ reports: availableReports, limits, plan });
    }

    // Check if report is available in plan
    if (!limits.reports.includes(reportId)) {
      return NextResponse.json({ error: 'Report not available in your plan. Please upgrade.' }, { status: 403 });
    }

    const report = BUILT_IN_REPORTS.find(r => r.id === reportId);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const { start, end } = getDateRange(timeRange);
    const dateFilter = { $gte: start, $lte: end };

    // Get report data based on report type
    let data: any = {};

    switch (report.id) {
      case 'leads_overview': {
        const leadsCol = crmDb.collection('crm_leads');
        const [total, newInPeriod, trend] = await Promise.all([
          leadsCol.countDocuments({ tenantId }),
          leadsCol.countDocuments({ tenantId, createdAt: dateFilter }),
          leadsCol.aggregate([
            { $match: { tenantId, createdAt: dateFilter } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]).toArray(),
        ]);
        data = {
          metrics: { total, newInPeriod },
          trend: trend.map(t => ({ date: t._id, value: t.count })),
        };
        break;
      }

      case 'leads_by_status': {
        const leadsCol = crmDb.collection('crm_leads');
        const byStatus = await leadsCol.aggregate([
          { $match: { tenantId } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray();
        data = {
          breakdown: byStatus.map(s => ({
            name: s._id || 'Unknown',
            value: s.count,
          })),
        };
        break;
      }

      case 'leads_by_source': {
        const leadsCol = crmDb.collection('crm_leads');
        const bySource = await leadsCol.aggregate([
          { $match: { tenantId } },
          { $unwind: { path: '$sources', preserveNullAndEmptyArrays: true } },
          { $group: { _id: '$sources', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]).toArray();
        data = {
          breakdown: bySource.map(s => ({
            name: s._id || 'Direct',
            value: s.count,
          })),
        };
        break;
      }

      case 'lead_conversion': {
        const leadsCol = crmDb.collection('crm_leads');
        const [total, converted] = await Promise.all([
          leadsCol.countDocuments({ tenantId, createdAt: dateFilter }),
          leadsCol.countDocuments({ tenantId, status: 'converted', createdAt: dateFilter }),
        ]);
        data = {
          metrics: {
            total,
            converted,
            rate: total > 0 ? (converted / total * 100) : 0,
          },
        };
        break;
      }

      case 'revenue_overview': {
        const dealsCol = crmDb.collection('crm_deals');
        const [totals, trend] = await Promise.all([
          dealsCol.aggregate([
            { $match: { tenantId, status: 'won', createdAt: dateFilter } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' }, avg: { $avg: '$amount' } } },
          ]).toArray(),
          dealsCol.aggregate([
            { $match: { tenantId, status: 'won', createdAt: dateFilter } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, value: { $sum: '$amount' } } },
            { $sort: { _id: 1 } },
          ]).toArray(),
        ]);
        const stats = totals[0] || { count: 0, total: 0, avg: 0 };
        data = {
          metrics: {
            deals: stats.count,
            revenue: stats.total,
            avgDealSize: stats.avg,
          },
          trend: trend.map(t => ({ date: t._id, value: t.value })),
        };
        break;
      }

      case 'deals_pipeline': {
        const dealsCol = crmDb.collection('crm_deals');
        const byStage = await dealsCol.aggregate([
          { $match: { tenantId } },
          { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$amount' } } },
        ]).toArray();
        data = {
          breakdown: byStage.map(s => ({
            name: s._id || 'Unknown',
            count: s.count,
            value: s.value,
          })),
        };
        break;
      }

      case 'email_performance': {
        const campaignsCol = crmDb.collection('crm_email_campaigns');
        const campaigns = await campaignsCol.find({
          tenantId,
          sentAt: { $exists: true },
        }).sort({ sentAt: -1 }).limit(20).toArray();

        const totals = campaigns.reduce(
          (acc, c) => ({
            sent: acc.sent + (c.stats?.sent || 0),
            opened: acc.opened + (c.stats?.opened || 0),
            clicked: acc.clicked + (c.stats?.clicked || 0),
          }),
          { sent: 0, opened: 0, clicked: 0 }
        );

        data = {
          metrics: {
            ...totals,
            openRate: totals.sent > 0 ? (totals.opened / totals.sent * 100) : 0,
            clickRate: totals.opened > 0 ? (totals.clicked / totals.opened * 100) : 0,
          },
          campaigns: campaigns.map(c => ({
            name: c.name,
            sent: c.stats?.sent || 0,
            opened: c.stats?.opened || 0,
            clicked: c.stats?.clicked || 0,
            sentAt: c.sentAt,
          })),
        };
        break;
      }

      case 'landing_page_performance': {
        const pagesCol = crmDb.collection('crm_landing_pages');
        const pages = await pagesCol.find({ tenantId }).toArray();

        const totals = pages.reduce(
          (acc, p) => ({
            views: acc.views + (p.stats?.views || 0),
            submissions: acc.submissions + (p.stats?.submissions || 0),
          }),
          { views: 0, submissions: 0 }
        );

        data = {
          metrics: {
            ...totals,
            conversionRate: totals.views > 0 ? (totals.submissions / totals.views * 100) : 0,
          },
          pages: pages.map(p => ({
            name: p.name,
            slug: p.slug,
            status: p.status,
            views: p.stats?.views || 0,
            submissions: p.stats?.submissions || 0,
            conversionRate: p.stats?.conversionRate || 0,
          })),
        };
        break;
      }

      case 'team_activity': {
        const leadsCol = crmDb.collection('crm_leads');
        const byUser = await leadsCol.aggregate([
          { $match: { tenantId, assignedTo: { $ne: null } } },
          { $group: { _id: '$assignedTo', total: { $sum: 1 }, recent: { $sum: { $cond: [{ $gte: ['$createdAt', start] }, 1, 0] } } } },
          { $sort: { total: -1 } },
        ]).toArray();

        data = {
          breakdown: byUser.map(u => ({
            user: u._id,
            totalLeads: u.total,
            recentLeads: u.recent,
          })),
        };
        break;
      }

      case 'response_time': {
        // This would need activity tracking which may not exist
        data = {
          metrics: {
            avgResponseTime: 0,
            note: 'Response time tracking requires activity logging',
          },
        };
        break;
      }

      default:
        data = { message: 'Report data not available' };
    }

    return NextResponse.json({
      report: {
        ...report,
        timeRange,
        generatedAt: new Date().toISOString(),
      },
      data,
    });
  } catch (error: any) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch report' }, { status: 500 });
  }
}
