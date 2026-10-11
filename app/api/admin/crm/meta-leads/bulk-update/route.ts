import { NextResponse } from 'next/server';
import { bunnyBatch } from '@/lib/bunnyDatabase';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { registrationLeadOwned, registrationViewer } from '@/lib/registrationAuth';
import { readRegistrationState } from '@/lib/registrationState';
import { processRegistrationApprovals } from '@/lib/registrationAutomation';
import { registrationWorkshops } from '@/lib/registrationState';
import { matchesMetaBatch } from '@/lib/registrationMetaReport';

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const { ids, status, workshopId, bulkUpdates } = await request.json();
    const updates: Array<{ id: string; status: string; reason?: string; metadata?: Record<string, unknown> }> =
      Array.isArray(bulkUpdates) ? bulkUpdates : Array.isArray(ids) ? ids.map(id => ({ id: String(id), status })) : [];
    if (!updates.length || updates.length > 5000 || updates.some(update => !update.id || typeof update.status !== 'string' || !/^[a-z0-9_]+$/.test(update.status))) {
      return NextResponse.json({ error: 'Valid lead IDs and statuses are required' }, { status: 400 });
    }
    const state = await readRegistrationState(viewer.superAdmin ? 'shared' : viewer.userId);
    const allLeads = await loadBunnyLeads();
    const owner = viewer.superAdmin ? 'admincrm' : viewer.userId;
    if (Array.isArray(bulkUpdates)) {
      const workshop = registrationWorkshops(state).find(item => item.id === workshopId);
      if (!workshop) return NextResponse.json({ error: 'Select a saved Meta batch before running AI.' }, { status: 400 });
      const requested = new Set(updates.map(update => String(update.id)));
      const leads = allLeads.filter(lead => requested.has(String(lead._id)) && registrationLeadOwned(lead, viewer) &&
        matchesMetaBatch(lead, String(workshop.id), String(workshop.metadata?.facebookFormId || workshop.metadata?.metaFormId || '')));
      if (!leads.length) return NextResponse.json({ error: 'No matching accessible leads' }, { status: 404 });
      const before = leads.map(lead => lead.status);
      const queued = await processRegistrationApprovals({ crm_workshops: [workshop] }, leads, owner, viewer.superAdmin);
      return NextResponse.json({ success: true, modifiedCount: leads.filter((lead, index) => lead.status !== before[index]).length, queued });
    }
    const now = new Date().toISOString();
    const changed: Array<Record<string, any>> = [];
    for (const update of updates) {
      const lead = allLeads.find(candidate => String(candidate._id) === String(update.id));
      if (!lead || !registrationLeadOwned(lead, viewer) || (workshopId && lead.workshopId !== workshopId)) continue;
      const metadata = { ...lead.metadata, ...(update.reason ? { ai9Reason: update.reason } : {}) };
      if (update.status === 'approved') {
        metadata.approvedAt = lead.status === 'approved' && lead.metadata?.approvedAt ? lead.metadata.approvedAt : now;
        metadata.ai9WEligible = true;
        metadata.wtAutoEligible = true;
      } else if (update.status.includes('pending')) {
        metadata.wtEligibleAt = now;
        metadata.wtAutoEligible = true;
      } else {
        metadata.wtAutoEligible = false;
      }
      Object.assign(lead, { status: update.status, metadata, updatedAt: now });
      changed.push(lead);
    }
    if (!changed.length) return NextResponse.json({ error: 'No matching accessible leads' }, { status: 404 });
    await bunnyBatch(changed.map(lead => ({
      sql: 'UPDATE leads_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(lead), now, String(lead._id)],
    })));
    const queued = await processRegistrationApprovals(state, changed, owner, viewer.superAdmin);
    return NextResponse.json({ success: true, modifiedCount: changed.length, queued });
  } catch (error) {
    console.error('Registration status update failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update leads' }, { status: 500 });
  }
}
