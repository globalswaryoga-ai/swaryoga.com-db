import crypto from 'node:crypto';
import { isChatbotOfficeOpen } from '@/lib/chatbotOfficeHours';
import { unsupportedChatbotNodes } from '@/lib/chatbotFlowCapabilities';

type RecordData = Record<string, any>;
type Statement = { sql: string; args: any[] };
export type RuntimeDependencies = {
  execute: (statement: Statement) => Promise<{ rows: any[] }>;
  batch: (statements: Statement[]) => Promise<unknown>;
  lead: (id: string) => Promise<any>;
  settings: (owner: string) => Promise<any>;
  automationRules?: (owner: string) => Promise<any[]>;
  flows: (owner: string) => Promise<any[]>;
  flow: (id: string, owner: string) => Promise<any>;
  template: (id: string, owner: string, name?: string) => Promise<any>;
  credentials: (owner: string) => Promise<any>;
  send: (phone: string, payload: RecordData, credentials: any) => Promise<string>;
  persistMessage: (message: RecordData) => Promise<unknown>;
  ai: (message: string, settings: RecordData, lead: RecordData) => Promise<string | null>;
  recordingRequest?: (input: {
    leadId: string; phoneNumber: string; messageBody: string; triggerValues: string[];
    tenantUserId: string; creds: any; messageId: string; now: Date;
  }) => Promise<{ handled: boolean; message?: string }>;
  now?: () => Date;
};

export class ChatbotRuntimeError extends Error {
  constructor(public code: string, message: string, public status = 422, public acceptedMessageId?: string) {
    super(message);
    this.name = 'ChatbotRuntimeError';
  }
}

export type ChatbotInboundInput = {
  leadId: any;
  phoneNumber: string;
  messageBody: string;
  wasFirstInbound: boolean;
  tenantUserId?: string;
  creds?: any;
  messageId?: string;
  triggerValues?: string[];
  receivedAt?: string | Date;
};

