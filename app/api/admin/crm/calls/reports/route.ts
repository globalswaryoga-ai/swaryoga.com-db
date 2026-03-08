/**
 * Call Reports / Analytics API
 * GET /api/admin/crm/calls/reports
 * Params: period (today|week|month|year|all), language, initiatedBy, minCost, maxCost, view (analytics|actionable)
 * Returns aggregated analytics data for charts + table + actionable call lists
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAICallLog, getLead } from '@/lib/schemas/enterpriseSchemas';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    case 'week': {
      const d = new Date(now);
      const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case 'year': {
      return new Date(now.getFullYear(), 0, 1);
    }
    default:
      return new Date(0);
  }
}

/** Format a call record with lead info for actionable lists */
function formatCallRow(c: any, leadMap: Map<string, any>, costPerMin: number) {
  const lead = c.leadId ? leadMap.get(String(c.leadId)) : null;
  return {
    _id: c._id,
    leadId: c.leadId,
    leadName: lead?.name || '',
    leadPhone: lead?.phone || c.phoneNumber || '',
    leadStage: lead?.stage || '',
    phoneNumber: c.phoneNumber || '',
    status: c.status,
    duration: c.duration || 0,
    cost: Math.round((((c.duration || 0) / 60) * costPerMin) * 100) / 100,
    sentiment: c.sentiment || '',
    summary: c.summary || '',
    purpose: c.purpose || '',
    language: c.language || '',
    direction: c.direction || 'outbound',
    initiatedBy: c.initiatedBy || '',
    batchName: c.batchName || '',
    createdAt: c.createdAt,
    callEndedReason: c.callEndedReason || '',
    recordingUrl: c.recordingUrl || '',
    collectedData: c.collectedData || {},
    questionsAsked: c.collectedData?.questions_asked || '',
    interested: c.collectedData?.interested || '',
    transcript: c.transcript || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    await connectDB();
    const AICallLog = getAICallLog();
    const Lead = getLead();

    const params = request.nextUrl.searchParams;
    const period = params.get('period') || 'month';
    const language = params.get('language') || '';
    const initiatedBy = params.get('initiatedBy') || '';
    const minCost = parseFloat(params.get('minCost') || '0');
    const maxCost = parseFloat(params.get('maxCost') || '0');
    const view = params.get('view') || 'analytics'; // 'analytics' or 'actionable'

    // Build match filter
    const match: any = {};
    if (period !== 'all') {
      match.createdAt = { $gte: getPeriodStart(period) };
    }
    if (language) {
      match.language = { $regex: language, $options: 'i' };
    }
    if (initiatedBy) {
      match.initiatedBy = initiatedBy;
    }
    Object.assign(match, tf);

    const costPerMin = 0.07;

    // ── 1. Overview summary (always computed) ──
    const overviewPipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $in: ['$status', ['failed', 'no_answer', 'busy', 'canceled']] }, 1, 0] } },
          active: { $sum: { $cond: [{ $in: ['$status', ['queued', 'ringing', 'in_progress']] }, 1, 0] } },
          noAnswer: { $sum: { $cond: [{ $in: ['$status', ['no_answer', 'ringing']] }, 1, 0] } },
          busy: { $sum: { $cond: [{ $eq: ['$status', 'busy'] }, 1, 0] } },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
          avgDuration: { $avg: { $ifNull: ['$duration', 0] } },
          outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
          inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
          withQueries: { $sum: { $cond: [{ $and: [
            { $ne: [{ $ifNull: ['$collectedData.questions_asked', ''] }, ''] },
            { $ne: [{ $ifNull: ['$collectedData.questions_asked', ''] }, null] },
          ] }, 1, 0] } },
          answerCallsDone: { $sum: { $cond: [{ $and: [
            { $eq: ['$purpose', 'answer_questions'] },
            { $eq: ['$status', 'completed'] },
          ] }, 1, 0] } },
        },
      },
    ];

    const overviewResult = await AICallLog.aggregate(overviewPipeline);
    const overview = overviewResult[0] || {
      totalCalls: 0, completed: 0, failed: 0, active: 0,
      noAnswer: 0, busy: 0,
      totalDuration: 0, avgDuration: 0, outbound: 0, inbound: 0,
      withQueries: 0, answerCallsDone: 0,
    };
    overview.totalCost = Math.round(((overview.totalDuration || 0) / 60) * costPerMin * 100) / 100;
    overview.avgCost = overview.totalCalls > 0
      ? Math.round((overview.totalCost / overview.totalCalls) * 100) / 100
      : 0;

    // ── Actionable view: return categorized call lists ──
    if (view === 'actionable') {
      // Fetch all calls in period (up to 500) with full data
      const allCalls = await AICallLog.find(match)
        .sort({ createdAt: -1 })
        .limit(500)
        .lean() as any[];

      // Build lead map for enrichment
      const leadIds = [...new Set(allCalls.map(c => String(c.leadId)).filter(Boolean))];
      const leads = leadIds.length > 0
        ? await Lead.find({ _id: { $in: leadIds } }).select('name phone stage email').lean() as any[]
        : [];
      const leadMap = new Map(leads.map(l => [String(l._id), l]));

      // Categorize calls
      const inboundCalls = allCalls.filter(c => c.direction === 'inbound');
      const outboundCalls = allCalls.filter(c => c.direction === 'outbound');
      const completedCalls = allCalls.filter(c => c.status === 'completed');
      const noAnswerCalls = allCalls.filter(c => ['no_answer', 'ringing'].includes(c.status));
      const failedCalls = allCalls.filter(c => ['failed', 'busy', 'canceled'].includes(c.status));

      // Calls with questions asked (new queries)
      const queryCalls = allCalls.filter(c => {
        const q = c.collectedData?.questions_asked;
        return q && typeof q === 'string' && q.trim().length > 0;
      });

      // Answer calls completed (purpose=answer_questions, status=completed)
      const answerDoneCalls = allCalls.filter(c =>
        c.purpose === 'answer_questions' && c.status === 'completed'
      );

      // Pending answers: leads that asked questions but haven't had an answer call completed yet
      // Group queryCalls by leadId, check if there's a subsequent answer_questions completed call
      const queryLeadIds = [...new Set(queryCalls.map(c => String(c.leadId)))];
      const answerDoneLeadIds = new Set(answerDoneCalls.map(c => String(c.leadId)));
      const pendingAnswerCalls = queryCalls.filter(c => !answerDoneLeadIds.has(String(c.leadId)));

      // Overdue: no_answer/failed calls older than 24h with no successful retry
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const successfulLeads = new Set(
        completedCalls.map(c => String(c.leadId))
      );
      const overdueCalls = allCalls.filter(c =>
        ['no_answer', 'ringing', 'failed', 'busy'].includes(c.status) &&
        new Date(c.createdAt) < twentyFourHoursAgo &&
        !successfulLeads.has(String(c.leadId))
      );
      // Deduplicate overdue by leadId (keep most recent)
      const overdueMap = new Map<string, any>();
      for (const c of overdueCalls) {
        const lid = String(c.leadId);
        if (!overdueMap.has(lid) || new Date(c.createdAt) > new Date(overdueMap.get(lid).createdAt)) {
          overdueMap.set(lid, c);
        }
      }
      const uniqueOverdueCalls = [...overdueMap.values()];

      const fmt = (list: any[]) => list.slice(0, 100).map(c => formatCallRow(c, leadMap, costPerMin));

      return apiSuccess({
        period,
        overview,
        actionable: {
          inbound: { count: inboundCalls.length, calls: fmt(inboundCalls) },
          outbound: { count: outboundCalls.length, calls: fmt(outboundCalls) },
          completed: { count: completedCalls.length, calls: fmt(completedCalls) },
          noAnswer: { count: noAnswerCalls.length, calls: fmt(noAnswerCalls) },
          failed: { count: failedCalls.length, calls: fmt(failedCalls) },
          newQueries: { count: queryCalls.length, calls: fmt(queryCalls) },
          answersDone: { count: answerDoneCalls.length, calls: fmt(answerDoneCalls) },
          pendingAnswers: { count: pendingAnswerCalls.length, calls: fmt(pendingAnswerCalls) },
          overdue: { count: uniqueOverdueCalls.length, calls: fmt(uniqueOverdueCalls) },
        },
      });
    }

    // ── 2. Daily volume chart data (last 30 days or period) ──
    const dailyPipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $in: ['$status', ['failed', 'no_answer', 'busy', 'canceled']] }, 1, 0] } },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 365 },
    ];
    const dailyData = await AICallLog.aggregate(dailyPipeline);
    const chartDaily = dailyData.map((d: any) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      total: d.total,
      completed: d.completed,
      failed: d.failed,
      cost: Math.round(((d.totalDuration || 0) / 60) * costPerMin * 100) / 100,
    }));

    // ── 3. By Language ──
    const langPipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
        },
      },
      { $sort: { count: -1 } },
    ];
    const langData = await AICallLog.aggregate(langPipeline);
    const byLanguage = langData.map((l: any) => ({
      language: l._id || 'Unknown',
      count: l.count,
      completed: l.completed,
      successRate: l.count > 0 ? Math.round((l.completed / l.count) * 100) : 0,
      cost: Math.round(((l.totalDuration || 0) / 60) * costPerMin * 100) / 100,
    }));

    // ── 4. By Admin User ──
    const adminPipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$initiatedBy',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $in: ['$status', ['failed', 'no_answer', 'busy', 'canceled']] }, 1, 0] } },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
        },
      },
      { $sort: { count: -1 } },
    ];
    const adminData = await AICallLog.aggregate(adminPipeline);
    const byAdmin = adminData.map((a: any) => ({
      admin: a._id || 'System',
      count: a.count,
      completed: a.completed,
      failed: a.failed,
      successRate: a.count > 0 ? Math.round((a.completed / a.count) * 100) : 0,
      cost: Math.round(((a.totalDuration || 0) / 60) * costPerMin * 100) / 100,
    }));

    // ── 5. By Purpose (template key) ──
    const purposePipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$purpose',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
        },
      },
      { $sort: { count: -1 } },
    ];
    const purposeData = await AICallLog.aggregate(purposePipeline);
    const byPurpose = purposeData.map((p: any) => ({
      purpose: p._id || 'Unknown',
      count: p.count,
      completed: p.completed,
      successRate: p.count > 0 ? Math.round((p.completed / p.count) * 100) : 0,
      cost: Math.round(((p.totalDuration || 0) / 60) * costPerMin * 100) / 100,
    }));

    // ── 6. By Sentiment ──
    const sentimentPipeline: any[] = [
      { $match: { ...match, sentiment: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ];
    const sentimentData = await AICallLog.aggregate(sentimentPipeline);
    const bySentiment = sentimentData.map((s: any) => ({
      sentiment: s._id,
      count: s.count,
    }));

    // ── 7. Recent calls table (last 200) ──
    const costFilter: any = {};
    if (minCost > 0 || maxCost > 0) {
      // We'll filter by duration since cost = duration/60 * 0.07
      if (minCost > 0) costFilter.duration = { ...costFilter.duration, $gte: (minCost / costPerMin) * 60 };
      if (maxCost > 0) costFilter.duration = { ...costFilter.duration, $lte: (maxCost / costPerMin) * 60 };
    }

    const recentCalls = await AICallLog.find({ ...match, ...costFilter })
      .sort({ createdAt: -1 })
      .limit(200)
      .select('leadId phoneNumber status duration sentiment summary purpose language direction initiatedBy batchName createdAt startedAt endedAt callEndedReason recordingUrl')
      .lean() as any[];

    const callsTable = recentCalls.map((c: any) => ({
      _id: c._id,
      leadId: c.leadId,
      phoneNumber: c.phoneNumber,
      status: c.status,
      duration: c.duration || 0,
      cost: Math.round((((c.duration || 0) / 60) * costPerMin) * 100) / 100,
      sentiment: c.sentiment || '',
      summary: c.summary || '',
      purpose: c.purpose || '',
      language: c.language || '',
      direction: c.direction || 'outbound',
      initiatedBy: c.initiatedBy || '',
      batchName: c.batchName || '',
      createdAt: c.createdAt,
      callEndedReason: c.callEndedReason || '',
      recordingUrl: c.recordingUrl || '',
    }));

    // ── 8. Hourly distribution (for today or recent data) ── 
    const hourlyPipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const hourlyData = await AICallLog.aggregate(hourlyPipeline);
    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      count: hourlyData.find((d: any) => d._id === h)?.count || 0,
    }));

    return apiSuccess({
      period,
      overview,
      chartDaily,
      byLanguage,
      byAdmin,
      byPurpose,
      bySentiment,
      byHour,
      calls: callsTable,
    });
  } catch (err: any) {
    console.error('[reports GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/calls/reports
 * Actions: mark_answered, mark_overdue_resolved
 * Body: { action, callId, leadId, notes }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    await connectDB();
    const AICallLog = getAICallLog();

    const body = await request.json();
    const { action, callId, leadId, notes } = body;

    if (action === 'mark_answered') {
      // Mark a query call as answered by adding a note
      if (!callId) return apiError('VALIDATION_ERROR', 'callId required');
      const callLog = await AICallLog.findOne({ _id: callId, ...tf });
      if (!callLog) return apiError('NOT_FOUND', 'Call not found');
      
      // Update collectedData to indicate questions were answered
      const cd = callLog.collectedData || {};
      cd.questions_answered = true;
      cd.answered_at = new Date().toISOString();
      cd.answered_by = decoded.userId || 'admin';
      if (notes) cd.answer_notes = notes;
      
      await AICallLog.updateOne({ _id: callId, ...tf }, { $set: { collectedData: cd } });
      return apiSuccess({ updated: true });
    }

    if (action === 'mark_resolved') {
      // Mark an overdue/failed call as resolved (no need to retry)
      if (!callId) return apiError('VALIDATION_ERROR', 'callId required');
      const cd: any = {};
      cd.overdue_resolved = true;
      cd.resolved_at = new Date().toISOString();
      cd.resolved_by = decoded.userId || 'admin';
      if (notes) cd.resolution_notes = notes;

      await AICallLog.updateOne(
        { _id: callId, ...tf },
        { $set: { 'collectedData.overdue_resolved': true, 'collectedData.resolved_at': cd.resolved_at, 'collectedData.resolved_by': cd.resolved_by, ...(notes ? { 'collectedData.resolution_notes': notes } : {}) } }
      );
      return apiSuccess({ updated: true });
    }

    return apiError('VALIDATION_ERROR', 'Unknown action');
  } catch (err: any) {
    console.error('[reports POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
