import { NextResponse } from 'next/server';
import { registrationViewer, registrationLeadOwned } from '@/lib/registrationAuth';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { readRegistrationState, registrationWorkshops } from '@/lib/registrationState';
import { processAutoAddGroups } from '@/lib/registrationAutoAddGroup';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { readRegistrationDecisions } from '@/lib/registrationAiConfig';
import { assembleRegistrationLeads, registrationBatchRows } from '@/lib/registrationLeads';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const targetBatchId = url.searchParams.get('batchId') || '';
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;

    // 1. Get connected phone from qr_sessions_sql
    let connectedPhone = '';
    try {
      const sessionRow = await bunnyExecute({
        sql: `SELECT connected_phone FROM qr_sessions_sql WHERE connected_phone != '' AND connected_phone IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
        args: [],
      });
      if (sessionRow.rows.length > 0) {
        connectedPhone = String(sessionRow.rows[0].connected_phone || '');
      }
    } catch (e) {
      console.warn('Failed to fetch qr_sessions_sql connected_phone:', e);
    }

    // 2. Load registration data
    const [state, allLeads, allForms, allSubmissions] = await Promise.all([
      readRegistrationState(scope),
      loadBunnyLeads(),
      listForms(),
      listSubmissions(),
    ]);

    const visibleLeads = allLeads.filter(lead => registrationLeadOwned(lead, viewer));
    const formIds = new Set(allForms.map(form => form.formId));
    const visibleSubmissions = allSubmissions.filter(sub => viewer.superAdmin || formIds.has(sub.formId));
    const rows = assembleRegistrationLeads(visibleLeads, visibleSubmissions, allForms);
    const workshops = registrationWorkshops(state);

    const targetWorkshops = targetBatchId
      ? workshops.filter(w => String(w.id) === String(targetBatchId))
      : workshops;

    const reportLeads: Array<{
      id: string;
      leadId: string;
      name: string;
      phone: string;
      batchId: string;
      batchName: string;
      groupStatus: string;
      autoAddedAt?: string;
      status: string;
      template: string;
      whatsappGroupLink?: string;
    }> = [];

    for (const workshop of targetWorkshops) {
      const decisions = readRegistrationDecisions(state, String(workshop.id));
      const batchRows = registrationBatchRows(rows, workshop);
      const wt = workshop.metadata?.wtSettings;
      const template = wt?.approved?.template || '';
      const groupLink = workshop.whatsappGroupLink || workshop.metadata?.whatsappGroupLink || '';

      for (const row of batchRows) {
        const decision = decisions[row.id] || {};
        const isApproved = decision.isRegistered === true ||
          String(decision.status || '').toLowerCase().startsWith('approval') ||
          (Array.isArray(decision.copies) && decision.copies.some((c: string) => String(c).toLowerCase().startsWith('approval')));

        if (!isApproved && !decision.groupStatus) continue;

        const phone = String(row.phoneNumber || row.mobile || '').replace(/\D/g, '');
        reportLeads.push({
          id: String(row.id),
          leadId: String(row.leadId || row.id),
          name: String(row.name || 'Participant'),
          phone: phone ? (phone.startsWith('91') ? `+${phone}` : `+91 ${phone}`) : '-',
          batchId: String(workshop.id),
          batchName: String(workshop.name || 'Batch'),
          groupStatus: String(decision.groupStatus || 'pending_add'),
          autoAddedAt: decision.autoAddedAt || undefined,
          status: String(decision.status || 'approved'),
          template,
          whatsappGroupLink: groupLink,
        });
      }
    }

    return NextResponse.json({
      success: true,
      connectedPhone: connectedPhone || '919075358557',
      totalLeads: reportLeads.length,
      leads: reportLeads,
    });
  } catch (error: any) {
    console.error('Failed to load auto-trigger report:', error);
    return NextResponse.json({ error: error.message || 'Failed to load report' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const { batchId, leadId, force = false } = body;
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;

    const [state, allLeads, allForms, allSubmissions] = await Promise.all([
      readRegistrationState(scope),
      loadBunnyLeads(),
      listForms(),
      listSubmissions(),
    ]);

    const visibleLeads = allLeads.filter(lead => registrationLeadOwned(lead, viewer));
    const results = await processAutoAddGroups({
      state,
      leads: visibleLeads,
      forms: allForms,
      submissions: allSubmissions,
      viewer,
      batchId,
      leadId,
      force: Boolean(leadId || force),
    });

    return NextResponse.json({
      success: true,
      processedBatches: results.length,
      totalAdded: results.reduce((sum, r) => sum + r.addedCount, 0),
      batches: results,
    });
  } catch (error: any) {
    console.error('Auto-add group error:', error);
    return NextResponse.json({ error: error.message || 'Failed to auto-add leads to group' }, { status: 500 });
  }
}
