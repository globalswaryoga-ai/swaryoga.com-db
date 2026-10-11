import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCohort, updateCohort } from '@/lib/workshopBunnyRepository';
import { queueDueWorkshopRecordings } from '@/lib/workshopRecordingAccess';
import { syncWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const cron = Boolean(process.env.CRON_SECRET && token === process.env.CRON_SECRET);
    const decoded = cron ? { isAdmin: true, userId: 'cron' } : verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const { cohortId, dryRun = false } = await request.json();
    if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
    const cohort = await getCohort(cohortId);
    if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    if (!cron && !isSuperAdmin(decoded) && cohort.createdByUserId !== decoded.userId)
      return NextResponse.json({ error: 'This workshop belongs to another admin' }, { status: 403 });
    const zoomAttendance = cohort.zoomMeetingId && !dryRun
      ? await syncWorkshopZoomAttendance(cohortId) : null;
    const delivery = await queueDueWorkshopRecordings(cohortId, dryRun);
    if (!dryRun) await updateCohort(cohortId, { workerLastRunAt: new Date().toISOString() });
    return NextResponse.json({
      success: delivery.errors.length === 0,
      result: { worker: 'workshop-management', dryRun, zoomAttendance,
        sent: 0, queued: delivery.queued, skipped: delivery.skipped, failed: delivery.errors.length,
        errors: delivery.errors, message: delivery.errors.length ? delivery.errors.join('; ') : `${delivery.queued} approved Meta recording messages queued; delivery uses the broadcast worker.` },
    }, { status: delivery.errors.length ? 207 : 200 });
  } catch (error) {
    console.error('[Workshop worker]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Workshop worker failed' }, { status: 500 });
  }
}
