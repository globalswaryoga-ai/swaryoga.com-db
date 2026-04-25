/**
 * AI Call Sync API
 * POST - Sync call status from Retell AI for stuck/missing calls
 * 
 * This endpoint fetches actual call data from Retell's API and updates
 * our database for calls that are stuck in 'ringing' or 'queued' status.
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAICallLog } from '@/lib/schemas/enterpriseSchemas';
import { getCallDetails, mapRetellStatus, mapDisconnectionReason, extractCollectedData } from '@/lib/retellAI';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/crm/calls/sync
 * Body: { action: 'sync_stuck' | 'sync_one', callId?: string }
 * 
 * sync_stuck: Find all calls stuck in ringing/queued and update from Retell
 * sync_one: Sync a specific call by its MongoDB _id
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    const body = await request.json();
    const { action, callId } = body;

    await connectDB();
    const AICallLog = getAICallLog();

    if (action === 'sync_one' && callId) {
      const callLog = await AICallLog.findOne({ _id: callId, ...tf }).lean() as any;
      if (!callLog) return apiError('NOT_FOUND', 'Call not found');
      if (!callLog.retellCallId) return apiError('VALIDATION_ERROR', 'Call has no Retell ID — cannot sync');

      const result = await syncCallFromRetell(AICallLog, callLog);
      return apiSuccess({ synced: 1, results: [result] });
    }

    // sync_stuck: Find all calls stuck in ringing/queued with a retellCallId
    const stuckCalls = await AICallLog.find({
      status: { $in: ['ringing', 'queued', 'in_progress'] },
      retellCallId: { $exists: true, $ne: null },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      ...tf,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean() as any[];

    if (!stuckCalls.length) {
      return apiSuccess({ synced: 0, message: 'No stuck calls found' });
    }

    const results: any[] = [];
    for (const callLog of stuckCalls) {
      try {
        const result = await syncCallFromRetell(AICallLog, callLog);
        results.push(result);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (err: any) {
        results.push({
          callId: callLog._id.toString(),
          retellCallId: callLog.retellCallId,
          error: err.message,
          synced: false,
        });
      }
    }

    const syncedCount = results.filter(r => r.synced).length;
    return apiSuccess({
      synced: syncedCount,
      total: stuckCalls.length,
      results,
    });
  } catch (err: any) {
    console.error('[calls/sync]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * Fetch call details from Retell and update our database
 */
async function syncCallFromRetell(AICallLog: any, callLog: any) {
  const retellCallId = callLog.retellCallId;

  try {
    const call = await getCallDetails(retellCallId);

    if (!call?.call_id) {
      return { callId: callLog._id.toString(), retellCallId, synced: false, error: 'Call not found in Retell' };
    }

    const status = mapRetellStatus(call.call_status, 'call_ended');
    const update: any = { status };

    // Duration
    if (call.start_timestamp && call.end_timestamp) {
      update.duration = Math.round((call.end_timestamp - call.start_timestamp) / 1000);
      update.startedAt = new Date(call.start_timestamp);
      update.endedAt = new Date(call.end_timestamp);
    } else if (call.start_timestamp) {
      update.startedAt = new Date(call.start_timestamp);
    }

    // Transcript
    if (call.transcript) {
      update.transcript = call.transcript;
    } else if (call.transcript_object) {
      update.transcript = call.transcript_object
        .map((t: any) => `${t.role === 'agent' ? 'AI' : 'Lead'}: ${t.content}`)
        .join('\n');
    }

    // Recording
    if (call.recording_url) {
      update.recordingUrl = call.recording_url;
    }

    // Disconnection reason
    if (call.disconnection_reason) {
      update.callEndedReason = mapDisconnectionReason(call.disconnection_reason);

      const reason = call.disconnection_reason;
      if (reason === 'dial_no_answer') update.status = 'no_answer';
      else if (reason === 'dial_busy') update.status = 'busy';
      else if (reason === 'dial_failed') update.status = 'failed';
      else if (reason === 'registered_call_timeout') update.status = 'failed';
      else if (reason === 'concurrency_limit_reached') update.status = 'failed';
      else if (reason === 'no_valid_payment') update.status = 'failed';
      else if (reason.startsWith('error_')) update.status = 'failed';
    }

    // From number
    if (call.from_number) update.fromNumber = call.from_number;

    // AI analysis
    if (call.call_analysis) {
      if (call.call_analysis.call_summary) {
        update.summary = call.call_analysis.call_summary;
      }
      if (call.call_analysis.user_sentiment) {
        const sentimentMap: Record<string, string> = {
          Positive: 'positive',
          Negative: 'negative',
          Neutral: 'neutral',
          Unknown: '',
        };
        update.sentiment = sentimentMap[call.call_analysis.user_sentiment] || '';
      }

      const collected = extractCollectedData(call.call_analysis);
      if (Object.keys(collected).length > 0) {
        update.collectedData = collected;
      }
    }

    // Save
    await AICallLog.updateOne({ _id: callLog._id }, { $set: update });

    return {
      callId: callLog._id.toString(),
      retellCallId,
      synced: true,
      oldStatus: callLog.status,
      newStatus: update.status,
      duration: update.duration || 0,
      callEndedReason: update.callEndedReason || null,
    };
  } catch (err: any) {
    return {
      callId: callLog._id.toString(),
      retellCallId,
      synced: false,
      error: err.message,
    };
  }
}
