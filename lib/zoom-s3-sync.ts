/**
 * Zoom Recording to AWS S3 Sync Utility
 * Downloads Zoom cloud recordings and uploads to S3
 * Only syncs: speaker_view and gallery_view (includes screen share)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { uploadToBunnyStream, generateBunnyTitle, isBunnyConfigured } from './bunny-stream';

// Configure AWS S3 (SDK v3)
const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  region: process.env.AWS_REGION || 'ap-south-1',
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'swarygoal1hindi';

// Zoom recording types we want to sync
const ALLOWED_RECORDING_TYPES = [
  'speaker_view',      // Speaker view recording
  'gallery_view',      // Gallery view (includes screen share overlay)
  'shared_screen_with_speaker_view', // Screen share with speaker
  'shared_screen_with_gallery_view', // Screen share with gallery
];

interface ZoomRecording {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

interface ZoomMeetingRecording {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecording[];
}

/**
 * Get Zoom OAuth access token using Server-to-Server OAuth
 */
export async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom credentials in environment variables');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Zoom access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Download recording from Zoom
 */
async function downloadZoomRecording(
  downloadUrl: string,
  accessToken: string
): Promise<Buffer> {
  // Zoom download URLs need the access token appended
  const urlWithToken = `${downloadUrl}?access_token=${accessToken}`;

  const response = await fetch(urlWithToken, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download recording: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload recording to S3
 */
async function uploadToS3(
  buffer: Buffer,
  s3Key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the S3 URL
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
}

/**
 * Generate S3 key for recording
 */
function generateS3Key(
  meetingTopic: string,
  recordingType: string,
  startTime: string,
  fileExtension: string
): string {
  // Clean topic name for use in path
  const cleanTopic = meetingTopic
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  // Format date
  const date = new Date(startTime);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // Create S3 key: zoom-recordings/YYYY-MM-DD/topic/type.ext
  return `zoom-recordings/${dateStr}/${cleanTopic}/${recordingType}.${fileExtension}`;
}

/**
 * Process and sync Zoom recordings to S3
 * Only syncs speaker_view and gallery_view
 */
export async function syncZoomRecordingsToS3(
  meetingRecording: ZoomMeetingRecording
): Promise<{
  success: boolean;
  syncedFiles: Array<{
    recordingType: string;
    s3Key: string;
    s3Url: string;
    fileSize: number;
    bunnyVideoId?: string;
    bunnyEmbedUrl?: string;
  }>;
  skippedFiles: string[];
  errors: string[];
}> {
  const result = {
    success: true,
    syncedFiles: [] as Array<{
      recordingType: string;
      s3Key: string;
      s3Url: string;
      fileSize: number;
      bunnyVideoId?: string;
      bunnyEmbedUrl?: string;
    }>,
    skippedFiles: [] as string[],
    errors: [] as string[],
  };

  try {
    // Get Zoom access token
    const accessToken = await getZoomAccessToken();

    // Filter recordings - only MP4 videos with allowed types
    const recordingsToSync = meetingRecording.recording_files.filter((file) => {
      const isAllowedType = ALLOWED_RECORDING_TYPES.includes(file.recording_type);
      const isVideo = file.file_type === 'MP4' || file.file_extension === 'MP4';

      if (!isAllowedType) {
        result.skippedFiles.push(`${file.recording_type} (not speaker/gallery view)`);
        return false;
      }
      if (!isVideo) {
        result.skippedFiles.push(`${file.recording_type} (not video: ${file.file_type})`);
        return false;
      }

      return true;
    });

    console.log(`[Zoom Sync] Processing ${recordingsToSync.length} recordings for: ${meetingRecording.topic}`);

    // Process each recording
    for (const recording of recordingsToSync) {
      try {
        console.log(`[Zoom Sync] Downloading ${recording.recording_type}...`);

        // Download from Zoom
        const buffer = await downloadZoomRecording(recording.download_url, accessToken);

        // Upload directly to Bunny Stream (primary storage + CDN)
        if (!isBunnyConfigured()) {
          throw new Error('Bunny Stream not configured (BUNNY_API_KEY / BUNNY_STREAM_LIBRARY_ID missing)');
        }

        const bunnyTitle = generateBunnyTitle(
          meetingRecording.topic,
          recording.recording_type,
          recording.recording_start
        );

        console.log(`[Zoom Sync] Uploading to Bunny Stream: ${bunnyTitle} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

        const bunnyResult = await uploadToBunnyStream(buffer, bunnyTitle);

        if (!bunnyResult.success) {
          throw new Error(`Bunny upload failed: ${bunnyResult.error}`);
        }

        result.syncedFiles.push({
          recordingType: recording.recording_type,
          s3Key: '',
          s3Url: '',
          fileSize: recording.file_size,
          bunnyVideoId: bunnyResult.videoId,
          bunnyEmbedUrl: bunnyResult.embedUrl,
        });

        console.log(`[Zoom Sync] ✅ ${recording.recording_type} → Bunny Stream: ${bunnyResult.embedUrl}`);
      } catch (err: any) {
        result.errors.push(`Failed to sync ${recording.recording_type}: ${err.message}`);
        console.error(`[Zoom Sync] ❌ Error syncing ${recording.recording_type}:`, err);
      }
    }

    result.success = result.errors.length === 0;
  } catch (err: any) {
    result.success = false;
    result.errors.push(`Sync failed: ${err.message}`);
    console.error('[Zoom Sync] Fatal error:', err);
  }

  return result;
}

/**
 * Get recording type display name
 */
export function getRecordingTypeDisplayName(type: string): string {
  const names: Record<string, string> = {
    speaker_view: 'Speaker View',
    gallery_view: 'Gallery View',
    shared_screen_with_speaker_view: 'Screen Share (Speaker)',
    shared_screen_with_gallery_view: 'Screen Share (Gallery)',
  };
  return names[type] || type;
}
