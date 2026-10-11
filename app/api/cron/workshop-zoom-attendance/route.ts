import { NextRequest, NextResponse } from 'next/server';
import { syncDueWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await syncDueWorkshopZoomAttendance();
  const failed = results.some(result => result.skipped && result.message && !result.message.startsWith('Zoom has not published'));
  return NextResponse.json({ success: !failed, checked: results.length, results }, { status: failed ? 207 : 200 });
}
