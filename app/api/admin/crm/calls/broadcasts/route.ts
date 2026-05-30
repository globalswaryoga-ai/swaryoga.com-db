/**
 * Bulk Call Broadcast API
 * GET  - List broadcasts (grouped by batchName) with period filters
 * POST - Create a scheduled/immediate broadcast
 * PUT  - Cancel a scheduled broadcast
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAICallLog, getAICallTemplate, getLead } from '@/lib/schemas/enterpriseSchemas';
import { createBatchCall, checkRetellConfig } from '@/lib/retellAI';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


// ── Period helpers ──
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
    default: return new Date(0);
  }
}

/**
 * GET /api/admin/crm/calls/broadcasts?period=today|week|month|year|all
 * Returns broadcasts grouped by batchName with aggregated stats
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    await connectDB();
    const AICallLog = getAICallLog();

    const period = request.nextUrl.searchParams.get('period') || 'all';
    const periodStart = getPeriodStart(period);

    // Match filter: only logs with batchName (= broadcast calls)
    const matchFilter: any = { batchName: { $exists: true, $ne: '' } };
    if (period !== 'all') {
      matchFilter.createdAt = { $gte: periodStart };
    }
    Object.assign(matchFilter, tf);

    // Aggregate broadcasts grouped by batchName
    const broadcasts = await AICallLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$batchName',
          totalCalls: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $in: ['$status', ['failed', 'no_answer', 'busy', 'canceled']] }, 1, 0] } },
          queued: { $sum: { $cond: [{ $in: ['$status', ['queued', 'ringing', 'in_progress']] }, 1, 0] } },
          totalDuration: { $sum: '$duration' },
          purpose: { $first: '$purpose' },
          language: { $first: '$language' },
          initiatedBy: { $first: '$initiatedBy' },
          retellBatchId: { $first: '$retellBatchId' },
          templateKey: { $first: '$templateKey' },
          scheduledAt: { $first: '$scheduledAt' },
          createdAt: { $min: '$createdAt' },
          lastCallAt: { $max: '$createdAt' },
          statuses: { $push: '$status' },
          failureReason: { $first: '$callEndedReason' },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
    ]);

    // Build display-ready data
    const data = broadcasts.map((b: any) => {
      const costPerMin = 0.07;
      const totalMinutes = (b.totalDuration || 0) / 60;
      const totalCost = totalMinutes * costPerMin;
      const allDone = b.queued === 0;
      const hasFailed = b.failed > 0;
      const overallStatus = !allDone ? 'in_progress'
        : b.totalCalls === b.completed ? 'completed'
        : hasFailed && b.completed > 0 ? 'partial'
        : 'failed';

      return {
        batchName: b._id,
        totalCalls: b.totalCalls,
        completed: b.completed,
        failed: b.failed,
        active: b.queued,
        totalDuration: b.totalDuration || 0,
        totalCost: Math.round(totalCost * 100) / 100,
        purpose: b.purpose,
        language: b.language,
        initiatedBy: b.initiatedBy,
        retellBatchId: b.retellBatchId,
        templateKey: b.templateKey,
        scheduledAt: b.scheduledAt,
        createdAt: b.createdAt,
        lastCallAt: b.lastCallAt,
        overallStatus,
        failureReason: b.failureReason || null,
      };
    });

    // Period summary stats
    const summary = {
      totalBroadcasts: data.length,
      totalCalls: data.reduce((s: number, b: any) => s + b.totalCalls, 0),
      totalCompleted: data.reduce((s: number, b: any) => s + b.completed, 0),
      totalFailed: data.reduce((s: number, b: any) => s + b.failed, 0),
      totalActive: data.reduce((s: number, b: any) => s + b.active, 0),
      totalDuration: data.reduce((s: number, b: any) => s + b.totalDuration, 0),
      totalCost: Math.round(data.reduce((s: number, b: any) => s + b.totalCost, 0) * 100) / 100,
    };

    return apiSuccess({ broadcasts: data, summary, period });
  } catch (err: any) {
    console.error('[broadcasts GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/calls/broadcasts
 * Body: { leadIds, templateId, scheduledAt?, language, purpose, batchName?, concurrency? }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');
    const tfTpl = tenantFilter(decoded, 'createdBy');

    const body = await request.json();
    const { leadIds, extraContacts, templateId, scheduledAt, language, purpose, batchName: customName, concurrency } = body;

    if (!leadIds?.length && !extraContacts?.length) return apiError('VALIDATION_ERROR', 'Select at least one lead');
    if (!templateId) return apiError('VALIDATION_ERROR', 'Select a calling template');

    await connectDB();
    const Lead = getLead();
    const AICallLog = getAICallLog();
    const AICallTemplate = getAICallTemplate();

    // Load template
    const template = await AICallTemplate.findOne({ _id: templateId, ...tfTpl }).lean() as any;
    if (!template) return apiError('NOT_FOUND', 'Template not found');

    const callLang = language === 'hi' ? 'hi' : 'en';
    const langLabel = callLang === 'hi' ? 'Hindi' : 'English';
    const adminId = decoded.userId || decoded.email || 'admin';
    const batchLabel = customName || `${template.name} - ${langLabel} - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    const isScheduled = !!scheduledAt;

    // Build tasks
    const tasks: Array<{ toNumber: string; leadName: string; leadId: string; dynamicVars: Record<string, string> }> = [];
    const skippedIds: string[] = [];

    // Tasks from existing leads
    if (leadIds?.length) {
      const leads = await Lead.find({ _id: { $in: leadIds } })
        .select('name phoneNumber email funnelStage workshopName country labels source displayName')
        .lean() as any[];

      for (const lead of leads) {
        const phone = (lead.phoneNumber || '').replace(/\D/g, '');
        if (!phone || phone.length < 8) { skippedIds.push(String(lead._id)); continue; }
        const fullPhone = phone.length === 10 ? `+91${phone}` : `+${phone}`;
        tasks.push({
          toNumber: fullPhone,
          leadName: lead.displayName || lead.name || 'there',
          leadId: String(lead._id),
          dynamicVars: {
            lead_email: lead.email || '',
            lead_stage: lead.funnelStage || '',
            workshop_name: lead.workshopName || 'Swar Yoga workshop',
            lead_country: lead.country || '',
            lead_source: lead.source || '',
          },
        });
      }
    }

    // Tasks from manually entered contacts — create minimal lead records
    if (extraContacts?.length) {
      for (const contact of extraContacts as Array<{ name: string; phoneNumber: string }>) {
        const phone = (contact.phoneNumber || '').replace(/\D/g, '');
        if (!phone || phone.length < 8) { skippedIds.push(contact.phoneNumber); continue; }
        const fullPhone = phone.length === 10 ? `+91${phone}` : `+${phone}`;

        // Upsert a minimal lead so the call log has a real leadId
        let lead = await Lead.findOne({ phoneNumber: phone }).lean() as any;
        if (!lead) {
          lead = await Lead.create({
            name: contact.name || 'Unknown',
            displayName: contact.name || 'Unknown',
            phoneNumber: phone,
            status: 'new_lead',
            source: 'manual',
            initiatedBy: adminId,
            assignedToUserId: decoded.userId || undefined,
          });
        }

        tasks.push({
          toNumber: fullPhone,
          leadName: contact.name || 'there',
          leadId: String(lead._id),
          dynamicVars: { lead_email: '', lead_stage: '', workshop_name: 'Swar Yoga workshop', lead_country: '', lead_source: 'manual' },
        });
      }
    }

    if (!tasks.length) return apiError('VALIDATION_ERROR', 'No valid phone numbers found');

    // Create AICallLog entries
    const logEntries = tasks.map(t => ({
      leadId: t.leadId,
      direction: 'outbound' as const,
      purpose: purpose || template.key || 'custom',
      customPrompt: template.promptText || '',
      status: isScheduled ? 'queued' : 'queued',
      phoneNumber: t.toNumber.replace(/\+/g, ''),
      language: callLang === 'hi' ? 'hi-IN' : 'en-IN',
      initiatedBy: adminId,
      batchName: batchLabel,
      templateId: String(template._id),
      templateKey: template.key,
      scheduledAt: isScheduled ? new Date(scheduledAt) : undefined,
    }));

    const createdLogs = await AICallLog.insertMany(logEntries);

    // If not scheduled, fire immediately via Retell
    if (!isScheduled) {
      const configStatus = checkRetellConfig();
      if (!configStatus.configured) {
        return apiError('SERVICE_UNAVAILABLE', `Retell AI not configured. Missing: ${configStatus.missing.join(', ')}`);
      }

      const result = await createBatchCall({
        name: batchLabel,
        tasks,
        purpose: purpose || 'custom',
        language: callLang as 'hi' | 'en',
        customPrompt: template.promptText,
        maxConcurrency: concurrency || 5,
      });

      if (!result.success) {
        await AICallLog.updateMany(
          { _id: { $in: createdLogs.map((l: any) => l._id) }, ...tf },
          { $set: { status: 'failed', callEndedReason: result.error } }
        );
        return apiError('SERVER_ERROR', result.error || 'Batch call failed');
      }

      await AICallLog.updateMany(
        { _id: { $in: createdLogs.map((l: any) => l._id) }, ...tf },
        { $set: { retellBatchId: result.batchId, status: 'ringing', startedAt: new Date() } }
      );
    }

    const costPerMin = 0.07;
    const avgMin = 2;

    return apiSuccess({
      batchName: batchLabel,
      totalQueued: tasks.length,
      skipped: skippedIds.length,
      scheduled: isScheduled,
      scheduledAt: isScheduled ? scheduledAt : null,
      templateName: template.name,
      estimatedCost: `$${(tasks.length * avgMin * costPerMin).toFixed(2)}`,
      message: isScheduled
        ? `Broadcast "${batchLabel}" scheduled for ${new Date(scheduledAt).toLocaleString('en-IN')} with ${tasks.length} leads`
        : `Broadcast "${batchLabel}" started: ${tasks.length} calls queued`,
    });
  } catch (err: any) {
    console.error('[broadcasts POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * PUT /api/admin/crm/calls/broadcasts
 * Body: { batchName, action: 'cancel' }
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    const body2 = await request.json();
    const { batchName, action, scheduledAt: newScheduledAt } = body2;
    if (!batchName) return apiError('VALIDATION_ERROR', 'batchName is required');

    await connectDB();
    const AICallLog = getAICallLog();

    if (action === 'cancel') {
      const result = await AICallLog.updateMany(
        { batchName, status: { $in: ['queued', 'ringing'] }, ...tf },
        { $set: { status: 'canceled', callEndedReason: 'Cancelled by admin' } }
      );
      return apiSuccess({ cancelled: result.modifiedCount, message: `Cancelled ${result.modifiedCount} pending calls in "${batchName}"` });
    }

    if (action === 'reschedule') {
      if (!newScheduledAt) return apiError('VALIDATION_ERROR', 'scheduledAt is required for reschedule');
      // Reset failed/canceled calls back to queued so the cron fires them
      const result = await AICallLog.updateMany(
        { batchName, status: { $in: ['queued', 'failed', 'canceled', 'no_answer', 'busy'] }, ...tf },
        { $set: { scheduledAt: new Date(newScheduledAt), status: 'queued', callEndedReason: null, retellBatchId: null } }
      );
      return apiSuccess({ updated: result.modifiedCount, message: `Rescheduled ${result.modifiedCount} calls in "${batchName}" to ${new Date(newScheduledAt).toLocaleString('en-IN')}` });
    }

    if (action === 'delete') {
      const result = await AICallLog.deleteMany(
        { batchName, status: { $in: ['queued', 'canceled'] }, ...tf }
      );
      return apiSuccess({ deleted: result.deletedCount, message: `Deleted ${result.deletedCount} call records from "${batchName}"` });
    }

    return apiError('VALIDATION_ERROR', 'Unknown action');
  } catch (err: any) {
    console.error('[broadcasts PUT]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * GET /api/admin/crm/calls/broadcasts/detail?batchName=xxx
 * Returns individual call logs for a specific broadcast
 */
