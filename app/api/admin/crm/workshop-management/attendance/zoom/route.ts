import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { syncWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const decoded: any = verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const { cohortId, classDate } = await request.json();
  if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });

  try {
    const result = await syncWorkshopZoomAttendance(String(cohortId), classDate || undefined);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Zoom attendance sync failed' }, { status: 422 });
  }
}
