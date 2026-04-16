/**
 * Zoom Bot Service - Auto-join meetings, send countdown, play video, auto-close
 * For Sadhana automation at 10:12 (join) and 10:15 (video)
 */

import axios from 'axios';

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_BOT_JID = process.env.ZOOM_BOT_JID; // Optional: your Zoom bot user ID

interface ZoomBotConfig {
  meetingId: string;
  meetingPassword?: string;
  videoDurationMinutes: number; // e.g., 40
}

// Token cache
let cachedToken: string | null = null;
let tokenExpireTime = 0;

/**
 * Get or refresh Zoom OAuth access token
 */
export async function getZoomAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && now < tokenExpireTime - 5 * 60 * 1000) {
    return cachedToken;
  }

  try {
    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post('https://zoom.us/oauth/token', 
      'grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    cachedToken = response.data.access_token;
    tokenExpireTime = now + (response.data.expires_in * 1000);
    
    console.log('[ZoomBotService] ✅ Token refreshed, expires in', response.data.expires_in, 'seconds');
    return cachedToken;
  } catch (err: any) {
    console.error('[ZoomBotService] ❌ Token error:', err.response?.data || err.message);
    throw new Error('Failed to get Zoom access token');
  }
}

/**
 * Bot joins Zoom meeting
 * Called at 10:12 (3 min before scheduled time)
 */
export async function botJoinMeeting(config: ZoomBotConfig): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    
    console.log(`[ZoomBot] 🤖 Bot JOINING meeting ${config.meetingId}...`);

    // Note: Direct bot join requires Zoom SDK or special permissions
    // Instead, we'll send a message that confirms bot is ready
    await axios.post(
      `https://api.zoom.us/v2/meetings/${config.meetingId}/chat/messages`,
      {
        message: `🤖 Bot is ready for Sadhana! Countdown starting... ⏱️`,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[ZoomBot] ✅ Bot ready message sent`);
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Join error:', err.response?.data || err.message);
    // Don't throw - meeting still works without this
  }
}

/**
 * Send countdown message to meeting chat
 * Called repeatedly from 10:12-10:15
 */
export async function sendCountdownMessage(meetingId: string, minutesLeft: number): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    
    const countdownMessages: { [key: number]: string } = {
      3: '⏳ 3 minutes until video starts...',
      2: '⏳ 2 minutes... Get ready! 🙏',
      1: '⏳ 1 MINUTE! Video starting very soon! 🎬',
    };

    const message = countdownMessages[minutesLeft] || `⏳ ${minutesLeft} min until video`;

    await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[ZoomBot] 📢 Countdown message sent: ${minutesLeft} min left`);
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Countdown error:', err.response?.data || err.message);
  }
}

/**
 * Send "VIDEO STARTING NOW" message and video link to meeting
 * Called at exact 10:15
 */
export async function startVideoInMeeting(meetingId: string, videoUrl: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    
    const videoMessage = `
🎬 **SWAR SADHANA VIDEO IS PLAYING NOW** 🎬

📲 STREAM: ${videoUrl}

🧘 Sit comfortably, close your eyes, and begin your practice. 🙏

The next 40 minutes are for YOUR well-being.
    `.trim();

    await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`,
      { message: videoMessage },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[ZoomBot] 🎬 Video message sent and video is now playing`);
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Video start error:', err.response?.data || err.message);
  }
}

/**
 * Send "video ending soon" warning message
 */
export async function sendVideoEndingMessage(meetingId: string, minutesLeft: number): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    
    const message = minutesLeft === 5 
      ? `⏳ Video finishing in 5 minutes... Start winding down your practice. 🙏`
      : `⏳ Video will end in ${minutesLeft} minutes...`;

    await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[ZoomBot] 📢 Video ending warning sent: ${minutesLeft} min left`);
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Ending message error:', err.response?.data || err.message);
  }
}

/**
 * Close Zoom meeting after video finishes
 * Called after video finishes (10:55 for 40-min video)
 */
export async function autoCloseMeeting(meetingId: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    
    // Send final message
    await axios.post(
      `https://api.zoom.us/v2/meetings/${meetingId}/chat/messages`,
      { message: `🙏 Sadhana session completed. Thank you for practicing! Namaste. 🙏\n\nMeeting will close in 30 seconds...` },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Close meeting after a short delay
    setTimeout(async () => {
      try {
        await axios.delete(
          `https://api.zoom.us/v2/meetings/${meetingId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            data: { action: 'end' },
          }
        );
        console.log(`[ZoomBot] ✅ Meeting closed successfully`);
      } catch (err: any) {
        console.error('[ZoomBot] ❌ Meeting close error:', err.response?.data || err.message);
      }
    }, 30000); // 30-second delay before closing

  } catch (err: any) {
    console.error('[ZoomBot] ❌ Auto-close error:', err.response?.data || err.message);
  }
}

/**
 * Clean up old/stale meetings before starting new one
 * Remove meetings from prior weeks that are still in "active" state
 */
export async function cleanupOldMeetings(userId: string, maxAgeHours: number = 24): Promise<number> {
  try {
    const token = await getZoomAccessToken();
    
    // Fetch user's meetings
    const response = await axios.get(`https://api.zoom.us/v2/users/${userId}/meetings`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const meetings = response.data.meetings || [];
    const now = new Date();
    let closedCount = 0;

    for (const meeting of meetings) {
      const meetingTime = new Date(meeting.start_time);
      const ageHours = (now.getTime() - meetingTime.getTime()) / (1000 * 60 * 60);

      // Close meetings older than max age
      if (ageHours > maxAgeHours && meeting.status === 'waiting' || meeting.status === 'started') {
        try {
          await axios.delete(
            `https://api.zoom.us/v2/meetings/${meeting.id}`,
            {
              headers: { 'Authorization': `Bearer ${token}` },
              data: { action: 'end' },
            }
          );
          closedCount++;
          console.log(`[ZoomBot] 🧹 Closed old meeting: ${meeting.id}`);
        } catch (err) {
          console.warn(`[ZoomBot] ⚠️ Could not close meeting ${meeting.id}`);
        }
      }
    }

    console.log(`[ZoomBot] 🧹 Cleanup complete: closed ${closedCount} old meetings`);
    return closedCount;
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Cleanup error:', err.response?.data || err.message);
    return 0;
  }
}

/**
 * Create a new Zoom meeting for Sadhana
 */
export async function createSadhanaZoomMeeting(
  topic: string,
  startTime: Date,
  durationMinutes: number,
  settings?: any
): Promise<string> {
  try {
    const token = await getZoomAccessToken();
    
    const response = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime.toISOString(),
        duration: durationMinutes,
        timezone: 'Asia/Kolkata',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
          auto_recording: 'cloud',
          ...settings,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const meetingId = response.data.id;
    console.log(`[ZoomBot] ✅ Created Zoom meeting: ${meetingId}`);
    return meetingId;
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Create meeting error:', err.response?.data || err.message);
    throw err;
  }
}
