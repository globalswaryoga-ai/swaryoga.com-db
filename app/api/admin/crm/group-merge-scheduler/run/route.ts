import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


const groupMergeScheduleSchema = new mongoose.Schema(
  {
    name: { type: String },
    targetGroupId: { type: String },
    sourceGroupIds: [{ type: String }],
    schedule: {
      times: [String],
      days: [Number],
      repeatFrequency: String,
      timezone: String,
    },
    mergeDurationMinutes: { type: Number },
    minDelayBetweenOpsMs: { type: Number },
    maxDelayBetweenOpsMs: { type: Number },
    lastExecutedAt: { type: Date },
    lastMergeQueueId: String,
    lastMergeStatus: String,
    status: String,
    userId: String,
    removeFromSource: { type: Boolean },
    totalParticipantsExpected: { type: Number },
  },
  { collection: 'group_merge_schedules' }
);

const mergeQueueSchema = new mongoose.Schema(
  {
    userId: String,
    sessionKey: String,
    targetGroupId: String,
    sourceGroupIds: [String],
    status: String,
    groupsProcessed: { type: Number, default: 0 },
    totalGroups: Number,
    participantsAddedTotal: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    lastOperationTime: { type: Date },
  },
  { collection: 'merge_queue' }
);

let GroupMergeSchedule: any;
let MergeQueue: any;

async function getModels() {
  if (!GroupMergeSchedule || !MergeQueue) {
    const db = mongoose.connection.useDb('swaryoga_admin_crm');

    if (db.models.GroupMergeSchedule) {
      GroupMergeSchedule = db.models.GroupMergeSchedule;
    } else {
      GroupMergeSchedule = db.model('GroupMergeSchedule', groupMergeScheduleSchema);
    }

    if (db.models.MergeQueue) {
      MergeQueue = db.models.MergeQueue;
    } else {
      MergeQueue = db.model('MergeQueue', mergeQueueSchema);
    }
  }
  return { GroupMergeSchedule, MergeQueue };
}

/**
 * Get current time in specified timezone
 */
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dayOfWeek: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'narrow',
  });

  const formatted = formatter.format(now);
  const [time, day] = formatted.split(' ');
  const [hours, minutes] = time.split(':').map(Number);

  const dayMap: Record<string, number> = { 'M': 1, 'T': 2, 'W': 3, 'Th': 4, 'F': 5, 'Sa': 6, 'Su': 7 };
  const dayOfWeek = dayMap[day] || 1;

  return { hours, minutes, dayOfWeek };
}

/**
 * Check if schedule should run now
 */
function shouldRunNow(schedule: any): boolean {
  const tz = schedule.schedule?.timezone || 'Asia/Kolkata';
  const { hours, minutes, dayOfWeek } = getCurrentTimeInTimezone(tz);
  const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Check day of week
  const scheduleDays = schedule.schedule?.days || [1, 2, 3, 4, 5];
  if (!scheduleDays.includes(dayOfWeek)) {
    return false;
  }

  // Check time (allow ±2 minute window)
  const scheduleTimes = schedule.schedule?.times || [];
  for (const time of scheduleTimes) {
    const [schedHours, schedMinutes] = time.split(':').map(Number);
    const timeDiff = Math.abs(hours - schedHours) * 60 + Math.abs(minutes - schedMinutes);
    if (timeDiff <= 2) {
      return true;
    }
  }

  return false;
}

/**
 * POST /api/admin/crm/group-merge-scheduler/run
 * Cron job to execute scheduled group merges (runs every minute)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a Vercel cron request
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('[Merge Scheduler Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { GroupMergeSchedule, MergeQueue } = await getModels();

    // Get all active schedules
    const activeSchedules = await GroupMergeSchedule.find({
      status: 'active',
    }).lean();

    console.log(`[Merge Scheduler Cron] Checking ${activeSchedules.length} active schedules`);

    let triggered = 0;
    const results: any[] = [];

    for (const schedule of activeSchedules) {
      // Check if this schedule should run now
      if (!shouldRunNow(schedule)) {
        continue;
      }

      // Check if already executed recently (within 1 hour)
      if (schedule.lastExecutedAt) {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (schedule.lastExecutedAt > hourAgo) {
          console.log(`[Merge Scheduler] Schedule "${schedule.name}" already executed within last hour, skipping`);
          continue;
        }
      }

      console.log(
        `[Merge Scheduler] Triggering merge for "${schedule.name}": ${schedule.sourceGroupIds.length} groups → 1 target (${schedule.totalParticipantsExpected || '?'} people)`
      );

      // Create merge queue entry
      try {
        const queueEntry = await MergeQueue.create({
          userId: schedule.userId,
          sessionKey: `schedule-${schedule._id}`,
          targetGroupId: schedule.targetGroupId,
          sourceGroupIds: schedule.sourceGroupIds,
          status: 'pending',
          groupsProcessed: 0,
          totalGroups: schedule.sourceGroupIds.length,
          participantsAddedTotal: 0,
          errorCount: 0,
          createdAt: new Date(),
        });

        // Update schedule with last execution info
        await GroupMergeSchedule.findByIdAndUpdate(schedule._id, {
          lastExecutedAt: new Date(),
          lastMergeQueueId: queueEntry._id.toString(),
          lastMergeStatus: 'pending',
          updatedAt: new Date(),
        });

        results.push({
          scheduleName: schedule.name,
          sourceGroups: schedule.sourceGroupIds.length,
          participants: schedule.totalParticipantsExpected,
          queueId: queueEntry._id.toString(),
          status: '✅ Triggered',
          durationMinutes: schedule.mergeDurationMinutes,
        });

        triggered++;
      } catch (error) {
        console.error(`[Merge Scheduler] Error creating queue for "${schedule.name}":`, error);
        results.push({
          scheduleName: schedule.name,
          status: '❌ Error',
          error: String(error).slice(0, 100),
        });
      }
    }

    console.log(`[Merge Scheduler Cron] Triggered ${triggered}/${activeSchedules.length} schedules`);

    return NextResponse.json({
      success: true,
      triggered,
      total: activeSchedules.length,
      results,
      message: triggered > 0 
        ? `✅ Triggered ${triggered} group merge(s). Check progress via /merge-queue endpoints.`
        : '⏭️ No schedules ready to run right now.',
    });
  } catch (error) {
    console.error('[Merge Scheduler Cron] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error).slice(0, 200) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/crm/group-merge-scheduler/run
 * Health check for cron job
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { GroupMergeSchedule } = await getModels();

    // Count active schedules
    const activeCount = await GroupMergeSchedule.countDocuments({ status: 'active' });
    const completedToday = await GroupMergeSchedule.countDocuments({
      lastExecutedAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      status: 'ok',
      activeSchedules: activeCount,
      completedToday,
      nextCheckIn: '1 minute',
      message: `Cron job running. ${activeCount} active schedules being monitored.`,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
  }
}
