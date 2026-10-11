import { NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';
import { queueRegistrationTemplate, resolveRegistrationTemplate } from '@/lib/registrationAutomation';
import { processDueBunnyMetaBroadcasts } from '@/lib/bunnyMetaBroadcastProcessor';
import { broadcastRunMessageFind } from '@/lib/bunnyBroadcastRepository';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 5000 || typeof body.template !== 'string' || !body.template.trim()) {
      return NextResponse.json({ error: 'Select leads and an approved Meta template' }, { status: 400 });
    }
    const wanted = new Set(body.ids.map(String));
    const leads = (await loadBunnyLeads()).filter(lead =>
      registrationLeadOwned(lead, viewer) &&
      [lead._id, lead.id, lead.leadNumber, lead.metadata?.googleResponseId].some(id => id && wanted.has(String(id))));
    if (!leads.length) return NextResponse.json({ error: 'No matching accessible CRM leads; sync the form first.' }, { status: 404 });
    const template = await resolveRegistrationTemplate(body.template.trim(), viewer.userId, viewer.superAdmin);
    const now = new Date();
    const queued = await queueRegistrationTemplate({
      leads, template, owner: viewer.userId, dueAt: now,
      eventKey: `manual:${now.toISOString().slice(0, 10)}:${leads.map(lead => lead._id).sort().join(',')}`,
    });
    const processing = await processDueBunnyMetaBroadcasts({ runId: queued.runId, perRunMessageLimit: 50 });
    const messages = await broadcastRunMessageFind({ runId: queued.runId });
    const results = messages.map(message => ({ id: message.leadId, wtStatus: message.status, wtError: message.failureReason }));
    const failed = processing.failed || processing.runResults.some(run => run.status === 'error');
    return NextResponse.json({
      success: !failed, count: processing.sent, queuedCount: messages.filter(message => message.status === 'pending').length,
      skippedCount: processing.skipped, results, runId: queued.runId,
      ...(failed ? { error: 'Some messages failed. See the trigger report for details.' } : {}),
    }, { status: failed ? 502 : 200 });
  } catch (error) {
    console.error('Registration template trigger failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'WhatsApp trigger failed' }, { status: 500 });
  }
}
