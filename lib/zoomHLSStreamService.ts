/**
 * Zoom HLS Stream Service
 * Streams Bunny HLS URL directly to Zoom meeting via RTMP
 * Bot joins meeting and streams video for all participants
 */

import axios from 'axios';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

interface ZoomMeetingStream {
  meetingId: string;
  meetingPassword?: string;
  hlsUrl: string; // Bunny HLS URL: https://swaryoga.b-cdn.net/...playlist.m3u8
  duration: number; // in minutes
}

interface StreamStatus {
  status: 'idle' | 'streaming' | 'stopped' | 'error';
  meetingId?: string;
  startTime?: Date;
  hlsUrl?: string;
  ffmpegProcess?: any;
  error?: string;
}

// Store active streams
const activeStreams = new Map<string, {
  process: any;
  startTime: Date;
  duration: number;
  hlsUrl: string;
}>();

/**
 * Get Zoom access token for RTMP streaming
 */
async function getZoomToken(): Promise<string> {
  try {
    const accountId = process.env.ZOOM_BOT_ACCOUNT_ID;
    const clientId = process.env.ZOOM_BOT_CLIENT_ID;
    const clientSecret = process.env.ZOOM_BOT_CLIENT_SECRET;

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
    console.error('[HLSStream] Token error:', err);
    throw err;
  }
}

/**
 * Get Zoom meeting RTMP endpoints for streaming
 */
async function getZoomRTMPEndpoint(meetingId: string): Promise<any> {
  try {
    const token = await getZoomToken();

    const response = await axios.get(
      `https://zoom.us/api/v2/meetings/${meetingId}/livestream/status`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        validateStatus: () => true,
      }
    );

    console.log('[HLSStream] Meeting RTMP status:', response.data);
    return response.data;
  } catch (err) {
    console.error('[HLSStream] RTMP endpoint error:', err);
    throw err;
  }
}

/**
 * Enable RTMP live streaming on Zoom meeting
 */
