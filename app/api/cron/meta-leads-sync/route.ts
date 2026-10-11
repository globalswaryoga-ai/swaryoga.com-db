import { NextRequest, NextResponse } from 'next/server';
import { readRegistrationState, registrationWorkshops } from '@/lib/registrationState';
import { POST as syncMetaForm } from '@/app/api/admin/crm/meta-leads/sync/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const workshops = registrationWorkshops(await readRegistrationState());
    const results: Array<{ workshopId: unknown; formId: string; status: number; data: unknown }> = [];
    for (const workshop of workshops) {
      const formId = workshop.metadata?.facebookFormId || workshop.metadata?.metaFormId;
      if (!formId) continue;
      const response = await syncMetaForm(new NextRequest(new URL('/api/admin/crm/meta-leads/sync', request.url), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: request.headers.get('authorization')! },
        body: JSON.stringify({ formId, workshopId: workshop.id, workshopName: workshop.name }),
      }));
      results.push({ workshopId: workshop.id, formId, status: response.status, data: await response.json() });
    }
    const failed = results.some(result => result.status >= 400);
    return NextResponse.json({ success: !failed, results }, { status: failed ? 502 : 200 });
  } catch (error) {
    console.error('Meta form cron failed:', error);
    return NextResponse.json({ error: 'Meta form sync failed; existing data is preserved' }, { status: 500 });
  }
}
