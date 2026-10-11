import { NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { readRegistrationState } from '@/lib/registrationState';
import { processRegistrationApprovals } from '@/lib/registrationAutomation';
import { processRegistrationSchedules } from '@/lib/registrationAutomation';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { processDueBunnyMetaBroadcasts } from '@/lib/bunnyMetaBroadcastProcessor';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { processRegistrationFunnel } from '@/lib/registrationFunnel';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await readRegistrationState();
    const [scopes, leads, allForms, allSubmissions] = await Promise.all([
      bunnyExecute('SELECT DISTINCT scope FROM registration_state_sql'),
      loadBunnyLeads(),
      listForms(),
      listSubmissions(),
    ]);
    const approvals: Array<{ workshopId: string; queued: number }> = [];
    const schedules: Array<{ queued: number }> = [];
    const funnels: Awaited<ReturnType<typeof processRegistrationFunnel>>[] = [];
    for (const row of scopes.rows) {
      const scope = String(row.scope);
      const shared = scope === 'shared';
      const owner = shared ? 'admincrm' : scope;
      const state = await readRegistrationState(scope);
      const visibleLeads = shared ? leads : leads.filter(lead => lead.createdByUserId === owner || lead.assignedToUserId === owner);
      const forms = allForms.filter(form => shared || form.createdBy === owner);
      const formIds = new Set(forms.map(form => form.formId));
      approvals.push(...await processRegistrationApprovals(state, visibleLeads, owner, shared));
      funnels.push(await processRegistrationFunnel({
        state, leads: visibleLeads, forms, submissions: allSubmissions.filter(submission => shared || formIds.has(submission.formId)), scope,
      }));
      schedules.push(await processRegistrationSchedules(await readRegistrationState(scope), visibleLeads, owner, shared));
    }
    const broadcasts = await processDueBunnyMetaBroadcasts({ runLimit: 20, perRunMessageLimit: 50 });
    const failed = funnels.some(result => result.errors.length) || broadcasts.failed > 0 || broadcasts.runResults.some(run => run.status === 'error');
    return NextResponse.json({ success: !failed, approvals, funnels, schedules, broadcasts }, { status: failed ? 502 : 200 });
  } catch (error) {
    console.error('Registration automation failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Registration automation failed' }, { status: 500 });
  }
}
