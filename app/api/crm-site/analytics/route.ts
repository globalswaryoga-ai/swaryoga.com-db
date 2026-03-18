import { NextRequest, NextResponse } from 'next/server';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';
import { resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

/**
 * GET /api/crm-site/analytics
 * Get tenant analytics - leads, messages, growth metrics
 */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const period = url.searchParams.get('period') || '30d'; // 7d, 30d, 90d

    // Calculate date range
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get tenant info
    // Get leads stats
    const leadsQuery = tenantSlug ? { tenantSlug } : {};
    const totalLeads = await crmDb.collection('leads').countDocuments(leadsQuery);
    const newLeads = await crmDb.collection('leads').countDocuments({
      ...leadsQuery,
      createdAt: { $gte: startDate },
    });

    // Get leads by status
    const leadsByStatus = await crmDb.collection('leads').aggregate([
      { $match: leadsQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

    // Get leads by source
    const leadsBySource = await crmDb.collection('leads').aggregate([
      { $match: leadsQuery },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();

    // Get daily lead growth
    const dailyLeads = await crmDb.collection('leads').aggregate([
      { $match: { ...leadsQuery, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // Get messages stats
    const messagesQuery = tenantSlug ? { tenantSlug } : {};
    const totalMessages = await crmDb.collection('whatsapp_messages').countDocuments(messagesQuery);
    const recentMessages = await crmDb.collection('whatsapp_messages').countDocuments({
      ...messagesQuery,
      createdAt: { $gte: startDate },
    });

    // Get broadcasts stats
    const broadcastsQuery = tenantSlug ? { tenantSlug } : {};
    const totalBroadcasts = await crmDb.collection('broadcasts').countDocuments(broadcastsQuery);
    const recentBroadcasts = await crmDb.collection('broadcasts').countDocuments({
      ...broadcastsQuery,
      createdAt: { $gte: startDate },
    });

    // Calculate conversion rate (leads to customer)
    const convertedLeads = await crmDb.collection('leads').countDocuments({
      ...leadsQuery,
      status: { $in: ['converted', 'customer', 'won'] },
    });
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

    // Get response time metrics
    const avgResponseTime = await crmDb.collection('whatsapp_messages').aggregate([
      { $match: { ...messagesQuery, direction: 'outbound', responseTimeMs: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$responseTimeMs' } } },
    ]).toArray();

    // Get top performing agents
    const topAgents = await crmDb.collection('leads').aggregate([
      { $match: { ...leadsQuery, assignedTo: { $exists: true, $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();

    // Calculate growth rate
    const prevPeriodStart = new Date(startDate);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - days);
    const prevLeads = await crmDb.collection('leads').countDocuments({
      ...leadsQuery,
      createdAt: { $gte: prevPeriodStart, $lt: startDate },
    });
    const growthRate = prevLeads > 0 ? (((newLeads - prevLeads) / prevLeads) * 100).toFixed(1) : newLeads > 0 ? '100' : '0';

    const planAccess = resolveTenantPlanAccess(tenant);

    return NextResponse.json({
      period,
      tenant: tenant ? {
        name: tenant.name,
        plan: planAccess.plan,
        planName: planAccess.planName,
        leadsUsed: tenant.currentLeadCount || 0,
        leadsLimit: planAccess.limits.maxLeads,
      } : null,
      summary: {
        totalLeads,
        newLeads,
        growthRate: parseFloat(growthRate),
        totalMessages,
        recentMessages,
        totalBroadcasts,
        recentBroadcasts,
        conversionRate: parseFloat(conversionRate),
        avgResponseTimeMinutes: avgResponseTime[0]?.avg ? Math.round(avgResponseTime[0].avg / 60000) : null,
      },
      charts: {
        dailyLeads: dailyLeads.map(d => ({ date: d._id, count: d.count })),
        leadsByStatus: leadsByStatus.map(s => ({ status: s._id || 'Unknown', count: s.count })),
        leadsBySource: leadsBySource.map(s => ({ source: s._id || 'Direct', count: s.count })),
      },
      topAgents: topAgents.map(a => ({ agentId: a._id, leads: a.count })),
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
