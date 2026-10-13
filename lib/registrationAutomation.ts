import { createHash } from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { ensureBroadcastSchema } from '@/lib/bunnyBroadcastRepository';
import { normalizePhone } from '@/lib/whatsapp';
import { type RegistrationRecord, evaluateMetaLead } from '@/lib/registrationRules';
import { registrationWorkshops, type RegistrationState } from '@/lib/registrationState';
import { registrationTargetMatches } from '@/lib/registrationRules';
import { readRegistrationDecisions } from '@/lib/registrationAiConfig';
import { matchesMetaBatch } from '@/lib/registrationMetaReport';
import { isApprovedJustBeforeActivation, isFutureMetaAutomationLead, isManualApprovalAutomationLead, META_APPROVAL_STAGES } from '@/lib/registrationMetaAutomation';

export async function resolveRegistrationTemplate(nameOrId: string, owner: string, superAdmin: boolean) {
  const result = await bunnyExecute({
    sql: `SELECT * FROM whatsapp_templates_sql WHERE (document_id = ? OR template_name = ?)
      AND UPPER(status) = 'APPROVED' AND (provider = 'meta' OR provider IS NULL)
      ORDER BY updated_at DESC`,
    args: [nameOrId, nameOrId],
  });
  const row = result.rows.find(candidate => superAdmin || candidate.created_by === owner);
  if (!row) throw new Error('An approved Meta template belonging to this account is required');
  return {
    ...JSON.parse(String(row.data_json)),
    _id: String(row.document_id), templateName: String(row.template_name),
    language: String(row.language || 'en'), status: String(row.status),
  };
}

