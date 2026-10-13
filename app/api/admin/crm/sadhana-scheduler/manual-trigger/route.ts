import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { startSadhanaBot } from '@/lib/crm/zoomMeetingSdkBot';
import { getSadhanaSchedule, updateSadhanaSchedule } from '@/lib/bunnySadhanaSchedulerRepository';
import { getProgram } from '@/lib/bunnySadhanaRepository';

export const dynamic = 'force-dynamic';

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
 * POST /api/admin/crm/sadhana-scheduler/manual-trigger
 * Manually trigger bot for a specific schedule NOW using Bunny Database
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await request.json();
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId required' }, { status: 400 });
    }

    let schedule: any = await getSadhanaSchedule(scheduleId);
    if (!schedule) {
      const prog = await getProgram(scheduleId);
      if (prog) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayVid = prog.videoCalendar?.[todayStr] || Object.values(prog.videoCalendar || {})[0] || {};
        schedule = {
          name: prog.name,
          videoUrl: todayVid.hlsUrl || todayVid.videoUrl || prog.playerUrl || '',
          zoomLink: prog.zoomLink,
          zoomId: prog.zoomId,
          zoomPassword: prog.zoomPassword,
          botName: prog.botName || '🤖 Swar Yoga Bot',
          videoDuration: prog.videoDuration || 40,
        };
      }
    }

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const { meetingId, password } = extractZoomDetailsFromLink(schedule.zoomLink || schedule.zoomId || '');
    const finalMeetingId = schedule.zoomMeetingId || schedule.zoomId || meetingId;
    const finalPassword = schedule.zoomPassword || password || '';

    if (!finalMeetingId) {
      return NextResponse.json(
        { error: 'No meeting ID found in schedule (configure Zoom link or ID)' },
        { status: 400 }
      );
    }

    if (!schedule.videoUrl) {
      return NextResponse.json(
        { error: 'No video URL configured for this schedule' },
        { status: 400 }
      );
    }

    const botResult = await startSadhanaBot({
      meetingNumber: finalMeetingId,
      meetingPassword: finalPassword,
      botName: schedule.botName || 'Swar Sadhana',
      videoUrl: schedule.videoUrl,
      chatMessages: Array.isArray(schedule.chatMessages) && schedule.chatMessages.length
        ? schedule.chatMessages
        : [{ message: `🧘 Manual trigger for "${schedule.name}" — Namaste 🙏`, delayMinutes: 0 }],
      enableAiChatReplies: !!schedule.enableAiChatReplies,
      durationMinutes: schedule.videoDuration || 40,
    });

    if (!botResult.success) {
      return NextResponse.json(
        { error: `Bot join failed: ${botResult.error || 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Record session in Bunny DB if it's a schedule item
    if (schedule.id) {
      const closeAt = new Date(Date.now() + ((schedule.videoDuration || 40) + 5) * 60 * 1000).toISOString();
      await updateSadhanaSchedule(schedule.id, {
        activeBotSession: {
          meetingId: finalMeetingId,
          meetingPassword: finalPassword,
          startedAt: new Date().toISOString(),
          closeAt,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `✅ Bot triggered for "${schedule.name}" - joining meeting ${finalMeetingId}!`,
        scheduleId,
        meetingId: finalMeetingId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Manual Trigger] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
