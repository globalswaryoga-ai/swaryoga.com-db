/**
 * Agent Management API
 * Full CRUD for Retell AI agents + sync with CRM language mappings
 *
 * GET    — List agents from Retell, enriched with CRM mapping info
 * POST   — Create a new agent in Retell + optionally map language
 * PATCH  — Update agent in Retell + update CRM mapping
 * DELETE — Delete agent from Retell + remove CRM mapping
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAgentLanguageMapping } from '@/lib/schemas/enterpriseSchemas';
import { listAgents, listVoices, LANGUAGE_LABELS } from '@/lib/retellAI';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

const RETELL_API_BASE = 'https://api.retellai.com';

function getApiKey(): string {
  return process.env.RETELL_API_KEY || '';
}

async function retellRequest(path: string, method: string, body?: any) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('RETELL_API_KEY not configured');

  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${RETELL_API_BASE}${path}`, opts);

  if (method === 'DELETE' && res.status === 204) return { deleted: true };

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Retell API ${res.status}: ${errText}`);
  }
  return res.json();
}

/**
 * GET /api/admin/crm/calls/agents
 * List all Retell agents, enriched with CRM language mappings
 * Query: ?voices=true — also return available voices
 *        ?llms=true   — also return available LLMs
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'createdBy');

    await connectDB();
    const AgentLanguageMapping = getAgentLanguageMapping();

    // Fetch agents from Retell (deduplicate by agent_id, keep latest version)
    const raw: any[] = await listAgents();
    const latestMap = new Map<string, any>();
    for (const agent of raw || []) {
      const existing = latestMap.get(agent.agent_id);
      if (!existing || (agent.last_modification_timestamp ?? 0) > (existing.last_modification_timestamp ?? 0)) {
        latestMap.set(agent.agent_id, agent);
      }
    }
    const retellAgents = Array.from(latestMap.values());

    // Fetch CRM mappings
    const mappings = await AgentLanguageMapping.find(tf).lean() as any[];
    const mappingsByAgentId = new Map<string, any[]>();
    for (const m of mappings) {
      const existing = mappingsByAgentId.get(m.agentId) || [];
      existing.push(m);
      mappingsByAgentId.set(m.agentId, existing);
    }

    // Enrich agents with CRM info
    const agents = retellAgents.map((agent: any) => {
      const crmMappings = mappingsByAgentId.get(agent.agent_id) || [];
      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        voice_id: agent.voice_id,
        language: agent.language,
        is_published: agent.is_published,
        webhook_url: agent.webhook_url,
        response_engine: agent.response_engine,
        last_modification_timestamp: agent.last_modification_timestamp,
        post_call_analysis_data: agent.post_call_analysis_data,
        max_call_duration_ms: agent.max_call_duration_ms,
        interruption_sensitivity: agent.interruption_sensitivity,
        // CRM enrichment
        crm_mappings: crmMappings.map((m: any) => ({
          _id: m._id,
          language: m.language,
          isDefault: m.isDefault,
          isActive: m.isActive,
          voiceId: m.voiceId,
        })),
        crm_languages: crmMappings.map((m: any) => m.language),
        crm_is_default: crmMappings.some((m: any) => m.isDefault),
      };
    });

    const result: any = { agents, mappings, languages: LANGUAGE_LABELS };

    // Optionally fetch voices
    if (request.nextUrl.searchParams.get('voices') === 'true') {
      try {
        result.voices = await listVoices();
      } catch {
        result.voices = [];
      }
    }

    // Optionally fetch LLMs
    if (request.nextUrl.searchParams.get('llms') === 'true') {
      try {
        const llmsRaw = await retellRequest('/list-retell-llms', 'GET');
        // Deduplicate LLMs by llm_id (keep latest version)
        const llmMap = new Map<string, any>();
        for (const llm of (llmsRaw || [])) {
          const ex = llmMap.get(llm.llm_id);
          if (!ex || (llm.last_modification_timestamp ?? 0) > (ex.last_modification_timestamp ?? 0)) {
            llmMap.set(llm.llm_id, llm);
          }
        }
        result.llms = Array.from(llmMap.values());
      } catch {
        result.llms = [];
      }
    }

    return apiSuccess(result);
  } catch (err: any) {
    console.error('[agents GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/calls/agents
 * Create a new agent in Retell + optionally create CRM language mapping
 *
 * Body: {
 *   agent_name: string (required)
 *   voice_id: string (required)
 *   language: string (Retell language code e.g. "hi-IN", "en-US")
 *   llm_id?: string  (use existing LLM)
 *   general_prompt?: string (if using retell-llm, the prompt to set)
 *   webhook_url?: string
 *   post_call_analysis_data?: array
 *   max_call_duration_ms?: number
 *   interruption_sensitivity?: number
 *   -- CRM fields --
 *   crm_languages?: string[]  (e.g. ["hi", "en"]) — languages to map in CRM
 *   crm_is_default?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'createdBy');

    const body = await request.json();
    const { agent_name, voice_id, language, llm_id, general_prompt, webhook_url,
      post_call_analysis_data, max_call_duration_ms, interruption_sensitivity,
      crm_languages, crm_is_default } = body;

    if (!agent_name?.trim()) return apiError('VALIDATION_ERROR', 'agent_name is required');
    if (!voice_id?.trim()) return apiError('VALIDATION_ERROR', 'voice_id is required');

    // Build Retell create-agent payload
    const createPayload: any = {
      agent_name: agent_name.trim(),
      voice_id: voice_id.trim(),
      language: language || 'hi-IN',
    };

    // Response engine: use existing LLM or create with prompt
    if (llm_id) {
      createPayload.response_engine = { type: 'retell-llm', llm_id };
    }

    if (webhook_url) createPayload.webhook_url = webhook_url;
    if (post_call_analysis_data) createPayload.post_call_analysis_data = post_call_analysis_data;
    if (max_call_duration_ms) createPayload.max_call_duration_ms = max_call_duration_ms;
    if (interruption_sensitivity !== undefined) createPayload.interruption_sensitivity = interruption_sensitivity;

    // Create agent in Retell
    const retellAgent = await retellRequest('/create-agent', 'POST', createPayload);

    // If general_prompt provided, update the LLM
    if (general_prompt && retellAgent.response_engine?.llm_id) {
      try {
        await retellRequest(`/update-retell-llm/${retellAgent.response_engine.llm_id}`, 'PATCH', {
          general_prompt,
        });
      } catch (err: any) {
        console.warn('[agents POST] Failed to update LLM prompt:', err.message);
      }
    }

    // Create CRM language mappings if requested
    const createdMappings: any[] = [];
    if (crm_languages?.length) {
      await connectDB();
      const AgentLanguageMapping = getAgentLanguageMapping();

      // If setting as default, clear other defaults
      if (crm_is_default) {
        await AgentLanguageMapping.updateMany({ isDefault: true, ...tf }, { $set: { isDefault: false } });
      }

      for (const lang of crm_languages) {
        const mapping = await AgentLanguageMapping.findOneAndUpdate(
          { language: lang.toLowerCase().trim(), ...tf },
          {
            $set: {
              agentId: retellAgent.agent_id,
              agentName: retellAgent.agent_name,
              voiceId: retellAgent.voice_id,
              isDefault: crm_is_default && lang === crm_languages[0],
              isActive: true,
              updatedBy: decoded.userId || decoded.email || 'admin',
            },
          },
          { upsert: true, new: true }
        );
        createdMappings.push(mapping);
      }
    }

    return apiSuccess({
      agent: retellAgent,
      crm_mappings: createdMappings,
      message: `Agent "${retellAgent.agent_name}" created (${retellAgent.agent_id})`,
    });
  } catch (err: any) {
    console.error('[agents POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * PATCH /api/admin/crm/calls/agents
 * Update an existing agent in Retell + update CRM mappings
 *
 * Body: {
 *   agent_id: string (required)
 *   agent_name?: string
 *   voice_id?: string
 *   language?: string
 *   webhook_url?: string
 *   general_prompt?: string (updates the LLM prompt)
 *   post_call_analysis_data?: array
 *   max_call_duration_ms?: number
 *   interruption_sensitivity?: number
 *   -- CRM fields --
 *   crm_languages?: string[]
 *   crm_is_default?: boolean
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'createdBy');

    const body = await request.json();
    const { agent_id, agent_name, voice_id, language, webhook_url, general_prompt,
      post_call_analysis_data, max_call_duration_ms, interruption_sensitivity,
      crm_languages, crm_is_default } = body;

    if (!agent_id?.trim()) return apiError('VALIDATION_ERROR', 'agent_id is required');

    // Build Retell update payload (only include changed fields)
    const updatePayload: any = {};
    if (agent_name?.trim()) updatePayload.agent_name = agent_name.trim();
    if (voice_id?.trim()) updatePayload.voice_id = voice_id.trim();
    if (language) updatePayload.language = language;
    if (webhook_url !== undefined) updatePayload.webhook_url = webhook_url;
    if (post_call_analysis_data) updatePayload.post_call_analysis_data = post_call_analysis_data;
    if (max_call_duration_ms) updatePayload.max_call_duration_ms = max_call_duration_ms;
    if (interruption_sensitivity !== undefined) updatePayload.interruption_sensitivity = interruption_sensitivity;

    // Update agent in Retell
    const retellAgent = await retellRequest(`/update-agent/${agent_id}`, 'PATCH', updatePayload);

    // Update LLM prompt if provided
    if (general_prompt && retellAgent.response_engine?.llm_id) {
      try {
        await retellRequest(`/update-retell-llm/${retellAgent.response_engine.llm_id}`, 'PATCH', {
          general_prompt,
        });
      } catch (err: any) {
        console.warn('[agents PATCH] Failed to update LLM prompt:', err.message);
      }
    }

    // Update CRM language mappings if provided
    const updatedMappings: any[] = [];
    if (crm_languages !== undefined) {
      await connectDB();
      const AgentLanguageMapping = getAgentLanguageMapping();

      // Remove old mappings for this agent
      await AgentLanguageMapping.deleteMany({ agentId: agent_id, ...tf });
      if (crm_is_default) {
        await AgentLanguageMapping.updateMany({ isDefault: true, ...tf }, { $set: { isDefault: false } });
      }

      // Create new mappings
      for (const lang of crm_languages) {
        const mapping = await AgentLanguageMapping.findOneAndUpdate(
          { language: lang.toLowerCase().trim(), ...tf },
          {
            $set: {
              agentId: retellAgent.agent_id,
              agentName: retellAgent.agent_name,
              voiceId: retellAgent.voice_id || voice_id || '',
              isDefault: crm_is_default && lang === crm_languages[0],
              isActive: true,
              updatedBy: decoded.userId || decoded.email || 'admin',
            },
          },
          { upsert: true, new: true }
        );
        updatedMappings.push(mapping);
      }
    }

    return apiSuccess({
      agent: retellAgent,
      crm_mappings: updatedMappings,
      message: `Agent "${retellAgent.agent_name}" updated`,
    });
  } catch (err: any) {
    console.error('[agents PATCH]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * DELETE /api/admin/crm/calls/agents
 * Delete an agent from Retell + remove all CRM mappings
 * Body: { agent_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'createdBy');

    const body = await request.json();
    const { agent_id } = body;

    if (!agent_id?.trim()) return apiError('VALIDATION_ERROR', 'agent_id is required');

    // Delete from Retell
    await retellRequest(`/delete-agent/${agent_id}`, 'DELETE');

    // Remove CRM mappings
    await connectDB();
    const AgentLanguageMapping = getAgentLanguageMapping();
    const deletedMappings = await AgentLanguageMapping.deleteMany({ agentId: agent_id, ...tf });

    return apiSuccess({
      deleted: true,
      agent_id,
      crm_mappings_removed: deletedMappings.deletedCount,
      message: `Agent "${agent_id}" deleted from Retell and CRM`,
    });
  } catch (err: any) {
    console.error('[agents DELETE]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
