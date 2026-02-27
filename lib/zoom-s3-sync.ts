/**
 * Zoom Recording → Bunny Stream Sync Utility
 * Downloads Zoom cloud recordings and uploads directly to Bunny Stream CDN.
 * Groups multi-day recurring meeting recordings by date → assigns day numbers.
 * Only syncs: speaker_view and gallery_view MP4 files.
 */

import { uploadToBunnyStream, generateBunnyTitle, isBunnyConfigured } from './bunny-stream';

// Zoom recording types we want to sync
const ALLOWED_RECORDING_TYPES = [
  'speaker_view',      // Speaker view recording
  'gallery_view',      // Gallery view (includes screen share overlay)
  'shared_screen_with_speaker_view', // Screen share with speaker
  'shared_screen_with_gallery_view', // Screen share with gallery
];

/** Progress callback signature for streaming updates */
export type SyncProgressCallback = (event: SyncProgressEvent) => void;

export interface SyncProgressEvent {
  type: 'start' | 'downloading' | 'uploading' | 'done' | 'error' | 'complete';
  fileIndex: number;      // current file (0-based)
  totalFiles: number;     // total files to sync
  recordingType: string;  // e.g. 'speaker_view'
  dayNumber: number;
  fileSizeMB: number;
  message: string;
  percent: number;        // 0-100 overall progress
}

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

export interface SyncedFile {
  recordingType: string;
  fileSize: number;
  bunnyVideoId: string;
  bunnyEmbedUrl: string;
  dayNumber: number;       // Which session day (1-based)
  recordingDate: string;   // ISO date string of the recording
  /** @deprecated kept for backward compat with old sync-recordings route */
  s3Key: string;
  /** @deprecated kept for backward compat */
  s3Url: string;
}

export interface SyncResult {
  success: boolean;
  syncedFiles: SyncedFile[];
  skippedFiles: string[];
  errors: string[];
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
 * Group recording files by date to identify which "day" each belongs to.
 * Zoom recurring meetings have multiple recording_files with different recording_start dates.
 * Returns a map: dateStr → dayNumber (1-based, sorted chronologically).
 */
function buildDayMap(files: ZoomRecording[]): Map<string, number> {
  const dates = new Set<string>();
  for (const f of files) {
    if (f.recording_start) {
      dates.add(f.recording_start.split('T')[0]); // YYYY-MM-DD
    }
  }
  const sorted = [...dates].sort(); // chronological
  const map = new Map<string, number>();
  sorted.forEach((d, i) => map.set(d, i + 1));
  return map;
}

/**
 * Download Zoom recordings and upload directly to Bunny Stream.
 * Groups by date to assign correct day numbers for multi-day workshops.
 *
 * @alias syncZoomRecordingsToS3 — kept for backward compatibility
 */
export async function syncZoomToBunny(
  meetingRecording: ZoomMeetingRecording,
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedFiles: [],
    skippedFiles: [],
    errors: [],
  };

  const emit = (evt: Partial<SyncProgressEvent> & { type: SyncProgressEvent['type'] }) => {
    if (onProgress) {
      onProgress({
        fileIndex: 0, totalFiles: 0, recordingType: '', dayNumber: 0,
        fileSizeMB: 0, message: '', percent: 0,
        ...evt,
      });
    }
  };

