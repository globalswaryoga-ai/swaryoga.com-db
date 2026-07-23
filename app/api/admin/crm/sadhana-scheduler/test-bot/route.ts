import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { startSadhanaBot } from '@/lib/crm/zoomMeetingSdkBot';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * Extract Zoom meeting ID and password from Zoom link
 */
function extractZoomDetailsFromLink(zoomLink: string): { meetingId?: string; password?: string } {
  if (!zoomLink) return {};
  
  const urlMatch = zoomLink.match(/\/j\/(\d+)/);
  const pwdMatch = zoomLink.match(/[?&]pwd=([^&]+)/);
  
  return {
    meetingId: urlMatch ? urlMatch[1] : undefined,
    password: pwdMatch ? decodeURIComponent(pwdMatch[1]) : undefined,
  };
}

const sadhanaScheduleSchema = new mongoose.Schema({
  name: String,
  videoUrl: String,
  zoomLink: String,
  zoomId: String,
  zoomPassword: String,
  schedule: {
    times: [String],
    days: [Number],
    repeatFrequency: String,
    startDate: Date,
    timezone: String,
  },
  botName: String,
  videoDuration: Number,
  botJoinMinutes: Number,
  autoCloseMinutes: Number,
  enableBotAutomation: Boolean,
  status: String,
  userId: String,
  createdAt: Date,
  updatedAt: Date,
});

export const runtime = 'nodejs';

/**
 * POST /api/admin/crm/sadhana-scheduler/test-bot
 * 
 * Manual test endpoint to trigger bot join immediately (bypasses time checks)
 * For testing bot automation outside of scheduled times
 * 
 * Request body: { scheduleId: string }
 * Response: { success: boolean, message: string, logs: string[] }
 */
