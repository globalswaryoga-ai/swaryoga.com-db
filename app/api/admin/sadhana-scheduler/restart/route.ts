import { NextRequest, NextResponse } from 'next/server';
import { stopSadhanaScheduler } from '@/lib/sadhanaSchedulerServiceV2';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initSadhanaSchedulerBunnySchema } from '@/lib/bunnySadhanaSchedulerRepository';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  try {
    stopSadhanaScheduler();
    await initSadhanaSchedulerBunnySchema();
    // Clear any stuck active sessions in Bunny Database so schedules restart clean
    await bunnyExecute({
      sql: `UPDATE crm_sadhana_schedules_sql SET active_bot_session_json = NULL, last_triggered_slot = NULL WHERE status = 'active'`,
      args: [],
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Sadhana Scheduler restarted cleanly. Active sessions refreshed in Bunny Database.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to restart scheduler' },
      { status: 500 }
    );
  }
}
