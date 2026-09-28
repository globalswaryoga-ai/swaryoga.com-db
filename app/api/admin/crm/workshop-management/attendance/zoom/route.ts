import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { syncWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const decoded: any = verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const { cohortId, classDate } = await request.json();
  if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });

  try {
    // The manual button is a fast health check. Full historical reconciliation
    // is handled by the three-hour cron; limiting this request prevents a
    // serverless gateway timeout when a cohort spans many sessions.
    const syncDate = classDate || new Date().toISOString().slice(0, 10);
    const result = await syncWorkshopZoomAttendance(String(cohortId), syncDate);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Zoom attendance sync failed' }, { status: 422 });
  }
}
