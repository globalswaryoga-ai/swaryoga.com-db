import { createHash } from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { ensureBroadcastSchema } from '@/lib/bunnyBroadcastRepository';
import { normalizePhone } from '@/lib/whatsapp';
import { type RegistrationRecord, evaluateMetaLead } from '@/lib/registrationRules';
import { registrationWorkshops, type RegistrationState } from '@/lib/registrationState';
import { registrationTargetMatches } from '@/lib/registrationRules';
import { readRegistrationDecisions } from '@/lib/registrationAiConfig';

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
  const hash = createHash('sha256').update(JSON.stringify([owner, template._id, eventKey])).digest('hex');
  const runId = `registration_${hash}`;
  const now = new Date().toISOString();
  const unique = new Map<string, RegistrationRecord>();
  for (const lead of leads) {
    const phone = normalizePhone(lead.phoneNumber || lead.mobile);
    if (lead.isBlocked || phone.length < 10 || phone.length > 15) continue;
    if (!unique.has(phone)) unique.set(phone, { ...lead, phoneNumber: phone });
  }
  if (!unique.size) throw new Error('No eligible leads with a valid WhatsApp number');
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

export async function processRegistrationApprovals(state: RegistrationState, leads: RegistrationRecord[], owner: string, superAdmin: boolean, now = new Date()) {
  const results: Array<{ workshopId: string; queued: number }> = [];
  for (const workshop of registrationWorkshops(state)) {
    const formId = workshop.metadata?.facebookFormId || workshop.metadata?.metaFormId;
    const workshopLeads = leads.filter(lead =>
      (lead.source === 'meta_instant_form' || lead.source === 'meta_leadgen' || (lead.labels || []).includes('meta_instant_form')) &&
      (lead.workshopId === workshop.id || (formId && lead.metadata?.metaFormId === formId)));
    for (const lead of workshopLeads) {
      const stages = [
        ['ai9AConfig', ['new', 'lead', 'new_pending'], 'stage_1_new', 'new_pending', 'new_rejected'],
        ['ai9BConfig', ['stage_1_new', 'stage_1_pending'], 'stage_2_new', 'stage_1_pending', 'stage_1_rejected'],
        ['ai9CConfig', ['stage_2_new', 'stage_2_pending'], 'stage_3_new', 'stage_2_pending', 'stage_2_rejected'],
        ['ai9DConfig', ['stage_3_new', 'stage_3_pending'], 'approved', 'stage_3_pending', 'stage_3_rejected'],
      ] as const;
      for (const [configKey, statuses, approved, pending, rejected] of stages) {
        const config = workshop.metadata?.[configKey];
        if (!config?.isActive || !(statuses as readonly string[]).includes(lead.status || 'new')) continue;
        const evaluated = evaluateMetaLead(lead, config, approved, pending, rejected);
        if (!evaluated || evaluated.status === lead.status) continue;
        lead.status = evaluated.status;
        lead.metadata = { ...lead.metadata, ai9Reason: evaluated.reason };
        if (lead.status === 'approved') lead.metadata = { ...lead.metadata, approvedAt: now.toISOString(), ai9WEligible: true };
        if (lead.status.includes('pending')) {
          lead.metadata = { ...lead.metadata, wtEligibleAt: now.toISOString(), wtAutoEligible: true };
        }
        await bunnyExecute({
          sql: 'UPDATE leads_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
          args: [JSON.stringify(lead), now.toISOString(), String(lead._id)],
        });
      }
      const settings = workshop.metadata?.wtSettings;
      const stage = lead.status === 'approved' ? settings?.approved : lead.status?.includes('pending') ? settings?.pending : null;
      const triggerConfig = workshop.metadata?.ai9EConfig;
      if (!stage?.template || !triggerConfig?.isActive) continue;
      const triggerEvaluation = evaluateMetaLead(lead, triggerConfig, 'eligible', 'pending', 'rejected');
      if (triggerEvaluation && triggerEvaluation.status !== 'eligible') continue;
      const eligible = lead.status === 'approved'
        ? lead.metadata?.ai9WEligible === true || lead.metadata?.wtAutoEligible === true
        : lead.metadata?.wtAutoEligible === true;
      if (!eligible) continue;
      const event = lead.status === 'approved' ? lead.metadata?.approvedAt : lead.metadata?.wtEligibleAt;
      if (!event || !Number.isFinite(new Date(event).getTime())) continue;
      if (lead.metadata?.wtLastTemplates?.[stage.template] && lead.metadata?.wtStatus !== 'failed') continue;
      const delay = Number(stage.delay ?? 5);
      if (!Number.isFinite(delay) || delay < 0) throw new Error(`Invalid WhatsApp delay for ${workshop.name}`);
      const template = await resolveRegistrationTemplate(stage.template, owner, superAdmin);
      const result = await queueRegistrationTemplate({
        leads: [lead], template, owner, eventKey: `${workshop.id}:${lead._id}:${event}`,
        dueAt: new Date(new Date(event).getTime() + delay * 60000),
      });
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
