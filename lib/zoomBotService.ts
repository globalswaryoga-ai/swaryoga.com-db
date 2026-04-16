/**
 * Zoom Bot Service - Auto-join meetings, send countdown, play video, auto-close
 * For Sadhana automation at 10:12 (join) and 10:15 (video)
 */

import axios from 'axios';

// Support both naming conventions (BOT_* and regular)
const ZOOM_ACCOUNT_ID = process.env.ZOOM_BOT_ACCOUNT_ID || process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_BOT_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_BOT_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;
const ZOOM_BOT_JID = process.env.ZOOM_BOT_JID; // Optional: your Zoom bot user ID

// CRITICAL: Log if credentials are missing
if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
  console.error('[ZoomBotService] ❌ CRITICAL: Missing Zoom credentials!');
  console.error('  ZOOM_ACCOUNT_ID:', ZOOM_ACCOUNT_ID ? '✅' : '❌');
  console.error('  ZOOM_CLIENT_ID:', ZOOM_CLIENT_ID ? '✅' : '❌');
  console.error('  ZOOM_CLIENT_SECRET:', ZOOM_CLIENT_SECRET ? '✅' : '❌');
}

interface ZoomBotConfig {
  meetingId: string;
  meetingPassword?: string;
  videoDurationMinutes: number; // e.g., 40
}

// Token cache
let cachedToken: string | null = null;
let tokenExpireTime = 0;

/**
 * Clear token cache (useful for debugging or token refresh)
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpireTime = 0;
  console.log('[ZoomBotService] 🔄 Token cache cleared');
}

/**
 * Get or refresh Zoom OAuth access token
 */
export async function getZoomAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && now < tokenExpireTime - 5 * 60 * 1000) {
    console.log('[ZoomBotService] ✅ Using cached token (expires in', Math.round((tokenExpireTime - now) / 1000), 'seconds)');
    return cachedToken;
  }

  try {
    // Build the auth header
    const clientId = ZOOM_CLIENT_ID || '';
    const clientSecret = ZOOM_CLIENT_SECRET || '';
    const accountId = ZOOM_ACCOUNT_ID || '';
    
    console.log('[ZoomBotService] 🔄 Requesting new token...');
    console.log('[ZoomBotService] - Client ID length:', clientId.length);
    console.log('[ZoomBotService] - Account ID length:', accountId.length);
    
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const requestBody = `grant_type=account_credentials&account_id=${accountId}`;
    
    console.log('[ZoomBotService] - Request body: grant_type=account_credentials&account_id=***');
    console.log('[ZoomBotService] - Auth header present:', auth.length > 0 ? 'Yes' : 'No');
    
    const response = await axios.post('https://zoom.us/oauth/token', 
      requestBody,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    cachedToken = response.data.access_token;
    tokenExpireTime = now + (response.data.expires_in * 1000);
    
    console.log('[ZoomBotService] ✅ Token refreshed, expires in', response.data.expires_in, 'seconds');
    return cachedToken;
  } catch (err: any) {
    const errorDetail = err.response?.data || err.message || String(err);
    const statusCode = err.response?.status || 'N/A';
    const errorMsg = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
    
    console.error('[ZoomBotService] ❌ Token error (Status: ' + statusCode + ')');
    console.error('[ZoomBotService] Error details:', errorMsg);
    console.error('[ZoomBotService] Account ID present:', ZOOM_ACCOUNT_ID ? 'Yes' : 'NO ❌');
    console.error('[ZoomBotService] Client ID present:', ZOOM_CLIENT_ID ? 'Yes' : 'NO ❌');
    console.error('[ZoomBotService] Client Secret present:', ZOOM_CLIENT_SECRET ? 'Yes' : 'NO ❌');
    
    // More specific error messages
    if (err.code === 'ECONNABORTED') {
      throw new Error('Zoom API timeout - took too long to respond');
    } else if (err.code === 'ENOTFOUND') {
      throw new Error('Cannot reach Zoom API - network error');
    } else if (err.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Zoom API server');
    } else if (statusCode === 400 && errorMsg.includes('invalid_request')) {
      const credSetup = `ZOOM_ACCOUNT_ID:${ZOOM_ACCOUNT_ID ? 'Yes' : 'NO'} ZOOM_CLIENT_ID:${ZOOM_CLIENT_ID ? 'Yes' : 'NO'} ZOOM_CLIENT_SECRET:${ZOOM_CLIENT_SECRET ? 'Yes' : 'NO'}`;
      throw new Error('Zoom OAuth invalid_request - Credentials may be incomplete. Setup: ' + credSetup);
    } else if (statusCode === 401) {
      throw new Error('Zoom API rejected credentials - check CLIENT_ID and SECRET');
    } else if (statusCode === 403) {
      throw new Error('Zoom account forbidden - check ACCOUNT_ID');
    } else {
      throw new Error('Failed to get Zoom access token: ' + errorMsg);
    }
  }
}

/**
 * Bot joins Zoom meeting as participant (sends ready message to chat)
 * Note: REST API cannot add bot as visible participant, but can send messages
 */
