import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { getBunnyChatbotSettings } from '@/lib/bunnyChatbotSettingsRepository';
import { ensureBunnyChatbotSchema } from '@/lib/bunnyChatbotRepository';
import { getBunnyMetaCredentialsForTenant } from '@/lib/bunnyWhatsAppAccounts';
import { getTemplateById } from '@/lib/bunnyTemplatesRepository';
import { initBunnyMetaWhatsAppSchema, upsertBunnyMetaMessage, listBunnyMetaMessages } from '@/lib/bunnyMetaWhatsAppRepository';
import { normalizePhone, getWhatsAppEnv, generateAppSecretProof, buildGraphMessagesUrl } from '@/lib/whatsapp';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { handleWorkshopRecordingRequest } from '@/lib/workshopRecordingAccess';
import { listBunnyAutomationRules } from '@/lib/bunnyAutomationRepository';
import { createBunnyChatbotRuntime, ChatbotRuntimeError } from '@/lib/bunnyChatbotRuntimeEngine';

function mapFlow(row: any) {
  return { ...JSON.parse(String(row.data_json)), _id: String(row.document_id),
    createdByUserId: String(row.created_by_user_id), enabled: Boolean(row.enabled) };
}

/**
 * Single-attempt transport: the general WhatsApp helpers retry POSTs and can
 * silently downgrade buttons to text, which is unsafe for durable flow execution.
 */
export async function sendChatbotMetaOnce(to: string, payload: Record<string, any>, credentials: any): Promise<string> {
  const outgoing = Object.fromEntries(Object.entries(payload).filter(([key]) => !key.startsWith('_')));
  const response = await fetch(buildGraphMessagesUrl(credentials.phoneNumberId,
    generateAppSecretProof(credentials.accessToken, credentials.appSecret)), {
    method: 'POST',
    headers: { Authorization: `Bearer ${credentials.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: normalizePhone(to), ...outgoing }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ChatbotRuntimeError('provider_rejected',
    `Meta rejected chatbot message (${response.status}): ${String(result?.error?.message || 'provider error')}`, 502);
  const id = result.messages?.[0]?.id;
  if (!id) throw new ChatbotRuntimeError('provider_result_unknown', 'Meta response omitted its message ID; automatic resend is disabled', 502);
  return String(id);
}

export const bunnyChatbotMetaRuntime = createBunnyChatbotRuntime({
  execute: statement => bunnyExecute(statement),
  batch: statements => bunnyBatch(statements),
  lead: getBunnyLeadById,
  settings: getBunnyChatbotSettings,
  automationRules: listBunnyAutomationRules,
  // Builder getters intentionally allow shared templates/storage fallback. Live
  // runtime must instead require exact SQL ownership and fail on SQL errors.
  flows: async owner => {
    await ensureBunnyChatbotSchema();
    const result = await bunnyExecute({ sql: 'SELECT * FROM chatbot_flows_sql WHERE created_by_user_id=? AND enabled=1', args: [owner] });
    return result.rows.map(mapFlow);
  },
  flow: async (id, owner) => {
    await ensureBunnyChatbotSchema();
    const result = await bunnyExecute({ sql: 'SELECT * FROM chatbot_flows_sql WHERE document_id=? AND created_by_user_id=?', args: [id, owner] });
    return result.rows[0] ? mapFlow(result.rows[0]) : null;
  },
  template: async (id, owner, name) => {
    if (id) return getTemplateById(id);
    const result = await bunnyExecute({
      sql: `SELECT document_id,data_json,status,created_by FROM whatsapp_templates_sql
        WHERE template_name=? AND created_by=? AND LOWER(status)='approved'
        AND (provider='meta' OR provider IS NULL) LIMIT 2`, args: [name || '', owner],
    });
    if (result.rows.length > 1) throw new ChatbotRuntimeError('ambiguous_template', 'Multiple approved templates have this name; use an explicit template ID');
    const row = result.rows[0];
    return row ? { ...JSON.parse(String(row.data_json)), _id: String(row.document_id),
      status: String(row.status), createdBy: String(row.created_by) } : null;
  },
  credentials: async owner => {
    await initBunnyMetaWhatsAppSchema();
    const credentials = await getBunnyMetaCredentialsForTenant(owner);
    if (credentials) return credentials;
    // Only the explicitly shared Super Admin account may use the configured env.
    if (owner === 'admin' || owner === 'admincrm') return getWhatsAppEnv();
    return null;
  },
  send: sendChatbotMetaOnce,
  persistMessage: upsertBunnyMetaMessage,
  recordingRequest: handleWorkshopRecordingRequest,
  ai: async (message, settings, lead) => {
    const recent = await listBunnyMetaMessages({ leadId: String(lead._id), limit: 8 });
    const history = recent.reverse().map((entry: any) => ({
      role: entry.direction === 'inbound' ? 'user' as const : 'assistant' as const,
      content: String(entry.messageContent || '').slice(0, 800),
    })).filter(entry => entry.content);
    return generateAIText({
      message, history, systemPrompt: settings.aiSystemPrompt ||
        'You are the configured business WhatsApp assistant. Be concise. Do not invent prices or availability. Never request passwords or OTPs.',
      temperature: 0.4,
      maxOutputTokens: Math.min(1000, Math.max(50, Number(settings.aiMaxTokens || settings.maxAiTokens || 250))),
    });
  },
});
