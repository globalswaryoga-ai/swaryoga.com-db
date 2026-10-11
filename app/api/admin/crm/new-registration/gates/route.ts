import { NextResponse } from 'next/server';
import { registrationViewer, registrationLeadOwned } from '@/lib/registrationAuth';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { assembleRegistrationLeads, registrationBatchRows } from '@/lib/registrationLeads';
import { saveRegistrationGate, readRegistrationDecisionState, readRegistrationState, registrationWorkshops } from '@/lib/registrationState';
import { readRegistrationDecisions, registrationDecisionKey } from '@/lib/registrationAiConfig';
import { registrationGatePatch, type RegistrationGateAction } from '@/lib/registrationGates';

export const dynamic = 'force-dynamic';
const ACTIONS: RegistrationGateAction[] = ['meeting_done', 'skip_zoom', 'pending', 'reject', 'approve', 'group_added', 'skip_group'];

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  const batchId = new URL(request.url).searchParams.get('batchId');
  if (!batchId) return NextResponse.json({ error: 'Select a batch before reading decisions.' }, { status: 400 });
  try {
    const state = await readRegistrationDecisionState(batchId, viewer.superAdmin ? 'shared' : viewer.userId);
    return NextResponse.json({ decisions: readRegistrationDecisions(state, batchId) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Registration decisions unavailable:', error);
    return NextResponse.json({ error: 'Unable to refresh registration decisions.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if (typeof body.batchId !== 'string' || typeof body.id !== 'string' || !ACTIONS.includes(body.action)) {
      return NextResponse.json({ error: 'A valid batch, response and gate action are required.' }, { status: 400 });
    }
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const [state, allLeads, allForms, allSubmissions] = await Promise.all([
      readRegistrationState(scope), loadBunnyLeads(), listForms(), listSubmissions(),
    ]);
    const workshop = registrationWorkshops(state).find(batch => String(batch.id) === body.batchId);
    if (!workshop) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
    const forms = allForms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
    const formIds = new Set(forms.map(form => form.formId));
    const rows = assembleRegistrationLeads(
      allLeads.filter(lead => registrationLeadOwned(lead, viewer)),
      allSubmissions.filter(submission => viewer.superAdmin || formIds.has(submission.formId)), forms,
    );
    const row = registrationBatchRows(rows, workshop).find(candidate => String(candidate.id) === body.id);
    if (!row) return NextResponse.json({ error: 'Form response not found in this batch.' }, { status: 404 });
    const previous = readRegistrationDecisions(state, body.batchId)[row.id] || {};
    let patch: ReturnType<typeof registrationGatePatch>;
    try {
      patch = registrationGatePatch(previous, body.action, viewer.userId);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Gate action rejected.' }, { status: 409 });
    }
    // Seed legacy state once, then merge only gate fields so AI scrutiny does not undo a manual gate.
    const key = registrationDecisionKey(body.batchId, String(row.id));
    const saved = await saveRegistrationGate(key, state[key] ? patch : { ...previous, ...patch }, state[key], scope);
    if (!saved) return NextResponse.json({ error: 'This lead changed while you were saving. Refresh and retry the gate action.' }, { status: 409 });
    const decisions = readRegistrationDecisions(await readRegistrationState(scope), body.batchId);
    return NextResponse.json({ success: true, decisions });
  } catch (error) {
    console.error('Registration gate save failed:', error);
    return NextResponse.json({ error: 'Unable to save the registration gate. Please retry.' }, { status: 500 });
  }
}
