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

    // Find our call log entry — try by retellCallId first, then fallback for batch calls
    let callLog = await AICallLog.findOne({ retellCallId: call.call_id }) as any;
    
    if (!callLog && call.to_number) {
      // Fallback: match by phone number for batch/broadcast calls that don't have individual retellCallId
      const cleanPhone = (call.to_number || '').replace(/\D/g, '');
      if (cleanPhone) {
        callLog = await AICallLog.findOne({
          phoneNumber: { $in: [cleanPhone, cleanPhone.replace(/^91/, ''), `+${cleanPhone}`] },
          status: { $in: ['queued', 'ringing'] },
          retellCallId: { $exists: false },
        }).sort({ createdAt: -1 }) as any;
        
        if (!callLog) {
          // Also try matching calls that have retellCallId but might be a different format
          callLog = await AICallLog.findOne({
            phoneNumber: { $in: [cleanPhone, cleanPhone.replace(/^91/, ''), `+${cleanPhone}`] },
            status: { $in: ['queued', 'ringing'] },
          }).sort({ createdAt: -1 }) as any;
        }
        
        if (callLog) {
          // Store the retellCallId for future webhook events on this call
          await AICallLog.updateOne({ _id: callLog._id }, { $set: { retellCallId: call.call_id } });
          console.log(`[retell-webhook] Matched call by phone ${cleanPhone}, stored retellCallId: ${call.call_id}`);
        }
      }
    }
    
    if (!callLog) {
      console.warn(`[retell-webhook] No call log found for retellCallId: ${call.call_id}, to: ${call.to_number}`);
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

        // Map specific disconnection reasons to appropriate status
        const reason = call.disconnection_reason;
        if (reason === 'dial_no_answer') update.status = 'no_answer';
        else if (reason === 'dial_busy') update.status = 'busy';
        else if (reason === 'dial_failed') update.status = 'failed';
        else if (reason === 'registered_call_timeout') update.status = 'failed';
        else if (reason === 'concurrency_limit_reached') update.status = 'failed';
        else if (reason === 'no_valid_payment') update.status = 'failed';
        else if (reason.startsWith('error_')) update.status = 'failed';
        // For user_hangup, agent_hangup, call_transfer, etc. keep the mapped status (completed)
      }

      // From number
      if (call.from_number) update.fromNumber = call.from_number;
    }

    if (event === 'call_analyzed') {
      // AI analysis results
      if (call.call_analysis) {
        // Summary — check call_summary first, then custom_analysis_data
        if (call.call_analysis.call_summary) {
          update.summary = call.call_analysis.call_summary;
        } else if (call.call_analysis.custom_analysis_data?.call_summary) {
          update.summary = call.call_analysis.custom_analysis_data.call_summary;
        }

        // Sentiment — check user_sentiment first, then custom_analysis_data
        const sentimentRaw = call.call_analysis.user_sentiment 
          || call.call_analysis.custom_analysis_data?.user_sentiment;
        if (sentimentRaw) {
          const sentimentMap: Record<string, string> = {
            Positive: 'positive',
            Negative: 'negative',
            Neutral: 'neutral',
            Unknown: '',
          };
          update.sentiment = sentimentMap[sentimentRaw] || '';
        }

        // Extract collected data (includes questions_asked, interested, etc.)
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