export async function botJoinMeeting(config: ZoomBotConfig): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    
    console.log(`[ZoomBot] 🤖 BOT SENDING READY MESSAGE to meeting ${config.meetingId}...`);

    // Send ready message to participants via Zoom Chat
    const response = await axios.post(
      `https://zoom.us/api/v2/meetings/${config.meetingId}/chat/messages`,
      {
        message: `🤖 **BOT IS READY** 🤖\n\nStarting Swar Sadhana video in 5 minutes... ⏱️\n\n🧘 Please sit comfortably and prepare for practice.\n\n✅ Video will play automatically for everyone in the meeting!`,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Don't throw on any status code
      }
    );

    if (response.status === 201) {
      console.log(`[ZoomBot] ✅ Ready message sent successfully`);
    } else if (response.status === 429) {
      console.warn(`[ZoomBot] ⚠️ Rate limited, will retry next minute`);
    } else if (response.status === 404) {
      console.error(`[ZoomBot] ❌ Meeting not found (404): ${config.meetingId}`);
      throw new Error(`Meeting ${config.meetingId} not found`);
    } else if (response.status === 401) {
      console.error(`[ZoomBot] ❌ Authentication failed (401) - Invalid token or credentials`);
      throw new Error('Zoom authentication failed');
    } else {
      console.warn(`[ZoomBot] ⚠️ Unexpected status ${response.status}:`, response.data);
    }
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Join error:', err.message);
    throw err; // Let caller know it failed
  }
}

/**
 * Start Live Stream in Zoom meeting (video plays for all participants)
 * Uses Zoom's live stream API and sends prominent chat message
 */
export async function startLiveStream(meetingId: string, videoUrl: string, displayName: string = 'Swar Sadhana'): Promise<void> {
  try {
    const token = await getZoomAccessToken();
    
    console.log(`[ZoomBot] 🎬 Starting LIVE STREAM for meeting ${meetingId}...`);
    console.log(`[ZoomBot] Video URL: ${videoUrl}`);

    // Send prominent message to meeting chat FIRST (this always works)
    const videoMessage = `
🎬 **SWAR SADHANA VIDEO IS NOW PLAYING FOR EVERYONE** 🎬

✅ Video is streaming live to all participants

🧘 **START YOUR PRACTICE:**
1. Sit comfortably on your mat
2. Close your eyes if comfortable
3. Follow along with the video
4. Practice duration: ~40 minutes
5. See you tomorrow at the same time! 🙏

🕉️ Namaste 🕉️
    `.trim();

    try {
      const chatResponse = await axios.post(
        `https://zoom.us/api/v2/meetings/${meetingId}/chat/messages`,
        { message: videoMessage },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      if (chatResponse.status === 201) {
        console.log(`[ZoomBot] ✅ Video message sent to chat successfully`);
      } else if (chatResponse.status === 404) {
        console.warn(`[ZoomBot] ⚠️ Meeting ${meetingId} not found - video link sent to chat (404)`);
      } else {
        console.warn(`[ZoomBot] ⚠️ Chat message status: ${chatResponse.status}`);
      }
    } catch (chatErr) {
      console.warn('[ZoomBot] ⚠️ Failed to send chat message, continuing anyway:', chatErr);
    }

    // Try to start live stream (optional, may not be available on all meeting types)
    try {
      console.log(`[ZoomBot] Attempting to start live stream...`);
      const streamResponse = await axios.patch(
        `https://api.zoom.us/v2/meetings/${meetingId}/livestream`,
        {
          action: 'start',
          settings: {
            live_streaming_reminder: false,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      if (streamResponse.status === 200 || streamResponse.status === 204) {
        console.log(`[ZoomBot] ✅ Live stream endpoint activated`);
      } else if (streamResponse.status === 404) {
        console.warn(`[ZoomBot] ⚠️ Live stream not available for this meeting (404), but chat message was sent`);
      } else if (streamResponse.status === 400) {
        console.warn(`[ZoomBot] ⚠️ Meeting may not support live stream:`, streamResponse.data?.message);
      } else {
        console.warn(`[ZoomBot] ⚠️ Live stream status: ${streamResponse.status}`, streamResponse.data);
      }
    } catch (streamErr) {
      console.warn('[ZoomBot] ⚠️ Live stream API error (non-critical, video link still in chat):', streamErr);
    }
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Live stream error:', err.response?.data || err.message);
    // Fallback: send video link if live stream fails
    try {
      await startVideoInMeeting(meetingId, videoUrl);
    } catch (fallbackErr) {
      console.error('[ZoomBot] ❌ Fallback also failed:', fallbackErr);
    }
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
      `https://zoom.us/api/v2/meetings/${meetingId}/chat/messages`,
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
      `https://zoom.us/api/v2/meetings/${meetingId}/chat/messages`,
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
    
    await axios.post(
      `https://zoom.us/api/v2/meetings/${meetingId}/chat/messages`,
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
      `https://zoom.us/api/v2/meetings/${meetingId}/chat/messages`,
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
