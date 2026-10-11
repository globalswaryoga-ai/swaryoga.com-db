import { NextRequest, NextResponse } from 'next/server';
import { syncDueWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';
import { listCohorts } from '@/lib/workshopBunnyRepository';
import { queueDueWorkshopRecordings } from '@/lib/workshopRecordingAccess';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await syncDueWorkshopZoomAttendance();
  const recordings: Array<{ cohortId: string; queued: number; skipped: number; errors: string[]; message?: string }> = [];
  for (const cohort of await listCohorts()) {
    if (cohort.autoSendRecordings && cohort.metadata?.recordingAccess?.enabled) {
      recordings.push({ cohortId: cohort._id, ...await queueDueWorkshopRecordings(cohort._id) });
    }
  }
  const failed = results.some(result => result.skipped && result.message && !result.message.startsWith('Zoom has not published'));
  const recordingFailed = recordings.some(result => result.errors.length);
  return NextResponse.json({ success: !failed && !recordingFailed, checked: results.length, results, recordings }, { status: failed || recordingFailed ? 207 : 200 });
}