export async function queueRegistrationTemplate({
  leads, template, owner, eventKey, dueAt,
}: {
  leads: RegistrationRecord[];
  template: RegistrationRecord;
  owner: string;
  eventKey: string;
  dueAt: Date;
}) {
  await ensureBroadcastSchema();
  // Recording-access runs carry per-event template variables, so they keep one run per event.
  if (template.recordingAccess) return queueSingleEventRun({ leads, template, owner, eventKey, dueAt });
  const day = new Date(dueAt.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  const baseRunId = `registration_daily_${createHash('sha256').update(JSON.stringify([owner, template._id, day])).digest('hex')}`;
  const existing = await bunnyExecute({
    sql: `SELECT status, json_extract(data_json, '$.reportFolder') AS folder FROM broadcast_runs_sql WHERE document_id = ?`,
    args: [baseRunId],
  });
  const closed = existing.rows[0] && (existing.rows[0].status === 'cancelled' || existing.rows[0].folder === 'deleted');
  const runId = closed ? `${baseRunId}_${createHash('sha256').update(eventKey).digest('hex').slice(0, 12)}` : baseRunId;
  const now = new Date().toISOString();
  const unique = eligibleRecipients(leads);
  const label = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const due = dueAt.toISOString();
  const results = await bunnyBatch([
    {
      sql: `INSERT INTO broadcast_runs_sql (document_id, broadcast_run_key, name, created_by_user_id,
        created_by_label, mode, provider, status, template_id, scheduled_at, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'schedule', 'meta', 'scheduled', ?, ?, ?, ?, ?)
        ON CONFLICT(document_id) DO NOTHING`,
      args: [runId, runId, `Registration Automation — ${label} · ${template.templateName}`, owner, 'Registration Automation', template._id, due,
        JSON.stringify({ templateSnapshot: template, stats: { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0 },
          target: { type: 'registrationDaily', day } }), now, now],
    },
    ...[...unique.values()].map(lead => ({
      sql: `INSERT INTO broadcast_run_messages_sql (document_id, run_id, lead_id, phone_number, status, due_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, ?) ON CONFLICT(document_id) DO NOTHING`,
      args: [`${runId}_${createHash('sha256').update(JSON.stringify([eventKey, lead.phoneNumber])).digest('hex')}`,
        runId, String(lead._id), lead.phoneNumber, due, now, now],
    })),
    {
      // Reopen the day's run when new recipients arrive; never reopen cancelled or deleted runs.
      sql: `UPDATE broadcast_runs_sql SET
          status = 'scheduled', completed_at = NULL, updated_at = ?,
          scheduled_at = (SELECT MIN(COALESCE(due_at, ?)) FROM broadcast_run_messages_sql WHERE run_id = ? AND status = 'pending')
        WHERE document_id = ? AND status != 'cancelled'
          AND COALESCE(json_extract(data_json, '$.reportFolder'), '') != 'deleted'
          AND EXISTS (SELECT 1 FROM broadcast_run_messages_sql WHERE run_id = ? AND status = 'pending')`,
      args: [now, due, runId, runId, runId],
    },
  ]);
  const queued = results.slice(1, 1 + unique.size).reduce((sum, item) => sum + Number(item?.rowsAffected || 0), 0);
  return { runId, queued };
}

const IST_OFFSET_MS = 330 * 60000;

function eligibleRecipients(leads: RegistrationRecord[]) {
  const unique = new Map<string, RegistrationRecord>();
  for (const lead of leads) {
    const phone = normalizePhone(lead.phoneNumber || lead.mobile);
    if (lead.isBlocked || phone.length < 10 || phone.length > 15) continue;
    if (!unique.has(phone)) unique.set(phone, { ...lead, phoneNumber: phone });
  }
  if (!unique.size) throw new Error('No eligible leads with a valid WhatsApp number');
  return unique;
}

async function queueSingleEventRun({ leads, template, owner, eventKey, dueAt }: {
  leads: RegistrationRecord[]; template: RegistrationRecord; owner: string; eventKey: string; dueAt: Date;
}) {
  const hash = createHash('sha256').update(JSON.stringify([owner, template._id, eventKey])).digest('hex');
  const runId = `registration_${hash}`;
  const now = new Date().toISOString();
  const unique = eligibleRecipients(leads);
  const stats = { total: unique.size, pending: unique.size, sent: 0, failed: 0, skipped: 0 };
  const results = await bunnyBatch([
    {
      sql: `INSERT INTO broadcast_runs_sql (document_id, broadcast_run_key, name, created_by_user_id,
        created_by_label, mode, provider, status, template_id, scheduled_at, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'schedule', 'meta', 'scheduled', ?, ?, ?, ?, ?)
        ON CONFLICT(document_id) DO NOTHING`,
      args: [runId, runId, `Registration: ${template.templateName}`, owner, 'Registration Automation', template._id, dueAt.toISOString(),
        JSON.stringify({ templateSnapshot: template, stats, target: { type: 'leadIds', leadIds: [...unique.values()].map(lead => lead._id), registrationEventKey: eventKey } }), now, now],
    },
    ...[...unique.values()].map(lead => ({
      sql: `INSERT INTO broadcast_run_messages_sql (document_id, run_id, lead_id, phone_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?) ON CONFLICT(document_id) DO NOTHING`,
      args: [`${runId}_${createHash('sha256').update(lead.phoneNumber).digest('hex')}`, runId, String(lead._id), lead.phoneNumber, now, now],
    })),
  ]);
  return { runId, queued: Number(results[0].rowsAffected) ? unique.size : 0 };
}

async function markLeadAutomation(lead: RegistrationRecord, patch: RegistrationRecord, now: Date) {
  lead.metadata = { ...lead.metadata, ...patch,
    ...(patch.wtLastTemplates ? { wtLastTemplates: { ...lead.metadata?.wtLastTemplates, ...patch.wtLastTemplates } } : {}) };
  await bunnyExecute({
    sql: 'UPDATE leads_sql SET data_json = json_patch(data_json, ?), updated_at = ? WHERE document_id = ?',
    args: [JSON.stringify({ metadata: patch }), now.toISOString(), String(lead._id)],
  });
}

/**
 * Returns where a contact already received this template (manual bulk broadcast, any owner, or the inbox),
 * so automation never resends to people who were messaged before the trigger existed.
 */
export async function findPreviousTemplateSend(phone: string, template: RegistrationRecord): Promise<string | null> {
  const last10 = String(phone || '').replace(/\D/g, '').slice(-10);
  if (last10.length < 10) return null;
  const ids = [String(template._id), String(template.templateName)];
  await ensureBroadcastSchema();
  const broadcast = await bunnyExecute({
    sql: `SELECT r.document_id FROM broadcast_run_messages_sql m
      JOIN broadcast_runs_sql r ON r.document_id = m.run_id
      WHERE substr(m.phone_number, -10) = ?
      AND (r.template_id IN (?, ?) OR json_extract(r.data_json, '$.templateSnapshot.templateName') = ?)
      AND ((m.wa_message_id IS NOT NULL AND m.wa_message_id != '') OR LOWER(m.status) IN ('sent', 'delivered', 'read'))
      LIMIT 1`,
    args: [last10, ...ids, String(template.templateName)],
  });
  if (broadcast.rows.length) return `broadcast ${String(broadcast.rows[0].document_id)}`;
  try {
    const inbox = await bunnyExecute({
      sql: `SELECT document_id FROM meta_messages_sql WHERE substr(phone_number, -10) = ? AND direction = 'outbound'
        AND LOWER(status) != 'failed'
        AND (json_extract(data_json, '$.metadata.templateId') IN (?, ?)
          OR json_extract(data_json, '$.metadata.template.templateName') = ?
          OR json_extract(data_json, '$.metadata.templateName') = ?)
        LIMIT 1`,
      args: [last10, ...ids, String(template.templateName), String(template.templateName)],
    });
    if (inbox.rows.length) return 'Meta inbox history';
  } catch (error) {
    if (!/no such table/i.test(error instanceof Error ? error.message : String(error))) throw error;
  }
  return null;
}

export async function processRegistrationApprovals(state: RegistrationState, leads: RegistrationRecord[], owner: string, superAdmin: boolean, now = new Date()) {
  const results: Array<{ workshopId: string; queued: number }> = [];
  for (const workshop of registrationWorkshops(state)) {
    const formId = workshop.metadata?.facebookFormId || workshop.metadata?.metaFormId;
    const workshopLeads = leads.filter(lead => matchesMetaBatch(lead, String(workshop.id), String(formId || '')));
    for (const lead of workshopLeads) {
      if (lead.isBlocked) continue;
      const stages = [
        ['ai9AConfig', ['new', 'lead', 'new_pending'], 'stage_1_new', 'new_pending', 'new_rejected'],
        // Stage 1 (AI-9B) is the final screen. Legacy Stage 2/3 statuses are re-screened here instead of stalling.
        ['ai9BConfig', ['stage_1_new', 'stage_1_pending', 'stage_2_new', 'stage_2_pending', 'stage_3_new', 'stage_3_pending'],
          'approved', 'stage_1_pending', 'stage_1_rejected'],
      ] as const;
      for (const [configKey, statuses, approved, pending, rejected] of stages) {
        const config = workshop.metadata?.[configKey];
        if (!config?.isActive || !(statuses as readonly string[]).includes(lead.status || 'new')) continue;
        const evaluated = evaluateMetaLead(lead, config, approved, pending, rejected);
        if (!evaluated || evaluated.status === lead.status) continue;
        lead.status = evaluated.status;
        const metadataPatch: RegistrationRecord = { ai9Reason: evaluated.reason,
          ai9PassedStages: { [configKey]: evaluated.status === approved } };
        if (lead.status === 'approved') Object.assign(metadataPatch, { approvedAt: now.toISOString(), ai9WEligible: true });
        if (lead.status.includes('pending')) {
          Object.assign(metadataPatch, { wtEligibleAt: now.toISOString(), wtAutoEligible: true });
        }
        lead.metadata = { ...lead.metadata, ...metadataPatch,
          ai9PassedStages: { ...lead.metadata?.ai9PassedStages, ...metadataPatch.ai9PassedStages } };
        await bunnyExecute({
          sql: 'UPDATE leads_sql SET data_json = json_patch(data_json, ?), updated_at = ? WHERE document_id = ?',
          args: [JSON.stringify({ status: lead.status, metadata: metadataPatch }), now.toISOString(), String(lead._id)],
        });
      }
      const settings = workshop.metadata?.wtSettings;
      if (lead.status !== 'approved') continue;
      const manual = isManualApprovalAutomationLead(lead, workshop.metadata || {});
      if (!manual && ((!isFutureMetaAutomationLead(lead, workshop.metadata || {}) &&
          !isApprovedJustBeforeActivation(lead, workshop.metadata || {})) ||
          !META_APPROVAL_STAGES.every(key => lead.metadata?.ai9PassedStages?.[key] === true))) continue;
      const stage = settings?.approved;
      const triggerConfig = workshop.metadata?.ai9EConfig;
      if (!stage?.template || (!manual && !triggerConfig?.isActive)) continue;
      if (!manual && triggerConfig?.isActive) {
        const triggerEvaluation = evaluateMetaLead(lead, triggerConfig, 'eligible', 'pending', 'rejected');
        if (triggerEvaluation && triggerEvaluation.status !== 'eligible') continue;
      }
      if (lead.metadata?.ai9WEligible !== true && lead.metadata?.wtAutoEligible !== true) continue;
      const event = lead.metadata?.approvedAt;
      if (!event || !Number.isFinite(new Date(event).getTime())) continue;
      if (lead.metadata?.wtLastTemplates?.[stage.template] && lead.metadata?.wtStatus !== 'failed') continue;
      const delay = Number(stage.delay ?? 5);
      if (!Number.isFinite(delay) || delay < 0) throw new Error(`Invalid WhatsApp delay for ${workshop.name}`);
      const template = await resolveRegistrationTemplate(stage.template, owner, superAdmin);
      if (lead.metadata?.wtLastTemplates?.[template.templateName] || lead.metadata?.wtLastTemplates?.[template._id]) continue;
      const phone = normalizePhone(lead.phoneNumber || lead.mobile);
      const previous = await findPreviousTemplateSend(phone, template);
      if (previous) {
        await markLeadAutomation(lead, { wtStatus: 'skipped', wtSkipReason: `Already messaged with ${template.templateName} (${previous})`,
          wtLastTemplates: { [template.templateName]: now.toISOString() } }, now);
        continue;
      }
      const result = await queueRegistrationTemplate({
        leads: [lead], template, owner, eventKey: `${workshop.id}:${lead._id}:meta-approved`,
        dueAt: new Date(new Date(event).getTime() + delay * 60000),
      });
      if (result.queued) {
        await markLeadAutomation(lead, { wtStatus: 'queued', wtQueuedRunId: result.runId, wtQueuedAt: now.toISOString(),
          wtApprovalSource: manual ? 'manual' : 'ai9' }, now);
      }
      results.push({ workshopId: String(workshop.id), queued: result.queued });
    }
  }
  return results;
}

/**
 * Automates WhatsApp delivery for leads approved in the New Registration funnel (Approval-1..4 or Registered).
 * Uses the batch's configured wtSettings.approved template and prevents duplicate sends.
 */
export async function processFunnelApprovals(state: RegistrationState, leads: RegistrationRecord[], owner: string, superAdmin: boolean, now = new Date()) {
  const results: Array<{ workshopId: string; queued: number }> = [];
  const { assembleRegistrationLeads, registrationBatchRows } = await import('@/lib/registrationLeads');
  const { listForms, listSubmissions } = await import('@/lib/bunny-forms-db');
  const [forms, submissions] = await Promise.all([listForms(), listSubmissions()]);
  const rows = assembleRegistrationLeads(leads, submissions, forms);

  for (const workshop of registrationWorkshops(state)) {
    const settings = workshop.metadata?.wtSettings;
    const stage = settings?.approved;
    if (!stage?.template) continue;

    const decisions = readRegistrationDecisions(state, String(workshop.id));
    const batchRows = registrationBatchRows(rows, workshop);

    for (const row of batchRows) {
      const decision = decisions[row.id] || decisions[row.leadId] || {};
      const status = String(decision.status || '').toLowerCase();
      const copies: string[] = Array.isArray(decision.copies) ? decision.copies.map(c => String(c).toLowerCase()) : [];
      const isApprovedInFunnel = status.startsWith('approval') || status === 'registered_leads' ||
        copies.some(c => c.startsWith('approval') || c === 'registered_leads') ||
        decision.isRegistered === true;

      if (!isApprovedInFunnel || decision.isRejected) continue;

      const lead = leads.find(l => String(l._id) === String(row.leadId || row.id));
      if (!lead || lead.isBlocked) continue;

      const phone = normalizePhone(row.phoneNumber || row.mobile || lead.phoneNumber || lead.mobile);
      if (phone.length < 10) continue;

      if (lead.metadata?.wtLastTemplates?.[stage.template] && lead.metadata?.wtStatus !== 'failed') continue;

      const delay = Number(stage.delay ?? 0);
      let template: any;
      try {
        template = await resolveRegistrationTemplate(stage.template, owner, superAdmin);
      } catch {
        continue;
      }

      if (lead.metadata?.wtLastTemplates?.[template.templateName] || lead.metadata?.wtLastTemplates?.[template._id]) continue;

      const previous = await findPreviousTemplateSend(phone, template);
      if (previous) {
        await markLeadAutomation(lead, {
          wtStatus: 'skipped',
          wtSkipReason: `Already messaged with ${template.templateName} (${previous})`,
          wtLastTemplates: { [template.templateName]: now.toISOString() },
        }, now);
        continue;
      }

      const result = await queueRegistrationTemplate({
        leads: [{ ...lead, phoneNumber: phone, name: row.name || lead.name }],
        template,
        owner,
        eventKey: `${workshop.id}:${lead._id}:funnel-approved`,
        dueAt: new Date(now.getTime() + delay * 60000),
      });

      if (result.queued) {
        await markLeadAutomation(lead, {
          wtStatus: 'queued',
          wtQueuedRunId: result.runId,
          wtQueuedAt: now.toISOString(),
          wtApprovalSource: 'funnel',
          wtLastTemplates: { [template.templateName]: now.toISOString() },
        }, now);
      }
      results.push({ workshopId: String(workshop.id), queued: result.queued });
    }
  }
  return results;
}

export function registrationTriggerDue(trigger: RegistrationRecord, now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: trigger.timeZone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const part = (name: string) => parts.find(value => value.type === name)?.value || '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const time = `${part('hour')}:${part('minute')}`;
  const dates: string[] = trigger.dates || [];
  const due = dates.filter(date => date < today || (date === today && trigger.time <= time));
  if (trigger.repeat === 'none' || !trigger.repeat) return due;
  const first = [...dates].sort()[0];
  if (!first || today < first || time < trigger.time) return due;
  const start = new Date(`${first}T12:00:00Z`);
  const current = new Date(`${today}T12:00:00Z`);
  const recurring = trigger.repeat === 'daily' ||
    (trigger.repeat === 'weekly' && start.getUTCDay() === current.getUTCDay()) ||
    (trigger.repeat === 'monthly' && start.getUTCDate() === current.getUTCDate());
  return [...new Set([...due, ...(recurring ? [today] : [])])];
}

export async function processRegistrationSchedules(state: RegistrationState, leads: RegistrationRecord[], owner: string, superAdmin: boolean, now = new Date()) {
  const { parseRegistrationValue } = await import('@/lib/registrationState');
  const triggers = parseRegistrationValue<RegistrationRecord[]>(state.crm_ai_triggers, []);
  let queued = 0;
  for (const trigger of triggers) {
    if (trigger.status !== 'active' || trigger.channel !== 'meta') continue;
    // Older browser-only triggers do not have a saved audience; never expand them to all leads.
    if (!Array.isArray(trigger.leadIds) || !trigger.leadIds.length) continue;
    const wanted = new Set(trigger.leadIds.map(String));
    const decisions = readRegistrationDecisions(state, String(trigger.batchId || ''));
    const responses = Array.isArray(trigger.responseAudience) ? trigger.responseAudience : [];
    const selected = leads.filter(lead => {
      if (!wanted.has(String(lead._id))) return false;
      const linked = responses.filter((entry: RegistrationRecord) => entry.leadId === String(lead._id));
      return linked.length
        ? linked.some((entry: RegistrationRecord) => registrationTargetMatches({ ...lead, id: entry.responseId }, decisions, trigger.targetCategory || 'All Leads'))
        : registrationTargetMatches(lead, decisions, trigger.targetCategory || 'All Leads');
    });
    if (!selected.length) continue;
    const dueDates = registrationTriggerDue(trigger, now);
    if (!dueDates.length) continue;
    const template = await resolveRegistrationTemplate(trigger.template, owner, superAdmin);
    for (const date of dueDates) {
      const result = await queueRegistrationTemplate({ leads: selected, template, owner, eventKey: `trigger:${trigger.id}:${date}`, dueAt: now });
      queued += result.queued;
    }
  }
  return { queued };
}
