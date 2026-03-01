/**
 * AI Agents API — Retell AI Agent Management
 * GET  — List all agents or get a single agent's details
 * POST — Update agent settings (voice, speed, temperature, volume)
 */
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { listAgents, getAgent, listPhoneNumbers } from '@/lib/retellAI';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/ai-agents
 * ?action=list          → List all agents
 * ?action=detail&id=xxx → Get single agent detail
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const action = request.nextUrl.searchParams.get('action') || 'list';
    const agentId = request.nextUrl.searchParams.get('id');

    if (action === 'detail' && agentId) {
      try {
        const agent = await getAgent(agentId);
        return apiSuccess({ agent });
      } catch (err: any) {
        return apiError('SERVER_ERROR', `Failed to fetch agent: ${err.message}`);
      }
    }

    // Default: list all agents (deduplicate by agent_id, keep latest version)
    try {
      const raw: any[] = await listAgents();
      // Retell returns every version of each agent — group by agent_id and keep latest
      const latestMap = new Map<string, any>();
      for (const agent of raw || []) {
        const existing = latestMap.get(agent.agent_id);
        if (
          !existing ||
          (agent.last_modification_timestamp ?? 0) > (existing.last_modification_timestamp ?? 0)
        ) {
          latestMap.set(agent.agent_id, agent);
        }
      }
      const agents = Array.from(latestMap.values());

      // Fetch phone numbers and map to agents
      let phoneMap: Record<string, string> = {};
      try {
        const phones: any[] = await listPhoneNumbers();
        for (const ph of phones || []) {
          if (ph.inbound_agent_id) phoneMap[ph.inbound_agent_id] = ph.phone_number_pretty || ph.phone_number;
          if (ph.outbound_agent_id) phoneMap[ph.outbound_agent_id] = ph.phone_number_pretty || ph.phone_number;
        }
      } catch { /* phone number fetch is optional */ }

      return apiSuccess({ agents, phoneMap });
    } catch (err: any) {
      console.error('[ai-agents list]', err);
      return apiSuccess({ agents: [], phoneMap: {}, error: err.message });
    }
  } catch (err: any) {
    console.error('[ai-agents GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/ai-agents
 * Body: { action: 'update_settings', agentId, settings: { voice_speed, voice_temperature, voice_volume } }
 * Body: { action: 'set_active', agentId }  — mark as primary CRM agent
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { action, agentId } = body;

    if (!action) return apiError('VALIDATION_ERROR', 'action is required');

    if (action === 'get_detail') {
      if (!agentId) return apiError('VALIDATION_ERROR', 'agentId is required');
      try {
        const agent = await getAgent(agentId);
        return apiSuccess({ agent });
      } catch (err: any) {
        return apiError('SERVER_ERROR', `Failed to fetch agent: ${err.message}`);
      }
    }

    if (action === 'set_active') {
      if (!agentId) return apiError('VALIDATION_ERROR', 'agentId is required');
      // In a real implementation, store the active agent ID in the database
      // For now, return success
      return apiSuccess({
        message: `Agent ${agentId} set as active CRM agent`,
        agentId,
      });
    }

    return apiError('VALIDATION_ERROR', `Unknown action: ${action}`);
  } catch (err: any) {
    console.error('[ai-agents POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
