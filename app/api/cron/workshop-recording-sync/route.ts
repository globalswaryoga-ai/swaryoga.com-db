export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { listCohorts } from '@/lib/workshopBunnyRepository';

export async function GET() {
  try {
    const cohorts = await listCohorts();
    const results = [];
    
    // We mock a POST request to the worker route to reuse its logic for each active cohort
    for (const cohort of cohorts) {
      if (cohort.zoomMeetingId && cohort.aiWorkerEnabled) {
        // Here we could call the logic directly, but for simplicity we fetch our own endpoint
        // Or better yet, we just duplicate the recording sync logic for all active cohorts
        // Actually, invoking the worker endpoint via fetch is standard in Vercel crons.
        try {
          const res = await fetch(new URL(`/api/admin/crm/workshop-management/worker`, process.env.NEXT_PUBLIC_APP_URL || 'https://swaryoga.com').toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
            body: JSON.stringify({ cohortId: cohort._id, dryRun: false })
          });
          const data = await res.json();
          results.push({ cohort: cohort.name, success: true, data });
        } catch (e: any) {
          results.push({ cohort: cohort.name, success: false, error: e.message });
        }
      }
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
