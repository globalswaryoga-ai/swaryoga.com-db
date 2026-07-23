import { NextRequest, NextResponse } from 'next/server';
import { stopSadhanaScheduler } from '@/lib/sadhanaSchedulerServiceV2';

// The in-process setInterval scheduler this used to restart is retired: on
// Vercel, every warm serverless container ran its own independent copy of
// it, so multiple containers could trigger the same schedule at once (a
// bot "restarting" mid-session). The Vercel Cron hitting
// /api/admin/crm/sadhana-scheduler/run every minute is now the single
// trigger path, with idempotency tracked on the schedule document itself
// instead of in process memory. This endpoint just makes sure no leftover
// instance of the old loop is still ticking.
export async function POST(request: NextRequest) {
  stopSadhanaScheduler();
  return NextResponse.json(
    {
      success: true,
      message: 'Legacy in-process scheduler stopped (if it was running). Scheduling now runs via the /run cron route only.',
    },
    { status: 200 }
  );
}
