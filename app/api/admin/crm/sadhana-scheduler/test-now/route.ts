import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError } from '@/lib/crm-handlers';
import { botJoinMeeting } from '@/lib/zoomBotService';
import mongoose from 'mongoose';

const sadhanaScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    botName: { type: String, default: 'Swar Sadhana' },
    videoUrl: { type: String, required: true },
    videoDuration: { type: Number, default: 40 },
    botJoinMinutes: { type: Number, default: 5 },
    autoCloseMinutes: { type: Number, default: 40 },
    zoomLink: { type: String },
    zoomId: { type: String },
    zoomPassword: { type: String },
    zoomMeetingId: { type: String },
    botJoinTime: { type: String, default: '10:12' },
    enableBotAutomation: { type: Boolean, default: true },
    schedule: {
      times: [String],
      days: [Number],
      repeatFrequency: String,
      startDate: String,
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    status: { type: String, default: 'active' },
    userId: String,
    tenantId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'sadhana_schedules' }
);

async function getSadhanaScheduleModel() {
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  return db.models.SadhanaSchedule || db.model('SadhanaSchedule', sadhanaScheduleSchema);
}

function extractZoomDetailsFromLink(zoomLink: string): { meetingId?: string; password?: string } {
  if (!zoomLink) return {};

  const urlMatch = zoomLink.match(/\/j\/(\d+)/);
  const pwdMatch = zoomLink.match(/[?&]pwd=([^&]+)/);

  return {
    meetingId: urlMatch ? urlMatch[1] : undefined,
    password: pwdMatch ? decodeURIComponent(pwdMatch[1]) : undefined,
  };
}

/**
 * GET /api/admin/crm/sadhana-scheduler/test-now
 * MANUAL TEST: Trigger bot join immediately for the first active schedule
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    // Test endpoint - no auth required

    const Model = await getSadhanaScheduleModel();

    // Get first active schedule
    const schedule = await Model.findOne({ status: 'active' }).lean() as any;

    if (!schedule) {
      return NextResponse.json(
        { error: 'No active schedule found', debug: 'Check if schedule exists and status=active' },
        { status: 404 }
      );
    }

    console.log(`[Test Now] Testing schedule: "${schedule.name}"`);
    console.log(`[Test Now] Schedule data:`, JSON.stringify(schedule, null, 2));

    // Extract meeting ID
    let meetingId = schedule.zoomMeetingId || schedule.zoomId;
    let meetingPassword = schedule.zoomPassword;

    if (!meetingId && schedule.zoomLink) {
      const { meetingId: extracted, password } = extractZoomDetailsFromLink(schedule.zoomLink);
      meetingId = extracted;
      meetingPassword = password || meetingPassword;
    }

    if (!meetingId) {
      return NextResponse.json(
        { error: 'No meeting ID found', debug: 'Check zoomLink, zoomMeetingId, or zoomId in schedule' },
        { status: 400 }
      );
    }

    console.log(`[Test Now] 🤖 Attempting to join meeting: ${meetingId}`);

    const ec2Url = process.env.ZOOM_BOT_EC2_URL;
    const ec2Secret = process.env.ZOOM_BOT_SECRET;

    // Priority 1: EC2 Puppeteer bot (real participant)
    if (ec2Url) {
      try {
        console.log(`[Test Now] Calling EC2 bot at ${ec2Url}`);
        const botRes = await fetch(`${ec2Url}/start-meeting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bot-secret': ec2Secret || '',
          },
          body: JSON.stringify({
            meetingId,
            password: meetingPassword,
            videoUrl: (schedule as any).videoUrl,
            durationMinutes: schedule.videoDuration || 40,
          }),
        });
        const botData = await botRes.json();

        return NextResponse.json({
          success: botRes.ok,
          message: botRes.ok ? '✅ EC2 bot triggered — joining meeting' : '❌ EC2 bot failed',
          ec2Response: botData,
          meeting: { id: meetingId, password: meetingPassword ? '***' : 'none' },
          schedule: { name: schedule.name, times: schedule.schedule?.times },
        }, { status: botRes.ok ? 200 : 500 });
      } catch (ec2Err: any) {
        return NextResponse.json({
          success: false,
          message: '❌ Could not reach EC2 bot',
          error: ec2Err.message,
          hint: 'Check ZOOM_BOT_EC2_URL and that bot service is running on EC2',
        }, { status: 500 });
      }
    }

    // Priority 2: Fallback to Zoom API (chat message only)
    try {
      await botJoinMeeting({
        meetingId,
        meetingPassword,
        videoDurationMinutes: schedule.videoDuration || 40,
      });

      return NextResponse.json({
        success: true,
        message: '✅ API bot triggered (chat only - set ZOOM_BOT_EC2_URL for real bot)',
        meeting: { id: meetingId, password: meetingPassword ? '***' : 'none' },
        schedule: { name: schedule.name, times: schedule.schedule?.times },
      }, { status: 200 });
    } catch (botErr: any) {
      return NextResponse.json({
        success: false,
        message: '❌ Bot join failed',
        error: botErr.message,
        schedule: { name: schedule.name, id: schedule._id },
      }, { status: 500 });
    }
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler/test-now');
  }
}
