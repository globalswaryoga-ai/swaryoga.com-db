import { NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';
import { parseRegistrationValue, readRegistrationState } from '@/lib/registrationState';
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
    const { decisionPatch, ...summary } = result;
    const updatedState = { ...state };
    for (const [key, patch] of Object.entries(decisionPatch)) {
      updatedState[key] = {
        ...parseRegistrationValue<Record<string, unknown>>(state[key], {}),
        ...parseRegistrationValue<Record<string, unknown>>(patch, {}),
      };
    }
    const decisions = readRegistrationDecisions(updatedState, body.batchId);

    // Automatically trigger WhatsApp automation for leads approved in this funnel run
    let queuedApprovals = 0;
    try {
      const { processFunnelApprovals } = await import('@/lib/registrationAutomation');
      const approvalResults = await processFunnelApprovals(updatedState, allLeads.filter(lead => registrationLeadOwned(lead, viewer)), viewer.userId, viewer.superAdmin);
      queuedApprovals = approvalResults.reduce((sum, item) => sum + (item.queued || 0), 0);
    } catch (e) {
      console.warn('Funnel approval WhatsApp trigger note:', e);
    }

    return NextResponse.json({ success: !result.errors.length, ...summary, decisions, queuedApprovals }, { status: result.errors.length ? 422 : 200 });
  } catch (error) {
    console.error('Registration funnel processing failed:', error);
    return NextResponse.json({ error: 'AI funnel processing failed; retry after checking saved configuration.' }, { status: 500 });
  }
}
