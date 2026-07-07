/**
 * Sadhana Recording Service - Auto-Record & Upload Sessions
 * Handles Zoom recording auto-download and storage in Bunny CDN
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const ZOOM_API_BASE = 'https://zoom.us/api/v2';
const RECORDING_DIR = process.env.RECORDING_DIR || '/var/sadhana/recordings';

const zoomConfig = {
  accessToken: process.env.ZOOM_USER_ACCESS_TOKEN,
  userId: process.env.ZOOM_USER_ID,
};

const bunnyConfig = {
  storageZone: process.env.BUNNY_STORAGE_ZONE || 'swaryoga',
  apiKey: process.env.BUNNY_STORAGE_API_KEY,
  endpoint: process.env.BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com',
  cdnUrl: process.env.BUNNY_CDN_URL || 'https://swaryoga.b-cdn.net',
};

/**
 * Get Zoom access token
 */
async function getZoomToken(): Promise<string> {
  try {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret || !accountId) {
      throw new Error('Zoom credentials not configured');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${accountId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    return response.data.access_token;
  } catch (err) {
    console.error('[Recording] Error getting Zoom token:', err);
    throw err;
  }
}

/**
 * Get meeting recordings from Zoom
 */
export async function getMeetingRecordings(meetingId: string): Promise<any[]> {
  try {
    const token = await getZoomToken();

    const response = await axios.get(
      `${ZOOM_API_BASE}/meetings/${meetingId}/recordings`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data.recording_files || [];
  } catch (err) {
    console.error('[Recording] Error getting recordings:', err);
    return [];
  }
}

/**
 * Download recording from Zoom
 */
export async function downloadRecording(
  downloadUrl: string,
  filename: string
): Promise<{ success: boolean; filePath?: string; message: string }> {
  try {
    // Create recording directory if not exists
    if (!fs.existsSync(RECORDING_DIR)) {
      fs.mkdirSync(RECORDING_DIR, { recursive: true });
    }

    const filePath = path.join(RECORDING_DIR, filename);
    const writer = fs.createWriteStream(filePath);

    const token = await getZoomToken();

    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 300000, // 5 minutes for large files
    });

    response.data.pipe(writer);

    return new Promise((resolve) => {
      writer.on('finish', () => {
        const stats = fs.statSync(filePath);
        console.log(`[Recording] ✅ Downloaded: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
        resolve({
          success: true,
          filePath,
          message: `Recording downloaded: ${filename}`,
        });
      });

      writer.on('error', (err) => {
        console.error('[Recording] Download error:', err);
        resolve({
          success: false,
          message: `Download failed: ${err.message}`,
        });
      });
    });
  } catch (err: any) {
    console.error('[Recording] Error downloading recording:', err.message);
    return {
      success: false,
      message: `Download error: ${err.message}`,
    };
  }
}

/**
 * Upload recording to Bunny CDN
 */
export async function uploadRecordingToBunny(
  localFilePath: string,
  remoteFilename: string
): Promise<{ success: boolean; cdnUrl?: string; message: string }> {
  try {
    if (!fs.existsSync(localFilePath)) {
      return {
        success: false,
        message: 'Local file not found',
      };
    }

    if (!bunnyConfig.apiKey) {
      return {
        success: false,
        message: 'Bunny CDN not configured',
      };
    }

    const fileStream = fs.createReadStream(localFilePath);
    const stats = fs.statSync(localFilePath);

    const uploadPath = `${bunnyConfig.endpoint}/${bunnyConfig.storageZone}/recordings/${remoteFilename}`;

    const response = await axios({
      method: 'put',
      url: uploadPath,
      data: fileStream,
      headers: {
        'AccessKey': bunnyConfig.apiKey,
        'Content-Type': 'video/mp4',
        'Content-Length': stats.size,
      },
      timeout: 600000, // 10 minutes for upload
    });

    if (response.status === 201 || response.status === 200) {
      const cdnUrl = `${bunnyConfig.cdnUrl}/recordings/${remoteFilename}`;
      console.log(`[Recording] ✅ Uploaded to Bunny: ${cdnUrl}`);

      // Delete local file after successful upload
      fs.unlinkSync(localFilePath);

      return {
        success: true,
        cdnUrl,
        message: `Recording uploaded to Bunny CDN`,
      };
    }

    return {
      success: false,
      message: `Upload failed with status ${response.status}`,
    };
  } catch (err: any) {
    console.error('[Recording] Error uploading to Bunny:', err.message);
    return {
      success: false,
      message: `Upload error: ${err.message}`,
    };
  }
}

/**
 * Process recording - download and upload to Bunny
 */
export async function processRecording(
  meetingId: string,
  recordingFile: any,
  sessionInfo: {
    programName: string;
    date: string;
    timeSlot: string;
  }
): Promise<{ success: boolean; cdnUrl?: string; message: string }> {
  try {
    console.log(`[Recording] 🎬 Processing recording: ${recordingFile.id}`);

    // Generate filename
    const timestamp = new Date().getTime();
    const safeFilename = `${sessionInfo.programName}-${sessionInfo.date}-${sessionInfo.timeSlot}-${timestamp}.mp4`.replace(/\s+/g, '-');

    // Step 1: Download from Zoom
    console.log(`[Recording] 📥 Downloading from Zoom...`);
    const downloadResult = await downloadRecording(
      recordingFile.download_url,
      safeFilename
    );

    if (!downloadResult.success || !downloadResult.filePath) {
      return downloadResult;
    }

    // Step 2: Upload to Bunny
    console.log(`[Recording] 📤 Uploading to Bunny CDN...`);
    const uploadResult = await uploadRecordingToBunny(
      downloadResult.filePath,
      safeFilename
    );

    return uploadResult;
  } catch (err) {
    console.error('[Recording] Error processing recording:', err);
    return {
      success: false,
      message: `Processing failed: ${err}`,
    };
  }
}

/**
 * Auto-process all new recordings for a meeting
 */
export async function autoProcessMeetingRecordings(
  meetingId: string,
  sessionInfo: any
): Promise<any> {
  try {
    console.log(`[Recording] 🔄 Auto-processing recordings for meeting ${meetingId}`);

    const recordings = await getMeetingRecordings(meetingId);

    if (recordings.length === 0) {
      console.log('[Recording] No recordings found');
      return {
        success: true,
        processedCount: 0,
        message: 'No new recordings',
      };
    }

    const results = [];

    for (const recording of recordings) {
      const result = await processRecording(meetingId, recording, sessionInfo);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Recording] ✅ Processed ${successCount}/${recordings.length} recordings`);

    return {
      success: true,
      processedCount: successCount,
      results,
      message: `Processed ${successCount} recordings`,
    };
  } catch (err) {
    console.error('[Recording] Error auto-processing:', err);
    return {
      success: false,
      message: `Auto-process failed: ${err}`,
    };
  }
}

/**
 * Get recording list from Bunny
 */
export async function getRecordingsList(): Promise<any[]> {
  try {
    if (!bunnyConfig.apiKey) {
      return [];
    }

    const response = await axios.get(
      `${bunnyConfig.endpoint}/${bunnyConfig.storageZone}/recordings/?list=true`,
      {
        headers: {
          'AccessKey': bunnyConfig.apiKey,
        },
      }
    );

    return response.data || [];
  } catch (err) {
    console.error('[Recording] Error getting recordings list:', err);
    return [];
  }
}

/**
 * Delete recording from Bunny
 */
export async function deleteRecording(filename: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!bunnyConfig.apiKey) {
      return {
        success: false,
        message: 'Bunny CDN not configured',
      };
    }

    await axios.delete(
      `${bunnyConfig.endpoint}/${bunnyConfig.storageZone}/recordings/${filename}`,
      {
        headers: {
          'AccessKey': bunnyConfig.apiKey,
        },
      }
    );

    console.log(`[Recording] ✅ Deleted: ${filename}`);

    return {
      success: true,
      message: `Recording deleted`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Delete failed: ${err.message}`,
    };
  }
}

export default {
  getMeetingRecordings,
  downloadRecording,
  uploadRecordingToBunny,
  processRecording,
  autoProcessMeetingRecordings,
  getRecordingsList,
  deleteRecording,
};
