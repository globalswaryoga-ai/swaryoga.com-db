/**
 * Batch AI Call API
 * POST - Create a batch of outbound AI calls via Retell
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead, getAICallLog } from '@/lib/schemas/enterpriseSchemas';
import { createBatchCall, checkRetellConfig } from '@/lib/retellAI';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/calls/batch
 * Body: { leadIds: string[], purpose, language, customPrompt?, name?, maxConcurrency? }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    const configStatus = checkRetellConfig();
    if (!configStatus.configured) {
      return apiError('SERVICE_UNAVAILABLE', `Retell AI not configured. Missing: ${configStatus.missing.join(', ')}`);
    }

    const body = await request.json();
    const { leadIds, purpose, language, customPrompt, name, maxConcurrency, overrideAgentId, overrideVoiceId } = body;

    if (!leadIds?.length) return apiError('VALIDATION_ERROR', 'leadIds array is required');
    if (!purpose) return apiError('VALIDATION_ERROR', 'purpose is required');

    await connectDB();
    const Lead = getLead();
    const AICallLog = getAICallLog();

    // Load all selected leads
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select('name phoneNumber email funnelStage workshopName country labels source language displayName')
      .lean() as any[];

    if (!leads.length) return apiError('NOT_FOUND', 'No leads found for the provided IDs');

    const callLang = language || 'hi';
    const langForLog = callLang === 'hi' ? 'hi-IN' : callLang === 'en' ? 'en-IN' : callLang;
    const langLabel = callLang === 'hi' ? 'Hindi' : callLang === 'en' ? 'English' : callLang;

    // Build tasks — only leads with valid phone numbers
    const tasks: Array<{ toNumber: string; leadName: string; leadId: string; dynamicVars: Record<string, string> }> = [];
    const skippedIds: string[] = [];

    for (const lead of leads) {
      const phone = (lead.phoneNumber || '').replace(/\D/g, '');
      if (!phone || phone.length < 8) {
        skippedIds.push(String(lead._id));
        continue;
      }
      const fullPhone = phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : `+${phone}`);
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
          lead_labels: (lead.labels || []).join(', '),
        },
      });
    }

    if (!tasks.length) {
      return apiError('VALIDATION_ERROR', 'No leads have valid phone numbers');
    }

    const batchName = name || `${purpose} - ${langLabel} - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    const adminId = decoded.userId || decoded.email || 'admin';

    // Create batch call log entries (status: queued)
    const logEntries = tasks.map(t => ({
      leadId: t.leadId,
      direction: 'outbound',
      purpose: purpose || 'custom',
      customPrompt: customPrompt || '',
      status: 'queued',
      phoneNumber: t.toNumber.replace(/\+/g, ''),
      language: langForLog,
      initiatedBy: adminId,
      batchName,
    }));

    const createdLogs = await AICallLog.insertMany(logEntries);

    // Execute bulk call via Retell batch API (agent auto-resolved from language mapping)
    const result = await createBatchCall({
      name: batchName,
      tasks,
      purpose,
      language: callLang,
      customPrompt,
      overrideAgentId: overrideAgentId || undefined,
      overrideVoiceId: overrideVoiceId || undefined,
      maxConcurrency: maxConcurrency || 5,
    });

    if (!result.success) {
      // Mark all logs as failed
      await AICallLog.updateMany(
        { _id: { $in: createdLogs.map((l: any) => l._id) }, ...tf },
        { $set: { status: 'failed', callEndedReason: result.error } }
      );
      return apiError('SERVER_ERROR', result.error || 'Batch call failed');
    }

    // Update logs with batch ID
    await AICallLog.updateMany(
      { _id: { $in: createdLogs.map((l: any) => l._id) }, ...tf },
      { $set: { retellBatchId: result.batchId, status: 'ringing', startedAt: new Date() } }
    );

    const costPerDial = 0.07; // $0.07/min avg
    return apiSuccess({
      batchId: result.batchId,
      batchName,
      totalQueued: tasks.length,
      skipped: skippedIds.length,
      estimatedCost: `$${(tasks.length * costPerDial).toFixed(2)}`,
      costPerDial: '$0.07/min',
      message: `Batch "${batchName}" started: ${tasks.length} calls queued${skippedIds.length ? `, ${skippedIds.length} skipped (no phone)` : ''}`,
    });
  } catch (err: any) {
    console.error('[calls/batch POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
