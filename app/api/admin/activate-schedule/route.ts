import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { sendMessageToMeeting, getMeetingInfo } from '@/lib/zoomBotServiceSimple';
import { startHetznerStream } from '@/lib/hetznerStreamingIntegration';

export async function POST(request: NextRequest) {
  try {
    const { scheduleName } = await request.json();

    if (!scheduleName) {
      return NextResponse.json(
        { success: false, error: 'Schedule name required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI_MAIN!);
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const SadhanaSchedule = db.models.SadhanaSchedule ||
      db.model('SadhanaSchedule', new mongoose.Schema({}, { strict: false }));

    // Find schedule by name
    const schedule = await SadhanaSchedule.findOne({ name: scheduleName });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: `Schedule "${scheduleName}" not found` },
        { status: 404 }
      );
    }

    console.log(`[Activate] Found schedule: ${schedule.name}`);

    // Activate the schedule
    schedule.status = 'active';
    schedule.enableBotAutomation = true;
    await schedule.save();

    console.log(`[Activate] ✅ Schedule activated: status=active, enableBotAutomation=true`);

    // Extract Zoom meeting ID
    let meetingId = schedule.zoomId;
    if (!meetingId && schedule.zoomLink) {
      const match = schedule.zoomLink.match(/\/j\/(\d+)/);
      if (match) meetingId = match[1];
    }

    if (!meetingId) {
      return NextResponse.json(
        {
          success: true,
          message: 'Schedule activated but no Zoom meeting ID found',
          schedule: {
            name: schedule.name,
            status: schedule.status,
            enableBotAutomation: schedule.enableBotAutomation,
          },
        },
        { status: 200 }
      );
    }

    // Step 1: Verify meeting exists
    console.log(`[Activate] Verifying meeting: ${meetingId}`);
    const meetingCheck = await getMeetingInfo(meetingId);

    if (!meetingCheck.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'Schedule activated but meeting verification failed',
          error: `Meeting ${meetingId} not found`,
        },
        { status: 200 }
      );
    }

    // Step 2: Send ready message
    console.log(`[Activate] Sending ready message`);
    await sendMessageToMeeting(
      meetingId,
      `🟢 **SADHANA BOT ACTIVATED** 🟢\n\n📍 ${schedule.name}\n⏱️ Duration: ${schedule.videoDuration || 40} minutes\n🎥 Video: Ready\n\nSession starting now!\n\nNameste 🙏`
    );

    // Step 3: Calculate minutes late
    const scheduledTime = schedule.schedule?.times?.[0] || '00:30';
    const [schedHour, schedMin] = scheduledTime.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const scheduledTotalMin = schedHour * 60 + schedMin;
    const currentTotalMin = currentHour * 60 + currentMin;
    const minutesLate = Math.max(0, currentTotalMin - scheduledTotalMin);

    console.log(`[Activate] ⏱️ Scheduled: ${scheduledTime}, Current: ${currentHour}:${String(currentMin).padStart(2, '0')}, Late by: ${minutesLate} minutes`);

    // Step 4: Start Hetzner stream
    console.log(`[Activate] Starting Hetzner stream`);
    let hlsUrl = schedule.videoUrl;
    if (schedule.videoUrl.endsWith('.mp4')) {
      hlsUrl = schedule.videoUrl.replace('.mp4', '-hls.m3u8');
    }

    const streamResult = await startHetznerStream({
      meetingId,
      hlsUrl,
      duration: schedule.videoDuration || 40,
      rtmpUrl: `rtmp://stream.zoom.us/apple/${meetingId}`,
      programName: schedule.name,
      scheduleId: schedule._id?.toString(),
      startTime: minutesLate > 0 ? minutesLate * 60 : 0,
    });

    if (!streamResult.success) {
      console.error(`[Activate] Stream failed: ${streamResult.error}`);
      return NextResponse.json(
        {
          success: true,
          message: 'Schedule activated but streaming failed',
          error: streamResult.error,
          details: streamResult,
        },
        { status: 200 }
      );
    }

    console.log(`[Activate] ✅ Session successfully activated and triggered`);

    return NextResponse.json(
      {
        success: true,
        message: `Schedule "${schedule.name}" activated and session triggered!`,
        details: {
          scheduleName: schedule.name,
          meetingId,
          videoDuration: schedule.videoDuration,
          streamSessionId: streamResult.sessionId,
          minutesLate,
          startTime: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Activate API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
