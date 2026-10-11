import { NextRequest, NextResponse } from 'next/server';
import { getCohort, listCohorts, updateCohort } from '@/lib/workshopBunnyRepository';
import { syncWorkshopWhatsappStudents } from '@/lib/workshopWhatsappStudents';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cohorts = (await listCohorts()).filter(cohort => cohort.autoSyncWhatsappGroup && cohort.whatsappGroupLink);
  cohorts.sort((a, b) => String(a.metadata?.whatsappStudentSyncAt || '').localeCompare(String(b.metadata?.whatsappStudentSyncAt || '')));
  const deadline = Date.now() + 180000;
  const results: Array<{ cohortId: string; error?: string; imported?: number }> = [];
  const deferred: string[] = [];
  for (const cohort of cohorts) {
    if (Date.now() >= deadline) { deferred.push(cohort._id); continue; }
    let error = '';
    try {
      const owner = String(cohort.createdByUserId || '');
      results.push({ cohortId: cohort._id, ...await syncWorkshopWhatsappStudents(cohort._id, { userId: owner, superAdmin: ['admin', 'admincrm'].includes(owner) }) });
    } catch (failure) {
      error = failure instanceof Error ? failure.message : 'Student sync failed';
      console.error('[workshop-whatsapp-students-cron]', cohort._id, error);
      results.push({ cohortId: cohort._id, error });
    }
    const current = await getCohort(cohort._id);
    if (current) {
      const saved = await updateCohort(cohort._id, { metadata: { ...current.metadata,
        whatsappStudentSyncAt: new Date().toISOString(), whatsappStudentSyncError: error } }, { metadata: current.metadata });
      if (!saved) results.push({ cohortId: cohort._id, error: 'Sync status could not be saved because workshop settings changed' });
    }
  }
  const success = !results.some(result => result.error) && !deferred.length;
  return NextResponse.json({ success, results, deferred }, { status: success ? 200 : 207 });
}
