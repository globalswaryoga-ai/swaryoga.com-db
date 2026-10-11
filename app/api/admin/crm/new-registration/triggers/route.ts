import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';
import { readRegistrationState, replaceRegistrationStateIfUnchanged, parseRegistrationValue, registrationWorkshops } from '@/lib/registrationState';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { assembleRegistrationLeads, registrationBatchRows } from '@/lib/registrationLeads';
import { readRegistrationDecisions } from '@/lib/registrationAiConfig';
import { registrationTargetMatches } from '@/lib/registrationRules';
import { resolveRegistrationTemplate } from '@/lib/registrationAutomation';
import { ensureBroadcastSchema } from '@/lib/bunnyBroadcastRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.channel !== 'meta' || !Array.isArray(body.dates) || !body.dates.length ||
        body.dates.some((date: unknown) => typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date).getTime()) || new Date(date).toISOString().slice(0, 10) !== date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time || '') ||
        !['none', 'daily', 'weekly', 'monthly'].includes(body.repeat) || !Array.isArray(body.leadIds) || !body.leadIds.length) {
      return NextResponse.json({ error: 'Select Meta, valid dates/time, a template and matching leads' }, { status: 400 });
    }
    new Intl.DateTimeFormat('en', { timeZone: body.timeZone || 'Asia/Kolkata' });
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const [state, allLeads, allForms, allSubmissions] = await Promise.all([readRegistrationState(scope), loadBunnyLeads(), listForms(), listSubmissions()]);
    const workshop = registrationWorkshops(state).find(workshop => String(workshop.id) === body.batchId);
    if (!workshop?.formId) return NextResponse.json({ error: 'Select a batch with its saved language form before scheduling.' }, { status: 400 });
    const forms = allForms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
    const formIds = new Set(forms.map(form => form.formId));
    const leads = allLeads.filter(lead => registrationLeadOwned(lead, viewer));
    const rows = registrationBatchRows(assembleRegistrationLeads(leads, allSubmissions.filter(submission => viewer.superAdmin || formIds.has(submission.formId)), forms), workshop);
    const wanted = new Set(body.leadIds.map(String));
    const decisions = readRegistrationDecisions(state, body.batchId);
    const responseIds = Array.isArray(body.responseIds) ? new Set(body.responseIds.map(String)) : null;
    const audience = rows.filter(row => row.leadId && wanted.has(String(row.leadId)) &&
      (!responseIds || responseIds.has(String(row.id))) &&
      registrationTargetMatches(row, decisions, body.targetCategory || 'All Leads'));
    const ids = [...new Set(audience.map(row => String(row.leadId)))];
    if (!ids.length) return NextResponse.json({ error: 'No eligible CRM leads in this batch/category. Sync form data first.' }, { status: 400 });
    const template = await resolveRegistrationTemplate(String(body.template || ''), viewer.userId, viewer.superAdmin);
    const triggers = parseRegistrationValue<Record<string, any>[]>(state.crm_ai_triggers, []);
    if (request.method === 'PUT') {
      if (!triggers.some(trigger => trigger.id === body.id && trigger.batchId === body.batchId)) {
        return NextResponse.json({ error: 'Trigger not found in this batch.' }, { status: 404 });
      }
      await ensureBroadcastSchema();
      const runs = await bunnyExecute({
        sql: "SELECT document_id FROM broadcast_runs_sql WHERE created_by_user_id = ? AND json_extract(data_json, '$.target.registrationEventKey') LIKE ? LIMIT 1",
        args: [viewer.userId, `trigger:${body.id}:%`],
      });
      if (runs.rows.length) return NextResponse.json({ error: 'This schedule has already queued messages. Cancel it and create a new schedule instead of editing.' }, { status: 409 });
    }
    const trigger = {
      id: request.method === 'PUT' ? body.id : randomUUID(), channel: 'meta', template: template._id, templateName: template.templateName,
      dates: body.dates, time: body.time, timeZone: body.timeZone || 'Asia/Kolkata',
      repeat: body.repeat, status: 'active', leadIds: ids, targetCategory: body.targetCategory || 'All Leads',
      audience: String(body.audience || ''), batchId: String(body.batchId || ''),
      responseAudience: audience.map(row => ({ responseId: String(row.id), leadId: String(row.leadId) })),
    };
    const saved = await replaceRegistrationStateIfUnchanged('crm_ai_triggers',
      JSON.stringify([trigger, ...triggers.filter(saved => saved.id !== trigger.id)]), state.crm_ai_triggers, scope);
    if (!saved) return NextResponse.json({ error: 'Schedules changed in another request. Reload and try again.' }, { status: 409 });
    return NextResponse.json({ success: true, data: trigger }, { status: request.method === 'PUT' ? 200 : 201 });
  } catch (error) {
    console.error('Failed to schedule registration trigger:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save trigger' }, { status: 500 });
  }

}

export const PUT = POST;

export async function DELETE(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !/^[\w-]+$/.test(id)) return NextResponse.json({ error: 'Trigger ID required' }, { status: 400 });
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const state = await readRegistrationState(scope);
    const triggers = parseRegistrationValue<Record<string, any>[]>(state.crm_ai_triggers, []);
    if (!triggers.some(trigger => trigger.id === id)) return NextResponse.json({ error: 'Trigger not found' }, { status: 404 });
    const saved = await replaceRegistrationStateIfUnchanged('crm_ai_triggers',
      JSON.stringify(triggers.filter(trigger => trigger.id !== id)), state.crm_ai_triggers, scope);
    if (!saved) return NextResponse.json({ error: 'Schedules changed in another request. Reload and try again.' }, { status: 409 });
    await ensureBroadcastSchema();
    const runs = await bunnyExecute({
      sql: `SELECT document_id FROM broadcast_runs_sql WHERE json_extract(data_json, '$.target.registrationEventKey') LIKE ?
        AND created_by_user_id = ? AND status IN ('scheduled', 'draft', 'running')`,
      args: [`trigger:${id}:%`, viewer.userId],
    });
    if (runs.rows.length) await bunnyBatch(runs.rows.flatMap(run => [
      { sql: "UPDATE broadcast_run_messages_sql SET status = 'cancelled' WHERE run_id = ? AND status = 'pending'", args: [String(run.document_id)] },
      { sql: "UPDATE broadcast_runs_sql SET status = 'cancelled' WHERE document_id = ?", args: [String(run.document_id)] },
    ]));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel registration trigger:', error);
    return NextResponse.json({ error: 'Failed to cancel trigger' }, { status: 500 });
  }
}
