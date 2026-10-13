import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { startSadhanaBot } from '@/lib/crm/zoomMeetingSdkBot';
import { getSadhanaSchedule } from '@/lib/bunnySadhanaSchedulerRepository';
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

export const runtime = 'nodejs';

/**
 * POST /api/admin/crm/sadhana-scheduler/test-bot
 * Manual test endpoint using Bunny Database
 */
export async function POST(request: NextRequest) {
  const startTime = new Date();
  const logs: string[] = [];

  try {
    logs.push('🔐 Step 1: Verifying authentication...');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token) {
      logs.push('❌ No authorization token provided');
      return NextResponse.json({ success: false, message: 'Unauthorized', logs }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      logs.push('❌ Invalid or expired token');
      return NextResponse.json({ success: false, message: 'Invalid token', logs }, { status: 403 });
    }

    logs.push(`✅ Authenticated as user: ${decoded.userId}`);
    logs.push('📋 Step 2: Parsing request body...');
    let scheduleId: string;

    try {
      const body = await request.json();
      scheduleId = body?.scheduleId;
    } catch {
      logs.push('❌ Failed to parse JSON body');
      return NextResponse.json({ success: false, message: 'Invalid JSON', logs }, { status: 400 });
    }

    if (!scheduleId) {
      logs.push('❌ Missing scheduleId in request body');
      return NextResponse.json({ success: false, message: 'scheduleId required', logs }, { status: 400 });
    }

    logs.push(`✅ Schedule ID: ${scheduleId}`);
    logs.push('📚 Step 3: Fetching schedule from Bunny Database...');

    // Try fetching from crm_sadhana_schedules_sql
    let schedule: any = await getSadhanaSchedule(scheduleId);

    // If not found, check sadhana_programs_sql
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
          enableBotAutomation: prog.enableBotAutomation !== false,
        };
      }
    }

    if (!schedule) {
      logs.push('❌ Schedule not found in Bunny Database');
      return NextResponse.json({ success: false, message: 'Schedule not found', logs }, { status: 404 });
    }

    logs.push(`✅ Found schedule: ${schedule.name}`);
    logs.push(`   - Zoom Link: ${schedule.zoomLink ? '✅ Yes' : '❌ No'}`);
    logs.push(`   - Video URL: ${schedule.videoUrl ? '✅ Yes' : '❌ No'}`);
    logs.push(`   - Bot Name: ${schedule.botName || 'Swar Sadhana'}`);
    logs.push(`   - Bot Automation: ${schedule.enableBotAutomation ? '✅ Enabled' : '❌ Disabled'}`);

    // Validate Zoom
    const { meetingId, password } = extractZoomDetailsFromLink(schedule.zoomLink || schedule.zoomId || '');
    const finalMeetingId = schedule.zoomMeetingId || schedule.zoomId || meetingId;
    const finalPassword = schedule.zoomPassword || password || '';

    if (!finalMeetingId) {
      logs.push('❌ No Zoom Meeting ID found. Please add a Zoom link or meeting ID in schedule settings.');
      return NextResponse.json(
        { success: false, message: 'Zoom meeting ID or link is required', logs },
        { status: 400 }
      );
    }

    if (!schedule.videoUrl) {
      logs.push('❌ Schedule has no video URL configured');
      return NextResponse.json(
        { success: false, message: 'No video URL configured', logs },
        { status: 400 }
      );
    }

    logs.push(`🤖 Step 4: Triggering Zoom bot for meeting: ${finalMeetingId}...`);
    const botResult = await startSadhanaBot({
      meetingNumber: finalMeetingId,
      meetingPassword: finalPassword,
      botName: schedule.botName || 'Swar Sadhana',
      videoUrl: schedule.videoUrl,
      chatMessages: Array.isArray(schedule.chatMessages) && schedule.chatMessages.length
        ? schedule.chatMessages
        : [{ message: `🧘 Test trigger for "${schedule.name}" — Namaste 🙏`, delayMinutes: 0 }],
      enableAiChatReplies: !!schedule.enableAiChatReplies,
      durationMinutes: schedule.videoDuration || 40,
    });

    if (!botResult.success) {
      logs.push(`❌ Bot join failed: ${botResult.error}`);
      return NextResponse.json({ success: false, message: botResult.error || 'Bot join failed', logs }, { status: 400 });
    }

    logs.push(`✅ Bot join triggered successfully (pid ${botResult.pid})`);
    const elapsedTime = new Date().getTime() - startTime.getTime();
    logs.push(`⏱️  Total time: ${elapsedTime}ms`);

    return NextResponse.json(
      {
        success: true,
        message: `Bot join test triggered for schedule: ${schedule.name}. Check the Zoom meeting in about 1-2 minutes.`,
        logs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    logs.push(`❌ Unexpected error: ${errorMsg}`);
    return NextResponse.json({ success: false, message: 'Test trigger failed', logs }, { status: 500 });
  }
}
