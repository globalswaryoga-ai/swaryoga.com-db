import { NextRequest, NextResponse } from 'next/server';
import { syncDueWorkshopZoomAttendance } from '@/lib/workshop-zoom-attendance';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await syncDueWorkshopZoomAttendance();
  return NextResponse.json({ success: true, checked: results.length, results });
}
