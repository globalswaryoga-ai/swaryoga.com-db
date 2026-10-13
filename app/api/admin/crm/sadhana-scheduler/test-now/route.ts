import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { botJoinMeeting } from '@/lib/zoomBotService';
import { listSadhanaSchedules } from '@/lib/bunnySadhanaSchedulerRepository';
import { listPrograms } from '@/lib/bunnySadhanaRepository';

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
 * GET /api/admin/crm/sadhana-scheduler/test-now
 * MANUAL TEST: Trigger bot join immediately for the first active schedule in Bunny Database
 */
export async function GET(_request: NextRequest) {
  try {
    // 1. Try to get first active schedule from Bunny Database
    const schedules = await listSadhanaSchedules({ status: 'active' });
    let schedule = schedules[0] as any;

    // 2. If no schedule in crm_sadhana_schedules_sql, check sadhana_programs_sql
    if (!schedule) {
      const programs = await listPrograms({ active: true });
      if (programs.length > 0) {
        const prog = programs[0];
        // find today's video or first video
        const todayStr = new Date().toISOString().split('T')[0];
        const todayVid = prog.videoCalendar?.[todayStr] || Object.values(prog.videoCalendar || {})[0] || {};
        schedule = {
          name: prog.name,
          videoUrl: todayVid.hlsUrl || todayVid.videoUrl || '',
          zoomLink: prog.zoomLink,
          zoomId: prog.zoomId,
          zoomPassword: prog.zoomPassword,
          botName: prog.botName || '🤖 Swar Yoga Bot',
          videoDuration: prog.videoDuration || 40,
        };
      }
    }

    if (!schedule) {
      return NextResponse.json(
        { error: 'No active schedule found in Bunny Database' },
        { status: 404 }
      );
    }

    const meetingId =
      schedule.zoomMeetingId ||
      schedule.zoomId ||
      extractZoomDetailsFromLink(schedule.zoomLink || '').meetingId;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'No meeting ID found in schedule (add Zoom Link or Zoom ID in settings)' },
        { status: 400 }
      );
    }

    const password =
      schedule.zoomPassword ||
      extractZoomDetailsFromLink(schedule.zoomLink || '').password ||
      '';

    const botResult = await botJoinMeeting({
      meetingId,
      meetingPassword: password || undefined,
      botName: schedule.botName || 'Swar Sadhana Test',
      videoUrl: schedule.videoUrl,
      videoDurationMinutes: schedule.videoDuration || 40,
      zoomLink: schedule.zoomLink,
    });

    return NextResponse.json(
      {
        success: botResult.success,
        scheduleName: schedule.name,
        meetingId,
        botDetails: botResult,
        timestamp: new Date().toISOString(),
      },
      { status: botResult.success ? 200 : 500 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler/test-now');
  }
}
