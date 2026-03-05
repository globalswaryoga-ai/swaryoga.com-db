// Zoom Integration for Swar Yoga Live Workshops
import axios from 'axios';
import { uploadToS3, buildS3Path } from './aws-s3';

interface ZoomMeetingConfig {
  clientId: string;
  clientSecret: string;
  accountId: string;
}

interface ZoomMeeting {
  id: number;
  uuid: string;
  topic: string;
  startUrl: string;
  joinUrl: string;
  startTime: string;
}

interface ZoomRecording {
  id: string;
  uuid: string;
  meetingId: number;
  recordingType: string;
  recordingFiles: Array<{
    id: string;
    messageTimestamp: number;
    recordingStart: string;
    recordingEnd: string;
    fileType: string;
    fileSize: number;
    downloadUrl: string;
  }>;
}

// Load Zoom credentials from environment
const zoomConfig: ZoomMeetingConfig = {
  clientId: process.env.ZOOM_CLIENT_ID || '',
  clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
  accountId: process.env.ZOOM_ACCOUNT_ID || '',
};

// Zoom API base URL
const ZOOM_API_BASE = 'https://zoom.us/oauth/token';
const ZOOM_API_ENDPOINT = 'https://api.zoom.us/v2';

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get Zoom OAuth access token (cached until expiration)
 */
async function getZoomAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid
  if (accessToken && tokenExpiresAt > now) {
    return accessToken || '';
  }

  try {
    const auth = Buffer.from(`${zoomConfig.clientId}:${zoomConfig.clientSecret}`).toString('base64');
    const response = await axios.post(
      ZOOM_API_BASE,
      'grant_type=account_credentials&account_id=' + zoomConfig.accountId,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiresAt = now + (response.data.expires_in * 1000);

    console.log('✅ Zoom OAuth Token Acquired');
    if (!accessToken) {
      throw new Error('Zoom access token missing in response');
    }
    return accessToken;
  } catch (error) {
    console.error('❌ Zoom OAuth Error:', error);
    throw new Error('Failed to get Zoom access token');
  }
}

/**
 * Create a Zoom meeting for live workshop
 * @param topic - Workshop name/topic
 * @param startTime - ISO 8601 formatted start time
 * @param duration - Duration in minutes
 * @param password - Optional meeting password
 */
export async function createZoomMeeting(
  topic: string,
  startTime: string,
  duration: number,
  password?: string
): Promise<ZoomMeeting> {
  const token = await getZoomAccessToken();

  const meetingData = {
    topic,
    type: 2, // Scheduled meeting
    start_time: startTime,
    duration,
    timezone: 'Asia/Kolkata', // IST timezone
    password: password || generateRandomPassword(),
    settings: {
      host_video: true,
      participant_video: true,
      cn_meeting: false,
      in_meeting: true,
      join_before_host: false,
      mute_upon_entry: true,
      // Enable automatic recording to cloud
      auto_recording: 'cloud',
      recording_type: 'shared_screen_with_speaker_video',
      waiting_room: true,
      approval_type: 0, // No approval needed
    },
  };

  try {
    const response = await axios.post(
      `${ZOOM_API_ENDPOINT}/users/me/meetings`,
      meetingData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const meeting: ZoomMeeting = {
      id: response.data.id,
      uuid: response.data.uuid,
      topic: response.data.topic,
      startUrl: response.data.start_url,
      joinUrl: response.data.join_url,
      startTime: response.data.start_time,
    };

    console.log(`✅ Zoom Meeting Created: ${meeting.joinUrl}`);
    return meeting;
  } catch (error) {
    console.error('❌ Zoom Meeting Creation Error:', error);
    throw new Error('Failed to create Zoom meeting');
  }
}

/**
 * Get Zoom meeting details
 * @param meetingId - Zoom meeting ID
 */
export async function getZoomMeeting(meetingId: number): Promise<ZoomMeeting> {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.get(
      `${ZOOM_API_ENDPOINT}/meetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const meeting: ZoomMeeting = {
      id: response.data.id,
      uuid: response.data.uuid,
      topic: response.data.topic,
      startUrl: response.data.start_url,
      joinUrl: response.data.join_url,
      startTime: response.data.start_time,
    };

    return meeting;
  } catch (error) {
    console.error('❌ Zoom Get Meeting Error:', error);
    throw new Error(`Failed to get meeting details for ID: ${meetingId}`);
  }
}

/**
 * Get Zoom meeting recordings
 * @param meetingId - Zoom meeting ID
 */
export async function getZoomRecordings(meetingId: number): Promise<ZoomRecording | null> {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.get(
      `${ZOOM_API_ENDPOINT}/meetings/${meetingId}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.data.recordingFiles || response.data.recordingFiles.length === 0) {
      console.log(`⚠️  No recordings found for meeting ${meetingId}`);
      return null;
    }

    const recording: ZoomRecording = {
      id: response.data.id,
      uuid: response.data.uuid,
      meetingId: response.data.meeting_id,
      recordingType: response.data.recording_type,
      recordingFiles: response.data.recording_files || [],
    };

    console.log(`✅ Zoom Recordings Found: ${recording.recordingFiles.length} files`);
    return recording;
  } catch (error) {
    console.error('❌ Zoom Get Recordings Error:', error);
    return null;
  }
}

