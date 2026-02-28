/**
 * Retell AI Webhook
 * POST - Receive call status updates from Retell.ai
 *
 * Retell sends: call_started, call_ended, call_analyzed
 * We update AICallLog and optionally update Lead fields from collected data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAICallLog, getLead } from '@/lib/schemas/enterpriseSchemas';
import { mapRetellStatus, mapDisconnectionReason, extractCollectedData } from '@/lib/retellAI';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event;
    const call = body.call;

    if (!call?.call_id) {
      return NextResponse.json({ received: true, error: 'No call_id' }, { status: 200 });
    }

    console.log(`[retell-webhook] Event: ${event}, Call ID: ${call.call_id}, Status: ${call.call_status}`);

    await connectDB();
    const AICallLog = getAICallLog();

    // Find our call log entry
    const callLog = await AICallLog.findOne({ retellCallId: call.call_id }) as any;
    if (!callLog) {
      console.warn(`[retell-webhook] No call log found for retellCallId: ${call.call_id}`);
      return NextResponse.json({ received: true, warning: 'Call not found in our system' }, { status: 200 });
    }

    const status = mapRetellStatus(call.call_status, event);

    // Build update object
    const update: any = {
      status,
    };

    if (event === 'call_started') {
      update.status = 'in_progress';
      if (call.start_timestamp) {
        update.startedAt = new Date(call.start_timestamp);
      }
    }

    if (event === 'call_ended' || event === 'call_analyzed') {
      // Duration
      if (call.start_timestamp && call.end_timestamp) {
        update.duration = Math.round((call.end_timestamp - call.start_timestamp) / 1000);
        update.endedAt = new Date(call.end_timestamp);
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

        // Map specific reasons to appropriate status
        if (call.disconnection_reason === 'dial_no_answer') update.status = 'no_answer';
        if (call.disconnection_reason === 'dial_busy') update.status = 'busy';
        if (call.disconnection_reason.startsWith('error_')) update.status = 'failed';
      }

      // From number
      if (call.from_number) update.fromNumber = call.from_number;
    }

    if (event === 'call_analyzed') {
      // AI analysis results
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

        // Extract collected data
        const collected = extractCollectedData(call.call_analysis);
        if (Object.keys(collected).length > 0) {
          update.collectedData = collected;

          // Auto-update lead fields from collected data
          try {
            await updateLeadFromCollectedData(callLog.leadId, collected, callLog._id);
          } catch (e) {
            console.error('[retell-webhook] Error updating lead from collected data:', e);
          }
        }
      }
    }

    // Save
    await AICallLog.updateOne({ _id: callLog._id }, { $set: update });

    return NextResponse.json({ received: true, status: update.status });
  } catch (err: any) {
    console.error('[retell-webhook] Error:', err);
    // Always return 200 to Retell to prevent retries
    return NextResponse.json({ received: true, error: err.message }, { status: 200 });
  }
}

/**
 * Auto-update lead fields from data collected during call
 */
async function updateLeadFromCollectedData(
  leadId: string,
  collected: Record<string, any>,
  callLogId: string
) {
  const Lead = getLead();
  const AICallLog = getAICallLog();
  const lead = await Lead.findById(leadId).lean() as any;
  if (!lead) return;

  const updates: any = {};
  const crmUpdates: any[] = [];

  // Map common collected fields
  const fieldMap: Record<string, string> = {
    email: 'email',
    country: 'country',
    city: 'city',
    state: 'state',
    language: 'language',
    name: 'name',
    workshop_interest: 'workshopName',
  };

  for (const [collectedKey, leadField] of Object.entries(fieldMap)) {
    if (collected[collectedKey] && typeof collected[collectedKey] === 'string') {
      const newVal = collected[collectedKey].trim();
      const oldVal = lead[leadField] || '';
      if (newVal && newVal !== oldVal) {
        updates[leadField] = newVal;
        crmUpdates.push({
          field: leadField,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await Lead.updateOne({ _id: leadId }, { $set: updates });

    // Record CRM updates in call log
    await AICallLog.updateOne({ _id: callLogId }, { $set: { crmUpdates } });

    console.log(`[retell-webhook] Updated lead ${leadId} fields:`, Object.keys(updates));
  }
}
