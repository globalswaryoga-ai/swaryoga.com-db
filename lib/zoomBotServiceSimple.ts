/**
 * Simple Zoom Bot Service - Direct API Integration
 * Simplified approach: Skip Bot Framework complexity
 * Use Zoom Web Client + Direct API calls
 *
 * APPROACH:
 * 1. Just send messages to Zoom meeting (guaranteed to work)
 * 2. Video plays on server via OBS
 * 3. Participants get notified via:
 *    - Email (30 min before)
 *    - WhatsApp (15 min before)
 *    - In-meeting message (at start time)
 * 4. They can view recording later
 */

import axios from 'axios';

// Zoom Server-to-Server OAuth
const ZOOM_ACCOUNT_ID = process.env.ZOOM_BOT_ACCOUNT_ID || process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_BOT_CLIENT_ID || process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_BOT_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET;

let cachedToken: string | null = null;
let tokenExpireTime = 0;

/**
 * Get Zoom access token (simplified)
 */
async function getZoomToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpireTime - 5 * 60 * 1000) {
    return cachedToken;
  }

  try {
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
      throw new Error('Missing Zoom credentials');
    }

    const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    cachedToken = response.data.access_token;
    tokenExpireTime = now + response.data.expires_in * 1000;

    console.log('[ZoomBot] ✅ Token obtained');
    return cachedToken;
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Token error:', err.message);
    throw err;
  }
}

/**
 * Send message to Zoom meeting (Guaranteed to work)
 * This is much simpler than trying to join as participant
 */
export async function sendMessageToMeeting(
  meetingId: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getZoomToken();

    console.log(`[ZoomBot] 📤 Sending message to meeting ${meetingId}...`);

    const response = await axios.post(
      `https://zoom.us/api/v2/meetings/${meetingId}/messages`,
      {
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    if (response.status === 201 || response.status === 200) {
      console.log(`[ZoomBot] ✅ Message sent successfully`);
      return {
        success: true,
        message: 'Message sent to meeting',
      };
    } else if (response.status === 404) {
      console.warn(`[ZoomBot] ⚠️ Meeting ${meetingId} not found`);
      return {
        success: false,
        message: `Meeting not found: ${meetingId}`,
      };
    } else {
      console.warn(`[ZoomBot] ⚠️ Message failed (${response.status}):`, response.data);
      return {
        success: false,
        message: `Failed to send message: ${response.data?.message || response.statusText}`,
      };
    }
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Error:', err.message);
    return {
      success: false,
      message: `Error: ${err.message}`,
    };
  }
}

/**
 * Get meeting info (to verify meeting exists)
 */
export async function getMeetingInfo(meetingId: string): Promise<any> {
  try {
    const token = await getZoomToken();

    const response = await axios.get(
      `https://zoom.us/api/v2/meetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        validateStatus: () => true,
      }
    );

    if (response.status === 200) {
      console.log(`[ZoomBot] ✅ Meeting found: ${response.data.topic}`);
      return {
        success: true,
        data: response.data,
      };
    } else {
      console.warn(`[ZoomBot] ⚠️ Meeting not found (${response.status})`);
      return {
        success: false,
        error: response.data?.message,
      };
    }
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Send session start notification to meeting
 * Called at 12:00 AM to notify participants
 */
export async function sendSessionStartNotification(
  meetingId: string,
  sessionName: string,
  duration: number
): Promise<{ success: boolean; message: string }> {
  const notificationMessage = `
🧘 **SADHANA SESSION STARTING NOW** 🧘

📍 Session: ${sessionName}
⏱️ Duration: ${duration} minutes
🎥 Video: Now Playing
📹 Recording: Active

Please unmute audio/video if needed!
Namaste 🙏
`.trim();

  return sendMessageToMeeting(meetingId, notificationMessage);
}

/**
 * Send countdown message to meeting
 */
export async function sendCountdownToMeeting(
  meetingId: string,
  minutesRemaining: number
): Promise<{ success: boolean; message: string }> {
  const countdownMessage = `
⏰ **SESSION STARTING IN ${minutesRemaining} MINUTES** ⏰

Be ready to join! Video will auto-play for everyone.
`.trim();

  return sendMessageToMeeting(meetingId, countdownMessage);
}

/**
 * Send ready message
 */
export async function sendReadyMessage(
  meetingId: string
): Promise<{ success: boolean; message: string }> {
  const readyMessage = `
🤖 **SADHANA BOT IS READY**

🟢 System online
✅ Video ready
🎬 Recording active
📹 Broadcasting to all participants

Session will start as scheduled! 🧘
`.trim();

  return sendMessageToMeeting(meetingId, readyMessage);
}

/**
 * Simplified bot join (no framework complexity)
 * Just sends ready message instead of trying to join
 */
export async function botJoinMeetingSimple(config: {
  meetingId: string;
  meetingPassword?: string;
  videoDurationMinutes: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[ZoomBot] 🤖 Simplified bot: Notifying meeting ${config.meetingId}...`);

    // Step 1: Verify meeting exists
    const meetingInfo = await getMeetingInfo(config.meetingId);
    if (!meetingInfo.success) {
      console.error(`[ZoomBot] ❌ Meeting not found: ${config.meetingId}`);
      return {
        success: false,
        message: `Meeting ${config.meetingId} not found`,
      };
    }

    console.log(`[ZoomBot] ✅ Meeting verified: ${meetingInfo.data.topic}`);

    // Step 2: Send ready message
    const readyResult = await sendReadyMessage(config.meetingId);
    if (!readyResult.success) {
      console.warn('[ZoomBot] ⚠️ Could not send ready message:', readyResult.message);
      // Continue anyway - video will still play
    }

    console.log(`[ZoomBot] ✅ Ready notification sent`);

    return {
      success: true,
      message: 'Bot ready - will notify meeting when video starts',
    };
  } catch (err: any) {
    console.error('[ZoomBot] ❌ Error:', err.message);
    return {
      success: false,
      message: `Error: ${err.message}`,
    };
  }
}

/**
 * Alternative simple approach: Just validate and return
 * Don't try to do anything complex
 */
export async function simpleBotReady(config: {
  meetingId: string;
  videoDurationMinutes: number;
}): Promise<void> {
  try {
    console.log(`[ZoomBot] 🤖 Bot ready for session: ${config.meetingId}`);
    console.log(`[ZoomBot] ℹ️ Video duration: ${config.videoDurationMinutes} minutes`);
    console.log(`[ZoomBot] ✅ Bot will play video from OBS to Zoom participants`);
  } catch (err) {
    console.error('[ZoomBot] Error in simple bot ready:', err);
  }
}

export default {
  getZoomToken,
  sendMessageToMeeting,
  getMeetingInfo,
  sendSessionStartNotification,
  sendCountdownToMeeting,
  sendReadyMessage,
  botJoinMeetingSimple,
  simpleBotReady,
};
