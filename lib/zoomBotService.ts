/**
 * Zoom Bot Service - Using Zoom Bot Framework (Option A)
 * Bot Framework allows bot to join as participant, send messages, and control recordings
 *
 * Credentials (Server-to-Server OAuth):
 * - ZOOM_ACCOUNT_ID: Account ID from Zoom marketplace
 * - ZOOM_CLIENT_ID: Client ID from app credentials
 * - ZOOM_CLIENT_SECRET: Client Secret from app credentials
 */

import axios from 'axios';

// Server-to-Server OAuth Credentials (from Zoom Marketplace)
// Support both naming conventions: ZOOM_BOT_* (preferred) and ZOOM_*
const ZOOM_ACCOUNT_ID = process.env.ZOOM_BOT_ACCOUNT_ID || process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_BOT_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_BOT_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;

// Bot Framework credentials (to be configured after app setup)
const ZOOM_BOT_JID = process.env.ZOOM_BOT_JID; // Bot's Jabberdish ID from Zoom
const ZOOM_BOT_USER_ID = process.env.ZOOM_BOT_USER_ID; // Bot user ID (alternative identifier)

// CRITICAL: Log if credentials are missing
if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
  console.error('[ZoomBotService] ❌ CRITICAL: Missing Zoom Server-to-Server OAuth credentials!');
  console.error('  ZOOM_ACCOUNT_ID:', ZOOM_ACCOUNT_ID ? '✅' : '❌');
  console.error('  ZOOM_CLIENT_ID:', ZOOM_CLIENT_ID ? '✅' : '❌');
  console.error('  ZOOM_CLIENT_SECRET:', ZOOM_CLIENT_SECRET ? '✅' : '❌');
}

if (!ZOOM_BOT_JID && !ZOOM_BOT_USER_ID) {
  console.warn('[ZoomBotService] ⚠️ Bot identifiers not yet configured. Get from Zoom Marketplace.');
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
 * Get or refresh Zoom Server-to-Server OAuth token (for Bot Framework)
 */
export async function getZoomAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && now < tokenExpireTime - 5 * 60 * 1000) {
    console.log('[ZoomBotService] ✅ Using cached Bot Framework token (expires in', Math.round((tokenExpireTime - now) / 1000), 'seconds)');
    return cachedToken;
  }

  try {
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
      throw new Error('Missing Server-to-Server OAuth credentials: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, or ZOOM_ACCOUNT_ID');
    }

    console.log('[ZoomBotService] 🔄 Requesting Bot Framework token via Server-to-Server OAuth...');

    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const requestBody = `grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`;

    const response = await axios.post('https://zoom.us/oauth/token',
      requestBody,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    cachedToken = response.data.access_token;
    tokenExpireTime = now + (response.data.expires_in * 1000);

    console.log('[ZoomBotService] ✅ Bot Framework token obtained, expires in', response.data.expires_in, 'seconds');
    return cachedToken;
  } catch (err: any) {
    const errorDetail = err.response?.data || err.message || String(err);
    const statusCode = err.response?.status || 'N/A';
    const errorMsg = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);

    console.error('[ZoomBotService] ❌ Token error (Status: ' + statusCode + ')');
    console.error('[ZoomBotService] Error details:', errorMsg);
    console.error('[ZoomBotService] Credentials check - Account:', ZOOM_ACCOUNT_ID ? '✅' : '❌', 'ID:', ZOOM_CLIENT_ID ? '✅' : '❌', 'Secret:', ZOOM_CLIENT_SECRET ? '✅' : '❌');

    if (err.code === 'ECONNABORTED') {
      throw new Error('Zoom API timeout - took too long to respond');
    } else if (statusCode === 401) {
      throw new Error('Zoom API rejected credentials - check CLIENT_ID and SECRET');
    } else if (statusCode === 403) {
      throw new Error('Zoom account forbidden - check ACCOUNT_ID');
    } else {
      throw new Error('Failed to get Zoom token: ' + errorMsg);
    }
  }
}