export async function POST(request: NextRequest) {
  const startTime = new Date();
  const logs: string[] = [];

  try {
    // 1️⃣ Verify authentication
    logs.push('🔐 Step 1: Verifying authentication...');
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    
    if (!token) {
      logs.push('❌ No authorization token provided');
      return NextResponse.json(
        { success: false, message: 'Unauthorized', logs },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      logs.push('❌ Invalid or expired token');
      return NextResponse.json(
        { success: false, message: 'Invalid token', logs },
        { status: 403 }
      );
    }

    logs.push(`✅ Authenticated as user: ${decoded.userId}`);

    // 2️⃣ Parse request body
    logs.push('📋 Step 2: Parsing request body...');
    let scheduleId: string;
    
    try {
      const body = await request.json();
      scheduleId = body?.scheduleId;
    } catch (e) {
      logs.push('❌ Failed to parse JSON body');
      return NextResponse.json(
        { success: false, message: 'Invalid JSON', logs },
        { status: 400 }
      );
    }

    if (!scheduleId) {
      logs.push('❌ Missing scheduleId in request body');
      return NextResponse.json(
        { success: false, message: 'scheduleId required', logs },
        { status: 400 }
      );
    }

    logs.push(`✅ Schedule ID: ${scheduleId}`);

    // 3️⃣ Connect to database
    logs.push('🗄️  Step 3: Connecting to database...');
    await connectDB();
    logs.push('✅ Database connected');

    // 4️⃣ Fetch schedule from database
    logs.push('📚 Step 4: Fetching schedule...');
    const db = mongoose.connection.getClient().db('swaryoga_admin_crm');
    const schedulesCollection = db.collection('sadhana_schedules');

    let schedule;
    try {
      schedule = await schedulesCollection.findOne({
        _id: new mongoose.Types.ObjectId(scheduleId),
      });
    } catch (e) {
      logs.push(`❌ Invalid schedule ID format: ${scheduleId}`);
      return NextResponse.json(
        { success: false, message: 'Invalid schedule ID', logs },
        { status: 400 }
      );
    }

    if (!schedule) {
      logs.push('❌ Schedule not found');
      return NextResponse.json(
        { success: false, message: 'Schedule not found', logs },
        { status: 404 }
      );
    }

    logs.push(`✅ Found schedule: ${schedule.name}`);
    logs.push(`   - Zoom Link: ${schedule.zoomLink ? '✅ Yes' : '❌ No'}`);
    logs.push(`   - Video URL: ${schedule.videoUrl ? '✅ Yes' : '❌ No'}`);
    logs.push(
      `   - Bot Name: ${schedule.botName || 'Swar Sadhana (default)'}`
    );
    logs.push(
      `   - Bot Automation: ${schedule.enableBotAutomation ? '✅ Enabled' : '❌ Disabled'}`
    );

    // 5️⃣ Validate schedule configuration
    logs.push('✔️  Step 5: Validating schedule configuration...');
    if (!schedule.zoomLink && !schedule.zoomId) {
      logs.push('❌ No Zoom link or ID configured');
      return NextResponse.json(
        { success: false, message: 'Zoom link required', logs },
        { status: 400 }
      );
    }

    if (!schedule.enableBotAutomation) {
      logs.push('⚠️  Bot automation is disabled for this schedule');
      logs.push('   - Click the "Enable Bot Automation" toggle in Settings');
    }

    logs.push('✅ Schedule configuration valid');

    // 6️⃣ Trigger bot join
    logs.push('🤖 Step 6: Triggering bot join...');
    logs.push(`   - Meeting URL: ${schedule.zoomLink || schedule.zoomId}`);
    logs.push(`   - Bot Name: ${schedule.botName || 'Swar Sadhana'}`);
    logs.push(`   - Video URL: ${schedule.videoUrl || 'None'}`);

    try {
      // Extract meeting ID and password from Zoom link
      const { meetingId, password } = extractZoomDetailsFromLink(
        schedule.zoomLink || schedule.zoomId
      );

      if (!meetingId) {
        logs.push('❌ Could not extract Zoom meeting ID from link');
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid Zoom link - could not extract meeting ID',
            logs,
          },
          { status: 400 }
        );
      }

      logs.push(`   - Extracted Meeting ID: ${meetingId}`);
      logs.push(`   - Password: ${password ? '✅ Yes' : '❌ No'}`);

      if (!schedule.videoUrl) {
        logs.push('❌ Schedule has no video URL configured');
        return NextResponse.json({ success: false, message: 'No video URL configured', logs }, { status: 400 });
      }

      // Real Zoom Meeting SDK bot (runs on a dedicated VPS) — joins the
      // meeting, posts a chat message, and plays the video with audio via
      // the SDK's raw-data APIs. See lib/crm/zoomMeetingSdkBot.ts for why
      // this replaced the old REST-based botJoinMeeting (which called Zoom
      // endpoints that don't actually exist for injecting a participant).
      const botResult = await startSadhanaBot({
        meetingNumber: meetingId,
        meetingPassword: password || schedule.zoomPassword || '',
        botName: schedule.botName || 'Swar Sadhana',
        videoUrl: schedule.videoUrl,
        chatMessage: `🧘 Test trigger for "${schedule.name}" — Namaste 🙏`,
        durationMinutes: schedule.videoDuration || 40,
      });

      if (!botResult.success) {
        logs.push(`❌ Bot join failed: ${botResult.error}`);
        return NextResponse.json({ success: false, message: botResult.error || 'Bot join failed', logs }, { status: 400 });
      }

      logs.push(`✅ Bot join triggered successfully (pid ${botResult.pid})`);
    } catch (botError: any) {
      const errorMsg = botError?.message || String(botError);
      logs.push(`❌ Bot join failed: ${errorMsg}`);
      
      // Log full error for debugging
      console.error('[test-bot] Bot error details:', botError);
      
      // Provide helpful guidance based on error type
      let helpMessage = errorMsg;
      if (errorMsg.includes('Zoom API rejected credentials')) {
        helpMessage = 'Zoom credentials are invalid or expired. Please verify ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in environment variables.';
      } else if (errorMsg.includes('Cannot reach Zoom API')) {
        helpMessage = 'Cannot reach Zoom API - network or firewall issue. Check your internet connection.';
      } else if (errorMsg.includes('Zoom account forbidden')) {
        helpMessage = 'Zoom account forbidden - check that ZOOM_ACCOUNT_ID matches your Zoom business account.';
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        helpMessage = `Zoom meeting (ID: ${extractZoomDetailsFromLink(schedule.zoomLink || schedule.zoomId).meetingId}) not found or not active. Make sure the Zoom meeting is currently running before testing the bot.`;
      } else if (errorMsg.includes('Authentication failed')) {
        helpMessage = 'Zoom authentication failed. Check if ZOOM credentials are correctly configured in environment variables.';
      }
      
      return NextResponse.json(
        {
          success: false,
          message: helpMessage,
          logs,
        },
        { status: 400 }
      );
    }

    // 7️⃣ Success response
    logs.push('✅ Test trigger completed');
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
    
    return NextResponse.json(
      {
        success: false,
        message: 'Test trigger failed',
        logs,
        error: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
      },
      { status: 500 }
    );
  }
}