async function enableZoomRTMP(meetingId: string): Promise<any> {
  try {
    const token = await getZoomToken();

    const response = await axios.patch(
      `https://zoom.us/api/v2/meetings/${meetingId}/livestream`,
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

    console.log('[HLSStream] RTMP enabled:', response.data);
    return response.data;
  } catch (err) {
    console.error('[HLSStream] Enable RTMP error:', err);
    throw err;
  }
}

/**
 * Start streaming Bunny HLS to Zoom via RTMP
 */
export async function startHLSStream(config: ZoomMeetingStream): Promise<StreamStatus> {
  try {
    const { meetingId, hlsUrl, duration } = config;

    console.log(`[HLSStream] 🎬 Starting HLS stream to Zoom ${meetingId}`);
    console.log(`[HLSStream] 📹 HLS URL: ${hlsUrl}`);
    console.log(`[HLSStream] ⏱️ Duration: ${duration} minutes`);

    // Step 1: Enable RTMP on meeting
    console.log('[HLSStream] Step 1: Enabling RTMP on Zoom meeting...');
    const rtmpStatus = await enableZoomRTMP(meetingId);

    if (!rtmpStatus.url) {
      console.error('[HLSStream] ❌ Failed to get RTMP URL from Zoom');
      return {
        status: 'error',
        error: 'Failed to enable RTMP on Zoom meeting',
      };
    }

    const rtmpUrl = rtmpStatus.url;
    const rtmpKey = rtmpStatus.key;
    const fullRtmpUrl = `${rtmpUrl}/${rtmpKey}`;

    console.log('[HLSStream] ✅ RTMP enabled');
    console.log(`[HLSStream] 📤 RTMP URL: ${rtmpUrl}`);

    // Step 2: Start FFmpeg to transcode HLS → RTMP
    console.log('[HLSStream] Step 2: Starting FFmpeg transcoding...');

    const ffmpegArgs = [
      '-i', hlsUrl, // Input: Bunny HLS stream
      '-c:v', 'copy', // Video codec: copy (no re-encoding for speed)
      '-c:a', 'aac', // Audio codec: AAC
      '-f', 'flv', // Output format: FLV for RTMP
      '-flvflags', 'no_duration_filesize', // FLV flags for streaming
      fullRtmpUrl, // Output: Zoom RTMP endpoint
    ];

    console.log('[HLSStream] 🎥 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: (duration + 5) * 60 * 1000, // Kill after duration + 5 min
    });

    let errorOutput = '';

    ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;
      console.log('[HLSStream] FFmpeg:', output.trim());
    });

    ffmpegProcess.stdout.on('data', (data) => {
      console.log('[HLSStream] FFmpeg stdout:', data.toString().trim());
    });

    ffmpegProcess.on('error', (err) => {
      console.error('[HLSStream] ❌ FFmpeg error:', err);
    });

    ffmpegProcess.on('exit', (code) => {
      console.log(`[HLSStream] FFmpeg exited with code ${code}`);
      activeStreams.delete(meetingId);
    });

    // Store active stream
    activeStreams.set(meetingId, {
      process: ffmpegProcess,
      startTime: new Date(),
      duration,
      hlsUrl,
    });

    // Auto-stop after duration
    const stopTimeMs = (duration + 1) * 60 * 1000;
    setTimeout(() => {
      stopHLSStream(meetingId).catch(err =>
        console.error('[HLSStream] Auto-stop error:', err)
      );
    }, stopTimeMs);

    console.log(`[HLSStream] ✅✅✅ HLS STREAM STARTED`);
    console.log(`[HLSStream] 📡 Video streaming to Zoom ${meetingId}`);
    console.log(`[HLSStream] ⏰ Will auto-stop in ${duration} minutes`);

    return {
      status: 'streaming',
      meetingId,
      startTime: new Date(),
      hlsUrl,
    };
  } catch (err: any) {
    console.error('[HLSStream] ❌ Stream start error:', err.message);
    return {
      status: 'error',
      error: err.message,
    };
  }
}

/**
 * Stop HLS stream
 */
export async function stopHLSStream(meetingId: string): Promise<StreamStatus> {
  try {
    const stream = activeStreams.get(meetingId);

    if (!stream) {
      console.warn(`[HLSStream] ⚠️ No active stream for meeting ${meetingId}`);
      return { status: 'idle' };
    }

    console.log(`[HLSStream] 🛑 Stopping stream for meeting ${meetingId}`);

    // Kill FFmpeg process
    if (stream.process && !stream.process.killed) {
      stream.process.kill('SIGTERM');
      console.log('[HLSStream] ✅ FFmpeg stopped');
    }

    activeStreams.delete(meetingId);

    return {
      status: 'stopped',
      meetingId,
    };
  } catch (err: any) {
    console.error('[HLSStream] Error stopping stream:', err.message);
    return {
      status: 'error',
      error: err.message,
    };
  }
}

/**
 * Get stream status
 */
export function getStreamStatus(meetingId: string): StreamStatus {
  const stream = activeStreams.get(meetingId);

  if (!stream) {
    return { status: 'idle' };
  }

  return {
    status: 'streaming',
    meetingId,
    startTime: stream.startTime,
    hlsUrl: stream.hlsUrl,
  };
}

/**
 * List all active streams
 */
export function listActiveStreams(): Record<string, any> {
  const streams: Record<string, any> = {};

  for (const [meetingId, stream] of activeStreams.entries()) {
    streams[meetingId] = {
      hlsUrl: stream.hlsUrl,
      startTime: stream.startTime,
      duration: stream.duration,
      elapsedMinutes: Math.round(
        (Date.now() - stream.startTime.getTime()) / 60000
      ),
      running: stream.process && !stream.process.killed,
    };
  }

  return streams;
}

export default {
  startHLSStream,
  stopHLSStream,
  getStreamStatus,
  listActiveStreams,
};
