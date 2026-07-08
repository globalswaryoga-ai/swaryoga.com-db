import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { sendMessageToMeeting, getMeetingInfo } from '@/lib/zoomBotServiceSimple';
import { startHetznerStream } from '@/lib/hetznerStreamingIntegration';

export async function POST(request: NextRequest) {
  try {
    const { scheduleId } = await request.json();

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID required' },
        { status: 400 }
      );
    }

    // Get schedule from database
    await mongoose.connect(process.env.MONGODB_URI_MAIN!);
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const SadhanaSchedule = db.models.SadhanaSchedule ||
      db.model('SadhanaSchedule', new mongoose.Schema({}));

    const schedule = await SadhanaSchedule.findById(scheduleId);

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    console.log(`[Trigger] Manual trigger for: ${schedule.name}`);

    // Extract Zoom meeting ID
    let meetingId = schedule.zoomId;
    if (!meetingId && schedule.zoomLink) {
      const match = schedule.zoomLink.match(/\/j\/(\d+)/);
      if (match) meetingId = match[1];
    }

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'No Zoom meeting ID found' },
        { status: 400 }
      );
    }

    // Step 1: Verify meeting exists
    console.log(`[Trigger] Verifying meeting: ${meetingId}`);
    const meetingCheck = await getMeetingInfo(meetingId);

    if (!meetingCheck.success) {
      return NextResponse.json(
        { success: false, error: `Meeting not found: ${meetingId}` },
        { status: 400 }
      );
    }

    // Step 2: Send ready message to meeting
    console.log(`[Trigger] Sending ready message`);
    await sendMessageToMeeting(
      meetingId,
      `🟢 **SADHANA BOT ACTIVATED (MANUAL TRIGGER)** 🟢\n\n📍 ${schedule.name}\n⏱️ Duration: ${schedule.videoDuration || 40} minutes\n🎥 Video: Ready\n\nSession starting now!\n\nNameste 🙏`
    );

    // Step 3: Start Hetzner stream
    console.log(`[Trigger] Starting Hetzner stream`);
    let hlsUrl = schedule.videoUrl;
    if (schedule.videoUrl.endsWith('.mp4')) {
      hlsUrl = schedule.videoUrl.replace('.mp4', '-hls.m3u8');
    }

    // Calculate minutes late (if any)
    const scheduledTime = schedule.schedule?.times?.[0] || '00:30';
    const [schedHour, schedMin] = scheduledTime.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const scheduledTotalMin = schedHour * 60 + schedMin;
    const currentTotalMin = currentHour * 60 + currentMin;
    const minutesLate = Math.max(0, currentTotalMin - scheduledTotalMin);

    console.log(`[Trigger] ⏱️ Scheduled: ${scheduledTime}, Current: ${currentHour}:${String(currentMin).padStart(2, '0')}, Late by: ${minutesLate} minutes`);

    const streamResult = await startHetznerStream({
      meetingId,
      hlsUrl,
      duration: schedule.videoDuration || 40,
      rtmpUrl: `rtmp://stream.zoom.us/apple/${meetingId}`,
      programName: schedule.name,
      scheduleId: schedule._id?.toString(),
      startTime: minutesLate > 0 ? minutesLate * 60 : 0, // Start from this many seconds into video
    });

    if (!streamResult.success) {
      console.error(`[Trigger] Stream failed: ${streamResult.error}`);
      return NextResponse.json(
        {
          success: true,
          message: 'Session triggered but streaming failed (check Hetzner)',
          details: streamResult,
        },
        { status: 200 }
      );
    }

    console.log(`[Trigger] ✅ Session successfully triggered`);

    return NextResponse.json(
      {
        success: true,
        message: `Session "${schedule.name}" triggered successfully`,
        details: {
          meetingId,
          scheduleName: schedule.name,
          videoDuration: schedule.videoDuration,
          streamSessionId: streamResult.sessionId,
          startTime: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Trigger API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