const normalize = (value: unknown) => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase();
const phone = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};
const json = (value: unknown): any => value ? JSON.parse(String(value)) : {};
const identity = (value: any) => String(value?.$oid || value || '');
const millis = (value: any) => {
  const parsed = new Date(value?.$date || value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
const superOwner = (owner: string) => owner === 'admin' || owner === 'admincrm';
export function chatbotOwnsLead(lead: any, owner: string): boolean {
  const owners = [identity(lead?.createdByUserId), identity(lead?.assignedToUserId)];
  return owners.includes(owner) || (superOwner(owner) && owners.some(superOwner));
}
export function chatbotKeywordMatches(keyword: string, values: string[], mode = 'word'): boolean {
  const key = normalize(keyword);
  if (!key) return false;
  return values.some(value => {
    const text = normalize(value);
    if (text === key) return true;
    if (mode === 'exact') return false;
    // Unicode word boundaries avoid "hi" matching "this", including Hindi/Marathi.
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}_])${escaped}($|[^\\p{L}\\p{M}\\p{N}_])`, 'u').test(text);
  });
}
export function chatbotBlocked(lead: RecordData, now = Date.now()): boolean {
  return Boolean(lead.isBlocked || lead.waBlocked || lead.optedOut || lead.whatsappOptOut ||
    ['blocked', 'opted_out', 'opted-out'].includes(normalize(lead.status)) ||
    ['opted_out', 'opted-out'].includes(normalize(lead.consentStatus || lead.consent?.status)) ||
    millis(lead.blockedUntil || lead.consent?.blockedUntil) > now);
}
export function chatbotAutomationConditions(lead: RecordData, conditions: any): boolean {
  if (!conditions) return true;
  const supported = ['statuses', 'workshopName', 'assignedToUserId', 'labelsAny', 'labelsAll'];
  if (typeof conditions !== 'object' || Array.isArray(conditions) ||
    Object.keys(conditions).some(key => !supported.includes(key))) {
    throw new ChatbotRuntimeError('unsupported_conditions', 'Automation contains unsupported conditions');
  }
  if (['statuses', 'labelsAny', 'labelsAll'].some(key => conditions[key] !== undefined && !Array.isArray(conditions[key])) ||
    ['workshopName', 'assignedToUserId'].some(key => conditions[key] !== undefined && typeof conditions[key] !== 'string')) {
    throw new ChatbotRuntimeError('invalid_conditions', 'Automation condition values have invalid types');
  }
  if (conditions.statuses?.length && !conditions.statuses.includes(String(lead.status))) return false;
  if (conditions.workshopName?.trim() && String(lead.workshopName || '') !== conditions.workshopName.trim()) return false;
  if (conditions.assignedToUserId?.trim() && String(lead.assignedToUserId || '') !== conditions.assignedToUserId.trim()) return false;
  const labels = Array.isArray(lead.labels) ? lead.labels.map(String) : [];
  if (conditions.labelsAny?.length && !conditions.labelsAny.some((label: any) => labels.includes(String(label)))) return false;
  if (conditions.labelsAll?.length && !conditions.labelsAll.every((label: any) => labels.includes(String(label)))) return false;
  return true;
}
export function chatbotOptionId(option: any, index: number): string {
  return String(option.id || option.buttonId || `btn_${index}_${String(option.value || option.label || index).slice(0, 20)}`);
}
function optionsFor(node: any): any[] {
  if (Array.isArray(node.templateButtons) && node.templateButtons.length) {
    return node.templateButtons.filter((button: any) => !button.type || normalize(button.type) === 'quick_reply');
  }
  return Array.isArray(node.options) ? node.options : Array.isArray(node.buttons) ? node.buttons : [];
}
function matchOption(node: any, values: string[]): any {
  return optionsFor(node).find((option, index) =>
    [option.id, option.buttonId, option.payload, option.value, option.label, option.title,
      chatbotOptionId(option, index), `tpl_btn_${index}`, String(index + 1)]
      .filter(value => value !== undefined && String(value).trim())
      .some(value => values.some(input => normalize(input) === normalize(value))));
}

/**
 * Durable, at-most-once Meta execution. A prepared/unknown send is deliberately
 * never retried: Meta has no idempotency key for message POSTs.
 */
export function createBunnyChatbotRuntime(deps: RuntimeDependencies) {
  const now = () => deps.now?.() || new Date();
  const sql = (query: string, args: any[] = []) => deps.execute({ sql: query, args });
  let initialized: Promise<void> | undefined;
  function schema() {
    if (!initialized) initialized = deps.batch([
      { sql: `CREATE TABLE IF NOT EXISTS chatbot_runtime_events_sql (
        scope TEXT NOT NULL, message_id TEXT NOT NULL, lead_id TEXT NOT NULL,
        status TEXT NOT NULL, error TEXT, payload_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        PRIMARY KEY(scope,message_id))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS chatbot_runtime_state_sql (
        scope TEXT NOT NULL, lead_id TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}',
        lock_token TEXT, lock_until TEXT, updated_at TEXT NOT NULL,
        PRIMARY KEY(scope,lead_id))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS chatbot_runtime_sends_sql (
        send_key TEXT PRIMARY KEY, scope TEXT NOT NULL, lead_id TEXT NOT NULL,
        status TEXT NOT NULL, wa_message_id TEXT, payload_json TEXT NOT NULL,
        error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`, args: [] },
      { sql: `CREATE INDEX IF NOT EXISTS idx_chatbot_runtime_sends_state ON chatbot_runtime_sends_sql(scope,lead_id,status)`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS chatbot_scheduled_actions_sql (
        document_id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, phone_number TEXT NOT NULL,
        flow_id TEXT NOT NULL, action_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        execute_at TEXT NOT NULL, data_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`, args: [] },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_csa_status_exec ON chatbot_scheduled_actions_sql(status,execute_at)', args: [] },
    ]).then(async () => {
      const columns = await sql('PRAGMA table_info(chatbot_runtime_events_sql)');
      if (!columns.rows.some(column => column.name === 'payload_json')) {
        try { await sql('ALTER TABLE chatbot_runtime_events_sql ADD COLUMN payload_json TEXT'); }
        catch (error) {
          const current = await sql('PRAGMA table_info(chatbot_runtime_events_sql)');
          if (!current.rows.some(column => column.name === 'payload_json')) throw error;
        }
      }
      await sql('CREATE INDEX IF NOT EXISTS idx_chatbot_runtime_deferred ON chatbot_runtime_events_sql(status,created_at)');
    }).catch(error => { initialized = undefined; throw error; });
    return initialized;
  }

  async function context(leadId: string, owner: string, requestedPhone?: string, suppliedCredentials?: any) {
    if (!owner) throw new ChatbotRuntimeError('missing_owner', 'A verified Meta account owner is required', 403);
    const lead = await deps.lead(leadId);
    if (!lead) throw new ChatbotRuntimeError('lead_not_found', 'Lead not found', 404);
    if (!chatbotOwnsLead(lead, owner)) throw new ChatbotRuntimeError('ownership', 'Lead does not belong to this Meta account owner', 403);
    const reqPhone = requestedPhone ? phone(requestedPhone) : null;
    const leadPhones = [lead.phoneNumber, ...(lead.contactPhones || []), lead.whatsappNumber, lead.phone].filter(Boolean).map(phone);
    let to = phone(lead.phoneNumber);
    if (reqPhone) {
      if (leadPhones.includes(reqPhone)) {
        to = reqPhone;
      } else if (!to || !/^\d{10,15}$/.test(to)) {
        to = reqPhone;
      } else {
        throw new ChatbotRuntimeError('phone_mismatch', 'Lead phone does not match the requested recipient', 400);
      }
    }
    if (!/^\d{10,15}$/.test(to)) {
      throw new ChatbotRuntimeError('phone_mismatch', 'Invalid recipient phone number', 400);
    }
    const credentials = await deps.credentials(owner);
    if (!credentials?.accessToken || !credentials?.phoneNumberId) throw new ChatbotRuntimeError('missing_credentials', 'Connect this owner’s Meta account before running a chatbot', 422);
    if (suppliedCredentials && suppliedCredentials.phoneNumberId !== credentials.phoneNumberId) {
      throw new ChatbotRuntimeError('account_mismatch', 'Incoming Meta account differs from the configured owner account', 403);
    }
    return { lead, owner, to, credentials, scope: `${owner}:${credentials.phoneNumberId}`, state: {} as RecordData,
      lockToken: '', ready: false, eventId: '', sentCount: 0, firstReply: null as RecordData | null };
  }
  type Context = Awaited<ReturnType<typeof context>>;

  async function lock(ctx: Context, manualRestart = false, allowPendingCancellation = false) {
    ctx.lockToken = crypto.randomUUID();
    const timestamp = now().toISOString();
    const result = await sql(`INSERT INTO chatbot_runtime_state_sql(scope,lead_id,data_json,lock_token,lock_until,updated_at)
      VALUES (?,?,'{}',?,?,?) ON CONFLICT(scope,lead_id) DO UPDATE SET
      lock_token=excluded.lock_token,lock_until=excluded.lock_until
      WHERE chatbot_runtime_state_sql.lock_until IS NULL OR chatbot_runtime_state_sql.lock_until < ?
      RETURNING data_json`, [ctx.scope, identity(ctx.lead._id), ctx.lockToken,
      new Date(now().getTime() + 10 * 60_000).toISOString(), timestamp, timestamp]);
    if (!result.rows.length) throw new ChatbotRuntimeError('conversation_busy', 'Conversation is already being processed; no message was sent', 409);
    ctx.state = json(result.rows[0].data_json);
    if (!ctx.state.initialized) {
      const legacy = ctx.lead.metadata?.chatbotFlowState;
      if (legacy?.pendingSendKey && !allowPendingCancellation) throw new ChatbotRuntimeError('send_requires_reconciliation', 'Previous send requires reconciliation; automatic resend is disabled', 409);
      if (legacy?.flowId && legacy.scope !== ctx.scope && !manualRestart) {
        legacy.flowId = null;
        legacy.nodeId = null;
      }
      const restored = legacy?.scope === ctx.scope && !manualRestart ? legacy : {};
      ctx.state = { ...restored, initialized: true, scope: ctx.scope, waitingForReply: Boolean(restored.waitingForReply),
        ...(allowPendingCancellation && legacy?.pendingSendKey ? { pendingSendKey: legacy.pendingSendKey } : {}),
        lastInboundAt: restored.lastInboundAt,
        welcomeAt: ctx.lead.metadata?._chatbot_welcome_at,
        variables: ctx.lead.metadata?.chatbotVariables || {} };
      if (!manualRestart && (legacy?.replyDelayScheduled || legacy?.delayScheduled)) {
        legacy.replyDelayScheduled = null;
        legacy.delayScheduled = null;
      }
    }
    if (ctx.state.pendingSendKey && !allowPendingCancellation) {
      throw new ChatbotRuntimeError('send_requires_reconciliation', 'Previous Meta send needs reconciliation. Automatic resend is disabled.', 409);
    }
    ctx.ready = true;
  }
  async function unlock(ctx: Context) {
    await sql('UPDATE chatbot_runtime_state_sql SET lock_token=NULL,lock_until=NULL WHERE scope=? AND lead_id=? AND lock_token=?',
      [ctx.scope, identity(ctx.lead._id), ctx.lockToken]);
  }
  async function checkpoint(ctx: Context) {
    const timestamp = now().toISOString();
    const result = await sql(`UPDATE chatbot_runtime_state_sql SET data_json=?,updated_at=?,lock_until=?
      WHERE scope=? AND lead_id=? AND lock_token=? RETURNING lead_id`,
    [JSON.stringify(ctx.state), timestamp, new Date(now().getTime() + 10 * 60_000).toISOString(), ctx.scope, identity(ctx.lead._id), ctx.lockToken]);
    if (!result.rows.length) throw new ChatbotRuntimeError('lock_lost', 'Conversation lock was lost; execution stopped', 409);
    const flowState = ctx.state.flowId ? { ...ctx.state, updatedAt: timestamp } : null;
    await sql(`UPDATE leads_sql SET data_json=json_set(data_json,
      '$.metadata.chatbotFlowState',json(?),'$.metadata.chatbotVariables',json(?),
      '$.metadata._chatbot_welcome_at',?,'$.metadata._chatbot_last_reply_at',?,'$.lastInboundAt',?),updated_at=? WHERE document_id=?`,
    [JSON.stringify(flowState), JSON.stringify(ctx.state.variables || {}), ctx.state.welcomeAt || null,
      ctx.state.lastReplyAt || null, ctx.state.lastInboundAt || null, timestamp, identity(ctx.lead._id)]);
  }
  async function blocked(ctx: Context) {
    const fresh = await deps.lead(identity(ctx.lead._id));
    if (!fresh || !chatbotOwnsLead(fresh, ctx.owner)) throw new ChatbotRuntimeError('ownership_changed', 'Lead ownership changed during execution', 403);
    if (chatbotBlocked(fresh, now().getTime()) || ctx.state.optedOut) return true;
    // Preserved legacy consent remains enforceable without connecting to Mongo.
    const archive = await sql("SELECT name FROM sqlite_master WHERE type='table' AND name='mongo_documents'");
    if (archive.rows.length) {
      const consents = await sql(`SELECT document_json FROM mongo_documents WHERE collection_name='user_consents'
        AND (json_extract(document_json,'$.phoneNumber')=? OR json_extract(document_json,'$.phoneNumber')=?)`,
      [ctx.to, ctx.to.startsWith('91') ? ctx.to.slice(2) : ctx.to]);
      if (consents.rows.some(row => chatbotBlocked(json(row.document_json), now().getTime()))) return true;
    }
    return false;
  }
  async function flow(id: string, owner: string) {
    const found = await deps.flow(id, owner);
    if (!found || identity(found.createdByUserId) !== owner || found.enabled === false) {
      throw new ChatbotRuntimeError('flow_not_found', 'Enabled owned flow not found', 404);
    }
    if (found.provider && found.provider !== 'meta') throw new ChatbotRuntimeError('unsupported_provider', 'This runtime supports Meta flows only');
    return found;
  }
  async function policy(ctx: Context, kind: string) {
    if (await blocked(ctx)) throw new ChatbotRuntimeError('blocked', 'Blocked or opted-out lead; no message sent', 403);
    if (kind !== 'template' && now().getTime() - millis(ctx.state.lastInboundAt) >= 24 * 60 * 60_000) {
      throw new ChatbotRuntimeError('outside_24h', 'Outside the Meta 24-hour conversation window: use an approved template', 422);
    }
  }
  async function send(ctx: Context, payload: RecordData, key: string) {
    await policy(ctx, payload.type);
    const timestamp = now().toISOString();
    const claim = await sql(`INSERT INTO chatbot_runtime_sends_sql(send_key,scope,lead_id,status,payload_json,created_at,updated_at)
      VALUES (?,?,?,'prepared',?,?,?) ON CONFLICT(send_key) DO NOTHING RETURNING send_key`,
    [key, ctx.scope, identity(ctx.lead._id), JSON.stringify(payload), timestamp, timestamp]);
    if (!claim.rows.length) throw new ChatbotRuntimeError('send_already_claimed', 'Send was already claimed; automatic resend is disabled', 409);
    ctx.state.pendingSendKey = key;
    await checkpoint(ctx);
    let acceptedId: string | undefined;
    try {
      acceptedId = await deps.send(ctx.to, payload, ctx.credentials);
      if (!acceptedId) throw new ChatbotRuntimeError('provider_result_unknown', 'Meta returned no message ID; do not resend automatically', 502);
      await sql(`UPDATE chatbot_runtime_sends_sql SET status='accepted',wa_message_id=?,updated_at=? WHERE send_key=?`,
        [acceptedId, now().toISOString(), key]);
      await deps.persistMessage({
        _id: acceptedId, waMessageId: acceptedId, leadId: identity(ctx.lead._id), phoneNumber: ctx.to,
        provider: 'meta', direction: 'outbound', messageType: payload.type, status: 'sent',
        messageContent: payload.text?.body || payload.interactive?.body?.text || payload._content || '',
        senderNumber: ctx.credentials.phoneNumber, sentByUserId: ctx.owner, sentAt: timestamp, createdAt: timestamp,
        metadata: { chatbot: { flowId: ctx.state.flowId, nodeId: payload._nodeId, sendKey: key },
          ...(payload._templateId ? { templateId: payload._templateId, template: payload._templateMetadata } : {}) },
      });
      await sql("UPDATE chatbot_runtime_sends_sql SET status='persisted',updated_at=? WHERE send_key=?", [now().toISOString(), key]);
      delete ctx.state.pendingSendKey;
      ctx.state.lastReplyAt = timestamp;
      await checkpoint(ctx);
      ctx.sentCount++;
      if (!ctx.firstReply) ctx.firstReply = payload.type === 'template'
        ? { isTemplate: true, templateId: payload._templateId }
        : { text: payload.text?.body || payload.interactive?.body?.text,
          ...(payload.interactive?.action?.buttons ? { interactiveButtons: payload.interactive.action.buttons.map((button: any) => button.reply) } : {}) };
    } catch (error) {
      // Keep the intent checkpoint even when Bunny is unavailable after acceptance.
      ctx.state.pendingSendKey = key;
      const code = acceptedId ? 'accepted_persistence_failed' :
        error instanceof ChatbotRuntimeError && error.code === 'provider_rejected' ? 'provider_rejected' : 'provider_result_unknown';
      await sql('UPDATE chatbot_runtime_sends_sql SET status=?,error=?,updated_at=? WHERE send_key=?',
        [acceptedId ? 'accepted_persistence_failed' : code === 'provider_rejected' ? 'rejected' : 'unknown',
          error instanceof Error ? error.message : code, now().toISOString(), key]).catch(() => {});
      throw new ChatbotRuntimeError(code,
        acceptedId ? `Meta accepted ${acceptedId}, but persistence failed. Reconcile this send; automatic resend is disabled.`
          : `Meta send ${code === 'provider_rejected' ? 'was rejected' : 'result is uncertain'}. Review the durable intent; automatic resend is disabled. ${error instanceof Error ? error.message : ''}`, 502, acceptedId);
    }
  }
  function content(node: any, ctx: Context) {
    let text = String(node.messageText || node.questionText || node.text || '');
    text = text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (all, key) =>
      String(ctx.state.variables?.[key.trim()] ?? (key.trim() === 'name' ? ctx.lead.name || '' : all)));
    if (node.spintaxEnabled) text = text.replace(/\{([^{}]+)\}/g, (_all, choices) => {
      const options = choices.split('|');
      return options[crypto.randomInt(options.length)];
    });
    return text;
  }
  async function templatePayload(node: any, ctx: Context) {
    if (!node.templateId && !node.templateName) throw new ChatbotRuntimeError('missing_template', 'Template nodes require a saved template ID or name');
    if ((node.templateButtons || []).some((button: any) => button.nextNodeId && button.type && normalize(button.type) !== 'quick_reply')) {
      throw new ChatbotRuntimeError('unsupported_template_route', 'Only quick-reply template buttons can route chatbot replies');
    }
    const template = await deps.template(identity(node.templateId), ctx.owner, node.templateName);
    if (!template || identity(template.createdBy || template.createdByUserId) !== ctx.owner ||
      !['approved'].includes(normalize(template.status)) || (template.provider && template.provider !== 'meta')) {
      throw new ChatbotRuntimeError('template_not_approved', 'Template must be approved and owned by the flow owner');
    }
    const name = template.templateName || template.metaTemplateName;
    if (!name) throw new ChatbotRuntimeError('missing_template_name', 'Template has no Meta name');
    const components: any[] = [];
    const media = template.headerMedia?.url ? template.headerMedia : template.imageFile?.url ? { kind: 'image', url: template.imageFile.url } : null;
    if (media) {
      if (!['image', 'video', 'document'].includes(media.kind)) throw new ChatbotRuntimeError('unsupported_header', 'Unsupported template media header');
      components.push({ type: 'header', parameters: [{ type: media.kind,
        [media.kind]: { ...(String(media.url).startsWith('meta:id:') ? { id: String(media.url).slice(8) } : { link: media.url }),
          ...(media.filename ? { filename: media.filename } : {}) } }] });
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(String(template.headerFormat).toUpperCase())) {
      throw new ChatbotRuntimeError('missing_header_media', 'Template media header is required');
    }
    const vars = node.templateVariables || node.bodyParams || [];
    if (!Array.isArray(vars)) throw new ChatbotRuntimeError('invalid_template_variables', 'Template variables must be an ordered array');
    const expected = new Set(String(template.templateContent || '').match(/\{\{\s*\d+\s*\}\}/g) || []).size;
    if (expected && vars.length !== expected) throw new ChatbotRuntimeError('missing_template_variables', `Template needs ${expected} body variables`);
    if (vars.length) components.push({ type: 'body', parameters: vars.map(value => ({ type: 'text', text: content({ text: String(value) }, ctx) })) });
    for (const [index, button] of (template.buttons || []).entries()) {
      const kind = normalize(button.kind || button.type);
      if ((kind === 'url' || button.url) && String(button.url || '').includes('{{')) {
        throw new ChatbotRuntimeError('unsupported_dynamic_url', 'Dynamic template URL buttons require explicit parameter support');
      }
      if (kind === 'catalog') throw new ChatbotRuntimeError('unsupported_catalog', 'Catalog template buttons are not supported by this chatbot runtime');
      if (kind === 'quick_reply' && optionsFor(node)[index]) {
        components.push({ type: 'button', sub_type: 'quick_reply', index: String(index),
          parameters: [{ type: 'payload', payload: chatbotOptionId(optionsFor(node)[index], index) }] });
      }
    }
    return { type: 'template', template: { name, language: { code: template.language || 'en' }, ...(components.length ? { components } : {}) },
      _content: template.templateContent || name, _templateId: identity(template._id),
      _templateMetadata: { templateName: name, headerMedia: media }, _nodeId: node.nodeId };
  }
  async function nodePayload(node: any, ctx: Context) {
    if (node.type === 'template') return templatePayload(node, ctx);
    const text = content(node, ctx) || (optionsFor(node).length ? 'Please choose:' : '');
    if (!text.trim()) throw new ChatbotRuntimeError('empty_message', `Node ${node.nodeId} has no message`);
    if (text.length > (optionsFor(node).length ? 1024 : 4096)) throw new ChatbotRuntimeError('message_too_long', 'Message exceeds the Meta payload length limit');
    const options = optionsFor(node);
    if (options.length) {
      if (options.length > 3) throw new ChatbotRuntimeError('unsupported_buttons', 'Meta reply buttons support at most three choices; no options were silently discarded');
      const buttons = options.map((option, index) => ({ type: 'reply', reply: {
        id: chatbotOptionId(option, index), title: String(option.label || option.title || option.value || '') } }));
      if (buttons.some(button => !button.reply.title || button.reply.title.length > 20 || button.reply.id.length > 256) ||
        new Set(buttons.map(button => button.reply.id)).size !== buttons.length) {
        throw new ChatbotRuntimeError('invalid_buttons', 'Reply button titles must be 1–20 characters and IDs unique and at most 256 characters');
      }
      return { type: 'interactive', interactive: { type: 'button', body: { text }, action: { buttons } }, _nodeId: node.nodeId };
    }
    return { type: 'text', text: { body: text, preview_url: true }, _nodeId: node.nodeId };
  }
  async function schedule(ctx: Context, seconds: number, type = 'flow_continue') {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 365 * 86400) throw new ChatbotRuntimeError('invalid_delay', 'Delay must be between 0 and 365 days');
    const id = crypto.randomUUID();
    const timestamp = now().toISOString();
    const record = { _id: id, ownerUserId: ctx.owner, scope: ctx.scope, generation: ctx.state.generation,
      flowId: ctx.state.flowId, nodeId: ctx.state.nodeId, replyToken: ctx.state.replyToken, actionType: type };
    await sql(`INSERT INTO chatbot_scheduled_actions_sql(document_id,lead_id,phone_number,flow_id,action_type,status,execute_at,data_json,created_at,updated_at)
      VALUES (?,?,?,?,?,'pending',?,?,?,?)`,
    [id, identity(ctx.lead._id), ctx.to, ctx.state.flowId, type,
      new Date(now().getTime() + seconds * 1000).toISOString(), JSON.stringify(record), timestamp, timestamp]);
    if (type === 'flow_continue') ctx.state.scheduledActionId = id;
    await checkpoint(ctx);
  }
  async function labels(ctx: Context, node: any) {
    if (!node.assignLabels?.length && !node.removeLabels?.length) return;
    const fresh = await deps.lead(identity(ctx.lead._id));
    const remove = new Set(node.removeLabels || []);
    const value = [...new Set([...(fresh.labels || []), ...(node.assignLabels || [])])].filter(label => !remove.has(label));
    await sql("UPDATE leads_sql SET data_json=json_set(data_json,'$.labels',json(?)),updated_at=? WHERE document_id=?",
      [JSON.stringify(value), now().toISOString(), identity(ctx.lead._id)]);
  }
  async function executeFlow(ctx: Context, selected: any, values: string[] = [], resumeDelay = false) {
    const nodes = selected.nodes || [];
    if (ctx.state.waitingForReply && !values.length && !resumeDelay) return;
    if (ctx.state.waitingForReply && values.length) {
      const node = nodes.find((node: any) => node.nodeId === ctx.state.nodeId);
      if (!node) throw new ChatbotRuntimeError('missing_node', 'Active node no longer exists');
      const option = matchOption(node, values);
      if (optionsFor(node).length && !option) {
        await send(ctx, await nodePayload(node, ctx), `${ctx.scope}:${ctx.eventId}:retry:${node.nodeId}`);
        return;
      }
      const answer = option?.value || values[0];
      if (!option && node.type === 'question') {
        const type = node.questionType;
        const valid = type === 'number' ? /^-?\d+(\.\d+)?$/.test(answer) :
          type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer) :
          type === 'phone' ? /^\d{10,15}$/.test(phone(answer)) :
          type === 'date' ? Number.isFinite(Date.parse(answer)) : Boolean(answer.trim());
        if (!valid) {
          await send(ctx, await nodePayload(node, ctx), `${ctx.scope}:${ctx.eventId}:retry:${node.nodeId}`);
          return;
        }
      }
      if (node.variableName) ctx.state.variables = { ...ctx.state.variables, [node.variableName]: answer };
      ctx.state.nodeId = option?.nextNodeId || node.nextNodeId || null;
      ctx.state.waitingForReply = false;
      ctx.state.replyToken = null;
      await checkpoint(ctx);
      if (ctx.state.nodeId && Number(node.replyDelayMinutes) > 0) {
        await schedule(ctx, Number(node.replyDelayMinutes) * 60);
        return;
      }
    }
    if (ctx.state.scheduledActionId && !resumeDelay) return;
    if (resumeDelay) delete ctx.state.scheduledActionId;
    for (let hops = 0; ctx.state.nodeId && hops < 32; hops++) {
      const node = nodes.find((node: any) => node.nodeId === ctx.state.nodeId);
      if (!node) throw new ChatbotRuntimeError('missing_node', `Flow references missing node ${ctx.state.nodeId}`);
      if (!['message', 'question', 'buttons', 'template', 'delay', 'end', 'wait_reply'].includes(node.type)) {
        throw new ChatbotRuntimeError('unsupported_node', `Node type "${node.type}" is not supported by the Bunny Meta runtime`);
      }
      if (node.type !== 'delay' && Number(node.delaySeconds) > 0 && ctx.state.delayReadyNode !== node.nodeId) {
        ctx.state.delayReadyNode = node.nodeId;
        await schedule(ctx, Number(node.delaySeconds));
        return;
      }
      delete ctx.state.delayReadyNode;
      await labels(ctx, node);
      if (node.type === 'end') {
        ctx.state.nodeId = null;
        if (content(node, ctx).trim()) {
          await send(ctx, await nodePayload({ ...node, options: [], buttons: [], templateButtons: [] }, ctx),
            `${ctx.scope}:${ctx.eventId}:${hops}:${node.nodeId}`);
        }
        break;
      }
      if (node.type === 'delay') {
        ctx.state.nodeId = node.nextNodeId || null;
        if (ctx.state.nodeId) { await schedule(ctx, Number(node.delaySeconds || node.seconds || 0)); return; }
        break;
      }
      if (node.type === 'wait_reply') {
        ctx.state.waitingForReply = true;
        ctx.state.replyToken = crypto.randomUUID();
        await checkpoint(ctx);
        if (Number(node.waitTimeoutMinutes) > 0) {
          if (node.timeoutNodeId && !nodes.some((target: any) => target.nodeId === node.timeoutNodeId)) {
            throw new ChatbotRuntimeError('invalid_timer_target', 'Wait-reply timeout target does not exist');
          }
          await schedule(ctx, Number(node.waitTimeoutMinutes) * 60, 'reply_timeout');
        }
        return;
      }
      if (Number(node.timerMinutes) > 0 && !['end_flow', 'goto_node'].includes(node.timerAction)) {
        throw new ChatbotRuntimeError('unsupported_timer', `Timer action ${node.timerAction || '(empty)'} is unsupported`);
      }
      if (Number(node.timerMinutes) > 0 && node.timerAction === 'goto_node' &&
        !nodes.some((target: any) => target.nodeId === node.timerTargetNodeId)) {
        throw new ChatbotRuntimeError('invalid_timer_target', 'Timer target node does not exist');
      }
      const payload = await nodePayload(node, ctx);
      const waits = node.waitForReply === true || ['question', 'buttons'].includes(node.type) ||
        (node.type === 'template' && optionsFor(node).length > 0);
      ctx.state.nodeId = waits ? node.nodeId : node.nextNodeId || null;
      ctx.state.waitingForReply = waits;
      ctx.state.replyToken = waits ? crypto.randomUUID() : null;
      await send(ctx, payload, `${ctx.scope}:${ctx.eventId}:${hops}:${node.nodeId}`);
      if (waits) {
        if (Number(node.timerMinutes) > 0) {
          await schedule(ctx, Number(node.timerMinutes) * 60, 'reply_timeout');
        }
        return;
      }
    }
    if (ctx.state.nodeId) throw new ChatbotRuntimeError('flow_hop_limit', 'Flow exceeded the 32-node execution limit; check for cycles');
    ctx.state.flowId = null;
    ctx.state.waitingForReply = false;
    await checkpoint(ctx);
  }
  async function startFlow(ctx: Context, selected: any) {
    const unsupported = unsupportedChatbotNodes(selected.nodes || []);
    if (unsupported.length) throw new ChatbotRuntimeError('unsupported_node', `Revise legacy nodes before starting this flow: ${unsupported.join(', ')}`);
    if (!selected.startNodeId || !(selected.nodes || []).some((node: any) => node.nodeId === selected.startNodeId)) {
      throw new ChatbotRuntimeError('invalid_start_node', 'Flow has no valid start node');
    }
    ctx.state = { ...ctx.state, flowId: identity(selected._id || selected.id), nodeId: selected.startNodeId,
      waitingForReply: false, scheduledActionId: null, delayReadyNode: null, generation: crypto.randomUUID(), error: null };
    await checkpoint(ctx);
    await executeFlow(ctx, selected);
  }
  async function fail(ctx: Context, error: unknown) {
    ctx.state.error = { code: error instanceof ChatbotRuntimeError ? error.code : 'runtime_failed',
      message: error instanceof Error ? error.message : String(error), at: now().toISOString() };
    await checkpoint(ctx).catch(() => {});
  }
  async function runAutomation(ctx: Context, rule: any) {
    const id = identity(rule._id);
    if (!id) throw new ChatbotRuntimeError('missing_rule_id', 'Automation rule requires a durable identity');
    const minutes = Number(rule.throttleMinutesPerLead ?? 5);
    if (!Number.isFinite(minutes) || minutes < 0) throw new ChatbotRuntimeError('invalid_rule_throttle', 'Automation throttle must be nonnegative minutes');
    const last = ctx.state.ruleLastExecuted?.[id] || ctx.lead.metadata?.[`automation:last:${id}`];
    if (minutes > 0 && last && now().getTime() - millis(last) < minutes * 60_000) return true;
    if (rule.actionType === 'send_text' || rule.actionType === 'send_image') {
      const body = String(rule.actionText || rule.caption || '').trim();
      const imageUrl = rule.imageUrl || rule.mediaUrl || rule.actionMediaUrl || null;
      if (imageUrl) {
        await send(ctx, {
          type: 'image',
          image: {
            link: imageUrl,
            ...(body ? { caption: body } : {}),
          }
        }, `${ctx.scope}:${ctx.eventId}:rule:${id}`);
      } else {
        if (!body || body.length > 4096) throw new ChatbotRuntimeError('invalid_rule_text', 'Automation requires 1–4096 text characters');
        await send(ctx, { type: 'text', text: { body, preview_url: true } }, `${ctx.scope}:${ctx.eventId}:rule:${id}`);
      }
    } else if (rule.actionType === 'send_template') {
      await send(ctx, await templatePayload({
        templateId: rule.actionTemplateId, templateVariables: rule.actionTemplateVariables,
      }, ctx), `${ctx.scope}:${ctx.eventId}:rule:${id}`);
    } else if (rule.actionType === 'update_lead') {
      const updates = rule.actionLeadUpdates;
      const allowed = ['status', 'workshopName', 'labels', 'assignedToUserId', 'notes'];
      if (!updates || typeof updates !== 'object' || Array.isArray(updates) || !Object.keys(updates).length ||
        Object.keys(updates).some(field => !allowed.includes(field))) {
        throw new ChatbotRuntimeError('unsupported_lead_updates', 'Automation supports only status, workshopName, labels, assignedToUserId and notes updates');
      }
      if (updates.labels !== undefined && (!Array.isArray(updates.labels) || updates.labels.some((label: any) => typeof label !== 'string'))) {
        throw new ChatbotRuntimeError('invalid_labels', 'Automation labels must be strings');
      }
      if (updates.assignedToUserId !== undefined && updates.assignedToUserId !== ctx.owner) {
        throw new ChatbotRuntimeError('unsupported_assignment', 'Cross-user automation assignment requires a tenant-team ownership resolver');
      }
      if (Object.entries(updates).some(([key, value]) => key !== 'labels' && typeof value !== 'string')) {
        throw new ChatbotRuntimeError('invalid_lead_updates', 'Automation lead fields must be strings');
      }
      const pairs = Object.keys(updates).map(() => '?,json(?)').join(',');
      const args = Object.entries(updates).flatMap(([field, value]) => [`$.${field}`, JSON.stringify(value)]);
      await sql(`UPDATE leads_sql SET data_json=json_set(data_json,${pairs}),updated_at=? WHERE document_id=?`,
        [...args, now().toISOString(), identity(ctx.lead._id)]);
    } else throw new ChatbotRuntimeError('unsupported_automation_action', `Automation action "${rule.actionType}" is unsupported`);
    ctx.state.ruleLastExecuted = { ...ctx.state.ruleLastExecuted, [id]: now().toISOString() };
    await checkpoint(ctx);
    return true;
  }
  async function inbound(input: ChatbotInboundInput, replayDeferred = false) {
    if (!input.messageId?.trim()) throw new ChatbotRuntimeError('missing_message_id', 'Provider message ID is required for atomic webhook deduplication', 400);
    await schema();
    const owner = input.tenantUserId || 'admincrm';
    const ctx = await context(identity(input.leadId), owner, input.phoneNumber, input.creds);
    ctx.eventId = input.messageId;
    const timestamp = now().toISOString();
    const recordedInbound = input.receivedAt ? null : await sql(`SELECT sent_at FROM meta_messages_sql
      WHERE wa_message_id=? AND lead_id=? AND direction='inbound' LIMIT 1`, [ctx.eventId, identity(ctx.lead._id)]);
    let originalReceivedAt = input.receivedAt || recordedInbound?.rows[0]?.sent_at || timestamp;
    // Store only replayable input, never access tokens or bridge secrets.
    const payload = JSON.stringify({ leadId: identity(ctx.lead._id), phoneNumber: ctx.to,
      messageBody: input.messageBody, triggerValues: input.triggerValues || [],
      wasFirstInbound: input.wasFirstInbound, tenantUserId: owner, messageId: ctx.eventId,
      receivedAt: originalReceivedAt });
    let claim = replayDeferred
      ? await sql(`UPDATE chatbot_runtime_events_sql SET status='processing',error=NULL,updated_at=?
          WHERE scope=? AND message_id=? AND status='deferred' RETURNING message_id`,
        [timestamp, ctx.scope, ctx.eventId])
      : await sql(`INSERT INTO chatbot_runtime_events_sql(scope,message_id,lead_id,status,payload_json,created_at,updated_at)
          VALUES (?,?,?,'processing',?,?,?) ON CONFLICT(scope,message_id) DO NOTHING RETURNING message_id`,
        [ctx.scope, input.messageId, identity(ctx.lead._id), payload, timestamp, timestamp]);
    if (!claim.rows.length) {
      const prior = await sql('SELECT status,error,payload_json FROM chatbot_runtime_events_sql WHERE scope=? AND message_id=?', [ctx.scope, input.messageId]);
      if (!replayDeferred && prior.rows[0]?.status === 'deferred') {
        originalReceivedAt = json(prior.rows[0].payload_json).receivedAt || originalReceivedAt;
        // Meta's HTTP 503 retry and cron may both try recovery; only one wins.
        claim = await sql(`UPDATE chatbot_runtime_events_sql SET status='processing',error=NULL,updated_at=?
          WHERE scope=? AND message_id=? AND status='deferred' RETURNING message_id`,
        [timestamp, ctx.scope, ctx.eventId]);
      }
      if (!claim.rows.length) return { status: 'duplicate', sentCount: 0,
        ...(prior.rows[0]?.status !== 'completed' ? { previousStatus: prior.rows[0]?.status, error: prior.rows[0]?.error } : {}) };
    }
    let locked = false;
    try {
      await lock(ctx); locked = true;
      const received = millis(originalReceivedAt);
      if (!received) throw new ChatbotRuntimeError('invalid_inbound_time', 'Inbound timestamp is invalid');
      if (received > now().getTime() + 60_000) throw new ChatbotRuntimeError('invalid_inbound_time', 'Inbound timestamp is in the future');
      ctx.state.lastInboundAt = new Date(Math.max(millis(ctx.state.lastInboundAt), received)).toISOString();
      const values = [input.messageBody, ...(input.triggerValues || [])].map(String).filter(value => value.trim());
      if (['stop', 'unsubscribe', 'cancel', 'block', 'opt out'].some(keyword => chatbotKeywordMatches(keyword, values, 'exact'))) {
        ctx.state.optedOut = true;
        ctx.state.flowId = null; ctx.state.nodeId = null; ctx.state.scheduledActionId = null;
        await sql("UPDATE leads_sql SET data_json=json_set(data_json,'$.isBlocked',json('true'),'$.consentStatus','opted-out'),updated_at=? WHERE document_id=?",
          [timestamp, identity(ctx.lead._id)]);
      } else if (!await blocked(ctx)) {
        const recording = await deps.recordingRequest?.({
          leadId: identity(ctx.lead._id), phoneNumber: ctx.to, messageBody: input.messageBody,
          triggerValues: input.triggerValues || [], tenantUserId: owner, creds: ctx.credentials,
          messageId: ctx.eventId, now: now(),
        });
        if (recording?.handled) {
          if (recording.message?.trim()) {
            await send(ctx, { type: 'text', text: { body: recording.message, preview_url: true } },
              `${ctx.scope}:${ctx.eventId}:recording-access`);
          }
        } else {
          const settings = await deps.settings(owner) || {};
          if (settings.chatbotEnabled === true) {
          if (!isChatbotOfficeOpen(settings, now())) {
            if (String(settings.afterHoursMessage || '').trim()) {
              await send(ctx, { type: 'text', text: { body: settings.afterHoursMessage, preview_url: true } }, `${ctx.scope}:${ctx.eventId}:after-hours`);
            }
          } else {
          const automationRules = (await deps.automationRules?.(owner) || [])
            .filter(rule => rule.enabled === true && identity(rule.createdByUserId) === owner &&
              (!rule.provider || rule.provider === 'meta'))
            .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || identity(a._id).localeCompare(identity(b._id)));
          const keywordAutomation = automationRules.find(rule => rule.triggerType === 'keyword' &&
            ((Array.isArray(rule.keywords) && rule.keywords.length > 0) ? rule.keywords : [rule.name || ''])
              .some((keyword: string) => chatbotKeywordMatches(keyword, values, rule.matchType || rule.matchMode)) &&
            chatbotAutomationConditions(ctx.lead, rule.conditions));
          const rules = (Array.isArray(settings.keywords) ? settings.keywords : [])
            .filter((rule: any) => rule.enabled !== false)
            .sort((a: any, b: any) => Number(b.priority || 0) - Number(a.priority || 0));
          const keyword = rules.find((rule: any) => (rule.keywords || [rule.keyword]).some((key: any) =>
            chatbotKeywordMatches(String(key || ''), values, rule.matchType || rule.matchMode)));
          const flows = (await deps.flows(owner)).filter(flow => identity(flow.createdByUserId) === owner &&
            flow.enabled !== false && (!flow.provider || flow.provider === 'meta'))
            .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || identity(a._id).localeCompare(identity(b._id)));
          const triggered = flows.find(flow => (flow.triggerKeywords || []).some((key: string) =>
            chatbotKeywordMatches(key, values, flow.triggerMatchType || flow.matchType)));
          if (keywordAutomation) await runAutomation(ctx, keywordAutomation);
          else if (keyword) {
            if (keyword.flowId) await startFlow(ctx, await flow(identity(keyword.flowId), owner));
            else if ((keyword.action || 'reply') === 'reply') {
              if (!String(keyword.response || '').trim()) throw new ChatbotRuntimeError('empty_keyword_reply', 'Matched keyword has no response');
              await send(ctx, { type: 'text', text: { body: keyword.response, preview_url: true } }, `${ctx.scope}:${ctx.eventId}:keyword`);
            } else if (keyword.action === 'send_template') {
              await send(ctx, await templatePayload(keyword, ctx), `${ctx.scope}:${ctx.eventId}:keyword-template`);
            } else throw new ChatbotRuntimeError('unsupported_keyword_action', `Keyword action "${keyword.action}" is unsupported`);
          } else if (triggered) await startFlow(ctx, await flow(identity(triggered._id || triggered.id), owner));
          else if (ctx.state.flowId) {
            if (ctx.state.error) throw new ChatbotRuntimeError('flow_requires_restart', 'Failed active flow requires explicit administrator restart', 409);
            await executeFlow(ctx, await flow(ctx.state.flowId, owner), values);
          } else {
            const days = Number(settings.welcomeRepeatDays || 0);
            const eligible = ctx.state.welcomeAt ? days > 0 && now().getTime() - millis(ctx.state.welcomeAt) >= days * 86400_000
              : days > 0 || input.wasFirstInbound;
            const welcomeRule = eligible ? automationRules.find(rule => rule.triggerType === 'welcome' &&
              chatbotAutomationConditions(ctx.lead, rule.conditions)) : null;
            const anyRule = automationRules.find(rule => rule.triggerType === 'any_message' && chatbotAutomationConditions(ctx.lead, rule.conditions));
            if (welcomeRule) {
              ctx.state.welcomeAt = timestamp;
              await runAutomation(ctx, welcomeRule);
            } else if (settings.welcomeEnabled === true && eligible && (settings.welcomeFlowId || String(settings.welcomeMessage || '').trim())) {
              ctx.state.welcomeAt = timestamp;
              if (settings.welcomeFlowId) await startFlow(ctx, await flow(identity(settings.welcomeFlowId), owner));
              else await send(ctx, { type: 'text', text: { body: settings.welcomeMessage, preview_url: true } }, `${ctx.scope}:${ctx.eventId}:welcome`);
            } else if (anyRule) await runAutomation(ctx, anyRule);
            else if (settings.aiEnabled === true && input.messageBody.trim()) {
              const reply = await deps.ai(input.messageBody, settings, ctx.lead);
              if (!reply?.trim()) throw new ChatbotRuntimeError('ai_no_reply', 'Configured AI fallback returned no response', 502);
              await send(ctx, { type: 'text', text: { body: reply, preview_url: true } }, `${ctx.scope}:${ctx.eventId}:ai`);
              }
              }
            }
          }
        }
      }
      await checkpoint(ctx);
      await sql("UPDATE chatbot_runtime_events_sql SET status='completed',updated_at=? WHERE scope=? AND message_id=?",
        [now().toISOString(), ctx.scope, ctx.eventId]);
      return { status: 'completed', sentCount: ctx.sentCount };
    } catch (error) {
      if (!locked && error instanceof ChatbotRuntimeError && error.code === 'conversation_busy') {
        // A distinct inbound event must survive webhook HTTP 200. Existing cron
        // drains this payload once the conversation lock becomes available.
        await sql(`UPDATE chatbot_runtime_events_sql SET status='deferred',error=?,updated_at=?
          WHERE scope=? AND message_id=?`, [error.message, now().toISOString(), ctx.scope, ctx.eventId]);
        throw new ChatbotRuntimeError('conversation_busy', 'Inbound event is durably deferred; retry after conversation processing completes', 503);
      }
      if (locked) await fail(ctx, error);
      await sql("UPDATE chatbot_runtime_events_sql SET status='failed',error=?,updated_at=? WHERE scope=? AND message_id=?",
        [error instanceof Error ? error.message : String(error), now().toISOString(), ctx.scope, ctx.eventId]).catch(() => {});
      throw error;
    } finally { if (ctx.lockToken) await unlock(ctx).catch(() => {}); }
  }
  async function start(input: { leadId: string; flowId: string; phoneNumber: string; ownerUserId: string }) {
    await schema();
    const ctx = await context(input.leadId, input.ownerUserId, input.phoneNumber);
    ctx.eventId = `manual:${crypto.randomUUID()}`;
    try {
      await lock(ctx, true);
      if ((await deps.settings(ctx.owner))?.chatbotEnabled !== true) {
        throw new ChatbotRuntimeError('chatbot_disabled', 'Enable the chatbot master switch before starting flows');
      }
      if (await blocked(ctx)) throw new ChatbotRuntimeError('blocked', 'Lead is blocked or opted out', 403);
      if (!ctx.state.lastInboundAt) {
        const recent = await sql(`SELECT sent_at FROM meta_messages_sql WHERE lead_id=? AND direction='inbound'
          AND sender_number=? ORDER BY sent_at DESC LIMIT 1`,           [identity(ctx.lead._id), phone(ctx.credentials.phoneNumber)]);
        ctx.state.lastInboundAt = recent.rows[0]?.sent_at;
      }
      const selected = await flow(input.flowId, input.ownerUserId);
      let first = selected.nodes?.find((node: any) => node.nodeId === selected.startNodeId);
      for (let hops = 0; first?.type === 'delay' && hops < 32; hops++) {
        first = selected.nodes?.find((node: any) => node.nodeId === first.nextNodeId);
      }
      if (first && ['message', 'question', 'buttons', 'template'].includes(first.type)) {
        await policy(ctx, first.type === 'template' ? 'template' : 'text');
      }
      await startFlow(ctx, selected);
      return { success: true, message: `Flow started! Sent ${ctx.sentCount} message(s) immediately.`,
        sentCount: ctx.sentCount, currentNode: ctx.state.nodeId || null, flowCompleted: !ctx.state.flowId,
        ...(ctx.firstReply ? { firstReply: ctx.firstReply } : {}) };
    } catch (error) { if (ctx.ready) await fail(ctx, error); throw error; }
    finally { if (ctx.lockToken) await unlock(ctx).catch(() => {}); }
  }
  async function runDue(options: { now?: Date; limit?: number } = {}) {
    await schema();
    const result = { scannedActions: 0, executedActions: 0, delayedMessages: 0, timeoutActions: 0,
      failedActions: 0, deferredEvents: 0, replayedEvents: 0,
      actionResults: [] as Array<{ actionId: string; actionType: string; status: 'ok' | 'error'; error?: string }> };
    const deferred = await sql(`SELECT scope,message_id,payload_json FROM chatbot_runtime_events_sql
      WHERE status='deferred' ORDER BY created_at,message_id LIMIT ?`, [Math.min(500, Math.max(1, options.limit || 100))]);
    result.deferredEvents = deferred.rows.length;
    for (const event of deferred.rows) {
      try {
        const input = json(event.payload_json);
        if (!input.messageId || !input.tenantUserId) throw new ChatbotRuntimeError('invalid_deferred_event', 'Deferred inbound payload is incomplete');
        const replay = await inbound(input, true);
        if (replay.status === 'completed') result.replayedEvents++;
      } catch (error) {
        if (error instanceof ChatbotRuntimeError && error.code === 'conversation_busy') continue;
        // Do not touch events claimed by another cron. Inbound records execution
        // failures itself; pre-claim configuration failures stay deferred.
        result.failedActions++;
        result.actionResults.push({ actionId: event.message_id, actionType: 'deferred_inbound',
          status: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    }
    const due = await sql("SELECT * FROM chatbot_scheduled_actions_sql WHERE status='pending' AND execute_at<=? ORDER BY execute_at LIMIT ?",
      [(options.now || now()).toISOString(), Math.min(500, Math.max(1, options.limit || 100))]);
    result.scannedActions = due.rows.length;
    for (const row of due.rows) {
      const claim = await sql("UPDATE chatbot_scheduled_actions_sql SET status='processing',updated_at=? WHERE document_id=? AND status='pending' RETURNING document_id",
        [now().toISOString(), row.document_id]);
      if (!claim.rows.length) continue;
      let ctx: Context | undefined;
      try {
        const action = json(row.data_json);
        if (!action.ownerUserId || !action.generation || !['flow_continue', 'reply_timeout'].includes(row.action_type)) {
          throw new ChatbotRuntimeError('unsupported_scheduled_action', 'Legacy/unowned scheduled action cannot be safely executed');
        }
        ctx = await context(String(row.lead_id), action.ownerUserId, String(row.phone_number));
        ctx.eventId = `scheduled:${row.document_id}`;
        await lock(ctx);
        const stale = ctx.scope !== action.scope || ctx.state.generation !== action.generation ||
          ctx.state.flowId !== row.flow_id || (row.action_type === 'flow_continue' ? ctx.state.scheduledActionId !== row.document_id
            : !ctx.state.waitingForReply || ctx.state.nodeId !== action.nodeId || ctx.state.replyToken !== action.replyToken);
        if (stale || await blocked(ctx) || (await deps.settings(ctx.owner))?.chatbotEnabled !== true) {
          await sql("UPDATE chatbot_scheduled_actions_sql SET status='cancelled',updated_at=? WHERE document_id=?", [now().toISOString(), row.document_id]);
          continue;
        }
        if (ctx.state.error) throw new ChatbotRuntimeError('flow_requires_restart', 'Scheduled flow is in a failed state', 409);
        const selected = await flow(String(row.flow_id), action.ownerUserId);
        if (row.action_type === 'reply_timeout') {
          const node = selected.nodes?.find((node: any) => node.nodeId === ctx!.state.nodeId);
          ctx.state.waitingForReply = false;
          ctx.state.nodeId = node?.type === 'wait_reply' ? node.timeoutNodeId || null :
            node?.timerAction === 'goto_node' ? node.timerTargetNodeId : null;
        }
        await executeFlow(ctx, selected, [], true);
        await sql("UPDATE chatbot_scheduled_actions_sql SET status='completed',updated_at=? WHERE document_id=?", [now().toISOString(), row.document_id]);
        result.executedActions++;
        if (row.action_type === 'reply_timeout') result.timeoutActions++; else result.delayedMessages += ctx.sentCount;
        result.actionResults.push({ actionId: row.document_id, actionType: row.action_type, status: 'ok' });
      } catch (error) {
        if (ctx?.ready) await fail(ctx, error);
        const message = error instanceof Error ? error.message : String(error);
        await sql("UPDATE chatbot_scheduled_actions_sql SET status='failed',data_json=json_set(data_json,'$.error',?),updated_at=? WHERE document_id=?",
          [message, now().toISOString(), row.document_id]).catch(() => {});
        result.failedActions++;
        result.actionResults.push({ actionId: row.document_id, actionType: row.action_type, status: 'error', error: message });
      } finally { if (ctx?.lockToken) await unlock(ctx).catch(() => {}); }
    }
    return result;
  }
  async function readState(input: { leadId: string; ownerUserId: string }) {
    await schema();
    const ctx = await context(input.leadId, input.ownerUserId);
    const result = await sql('SELECT data_json FROM chatbot_runtime_state_sql WHERE scope=? AND lead_id=?',
      [ctx.scope, identity(ctx.lead._id)]);
    const state = result.rows[0] ? json(result.rows[0].data_json) : null;
    return { state: state?.flowId ? state : null,
      requiresReconciliation: Boolean(state?.pendingSendKey),
      ...(state?.error ? { error: state.error } : {}) };
  }
  async function cancel(input: { leadId: string; ownerUserId: string }) {
    await schema();
    const ctx = await context(input.leadId, input.ownerUserId);
    try {
      // Cancellation may end a flow, but must never erase an uncertain send.
      await lock(ctx, true, true);
      ctx.state.flowId = null; ctx.state.nodeId = null; ctx.state.waitingForReply = false;
      ctx.state.scheduledActionId = null; ctx.state.replyToken = null; ctx.state.delayReadyNode = null;
      ctx.state.generation = crypto.randomUUID();
      const timestamp = now().toISOString();
      await deps.batch([
        { sql: `UPDATE chatbot_runtime_state_sql SET data_json=?,updated_at=?
          WHERE scope=? AND lead_id=? AND lock_token=?`,
          args: [JSON.stringify(ctx.state), timestamp, ctx.scope, identity(ctx.lead._id), ctx.lockToken] },
        { sql: `UPDATE chatbot_scheduled_actions_sql SET status='cancelled',updated_at=?
          WHERE lead_id=? AND status='pending' AND
          (json_extract(data_json,'$.scope')=? OR json_extract(data_json,'$.ownerUserId')=?
            OR (json_extract(data_json,'$.ownerUserId') IS NULL AND json_extract(data_json,'$.scope') IS NULL
              AND flow_id IN (SELECT document_id FROM chatbot_flows_sql WHERE created_by_user_id=?)))`,
          args: [timestamp, identity(ctx.lead._id), ctx.scope, ctx.owner, ctx.owner] },
        { sql: `UPDATE leads_sql SET data_json=json_set(data_json,'$.metadata.chatbotFlowState',json('null')),updated_at=?
          WHERE document_id=?`, args: [timestamp, identity(ctx.lead._id)] },
      ]);
      return { success: true, state: null, requiresReconciliation: Boolean(ctx.state.pendingSendKey),
        message: 'Flow cancelled and pending owned scheduled actions aborted. Previously accepted sends are preserved.' };
    } finally { if (ctx.lockToken) await unlock(ctx).catch(() => {}); }
  }
  return { inbound, start, runDue, readState, cancel };
}
