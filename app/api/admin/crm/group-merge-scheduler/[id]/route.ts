import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError } from '@/lib/crm-handlers';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


const groupMergeScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    targetGroupId: { type: String, required: true },
    targetGroupName: { type: String },
    sourceGroupIds: [{ type: String }],
    sourceGroupNames: [{ type: String }],
    totalParticipantsExpected: { type: Number, default: 0 },
    removeFromSource: { type: Boolean, default: false },
    schedule: {
      times: [String],
      days: [Number],
      repeatFrequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly'], default: 'weekly' },
      startDate: String,
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    mergeDurationMinutes: { type: Number, default: 120 },
    minDelayBetweenOpsMs: { type: Number, default: 30000 },
    maxDelayBetweenOpsMs: { type: Number, default: 120000 },
    lastExecutedAt: { type: Date },
    lastMergeQueueId: String,
    lastMergeStatus: String,
    lastMergeParticipantsAdded: { type: Number, default: 0 },
    lastMergeError: String,
    enableAutoResume: { type: Boolean, default: true },
    maxErrorsBeforePause: { type: Number, default: 5 },
    status: { type: String, enum: ['active', 'paused', 'completed', 'archived'], default: 'active' },
    userId: String,
    tenantId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'group_merge_schedules' }
);

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
 * GET /api/admin/crm/group-merge-scheduler/[id]
 * Get a specific group merge schedule
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const Model = await getGroupMergeScheduleModel();
    const schedule = await Model.findById(new ObjectId(params.id)).lean();

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Check ownership
    if (schedule.userId !== decoded.userId && !decoded.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: schedule }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET group-merge-scheduler/[id]');
  }
}

/**
 * PUT/PATCH /api/admin/crm/group-merge-scheduler/[id]
 * Update a group merge schedule
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const Model = await getGroupMergeScheduleModel();

    // Check ownership
    const existing = await Model.findById(new ObjectId(params.id));
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existing.userId !== decoded.userId && !decoded.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update
    const updated = await Model.findByIdAndUpdate(
      new ObjectId(params.id),
      { ...body, updatedAt: new Date() },
      { new: true }
    ).lean();

    return NextResponse.json(
      { success: true, data: updated, message: '✅ Schedule updated' },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'PUT group-merge-scheduler/[id]');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return PUT(request, { params });
}

/**
 * DELETE /api/admin/crm/group-merge-scheduler/[id]
 * Delete/archive a group merge schedule
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const Model = await getGroupMergeScheduleModel();

    // Check ownership
    const existing = await Model.findById(new ObjectId(params.id));
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existing.userId !== decoded.userId && !decoded.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Archive instead of delete
    await Model.findByIdAndUpdate(new ObjectId(params.id), { status: 'archived' });

    return NextResponse.json(
      { success: true, message: '✅ Schedule archived' },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'DELETE group-merge-scheduler/[id]');
  }
}