  try {
    const accessToken = await getZoomAccessToken();

    // Filter to allowed MP4 recording types
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

    if (!isBunnyConfigured()) {
      throw new Error('Bunny Stream not configured (BUNNY_API_KEY / BUNNY_STREAM_LIBRARY_ID missing)');
    }

    // Build day map from all recording dates
    const dayMap = buildDayMap(recordingsToSync);
    const totalDays = dayMap.size;
    const totalFiles = recordingsToSync.length;

    console.log(`[Zoom→Bunny] Processing ${totalFiles} recordings across ${totalDays} day(s) for: ${meetingRecording.topic}`);

    emit({ type: 'start', totalFiles, message: `Starting sync: ${totalFiles} file(s) across ${totalDays} day(s)`, percent: 0 });

    // Process each recording
    for (let i = 0; i < recordingsToSync.length; i++) {
      const recording = recordingsToSync[i];
      try {
        const dateStr = recording.recording_start?.split('T')[0] || '';
        const dayNumber = dayMap.get(dateStr) || 1;
        const sizeMB = Math.round(recording.file_size / (1024 * 1024));
        const typeName = getRecordingTypeDisplayName(recording.recording_type);

        // Each file has 2 phases: download (50%) + upload (50%)
        const fileBasePercent = (i / totalFiles) * 100;
        const fileStepPercent = (1 / totalFiles) * 100;

        emit({
          type: 'downloading', fileIndex: i, totalFiles,
          recordingType: recording.recording_type, dayNumber, fileSizeMB: sizeMB,
          message: `Downloading Day ${dayNumber} ${typeName} (${sizeMB} MB)...`,
          percent: Math.round(fileBasePercent),
        });

        console.log(`[Zoom→Bunny] Day ${dayNumber}: Downloading ${recording.recording_type}...`);

        // Download from Zoom
        const buffer = await downloadZoomRecording(recording.download_url, accessToken);

        // Build title
        const bunnyTitle = totalDays > 1
          ? `${meetingRecording.topic} - Day ${dayNumber} - ${typeName} - ${dateStr}`
          : generateBunnyTitle(meetingRecording.topic, recording.recording_type, recording.recording_start);

        emit({
          type: 'uploading', fileIndex: i, totalFiles,
          recordingType: recording.recording_type, dayNumber, fileSizeMB: sizeMB,
          message: `Uploading Day ${dayNumber} ${typeName} to Bunny Stream (${sizeMB} MB)...`,
          percent: Math.round(fileBasePercent + fileStepPercent * 0.5),
        });

        console.log(`[Zoom→Bunny] Uploading to Bunny Stream: ${bunnyTitle} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

        const bunnyResult = await uploadToBunnyStream(buffer, bunnyTitle);

        if (!bunnyResult.success) {
          throw new Error(`Bunny upload failed: ${bunnyResult.error}`);
        }

        result.syncedFiles.push({
          recordingType: recording.recording_type,
          fileSize: recording.file_size,
          bunnyVideoId: bunnyResult.videoId,
          bunnyEmbedUrl: bunnyResult.embedUrl,
          dayNumber,
          recordingDate: dateStr,
          s3Key: '', // deprecated
          s3Url: '', // deprecated
        });

        emit({
          type: 'done', fileIndex: i, totalFiles,
          recordingType: recording.recording_type, dayNumber, fileSizeMB: sizeMB,
          message: `✅ Day ${dayNumber} ${typeName} uploaded successfully`,
          percent: Math.round(fileBasePercent + fileStepPercent),
        });

        console.log(`[Zoom→Bunny] ✅ Day ${dayNumber} ${recording.recording_type} → ${bunnyResult.embedUrl}`);
      } catch (err: any) {
        result.errors.push(`Failed to sync ${recording.recording_type}: ${err.message}`);
        console.error(`[Zoom→Bunny] ❌ Error syncing ${recording.recording_type}:`, err);

        emit({
          type: 'error', fileIndex: i, totalFiles,
          recordingType: recording.recording_type, dayNumber: 0, fileSizeMB: 0,
          message: `❌ Failed: ${recording.recording_type} — ${err.message}`,
          percent: Math.round(((i + 1) / totalFiles) * 100),
        });
      }
    }

    result.success = result.errors.length === 0;

    emit({ type: 'complete', totalFiles, message: `Sync complete: ${result.syncedFiles.length}/${totalFiles} files`, percent: 100 });
  } catch (err: any) {
    result.success = false;
    result.errors.push(`Sync failed: ${err.message}`);
    console.error('[Zoom→Bunny] Fatal error:', err);
    emit({ type: 'error', message: `Fatal error: ${err.message}`, percent: 0 });
  }

  return result;
}

/** backward-compat alias */
export const syncZoomRecordingsToS3 = syncZoomToBunny;

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
