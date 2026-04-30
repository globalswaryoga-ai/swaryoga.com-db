import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin, tenantFilter } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


// Import or create SadhanaSchedule model
import mongoose from 'mongoose';

const sadhanaScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    botName: { type: String, default: 'Swar Sadhana' }, // Name shown in Zoom meeting
    videoUrl: { type: String, required: true },
    videoDuration: { type: Number, default: 40 }, // Minutes (for auto-close)
    botJoinMinutes: { type: Number, default: 5 }, // How many minutes before scheduled time bot joins (5 or 3)
    autoCloseMinutes: { type: Number, default: 40 }, // Minutes after start before auto-close (match video duration)
    zoomLink: { type: String },
    zoomId: { type: String },
    zoomPassword: { type: String },
    zoomMeetingId: { type: String }, // Current meeting ID if created
    botJoinTime: { type: String, default: '10:12' }, // When bot joins (HH:MM) - deprecated, use botJoinMinutes
    enableBotAutomation: { type: Boolean, default: true }, // Enable bot join/countdown/close
    schedule: {
      times: [String], // ["06:00", "18:00"]
      days: [Number], // [1, 2, 3, 4, 5]
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
    userId: String, // Creator/owner
    tenantId: String, // For multi-tenant support
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'sadhana_schedules' }
);

let SadhanaSchedule: any;

async function getSadhanaScheduleModel() {
  if (!SadhanaSchedule) {
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    if (db.models.SadhanaSchedule) {
      SadhanaSchedule = db.models.SadhanaSchedule;
    } else {
      SadhanaSchedule = db.model('SadhanaSchedule', sadhanaScheduleSchema);
    }
  }
  return SadhanaSchedule;
}

/**
 * GET /api/admin/crm/sadhana-scheduler
 * List all Sadhana schedules for the user
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    console.log('[Sadhana GET] Auth header:', request.headers.get('authorization')?.slice(0, 50));
    console.log('[Sadhana GET] Extracted token:', token?.slice(0, 20) + '...');
    
    const decoded = verifyToken(token);
    console.log('[Sadhana GET] Token verification result:', decoded ? 'SUCCESS' : 'FAILED');
    
    if (!decoded) {
      console.error('[Sadhana GET] Token verification failed', {
        authHeader: request.headers.get('authorization')?.slice(0, 20),
        hasToken: !!token,
        tokenLength: token?.length,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const Model = await getSadhanaScheduleModel();
    const filter: any = {};

    // Multi-tenant support
    if (!isSuperAdmin(decoded)) {
      filter.userId = decoded.userId;
    }

    const schedules = await Model.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: schedules }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler');
  }
}

/**
 * POST /api/admin/crm/sadhana-scheduler
 * Create a new Sadhana schedule
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded) {
      console.error('[Sadhana POST] Token verification failed', {
        authHeader: request.headers.get('authorization')?.slice(0, 20),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const Model = await getSadhanaScheduleModel();

    // Validate required fields
    if (!body.name || !body.videoUrl || !body.schedule) {
      return NextResponse.json(
        { error: 'Missing required fields: name, videoUrl, schedule' },
        { status: 400 }
      );
    }

    // Validate that at least one Zoom method is provided
    const hasZoomLink = body.zoomLink && body.zoomLink.trim();
    const hasZoomCredentials = body.zoomId && body.zoomPassword && body.zoomId.trim() && body.zoomPassword.trim();
    
    if (!hasZoomLink && !hasZoomCredentials) {
      return NextResponse.json(
        { error: 'Either Zoom link or Zoom ID+password is required' },
        { status: 400 }
      );
    }

    // Generate programSlug from name (used by live page and bot)
    const programSlug = body.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const newSchedule = new Model({
      name: body.name,
      slug: programSlug,
      programSlug: programSlug,
      botName: body.botName || 'Swar Sadhana',
      videoUrl: body.videoUrl,
      videoDuration: body.videoDuration || 40,
      botJoinMinutes: body.botJoinMinutes || 5,
      autoCloseMinutes: body.autoCloseMinutes || 40,
      enableBotAutomation: body.enableBotAutomation !== false,
      zoomLink: body.zoomLink || null,
      zoomId: body.zoomId || null,
      zoomPassword: body.zoomPassword || null,
      schedule: body.schedule,
      status: body.status || 'active',
      userId: decoded.userId,
      tenantId: decoded.tenantId,
    });

    const saved = await newSchedule.save();

    return NextResponse.json(
      { success: true, data: saved },
      { status: 201 }
    );
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-scheduler');
  }
}
