/**
 * Funnel Analytics API
 * GET - Daily, weekly, monthly, yearly funnel analytics
 * Yearly follows Indian financial year: April 1 → March 31
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead, getFunnelStageHistory, getWhatsAppMessage, getSalesReport } from '@/lib/schemas/enterpriseSchemas';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


function getFinancialYearRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  // FY starts April (month 3)
  const fyStartYear = month >= 3 ? year : year - 1;
  return {
    start: new Date(fyStartYear, 3, 1),          // April 1
    end: new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999), // March 31
    label: `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
  };
}

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    await connectDB();
    const Lead = getLead();
    const FunnelStageHistory = getFunnelStageHistory();
    const WhatsAppMessage = getWhatsAppMessage();
    const SalesReport = getSalesReport();

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'daily'; // daily|weekly|monthly|yearly
    const assignedTo = url.searchParams.get('assignedTo') || '';
    const isSuper = isSuperAdmin(decoded);
    const viewerId = getViewerUserId(decoded);

    const now = new Date();
    const fy = getFinancialYearRange(now);
    const today = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build user filter - ALWAYS filter by current user to prevent data leakage
    const userFilter: any = {};
    if (!isSuper) {
      // Regular admin: only see their own leads
      userFilter.$or = [{ assignedToUserId: viewerId }, { createdByUserId: viewerId }];
    } else if (assignedTo) {
      // Super admin with specific user filter
      userFilter.assignedToUserId = assignedTo;
    } else {
      // Super admin without specific filter - only show leads created by them or assigned to them
      // This prevents showing all data
      userFilter.$or = [{ assignedToUserId: viewerId }, { createdByUserId: viewerId }];
    }

    // ── Stage Distribution (current snapshot) ──
    const stagePipeline: any[] = [];
    if (Object.keys(userFilter).length) stagePipeline.push({ $match: userFilter });
    stagePipeline.push({
      $group: {
        _id: { $ifNull: ['$funnelStage', 'new_lead'] },
        count: { $sum: 1 },
      },
    });
    const stageDistribution = await Lead.aggregate(stagePipeline);

    // ── Period date range ──
    let periodStart: Date;
    let periodEnd = now;
    let groupFormat: string;

    switch (period) {
      case 'daily':
        periodStart = today;
        groupFormat = '%H:00'; // hourly within today
        break;
      case 'weekly':
        periodStart = weekStart;
        groupFormat = '%Y-%m-%d';
        break;
      case 'monthly':
        periodStart = monthStart;
        groupFormat = '%Y-%m-%d';
        break;
      case 'yearly':
      default:
        periodStart = fy.start;
        periodEnd = fy.end;
        groupFormat = '%Y-%m';
        break;
    }

    // ── Leads created over time ──
    const leadsOverTime = await Lead.aggregate([
      {
        $match: {
          ...userFilter,
          createdAt: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt', timezone: 'Asia/Kolkata' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Stage changes over time ──
    const stageHistoryFilter: any = { createdAt: { $gte: periodStart, $lte: periodEnd } };
    if (!isSuper) stageHistoryFilter.changedByUserId = viewerId;
    else if (assignedTo) stageHistoryFilter.changedByUserId = assignedTo;

    const stageChanges = await FunnelStageHistory.aggregate([
      { $match: stageHistoryFilter },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupFormat, date: '$createdAt', timezone: 'Asia/Kolkata' } },
            toStage: '$toStage',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]);

    // ── Messages sent over time (only for super admins) ──
    const msgFilter: any = {
      direction: 'outbound',
      sentAt: { $gte: periodStart, $lte: periodEnd },
    };
    const messagesOverTime = isSuper ? (await WhatsAppMessage.aggregate([
      { $match: msgFilter },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$sentAt', timezone: 'Asia/Kolkata' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])) : [];

    // ── Sales over time ──
    const salesFilter: any = {
      saleDate: { $gte: periodStart, $lte: periodEnd },
      status: 'completed',
    };
    if (!isSuper) salesFilter.reportedByUserId = viewerId;
    else if (assignedTo) salesFilter.reportedByUserId = assignedTo;

    const salesOverTime = await SalesReport.aggregate([
      { $match: salesFilter },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$saleDate', timezone: 'Asia/Kolkata' } },
          count: { $sum: 1 },
          revenue: { $sum: '$saleAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Conversion funnel (leads through stages) ──
    const conversionFunnel = stageDistribution.map((s: any) => ({
      stage: s._id,
      count: s.count,
    }));

    // ── Summary stats ──
    const totalLeads = await Lead.countDocuments(userFilter);
    // Note: Message count is disabled for data isolation - only show for super-admins with proper filters
    const totalMessages = isSuper ? (await WhatsAppMessage.countDocuments({ ...msgFilter })) : 0;
    const totalSales = await SalesReport.countDocuments(salesFilter);
    const totalRevenue = salesOverTime.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);

    // Today's stats
    const todayLeads = await Lead.countDocuments({ ...userFilter, createdAt: { $gte: today } });
    const todayMessages = isSuper ? (await WhatsAppMessage.countDocuments({ direction: 'outbound', sentAt: { $gte: today } })) : 0;
    const todaySales = await SalesReport.countDocuments({ ...salesFilter, saleDate: { $gte: today } });

    // ── Country-wise breakdown ──
    const countryBreakdown = await Lead.aggregate([
      { $match: { ...userFilter } },
      {
        $group: {
          _id: { country: { $ifNull: ['$country', 'India'] }, countryCode: { $ifNull: ['$countryCode', 'IN'] } },
          count: { $sum: 1 },
          enrolled: { $sum: { $cond: [{ $eq: ['$funnelStage', 'enrolled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$funnelStage', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // ── Language-wise breakdown ──
    const languageBreakdown = await Lead.aggregate([
      { $match: { ...userFilter } },
      {
        $group: {
          _id: { language: { $ifNull: ['$language', 'Hindi'] }, languageCode: { $ifNull: ['$languageCode', 'hi'] } },
          count: { $sum: 1 },
          enrolled: { $sum: { $cond: [{ $eq: ['$funnelStage', 'enrolled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$funnelStage', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // ── Region breakdown (North India / South India) ──
    const regionBreakdown = await Lead.aggregate([
      { $match: { ...userFilter, country: 'India' } },
      {
        $group: {
          _id: { $ifNull: ['$region', 'Unknown'] },
          count: { $sum: 1 },
          enrolled: { $sum: { $cond: [{ $eq: ['$funnelStage', 'enrolled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$funnelStage', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // ── State-wise breakdown (India only) ──
    const stateBreakdown = await Lead.aggregate([
      { $match: { ...userFilter, country: 'India', state: { $ne: '' } } },
      {
        $group: {
          _id: { state: '$state', region: { $ifNull: ['$region', ''] } },
          count: { $sum: 1 },
          enrolled: { $sum: { $cond: [{ $eq: ['$funnelStage', 'enrolled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$funnelStage', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // ── Country × Stage matrix ──
    const countryStageMatrix = await Lead.aggregate([
      { $match: { ...userFilter } },
      {
        $group: {
          _id: { country: { $ifNull: ['$country', 'India'] }, stage: { $ifNull: ['$funnelStage', 'new_lead'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.country': 1 } },
    ]);

    // ── Language × Stage matrix ──
    const languageStageMatrix = await Lead.aggregate([
      { $match: { ...userFilter } },
      {
        $group: {
          _id: { language: { $ifNull: ['$language', 'Hindi'] }, stage: { $ifNull: ['$funnelStage', 'new_lead'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.language': 1 } },
    ]);

    return apiSuccess({
      period,
      financialYear: fy.label,
      periodRange: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
      summary: {
        totalLeads,
        totalMessages,
        totalSales,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        todayLeads,
        todayMessages,
        todaySales,
      },
      stageDistribution: stageDistribution.map((s: any) => ({ stage: s._id, count: s.count })),
      conversionFunnel,
      leadsOverTime: leadsOverTime.map((l: any) => ({ period: l._id, count: l.count })),
      stageChanges: stageChanges.map((s: any) => ({
        period: s._id.period,
        stage: s._id.toStage,
        count: s.count,
      })),
      messagesOverTime: messagesOverTime.map((m: any) => ({ period: m._id, count: m.count })),
      salesOverTime: salesOverTime.map((s: any) => ({ period: s._id, count: s.count, revenue: s.revenue })),
      countryBreakdown: countryBreakdown.map((c: any) => ({
        country: c._id.country,
        countryCode: c._id.countryCode,
        count: c.count,
        enrolled: c.enrolled,
        completed: c.completed,
        conversionRate: c.count > 0 ? Math.round(((c.enrolled + c.completed) / c.count) * 100) : 0,
      })),
      languageBreakdown: languageBreakdown.map((l: any) => ({
        language: l._id.language,
        languageCode: l._id.languageCode,
        count: l.count,
        enrolled: l.enrolled,
        completed: l.completed,
        conversionRate: l.count > 0 ? Math.round(((l.enrolled + l.completed) / l.count) * 100) : 0,
      })),
      countryStageMatrix: countryStageMatrix.map((c: any) => ({
        country: c._id.country,
        stage: c._id.stage,
        count: c.count,
      })),
      languageStageMatrix: languageStageMatrix.map((l: any) => ({
        language: l._id.language,
        stage: l._id.stage,
        count: l.count,
      })),
      regionBreakdown: regionBreakdown.map((r: any) => ({
        region: r._id,
        count: r.count,
        enrolled: r.enrolled,
        completed: r.completed,
        conversionRate: r.count > 0 ? Math.round(((r.enrolled + r.completed) / r.count) * 100) : 0,
      })),
      stateBreakdown: stateBreakdown.map((s: any) => ({
        state: s._id.state,
        region: s._id.region,
        count: s.count,
        enrolled: s.enrolled,
        completed: s.completed,
        conversionRate: s.count > 0 ? Math.round(((s.enrolled + s.completed) / s.count) * 100) : 0,
      })),
    });
  } catch (err: any) {
    console.error('[Funnel Analytics GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