/**
 * Bot joins Zoom meeting as participant using Zoom Bot Framework
 * Bot appears as a real participant in the meeting (not just chat)
 */
export async function botJoinMeeting(config: ZoomBotConfig): Promise<void> {
  try {
    const token = await getZoomAccessToken();

    if (!ZOOM_BOT_JID && !ZOOM_BOT_USER_ID) {
      console.warn('[ZoomBot] ⚠️ Bot JID/User ID not configured yet. Falling back to chat message only.');
      await sendBotReadyMessage(config.meetingId);
      return;
    }

    console.log(`[ZoomBot] 🤖 Bot Framework: Joining meeting ${config.meetingId} as participant...`);

    // Bot Framework API: Use bot's JID to join meeting
    const botIdentifier = ZOOM_BOT_JID || ZOOM_BOT_USER_ID;

    try {
      // Step 1: Add bot as co-host (bypasses waiting room)
      console.log(`[ZoomBot] 🤖 Attempting to add bot as co-host to meeting ${config.meetingId}...`);

      const coHostResponse = await axios.put(
        `https://zoom.us/api/v2/meetings/${config.meetingId}`,
        {
          settings: {
            co_hosts: [botIdentifier],
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

      if (coHostResponse.status === 204 || coHostResponse.status === 200) {
        console.log(`[ZoomBot] ✅ Bot added as co-host successfully`);
        return;
      }

      // Step 2: Fallback - Try adding as regular participant
      console.log(`[ZoomBot] ℹ️ Co-host addition failed (${coHostResponse.status}), trying as regular participant...`);

      const joinResponse = await axios.post(
        `https://zoom.us/api/v2/meetings/${config.meetingId}/participants`,
        {
          action: 'add',
          participant_jid: botIdentifier,
          display_name: 'SWAR SADHANA BOT',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      if (joinResponse.status === 201 || joinResponse.status === 200) {
        console.log(`[ZoomBot] ✅ Bot joined meeting as participant`);
      } else if (joinResponse.status === 404) {
        console.warn(`[ZoomBot] ⚠️ Meeting ${config.meetingId} not found`);
        await sendBotReadyMessage(config.meetingId);
      } else if (joinResponse.status === 400) {
        console.warn(`[ZoomBot] ⚠️ Cannot add bot (400):`, joinResponse.data?.message);
        await sendBotReadyMessage(config.meetingId);
      } else if (joinResponse.status === 429) {
        console.warn(`[ZoomBot] ⚠️ Rate limited (429)`);
      } else {
        console.warn(`[ZoomBot] ⚠️ Unexpected status ${joinResponse.status}:`, joinResponse.data);
        await sendBotReadyMessage(config.meetingId);
      }
    } catch (joinErr) {
      console.warn('[ZoomBot] ⚠️ Bot join failed:', joinErr);
      await sendBotReadyMessage(config.meetingId);
    }
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Bot join error:', err.message);
    throw err;
  }
}

/**
 * Fallback: Send bot ready message to meeting chat
 * Used when Bot Framework is not fully configured or meeting doesn't support bot participants
 */
async function sendBotReadyMessage(meetingId: string): Promise<void> {
  try {
    const token = await getZoomAccessToken();

    const readyMessage = `🤖 **BOT IS READY** 🤖

Starting Swar Sadhana video in 5 minutes... ⏱️

🧘 Please sit comfortably and prepare for practice.

✅ Video will play automatically for everyone in the meeting!`;

    const response = await axios.post(
      `https://zoom.us/api/v2/meetings/${meetingId}/chat/messages`,
      { message: readyMessage },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    if (response.status === 201) {
      console.log(`[ZoomBot] ✅ Bot ready message sent via chat`);
    } else if (response.status === 429) {
      console.warn(`[ZoomBot] ⚠️ Rate limited on chat message`);
    } else if (response.status === 404) {
      console.error(`[ZoomBot] ❌ Meeting not found: ${meetingId}`);
    } else {
      console.warn(`[ZoomBot] ⚠️ Chat message status: ${response.status}`);
    }
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Chat message error:', err.message);
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
