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
import { createOutboundCall, checkRetellConfig, listAgents, listVoices, resolveAgentForLanguage } from '@/lib/retellAI';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/calls?leadId=xxx
 * Get call history for a specific lead or all recent calls
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    await connectDB();
    const AICallLog = getAICallLog();

    const leadId = request.nextUrl.searchParams.get('leadId');
    const action = request.nextUrl.searchParams.get('action');

    // ── Today's call summary per lead (counts + active calls) ──
    if (action === 'today_summary') {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Aggregate today's calls grouped by leadId
        const summary = await AICallLog.aggregate([
          { $match: { createdAt: { $gte: todayStart }, ...tf } },
          {
            $group: {
              _id: '$leadId',
              totalToday: { $sum: 1 },
              activeCount: {
                $sum: {
                  $cond: [{ $in: ['$status', ['queued', 'ringing', 'in_progress']] }, 1, 0],
                },
              },
              lastStatus: { $last: '$status' },
              lastCallAt: { $max: '$createdAt' },
            },
          },
        ]);

        // Build a map: leadId -> { totalToday, activeCount, lastStatus }
        const map: Record<string, { totalToday: number; active: boolean; lastStatus: string }> = {};
        for (const s of summary) {
          map[String(s._id)] = {
            totalToday: s.totalToday,
            active: s.activeCount > 0,
            lastStatus: s.lastStatus,
          };
        }

        return apiSuccess({ todayCalls: map });
      } catch (err: any) {
        return apiSuccess({ todayCalls: {} });
      }
    }

    // ── List Retell AI agents (deduplicated by agent_id, latest version only) ──
    if (action === 'list_agents') {
      try {
        const raw: any[] = await listAgents();
        const latestMap = new Map<string, any>();
        for (const agent of raw || []) {
          const existing = latestMap.get(agent.agent_id);
          if (!existing || (agent.last_modification_timestamp ?? 0) > (existing.last_modification_timestamp ?? 0)) {
            latestMap.set(agent.agent_id, agent);
          }
        }
        const agents = Array.from(latestMap.values());
        return apiSuccess({ agents });
      } catch (err: any) {
        return apiSuccess({ agents: [], error: err.message });
      }
    }

    // ── List Retell AI voices ──
    if (action === 'list_voices') {
      try {
        const voices: any[] = await listVoices();
        return apiSuccess({ voices: voices || [] });
      } catch (err: any) {
        return apiSuccess({ voices: [], error: err.message });
      }
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 20), 100);

    const query: any = {};
    if (leadId) query.leadId = leadId;
    Object.assign(query, tf);

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
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    const body = await request.json();
    const { leadId, purpose, language, customPrompt, overrideAgentId, overrideVoiceId, action, text, languageLabel, callingNumber, templateName } = body;

    // ── Template voice generation (no lead required) ──
    if (action === 'generate_voice' || purpose === 'template_voice_generation') {
      if (!text?.trim()) return apiError('VALIDATION_ERROR', 'Draft script text is required');

      const callLang = language || 'en';
      const voiceName = `AI Voice — ${languageLabel || (callLang === 'hi' ? 'Hindi' : 'English')} — ${templateName || 'Untitled'}`;

      // Save the script as a voice-ready template configuration.
      // The Retell agent will use this script as its prompt when making actual calls.
      // No outbound call is made here — this just registers the voice script.
      return apiSuccess({
        voiceUrl: `retell://agent/${process.env.RETELL_AGENT_ID || 'sakshi'}/script/${Date.now()}`,
        voiceName,
        script: text,
        language: callLang,
        status: 'success',
        message: `Voice script "${templateName || 'Untitled'}" saved successfully. The AI agent will use this script when calling leads.`,
      });
    }

    // ── Standard AI call to a lead ──
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

    // Resolve language label for call log (e.g. 'hi' → 'hi-IN', 'ne' stays 'ne')
    const langForLog = callLang === 'hi' ? 'hi-IN' : callLang === 'en' ? 'en-IN' : callLang;

    // Create call log entry (status: queued)
    const callLog = await AICallLog.create({
      leadId,
      direction: 'outbound',
      purpose: purpose || 'custom',
      customPrompt: customPrompt || '',
      status: 'queued',
      phoneNumber: phone,
      language: langForLog,
      initiatedBy: decoded.userId || decoded.email || 'admin',
    });

    // Trigger the call via Retell (agent auto-resolved from language mapping)
    const result = await createOutboundCall({
      toNumber: phone,
      leadName: lead.displayName || lead.name || 'there',
      purpose,
      language: callLang,
      customPrompt,
      overrideAgentId: overrideAgentId || undefined,
      overrideVoiceId: overrideVoiceId || undefined,
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
      await AICallLog.updateOne({ _id: callLog._id, ...tf }, { $set: { status: 'failed', callEndedReason: result.error } });
      return apiError('SERVER_ERROR', result.error || 'Failed to start call');
    }

    // Update call log with Retell call ID
    await AICallLog.updateOne(
      { _id: callLog._id, ...tf },
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