/**
 * Download Zoom recording and upload to AWS S3
 * @param recordingUrl - Zoom recording file download URL
 * @param workshopSlug - Workshop slug for S3 organization
 * @param language - Language of the workshop
 * @param fileName - Name for the file in S3
 */
export async function downloadAndUploadZoomRecording(
  recordingUrl: string,
  workshopSlug: string,
  language: string,
  fileName: string
): Promise<string> {
  try {
    // Download recording from Zoom with JWT token
    const token = await getZoomAccessToken();
    const response = await axios.get(recordingUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'arraybuffer',
    });

    const fileBuffer = Buffer.from(response.data);

    // Build S3 path
    const s3Path = buildS3Path('recorded-workshops', `${workshopSlug}/${language}`, fileName);

    // Upload to S3
    const s3Url = await uploadToS3(fileBuffer, s3Path, {
      acl: 'private', // Keep recordings private
      metadata: {
        'workshop': workshopSlug,
        'language': language,
        'zoom-recording': 'true',
        'downloaded-at': new Date().toISOString(),
      },
    });

    console.log(`✅ Zoom Recording Uploaded to S3: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error('❌ Download/Upload Recording Error:', error);
    throw new Error(`Failed to download and upload recording: ${fileName}`);
  }
}

/**
 * Delete Zoom meeting
 * @param meetingId - Zoom meeting ID
 */
export async function deleteZoomMeeting(meetingId: number): Promise<void> {
  const token = await getZoomAccessToken();

  try {
    await axios.delete(
      `${ZOOM_API_ENDPOINT}/meetings/${meetingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`✅ Zoom Meeting Deleted: ${meetingId}`);
  } catch (error) {
    console.error('❌ Zoom Meeting Delete Error:', error);
    throw new Error(`Failed to delete meeting: ${meetingId}`);
  }
}

/**
 * Update Zoom meeting recording settings
 * @param meetingId - Zoom meeting ID
 */
export async function updateZoomMeetingRecordingSettings(meetingId: number): Promise<void> {
  const token = await getZoomAccessToken();

  try {
    await axios.patch(
      `${ZOOM_API_ENDPOINT}/meetings/${meetingId}`,
      {
        settings: {
          auto_recording: 'cloud',
          recording_type: 'shared_screen_with_speaker_video',
          cloud_recording_available: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Zoom Recording Settings Updated: ${meetingId}`);
  } catch (error) {
    console.error('❌ Zoom Settings Update Error:', error);
    throw new Error(`Failed to update recording settings for meeting: ${meetingId}`);
  }
}

/**
 * Generate random password for Zoom meeting
 */
function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Validate Zoom webhook event (security check)
 * @param signature - Zoom webhook signature header
 * @param timestamp - Zoom webhook timestamp header
 * @param body - Webhook request body
 */
export function validateZoomWebhookSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  // This is a simplified validation - Zoom uses HMAC SHA256
  // In production, implement proper HMAC validation
  try {
    // For now, just validate that signature exists
    return signature && timestamp && body ? true : false;
  } catch {
    return false;
  }
}

export type { ZoomMeeting, ZoomRecording, ZoomMeetingConfig };
