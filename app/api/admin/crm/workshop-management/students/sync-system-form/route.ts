import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCohort, upsertStudent } from '@/lib/workshopBunnyRepository';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { assembleRegistrationLeads, filterRegistrationLeads } from '@/lib/registrationLeads';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { cohortId, formUrl } = body;
    if (!cohortId || !formUrl) {
      return NextResponse.json({ error: 'cohortId and formUrl are required' }, { status: 400 });
    }
    const cohort = await getCohort(cohortId);
    if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    const viewer = registrationViewer(request);
    if (!viewer || (!viewer.superAdmin && cohort.createdByUserId !== viewer.userId)) {
      return NextResponse.json({ error: 'This workshop belongs to another admin' }, { status: 403 });
    }

    let formId = formUrl;
    if (formUrl.includes('/workshop-join/')) {
      formId = formUrl.split('/workshop-join/')[1].split('/')[0].split('?')[0];
    }

    const [allLeads, allForms, allSubmissions] = await Promise.all([loadBunnyLeads(), listForms(), listSubmissions()]);
    const forms = allForms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
    const formIds = new Set(forms.map(form => form.formId));
    const leads = filterRegistrationLeads(assembleRegistrationLeads(
      allLeads.filter(lead => registrationLeadOwned(lead, viewer)),
      allSubmissions.filter(row => viewer.superAdmin || formIds.has(row.formId)), forms,
    ), formId, '');

    let enrolled = 0;
    for (const lead of leads) {
      await upsertStudent({
        cohortId,
        name: lead.name || 'Unknown',
        email: lead.email || '',
        phone: lead.phoneNumber || lead.mobile || '',
        whatsappNumber: lead.phoneNumber || '',
        leadId: lead.leadId || null,
        leadNumber: lead.leadNumber || '',
        source: 'system-form',
        active: true
      });
      enrolled++;
    }

    return NextResponse.json({ success: true, enrolled });
  } catch (error: any) {
    console.error('[sync-system-form]', error);
    return NextResponse.json({ error: error?.message || 'Failed to sync form students' }, { status: 500 });
  }
}
