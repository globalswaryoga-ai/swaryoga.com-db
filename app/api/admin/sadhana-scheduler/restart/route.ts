import { NextRequest, NextResponse } from 'next/server';
import { stopSadhanaScheduler, startSadhanaScheduler } from '@/lib/sadhanaSchedulerServiceV2';

export async function POST(request: NextRequest) {
  try {
    console.log('[Restart API] Restarting Sadhana scheduler...');

    // Stop current scheduler
    console.log('[Restart API] Stopping scheduler...');
    stopSadhanaScheduler();

    // Wait a moment
    await new Promise(r => setTimeout(r, 1000));

    // Start scheduler again
    console.log('[Restart API] Starting scheduler...');
    await startSadhanaScheduler();

    console.log('[Restart API] ✅ Scheduler restarted successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'Sadhana scheduler restarted successfully',
        restartTime: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Restart API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
