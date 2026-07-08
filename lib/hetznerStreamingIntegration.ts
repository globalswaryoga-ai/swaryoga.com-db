/**
 * Hetzner Streaming Integration
 * Handles automatic streaming from Bunny HLS to Zoom via Hetzner Docker container
 */

import axios from 'axios';

interface StreamingConfig {
  meetingId: string;
  hlsUrl: string;
  duration: number; // in minutes
  rtmpUrl?: string;
  programName?: string;
  scheduleId?: string;
  startTime?: number; // Start video from this many seconds (for late joins)
}

interface StreamingResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  sessionId?: string;
}

// Hetzner API Configuration
const HETZNER_API_URL = process.env.HETZNER_STREAMING_URL || 'http://5.223.65.159:3001';
const HETZNER_TIMEOUT = parseInt(process.env.HETZNER_STREAMING_TIMEOUT || '30000', 10);

/**
 * Start streaming from Bunny HLS to Zoom via Hetzner
 */
export async function startHetznerStream(config: StreamingConfig): Promise<StreamingResponse> {
  try {
    console.log(`[HetznerStreaming] 🎬 Starting stream for meeting: ${config.meetingId}`);
    console.log(`[HetznerStreaming] 📹 HLS URL: ${config.hlsUrl}`);
    console.log(`[HetznerStreaming] ⏱️ Duration: ${config.duration} minutes`);
    console.log(`[HetznerStreaming] 📡 Hetzner API: ${HETZNER_API_URL}`);

    // Validate configuration
    if (!config.meetingId || !config.hlsUrl || !config.duration) {
      const error = 'Missing required configuration: meetingId, hlsUrl, or duration';
      console.error(`[HetznerStreaming] ❌ ${error}`);
      return { success: false, error };
    }

    // Prepare request payload
    const payload: any = {
      meetingId: config.meetingId,
      hlsUrl: config.hlsUrl,
      duration: config.duration,
      rtmpUrl: config.rtmpUrl || `rtmp://stream.zoom.us/apple/${config.meetingId}`,
    };

    if (config.startTime && config.startTime > 0) {
      payload.startTime = config.startTime; // Skip to this many seconds
      console.log(`[HetznerStreaming] ⏩ Starting video from ${Math.floor(config.startTime / 60)} minutes (late join)`);
    }

    console.log(`[HetznerStreaming] 📤 Sending request to Hetzner...`);

    // Call Hetzner streaming API
    const response = await axios.post(`${HETZNER_API_URL}/api/start-stream`, payload, {
      timeout: HETZNER_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      console.log(`[HetznerStreaming] ✅ Stream started successfully!`);
      console.log(`[HetznerStreaming] 📝 Session ID: ${response.data.data?.sessionId}`);
      console.log(`[HetznerStreaming] 📊 Meeting ID: ${response.data.data?.meetingId}`);
      console.log(`[HetznerStreaming] 🎯 Status: ${response.data.data?.status}`);

      return {
        success: true,
        message: 'Stream started successfully',
        data: response.data.data,
        sessionId: response.data.data?.sessionId,
      };
    } else {
      const error = response.data.error || 'Unknown error from Hetzner API';
      console.error(`[HetznerStreaming] ❌ ${error}`);
      return { success: false, error };
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    console.error(`[HetznerStreaming] ❌ Error starting stream: ${errorMessage}`);
    console.error(`[HetznerStreaming] 📋 Error details:`, error.response?.data || error.message);

    return {
      success: false,
      error: `Failed to start streaming: ${errorMessage}`,
    };
  }
}

/**
 * Stop streaming
 */
export async function stopHetznerStream(meetingId: string): Promise<StreamingResponse> {
  try {
    console.log(`[HetznerStreaming] 🛑 Stopping stream for meeting: ${meetingId}`);

    const response = await axios.post(
      `${HETZNER_API_URL}/api/stop-stream`,
      { meetingId },
      { timeout: HETZNER_TIMEOUT }
    );

    if (response.data.success) {
      console.log(`[HetznerStreaming] ✅ Stream stopped successfully`);
      return {
        success: true,
        message: 'Stream stopped successfully',
        data: response.data.data,
      };
    } else {
      return { success: false, error: response.data.error };
    }
  } catch (error: any) {
    console.error(`[HetznerStreaming] ❌ Error stopping stream:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get stream status
 */
export async function getHetznerStreamStatus(meetingId: string): Promise<StreamingResponse> {
  try {
    console.log(`[HetznerStreaming] 📊 Checking status for meeting: ${meetingId}`);

    const response = await axios.get(
      `${HETZNER_API_URL}/api/stream-status?meetingId=${meetingId}`,
      { timeout: HETZNER_TIMEOUT }
    );

    if (response.data.success) {
      console.log(`[HetznerStreaming] ✅ Status retrieved: ${response.data.data?.status}`);
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      return { success: false, error: response.data.error };
    }
  } catch (error: any) {
    console.error(`[HetznerStreaming] ❌ Error getting status:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active streams
 */
export async function listHetznerStreams(): Promise<StreamingResponse> {
  try {
    console.log(`[HetznerStreaming] 📋 Fetching active streams...`);

    const response = await axios.get(`${HETZNER_API_URL}/api/streams`, {
      timeout: HETZNER_TIMEOUT,
    });

    if (response.data.success) {
      console.log(`[HetznerStreaming] ✅ Found ${response.data.count} active streams`);
      return {
        success: true,
        data: response.data,
      };
    } else {
      return { success: false, error: response.data.error };
    }
  } catch (error: any) {
    console.error(`[HetznerStreaming] ❌ Error listing streams:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Health check - verify Hetzner service is running
 */
export async function checkHetznerHealth(): Promise<boolean> {
  try {
    console.log(`[HetznerStreaming] 🏥 Health check: ${HETZNER_API_URL}`);

    const response = await axios.get(`${HETZNER_API_URL}/health`, {
      timeout: 10000,
    });

    if (response.data.status === 'ok') {
      console.log(`[HetznerStreaming] ✅ Hetzner service is healthy`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error(`[HetznerStreaming] ❌ Health check failed:`, error.message);
    return false;
  }
}

/**
 * Start streaming for Sadhana program
 * Called by CRM scheduler
 */
export async function startSadhanaStream(programData: any): Promise<StreamingResponse> {
  try {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║   🎬 STARTING SADHANA STREAM              ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);

    // Extract meeting ID from zoom link or use provided meeting ID
    let meetingId = programData.meetingId;
    if (!meetingId && programData.zoomLink) {
      const match = programData.zoomLink.match(/j\/(\d+)/);
      meetingId = match ? match[1] : null;
    }

    if (!meetingId) {
      return { success: false, error: 'No meeting ID found' };
    }

    // Extract HLS URL from program data
    const hlsUrl = programData.hlsUrl || programData.videoUrl;
    if (!hlsUrl) {
      return { success: false, error: 'No HLS URL found' };
    }

    // Call Hetzner streaming API
    const config: StreamingConfig = {
      meetingId,
      hlsUrl,
      duration: programData.duration || 40,
      rtmpUrl: `rtmp://stream.zoom.us/apple/${meetingId}`,
      programName: programData.programName || programData.topic,
      scheduleId: programData.scheduleId,
    };

    console.log(`[Sadhana] 📺 Program: ${config.programName}`);
    console.log(`[Sadhana] 🎯 Meeting ID: ${config.meetingId}`);
    console.log(`[Sadhana] 📹 HLS Source: ${config.hlsUrl}`);
    console.log(`[Sadhana] ⏱️ Duration: ${config.duration} minutes\n`);

    const result = await startHetznerStream(config);

    if (result.success) {
      console.log(`\n✅ SADHANA STREAM STARTED!\n`);
      console.log(`📊 Session ID: ${result.sessionId}`);
      console.log(`🎬 Status: LIVE`);
      console.log(`⏰ Auto-stop in ${config.duration} minutes\n`);
    } else {
      console.log(`\n❌ FAILED TO START STREAM!\n`);
      console.log(`Error: ${result.error}\n`);
    }

    return result;
  } catch (error: any) {
    console.error(`[Sadhana] ❌ Error starting Sadhana stream:`, error.message);
    return { success: false, error: error.message };
  }
}

export default {
  startHetznerStream,
  stopHetznerStream,
  getHetznerStreamStatus,
  listHetznerStreams,
  checkHetznerHealth,
  startSadhanaStream,
};
