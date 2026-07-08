import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSadhanaSchedulerStatus } from '@/lib/sadhanaSchedulerServiceV2';

// Store logs in memory (in production, use database)
let schedulerLogs: any[] = [];
const MAX_LOGS = 100;

export function addSchedulerLog(log: any) {
  schedulerLogs.unshift(log);
  if (schedulerLogs.length > MAX_LOGS) {
    schedulerLogs.pop();
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check scheduler status
    const status = getSadhanaSchedulerStatus();

    // Get active schedules count
    let activeSchedules = 0;
    try {
      await mongoose.connect(process.env.MONGODB_URI_MAIN!);
      const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
      const SadhanaSchedule = db.models.SadhanaSchedule || db.model('SadhanaSchedule', new mongoose.Schema({}));
      activeSchedules = await SadhanaSchedule.countDocuments({ status: 'active', enableBotAutomation: true });
    } catch (error) {
      console.error('[Status API] MongoDB error:', error);
    }

    // Calculate uptime (from last restart)
    const uptime = Math.floor(Date.now() / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return NextResponse.json({
      status: {
        running: status.running,
        lastCheck: new Date().toISOString(),
        nextCheck: new Date(Date.now() + status.interval).toISOString(),
        activeSchedules,
        uptime: uptimeStr,
      },
      logs: schedulerLogs,
    });
  } catch (error) {
    console.error('[Status API] Error:', error);
    return NextResponse.json(
      {
        status: {
          running: false,
          lastCheck: new Date().toISOString(),
          nextCheck: new Date(Date.now() + 60000).toISOString(),
          activeSchedules: 0,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          uptime: '0m',
        },
        logs: schedulerLogs,
      },
      { status: 200 }
    );
  }
}
