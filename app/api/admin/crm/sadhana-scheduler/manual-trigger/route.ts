import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  botJoinMeeting,
  sendCountdownMessage,
  startLiveStream,
  cleanupOldMeetings,
} from '@/lib/zoomBotService';

export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';

/**
 * POST /api/admin/crm/sadhana-scheduler/manual-trigger
 * Manually trigger bot for a specific schedule NOW (skip time checks)
 * Body: { scheduleId: string }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { scheduleId } = await request.json();
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId required' }, { status: 400 });
    }

    // Get the schedule
    const db = mongoose.connection.useDb('swaryoga_admin_crm');
    const schedule = await db.collection('sadhana_schedules').findOne({
      _id: new mongoose.Types.ObjectId(scheduleId),
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get leads for this user
    const Lead = mongoose.connection.db?.collection('leads');
    const leads = await Lead?.find({ assignedToUserId: schedule.userId }).toArray();

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads assigned to this schedule' },
        { status: 400 }
      );
    }

    // Extract meeting ID
    let meetingId = schedule.zoomMeetingId || schedule.zoomId;
    let meetingPassword = schedule.zoomPassword;

    if (!meetingId && schedule.zoomLink) {
      const urlMatch = schedule.zoomLink.match(/\/j\/(\d+)/);
      const pwdMatch = schedule.zoomLink.match(/[?&]pwd=([^&]+)/);
      meetingId = urlMatch ? urlMatch[1] : undefined;
      meetingPassword = pwdMatch ? decodeURIComponent(pwdMatch[1]) : undefined;

      // Save extracted values
      if (meetingId) {
        try {
          await db.collection('sadhana_schedules').updateOne(
            { _id: new mongoose.Types.ObjectId(scheduleId) },
            {
              $set: {
                zoomMeetingId: meetingId,
                zoomPassword: meetingPassword || null,
              },
            }
          );
        } catch (e) {
          console.warn('[Manual Trigger] Warning saving extracted Zoom ID:', e);
        }
      }
    }

    if (!meetingId) {
      return NextResponse.json(
        { error: 'No meeting ID found in schedule' },
        { status: 400 }
      );
    }

    console.log(`[Manual Trigger] 🤖 Starting manual bot trigger for schedule ${scheduleId}`);
    console.log(`[Manual Trigger] Meeting ID: ${meetingId}`);

    // 1️⃣ BOT JOINS
    try {
      console.log(`[Manual Trigger] 🤖 BOT JOINING now...`);
      await botJoinMeeting({
        meetingId,
        meetingPassword,
        videoDurationMinutes: schedule.videoDuration || 40,
      });
      
      // Clean up old meetings
      try {
        await cleanupOldMeetings(schedule.userId, 24);
      } catch (e) {
        console.warn('[Manual Trigger] Warning during cleanup:', e);
      }
    } catch (err) {
      console.error('[Manual Trigger] Bot join error:', err);
      return NextResponse.json(
        { error: `Bot join failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    // 2️⃣ COUNTDOWN (after 5 seconds to let bot join first)
    setTimeout(async () => {
      try {
        console.log(`[Manual Trigger] ⏳ Sending countdown...`);
        await sendCountdownMessage(meetingId, 120);
      } catch (err) {
        console.error('[Manual Trigger] Countdown error:', err);
      }
    }, 5000);

    // 3️⃣ VIDEO STARTS (after 10 seconds)
    setTimeout(async () => {
      try {
        console.log(`[Manual Trigger] 🎬 VIDEO STARTING now...`);
        await startLiveStream(
          meetingId,
          schedule.videoUrl,
          schedule.botName || schedule.name || 'Swar Sadhana'
        );
      } catch (err) {
        console.error('[Manual Trigger] Video start error:', err);
      }
    }, 10000);

    return NextResponse.json(
      {
        success: true,
        message: `✅ Bot triggered for "${schedule.name}" - joining meeting now!`,
        scheduleId,
        meetingId,
        expected: {
          botJoins: 'now',
          countdown: '5 seconds',
          videoStarts: '10 seconds',
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Manual Trigger] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
