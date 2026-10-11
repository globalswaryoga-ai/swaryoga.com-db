import { NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';
import { readRegistrationState } from '@/lib/registrationState';
import { processRegistrationFunnel } from '@/lib/registrationFunnel';
import { readRegistrationDecisions } from '@/lib/registrationAiConfig';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.batchId || !/^AI-4[A-P]?$/.test(body.worker || '') ||
        (body.ids !== undefined && (!Array.isArray(body.ids) || body.ids.some((id: unknown) => typeof id !== 'string')))) {
      return NextResponse.json({ error: 'A batch, worker, and valid selected response IDs are required' }, { status: 400 });
    }
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const [state, allLeads, allForms, allSubmissions] = await Promise.all([readRegistrationState(scope), loadBunnyLeads(), listForms(), listSubmissions()]);
    const forms = allForms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
    const formIds = new Set(forms.map(form => form.formId));
    const result = await processRegistrationFunnel({
      state, leads: allLeads.filter(lead => registrationLeadOwned(lead, viewer)), forms,
      submissions: allSubmissions.filter(submission => viewer.superAdmin || formIds.has(submission.formId)),
      scope, batchId: body.batchId, worker: body.worker, selectedIds: body.ids,
    });
    const decisions = readRegistrationDecisions(await readRegistrationState(scope), body.batchId);
    return NextResponse.json({ success: !result.errors.length, ...result, decisions }, { status: result.errors.length ? 422 : 200 });
  } catch (error) {
    console.error('Registration funnel processing failed:', error);
    return NextResponse.json({ error: 'AI funnel processing failed; retry after checking saved configuration.' }, { status: 500 });
  }
}
