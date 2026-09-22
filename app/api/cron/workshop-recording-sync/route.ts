export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { syncAllActiveCohortsRecordings } from '@/lib/workshopRecordingSync';

export async function GET() {
  try {
    const results = await syncAllActiveCohortsRecordings();
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[Cron Workshop Recording Sync] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
