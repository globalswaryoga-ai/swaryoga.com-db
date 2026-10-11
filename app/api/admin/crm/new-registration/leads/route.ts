import { NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';
import { assembleRegistrationLeads, filterRegistrationLeads } from '@/lib/registrationLeads';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const [allLeads, allForms, allSubmissions] = await Promise.all([loadBunnyLeads(), listForms(), listSubmissions()]);
    const leads = allLeads.filter(lead => registrationLeadOwned(lead, viewer));
    const forms = allForms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
    const formIds = new Set(forms.map(form => form.formId));
    const submissions = allSubmissions.filter(submission => viewer.superAdmin || formIds.has(submission.formId));
    const url = new URL(request.url);
    const rows = filterRegistrationLeads(
      assembleRegistrationLeads(leads, submissions, forms),
      url.searchParams.get('formId') || '',
      url.searchParams.get('language') || '',
    );
    return NextResponse.json({ success: true, data: rows, count: rows.length }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load saved registration leads:', error);
    return NextResponse.json({ error: 'Saved form data is unavailable. Please retry; no records were removed.' }, { status: 503 });
  }
}
