import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const groupMergeScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Monday Sales Groups Merge"
    description: { type: String },
    
    // Merge configuration
    targetGroupId: { type: String, required: true }, // "120192939@g.us"
    targetGroupName: { type: String },
    sourceGroupIds: [{ type: String }], // ["grp1@g.us", "grp2@g.us", ...]
    sourceGroupNames: [{ type: String }],
    
    totalParticipantsExpected: { type: Number, default: 0 }, // For tracking
    removeFromSource: { type: Boolean, default: false }, // Whether to remove after adding
    
    // Schedule configuration
    schedule: {
      times: [String], // ["09:00", "14:00"] - when to trigger merge
      days: [Number], // [1, 2, 3, 4, 5] - Monday=1, Sunday=7
      repeatFrequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
      startDate: String, // "2026-04-17"
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    
    // Merge timing configuration (ultra-conservative for zero ban risk)
    mergeDurationMinutes: { type: Number, default: 240 }, // 240 minutes (4 hours) - MAXIMUM SAFETY
    minDelayBetweenOpsMs: { type: Number, default: 45000 }, // 45 seconds minimum (vs 30)
    maxDelayBetweenOpsMs: { type: Number, default: 180000 }, // 180 seconds maximum (vs 120) - 3 MINUTES
    
    // Current/last execution
    lastExecutedAt: { type: Date },
    lastMergeQueueId: String, // Link to merge_queue collection
    lastMergeStatus: String, // "pending", "in-progress", "completed", "failed"
    lastMergeParticipantsAdded: { type: Number, default: 0 },
    lastMergeError: String,
    
    // Safety configuration
    enableAutoResume: { type: Boolean, default: true }, // Auto-resume if disconnected
    maxErrorsBeforePause: { type: Number, default: 5 },
    
    // Status
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'archived'],
      default: 'active',
    },
    
    // Ownership
    userId: String, // Creator
    tenantId: String, // For multi-tenant
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'group_merge_schedules' }
);

// Create index for schedule queries
groupMergeScheduleSchema.index({ userId: 1, status: 1 });
groupMergeScheduleSchema.index({ 'schedule.times': 1 });

let GroupMergeSchedule: any;

async function getGroupMergeScheduleModel() {
  if (!GroupMergeSchedule) {
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    if (db.models.GroupMergeSchedule) {
      GroupMergeSchedule = db.models.GroupMergeSchedule;
    } else {
      GroupMergeSchedule = db.model('GroupMergeSchedule', groupMergeScheduleSchema);
    }
  }
  return GroupMergeSchedule;
}

/**
 * GET /api/admin/crm/group-merge-scheduler
 * List all group merge schedules for the user
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const Model = await getGroupMergeScheduleModel();
    const filter: any = { status: { $ne: 'archived' } };

    if (!isSuperAdmin(decoded)) {
      filter.userId = decoded.userId;
    }

    const schedules = await Model.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: schedules }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET group-merge-scheduler');
  }
}

/**
 * POST /api/admin/crm/group-merge-scheduler
 * Create a new group merge schedule
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      targetGroupId,
      targetGroupName,
      sourceGroupIds,
      sourceGroupNames,
      totalParticipantsExpected,
      removeFromSource,
      schedule,
      mergeDurationMinutes,
      minDelayBetweenOpsMs,
      maxDelayBetweenOpsMs,
    } = body;

    // Validation
    if (!name || !targetGroupId || !sourceGroupIds?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, targetGroupId, sourceGroupIds' },
        { status: 400 }
      );
    }

    const Model = await getGroupMergeScheduleModel();
    const newSchedule = await Model.create({
      name,
      description,
      targetGroupId,
      targetGroupName,
      sourceGroupIds,
      sourceGroupNames,
      totalParticipantsExpected,
      removeFromSource: removeFromSource ?? false,
      schedule: {
        times: schedule?.times || ['09:00'],
        days: schedule?.days || [1, 2, 3, 4, 5],
        repeatFrequency: schedule?.repeatFrequency || 'weekly',
        startDate: schedule?.startDate || new Date().toISOString().split('T')[0],
        timezone: schedule?.timezone || 'Asia/Kolkata',
      },
      mergeDurationMinutes: mergeDurationMinutes || 120,
      minDelayBetweenOpsMs: minDelayBetweenOpsMs || 30000,
      maxDelayBetweenOpsMs: maxDelayBetweenOpsMs || 120000,
      userId: decoded.userId,
      tenantId: decoded.tenantId,
    });

    return NextResponse.json(
      {
        success: true,
        data: newSchedule,
        message: `✅ Schedule "${name}" created. Will run at ${schedule?.times?.join(', ') || '09:00'} for ${mergeDurationMinutes || 120} minutes on selected days.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleCrmError(error, 'POST group-merge-scheduler');
  }
}
