/**
 * AI Call Start API
 * POST - Start an AI call to a lead via Retell.ai
 * GET  - Get call history for a lead
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead, getAICallLog } from '@/lib/schemas/enterpriseSchemas';
import { createOutboundCall, checkRetellConfig } from '@/lib/retellAI';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/calls?leadId=xxx
 * Get call history for a specific lead or all recent calls
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const AICallLog = getAICallLog();

    const leadId = request.nextUrl.searchParams.get('leadId');
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 20), 100);

    const query: any = {};
    if (leadId) query.leadId = leadId;

    const calls = await AICallLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Check Retell config status
    const configStatus = checkRetellConfig();

    return apiSuccess({ calls, configured: configStatus.configured, missing: configStatus.missing });
  } catch (err: any) {
    console.error('[calls GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/calls
 * Start an AI call to a lead
 * Body: { leadId, purpose, language?, customPrompt? }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const { leadId, purpose, language, customPrompt } = await request.json();

    if (!leadId) return apiError('VALIDATION_ERROR', 'leadId is required');
    if (!purpose) return apiError('VALIDATION_ERROR', 'purpose is required');

    // Check config
    const configStatus = checkRetellConfig();
    if (!configStatus.configured) {
      return apiError('SERVICE_UNAVAILABLE', `Retell AI not configured. Missing: ${configStatus.missing.join(', ')}`);
    }

    await connectDB();
    const Lead = getLead();
    const AICallLog = getAICallLog();

    // Get lead details
    const lead = await Lead.findById(leadId)
      .select('name phoneNumber email funnelStage workshopName country labels source language displayName')
      .lean() as any;

    if (!lead) return apiError('NOT_FOUND', 'Lead not found');

    const phone = (lead.phoneNumber || '').replace(/\D/g, '');
    if (!phone) return apiError('VALIDATION_ERROR', 'Lead has no phone number');

    // Determine language
    const callLang = language || (lead.language?.toLowerCase()?.includes('hindi') ? 'hi' : 'en');

    // Create call log entry (status: queued)
    const callLog = await AICallLog.create({
      leadId,
      direction: 'outbound',
      purpose,
      customPrompt: customPrompt || '',
      status: 'queued',
      phoneNumber: phone,
      language: callLang === 'hi' ? 'hi-IN' : 'en-IN',
      initiatedBy: decoded.userId || decoded.email || 'admin',
    });

    // Trigger the call via Retell
    const result = await createOutboundCall({
      toNumber: phone,
      leadName: lead.displayName || lead.name || 'there',
      purpose,
      language: callLang as 'hi' | 'en',
      customPrompt,
      leadContext: {
        name: lead.displayName || lead.name || '',
        phone,
        email: lead.email,
        stage: lead.funnelStage,
        workshopName: lead.workshopName,
        country: lead.country,
        labels: lead.labels,
        source: lead.source,
        language: lead.language,
      },
    });

    if (!result.success) {
      // Update call log to failed
      await AICallLog.updateOne({ _id: callLog._id }, { $set: { status: 'failed', callEndedReason: result.error } });
      return apiError('SERVER_ERROR', result.error || 'Failed to start call');
    }

    // Update call log with Retell call ID
    await AICallLog.updateOne(
      { _id: callLog._id },
      { $set: { retellCallId: result.callId, status: 'ringing', startedAt: new Date() } }
    );

    return apiSuccess({
      callId: String(callLog._id),
      retellCallId: result.callId,
      status: 'ringing',
      message: `AI call started to ${lead.displayName || lead.name || phone}`,
    });
  } catch (err: any) {
    console.error('[calls POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
