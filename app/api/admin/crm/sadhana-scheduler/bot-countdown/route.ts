import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/crm/sadhana-scheduler/bot-countdown
 * Handles bot join (3 min before) and countdown display
 * Called automatically or manually for testing
 */
export async function POST(request: NextRequest) {
  try {
    const { meetingId, scheduleId, action } = await request.json();

    if (!meetingId || !action) {
      return NextResponse.json(
        { error: 'Missing meetingId or action' },
        { status: 400 }
      );
    }

    console.log(`[Bot Countdown] Action: ${action} for meeting ${meetingId}`);

    // Get Zoom access token
    const token = await getZoomAccessToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to get Zoom access token' },
        { status: 500 }
      );
    }

    if (action === 'bot-join') {
      // Bot joins 3 minutes before (with name "Swaryoga Bot")
      console.log('[Bot Countdown] 🤖 Bot joining meeting...');
      
      const joinResponse = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            registrants: [
              {
                email: 'swarbot@swaryoga.com',
                first_name: 'Swaryoga',
                last_name: 'Bot',
              }
            ]
          }),
        }
      );

      if (!joinResponse.ok) {
        const errorText = await joinResponse.text();
        console.warn(`[Bot Countdown] Bot join: ${joinResponse.status}`, errorText);
      }

      console.log('[Bot Countdown] ✅ Bot registered (will auto-join)');
      
      return NextResponse.json({
        success: true,
        message: 'Bot joining for countdown',
        action: 'bot-join'
      });

    } else if (action === 'countdown') {
      // Send countdown message to meeting chat
      const { countdownSeconds } = await request.json();
      const seconds = countdownSeconds || 179; // Default 2:59

      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      const message = seconds <= 0 
        ? '🎥 VIDEO STARTING NOW! 🚀' 
        : `⏳ Video starting in ${timeString}...`;

      console.log(`[Bot Countdown] Sending: ${message}`);

      const msgResponse = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            to: 'all'
          }),
        }
      );

      if (!msgResponse.ok) {
        console.warn(`[Bot Countdown] Message send: ${msgResponse.status}`);
        // Continue even if message fails
      }

      return NextResponse.json({
        success: true,
        message,
        countdown: timeString,
        action: 'countdown'
      });

    } else if (action === 'video-start') {
      // Start video playing in meeting
      console.log('[Bot Countdown] 🎬 Starting video stream...');

      // Send "VIDEO STARTING" message
      await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: '🎥 VIDEO STARTING NOW! 🚀',
            to: 'all'
          }),
        }
      ).catch(e => console.warn('[Bot Countdown] Video start message failed:', e.message));

      return NextResponse.json({
        success: true,
        message: 'Video start initiated',
        action: 'video-start'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[Bot Countdown] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * Get Zoom OAuth Access Token
 */
async function getZoomAccessToken(): Promise<string | null> {
  try {
    const accountId = process.env.ZOOM_BOT_ACCOUNT_ID;
    const clientId = process.env.ZOOM_BOT_CLIENT_ID;
    const clientSecret = process.env.ZOOM_BOT_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      console.error('[Zoom] Missing credentials');
      return null;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=account_credentials&account_id=${accountId}`,
    });

    if (!response.ok) {
      console.error(`[Zoom] Token failed: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[Zoom] Token error:', error);
    return null;
  }
}
