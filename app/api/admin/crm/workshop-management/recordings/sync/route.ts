import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { syncZoomRecordingsForCohort } from '@/lib/workshopRecordingSync';

function isAdmin(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
    return true;
  }
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const cohortId = body.cohortId;
    if (!cohortId) {
      return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
    }

    const result = await syncZoomRecordingsForCohort(cohortId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Recordings Sync] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to sync recordings' }, { status: 500 });
  }
}
