import { NextResponse } from 'next/server';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { ensureBroadcastSchema } from '@/lib/bunnyBroadcastRepository';
import { registrationViewer, registrationLeadOwned } from '@/lib/registrationAuth';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { matchesMetaBatch, triggerMessageStats, triggerWrongNumber } from '@/lib/registrationMetaReport';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const workshopId = params.get('workshopId') || '';
    const formId = params.get('metaFormId') || '';
    if (!workshopId && !formId) return NextResponse.json({ error: 'Select a Meta batch before loading its trigger report.' }, { status: 400 });
    const audience = (await loadBunnyLeads()).filter(lead =>
      registrationLeadOwned(lead, viewer) && matchesMetaBatch(lead, workshopId, formId));
    const audienceIds = new Set(audience.map(lead => String(lead._id || lead.id)));
    await ensureBroadcastSchema();
    const result = await bunnyExecute({
      sql: `SELECT * FROM broadcast_runs_sql WHERE
        (created_by_label IN ('AI-9W Worker', 'Registration Automation') OR name LIKE 'AI Trigger%' OR name LIKE 'AI-9W%')
        ${viewer.superAdmin ? '' : 'AND created_by_user_id = ?'} ORDER BY created_at DESC`,
      args: viewer.superAdmin ? [] : [viewer.userId],
    });
    const data = await Promise.all(result.rows.map(async run => {
      const snapshot = JSON.parse(String(run.data_json || '{}'));
      const messages = await bunnyExecute({
          sql: `SELECT m.*, l.data_json AS lead_json FROM broadcast_run_messages_sql m
            LEFT JOIN leads_sql l ON l.document_id = m.lead_id WHERE m.run_id = ?`,
          args: [String(run.document_id)],
        });
      const scopedMessages = messages.rows.filter(message => audienceIds.has(String(message.lead_id)));
      const event = String(snapshot.target?.registrationEventKey || '');
      const linked = (workshopId && (snapshot.workshopId === workshopId || snapshot.target?.workshopId === workshopId ||
        event.startsWith(`${workshopId}:`))) || (snapshot.target?.leadIds || []).some((id: string) => audienceIds.has(String(id)));
      if (!scopedMessages.length && !linked) return null;
      const leads = scopedMessages.map(message => ({
        id: message.document_id, leadId: String(message.lead_id || ''),
        leadName: JSON.parse(String(message.lead_json || '{}')).name || 'Unknown',
        phone: message.phone_number, status: String(message.status),
        waMessageId: message.wa_message_id ? String(message.wa_message_id) : null,
        reason: String(message.failure_reason || ''),
        sentAt: message.sent_at, deliveredAt: message.delivered_at, readAt: message.read_at,
      }));
      return {
        id: run.document_id, name: run.name, template: snapshot.templateSnapshot?.templateName || run.template_id,
        status: run.status, senderNumber: snapshot.senderNumber || '', createdAt: run.created_at,
        reportFolder: snapshot.reportFolder || '',
        retryableCount: leads.filter(message => message.status === 'failed' && !message.waMessageId && !triggerWrongNumber(message)).length,
        scheduledAt: run.scheduled_at || run.created_at, stats: triggerMessageStats(leads).stats,
        evidence: leads.length ? 'message_rows' : 'legacy_header_only',
        leads,
      };
    }));
    const runs = data.filter(run => run !== null);
    const messages = runs.flatMap(run => run.leads);
    const verifiedIds = new Set(messages.filter(message =>
      ['sent', 'delivered', 'read'].includes(message.status) && message.waMessageId).map(message => message.leadId));
    const legacyReportedSent = audience.filter(lead =>
      ['sent', 'delivered', 'read'].includes(lead.metadata?.wtStatus) && !verifiedIds.has(String(lead._id || lead.id))).length;
    return NextResponse.json({
      success: true, data: runs.filter(run => run.reportFolder !== 'deleted'),
      summary: { ...triggerMessageStats(messages), legacyReportedSent },
    });
  } catch (error) {
    console.error('Registration trigger report failed:', error);
    return NextResponse.json({ error: 'Failed to load trigger report' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    const viewer = registrationViewer(request);
    if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    try {
      const body = await request.json();
      const actions = ['retry', 'reschedule', 'cancel', 'delete'];
      if (typeof body.runId !== 'string' || !/^[\w-]+$/.test(body.runId) || !actions.includes(body.action)) {
        return NextResponse.json({ error: 'A valid trigger run and action are required.' }, { status: 400 });
      }
      await ensureBroadcastSchema();
      const found = await bunnyExecute({
        sql: `SELECT * FROM broadcast_runs_sql WHERE document_id = ?
          AND (created_by_label IN ('AI-9W Worker', 'Registration Automation') OR name LIKE 'AI Trigger%' OR name LIKE 'AI-9W%')
          ${viewer.superAdmin ? '' : 'AND created_by_user_id = ?'}`,
        args: [body.runId, ...(viewer.superAdmin ? [] : [viewer.userId])],
      });
      const run = found.rows[0];
      if (!run || JSON.parse(String(run.data_json || '{}')).reportFolder === 'deleted') {
        return NextResponse.json({ error: 'Trigger run not found.' }, { status: 404 });
      }
      const messages = await bunnyExecute({
        sql: 'SELECT document_id, status, wa_message_id, failure_reason FROM broadcast_run_messages_sql WHERE run_id = ?',
        args: [body.runId],
      });
      const retryIds = messages.rows.filter(message => message.status === 'failed' && !message.wa_message_id &&
        !triggerWrongNumber({ leadId: '', status: String(message.status), reason: String(message.failure_reason || '') }))
        .map(message => String(message.document_id));
      if (body.action === 'retry' && !retryIds.length) return NextResponse.json({ error: 'No retryable failed recipients. Sent or wrong-number messages will not be resent.' }, { status: 409 });
      if (body.action === 'reschedule' && !messages.rows.some(message => message.status === 'pending' || message.status === 'cancelled')) {
        return NextResponse.json({ error: 'No unsent recipients to reschedule. Use Retry for failed recipients.' }, { status: 409 });
      }
      const scheduledAt = body.action === 'reschedule' ? new Date(body.scheduledAt || '') : new Date();
      if (!Number.isFinite(scheduledAt.getTime()) || (body.action === 'reschedule' && scheduledAt.getTime() <= Date.now())) {
        return NextResponse.json({ error: 'Choose a valid future trigger date and time.' }, { status: 400 });
      }
      const stopping = body.action === 'cancel' || body.action === 'delete';
      const now = new Date().toISOString();
      const patch = body.action === 'delete'
        ? { reportFolder: 'deleted', reportDeletedAt: now, reportDeletedBy: viewer.userId }
        : { lastReportAction: body.action, lastReportActionAt: now, lastReportActionBy: viewer.userId };
      const result = await bunnyBatch([
        {
          sql: `UPDATE broadcast_runs_sql SET status = ?, scheduled_at = ?, completed_at = NULL,
            updated_at = ?, data_json = json_patch(COALESCE(data_json, '{}'), ?)
            WHERE document_id = ? AND COALESCE(json_extract(data_json, '$.reportFolder'), '') != 'deleted'
            AND NOT EXISTS (SELECT 1 FROM broadcast_run_messages_sql WHERE run_id = ? AND status = 'sending')`,
          args: [stopping ? 'cancelled' : 'scheduled', stopping ? run.scheduled_at : scheduledAt.toISOString(),
            now, JSON.stringify(patch), body.runId, body.runId],
        },
        {
          sql: `UPDATE broadcast_run_messages_sql SET status = ?, failure_reason = ?, updated_at = ?
            WHERE run_id = ? AND ${body.action === 'retry'
              ? `status = 'failed' AND wa_message_id IS NULL AND document_id IN (${retryIds.map(() => '?').join(',')})`
              : stopping ? "status = 'pending'" : "status IN ('pending', 'cancelled') AND wa_message_id IS NULL"}
            AND EXISTS (SELECT 1 FROM broadcast_runs_sql WHERE document_id = ? AND status = ?
              AND updated_at = ?)`,
          args: [stopping ? 'cancelled' : 'pending', stopping ? 'Cancelled by CRM admin' : null, now,
            body.runId, ...(body.action === 'retry' ? retryIds : []), body.runId, stopping ? 'cancelled' : 'scheduled', now],
        },
      ]);
      if (!result[0].rowsAffected) return NextResponse.json({ error: 'A recipient is currently sending or this run changed. Refresh and retry after processing finishes.' }, { status: 409 });
      return NextResponse.json({
        success: true, affected: Number(result[1].rowsAffected),
        message: body.action === 'delete' ? 'Moved to the backend deleted folder; delivery history is preserved and hidden from the report.'
          : stopping ? 'Unsent recipients cancelled.' : 'Unsent recipients scheduled; sent messages are unchanged.',
      });
    } catch (error) {
      console.error('Trigger report action failed:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update trigger run.' }, { status: 500 });
    }
}
