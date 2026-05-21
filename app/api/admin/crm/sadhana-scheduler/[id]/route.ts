import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


const sadhanaScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    botName: { type: String, default: 'Swar Sadhana' },
    videoUrl: { type: String, required: true },
    videoDuration: { type: Number, default: 40 },
    botJoinMinutes: { type: Number, default: 5 },
    autoCloseMinutes: { type: Number, default: 40 },
    enableBotAutomation: { type: Boolean, default: true },
    zoomLink: { type: String },
    zoomId: { type: String },
    zoomPassword: { type: String },
    schedule: {
      times: [String],
      days: [Number],
      repeatFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
      startDate: String,
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
    },
    userId: String,
    tenantId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'sadhana_schedules' }
);

let SadhanaSchedule: any;

async function getSadhanaScheduleModel() {
  if (!SadhanaSchedule) {
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    if (db.models.SadhanaSchedule) {
      SadhanaSchedule = db.models.SadhanaSchedule;
    } else {
      SadhanaSchedule = db.model('SadhanaSchedule', sadhanaScheduleSchema);
    }
  }
  return SadhanaSchedule;
}

/**
 * GET /api/admin/crm/sadhana-scheduler/[id]
 * Get a specific Sadhana schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const Model = await getSadhanaScheduleModel();
    const filter: any = { _id: params.id };

    if (!isSuperAdmin(decoded)) {
      filter.userId = decoded.userId;
    }

    const schedule = await Model.findOne(filter).lean();

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: schedule }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler/[id]');
  }
}

/**
 * PUT /api/admin/crm/sadhana-scheduler/[id]
 * Update a Sadhana schedule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const Model = await getSadhanaScheduleModel();

    const filter: any = { _id: params.id };
    if (!isSuperAdmin(decoded)) {
      filter.userId = decoded.userId;
    }

    const schedule = await Model.findOne(filter);

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (body.name) schedule.name = body.name;
    if (body.botName !== undefined) schedule.botName = body.botName || 'Swar Sadhana';
    if (body.videoUrl) schedule.videoUrl = body.videoUrl;
    if (body.videoDuration !== undefined) schedule.videoDuration = body.videoDuration || 40;
    if (body.botJoinMinutes !== undefined) schedule.botJoinMinutes = body.botJoinMinutes || 5;
    if (body.autoCloseMinutes !== undefined) schedule.autoCloseMinutes = body.autoCloseMinutes || 40;
    if (body.enableBotAutomation !== undefined) schedule.enableBotAutomation = body.enableBotAutomation !== false;
    if (body.zoomLink !== undefined) schedule.zoomLink = body.zoomLink;
    if (body.zoomId !== undefined) schedule.zoomId = body.zoomId;
    if (body.zoomPassword !== undefined) schedule.zoomPassword = body.zoomPassword;
    if (body.schedule) schedule.schedule = body.schedule;
    if (body.status) schedule.status = body.status;

    schedule.updatedAt = new Date();
    const updated = await schedule.save();

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'PUT sadhana-scheduler/[id]');
  }
}

/**
 * PATCH /api/admin/crm/sadhana-scheduler/[id]
 * Partially update a Sadhana schedule (mainly for status toggle)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const Model = await getSadhanaScheduleModel();

    const filter: any = { _id: params.id };
    if (!isSuperAdmin(decoded)) {
      filter.userId = decoded.userId;
    }

    const schedule = await Model.findOne(filter);

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Only allow status toggle
    if (body.status && ['active', 'paused'].includes(body.status)) {
      schedule.status = body.status;
      schedule.updatedAt = new Date();
      const updated = await schedule.save();
      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Only status can be patched' },
      { status: 400 }
    );
  } catch (error) {
    return handleCrmError(error, 'PATCH sadhana-scheduler/[id]');
  }
}

/**
 * DELETE /api/admin/crm/sadhana-scheduler/[id]
 * Delete a Sadhana schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const Model = await getSadhanaScheduleModel();
    const filter: any = { _id: params.id };

    if (!isSuperAdmin(decoded)) {
      filter.userId = decoded.userId;
    }

    const result = await Model.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Schedule deleted' },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-scheduler/[id]');
  }
}
