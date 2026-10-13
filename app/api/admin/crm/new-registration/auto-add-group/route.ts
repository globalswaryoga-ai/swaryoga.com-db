import { NextResponse } from 'next/server';
import { registrationViewer, registrationLeadOwned } from '@/lib/registrationAuth';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { readRegistrationState } from '@/lib/registrationState';
import { processAutoAddGroups } from '@/lib/registrationAutoAddGroup';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const { batchId, force = false } = body;
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
      force,
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
