/**
 * OBS Control Service V2 - Supports Local Files AND URLs (Bunny CDN)
 * Controls OBS for Sadhana video playback in Zoom
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// OBS WebSocket Configuration
const OBS_WEBSOCKET_HOST = process.env.OBS_WEBSOCKET_HOST || 'localhost';
const OBS_WEBSOCKET_PORT = process.env.OBS_WEBSOCKET_PORT || 4444;
const OBS_PASSWORD = process.env.OBS_PASSWORD || '';

// Virtual camera device
const VIRTUAL_CAMERA_DEVICE = '/dev/video10'; // Linux default
const VIDEO_DIRECTORY = process.env.SADHANA_VIDEO_DIR || '/var/sadhana/videos';

// Track current playback state
let currentPlaybackProcess: any = null;
let isPlayingVideo = false;
let currentVideoFile: string | null = null;

/**
 * Check if input is a URL or local file
 */
function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

/**
 * Validate video source (URL or local file)
 */
export function validateVideoSource(source: string): {
  valid: boolean;
  type: 'url' | 'file';
  exists: boolean;
  readable: boolean;
  size?: number;
} {
  if (isUrl(source)) {
    // For URLs, we assume valid if it's a proper URL format
    const isValidUrl = source.includes('bunny') || source.includes('cdn') ||
                       source.includes('youtube') || source.includes('vimeo') ||
                       source.includes('.mp4') || source.includes('.mkv');
    return {
      valid: isValidUrl,
      type: 'url',
      exists: true,
      readable: isValidUrl,
    };
  }

  // Local file validation
  try {
    if (!fs.existsSync(source)) {
      return {
        valid: false,
        type: 'file',
        exists: false,
        readable: false,
        size: 0,
      };
    }

    try {
      fs.accessSync(source, fs.constants.R_OK);
    } catch (e) {
      return {
        valid: false,
        type: 'file',
        exists: true,
        readable: false,
        size: 0,
      };
    }

    const stats = fs.statSync(source);
    const size = stats.size;

    return {
      valid: size > 1024 * 1024,
      type: 'file',
      exists: true,
      readable: true,
      size: size,
    };
  } catch (err) {
    console.error('[OBS] Video validation error:', err);
    return {
      valid: false,
      type: 'file',
      exists: false,
      readable: false,
      size: 0,
    };
  }
}

/**
 * Check if OBS is installed and running
 */
export async function checkOBSInstalled(): Promise<{
  installed: boolean;
  running: boolean;
  version?: string;
}> {
  try {
    const { stdout: obsVersion } = await execAsync('obs --version 2>/dev/null || obs-studio --version 2>/dev/null || echo ""');
    const { stdout: obsRunning } = await execAsync('pgrep -f obs || echo "not_running"');

    return {
      installed: obsVersion.length > 0,
      running: !obsRunning.includes('not_running'),
      version: obsVersion.trim(),
    };
  } catch (err) {
    console.warn('[OBS] Error checking installation:', err);
    return {
      installed: false,
      running: false,
    };
  }
}

/**
 * Check if virtual camera is available
 */
export async function checkVirtualCamera(): Promise<{
  available: boolean;
  device?: string;
  canWrite: boolean;
}> {
  try {
    const { stdout: devices } = await execAsync('ls -la /dev/video* 2>/dev/null || echo ""');
    const hasVirtualCamera = devices.includes('video10') || devices.includes('video20');

    if (hasVirtualCamera) {
      try {
        fs.accessSync(VIRTUAL_CAMERA_DEVICE, fs.constants.W_OK);
        return {
          available: true,
          device: VIRTUAL_CAMERA_DEVICE,
          canWrite: true,
        };
      } catch (e) {
        return {
          available: true,
          device: VIRTUAL_CAMERA_DEVICE,
          canWrite: false,
        };
      }
    }

    return {
      available: false,
      canWrite: false,
    };
  } catch (err) {
    console.warn('[OBS] Error checking virtual camera:', err);
    return {
      available: false,
      canWrite: false,
    };
  }
}

/**
 * Start video playback from URL or local file
 * Supports:
 * - Local files: /var/sadhana/videos/sadhana.mp4
 * - Bunny CDN: https://swaryoga.b-cdn.net/sadhana.mp4
 * - YouTube: https://youtube.com/watch?v=...
 * - Any HTTPS video URL
 */
export async function startSadhanaVideo(
  videoSource: string,
  durationMinutes: number = 40
): Promise<{
  success: boolean;
  message: string;
  pid?: number;
  type?: 'url' | 'file';
}> {
  try {
    // Validate video source
    const validation = validateVideoSource(videoSource);
    if (!validation.valid) {
      return {
        success: false,
        message: `Video source invalid: ${JSON.stringify(validation)}`,
      };
    }

    // Check virtual camera
    const camera = await checkVirtualCamera();
    if (!camera.available) {
      return {
        success: false,
        message: 'Virtual camera not available. Run: sudo modprobe v4l2loopback',
      };
    }

    if (!camera.canWrite) {
      return {
        success: false,
        message: `Cannot write to ${VIRTUAL_CAMERA_DEVICE}. Run: sudo chmod 666 ${VIRTUAL_CAMERA_DEVICE}`,
      };
    }

    // Kill any existing playback
    if (currentPlaybackProcess) {
      try {
        currentPlaybackProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.warn('[OBS] Warning killing previous process:', e);
      }
    }

    console.log(`[OBS] 🎬 Starting video playback: ${videoSource}`);
    console.log(`[OBS] 📹 Type: ${validation.type}`);
    console.log(`[OBS] 📹 Video will output to: ${VIRTUAL_CAMERA_DEVICE}`);
    console.log(`[OBS] ⏱️  Expected duration: ${durationMinutes} minutes`);

    // FFmpeg command - supports both local files and URLs
    // -re: Read input at native frame rate
    // -i: Input (can be local file or URL)
    // -f v4l2: Output format (V4L2)
    // -pix_fmt yuv420p: Pixel format
    // -s 1920x1080: Resolution
    // -r 30: Frame rate

    const ffmpegCommand = [
      'ffmpeg',
      '-re', // Read at native rate
      '-i', videoSource, // Input (URL or file)
      '-c:v', 'rawvideo', // Video codec
      '-pix_fmt', 'yuv420p', // Pixel format
      '-s', '1920x1080', // Resolution
      '-r', '30', // Frame rate
      '-c:a', 'aac', // Audio codec
      '-b:a', '128k', // Audio bitrate
      '-f', 'v4l2', // Output format
      VIRTUAL_CAMERA_DEVICE, // Output device
    ];

    console.log(`[OBS] 🔧 FFmpeg command: ${ffmpegCommand.join(' ')}`);

    // Spawn FFmpeg process
    currentPlaybackProcess = spawn('ffmpeg', ffmpegCommand.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    const pid = currentPlaybackProcess.pid;

    currentPlaybackProcess.on('error', (err: any) => {
      console.error('[OBS] FFmpeg process error:', err);
      isPlayingVideo = false;
      currentPlaybackProcess = null;
    });

    currentPlaybackProcess.on('exit', (code: number) => {
      console.log(`[OBS] ℹ️ FFmpeg exited with code: ${code}`);
      isPlayingVideo = false;
      currentPlaybackProcess = null;
    });

    // Wait for FFmpeg to initialize
    await new Promise(r => setTimeout(r, 2000));

    // Check if process started successfully
    if (!currentPlaybackProcess || currentPlaybackProcess.killed) {
      return {
        success: false,
        message: 'FFmpeg failed to start or was killed immediately',
      };
    }

    isPlayingVideo = true;
    currentVideoFile = videoSource;

    console.log(`[OBS] ✅ Video playback started successfully (PID: ${pid})`);
    console.log(`[OBS] 🎥 ${validation.type === 'url' ? 'Streaming from URL' : 'Playing local file'}`);

    // Auto-stop after video duration + buffer
    const stopDelayMs = (durationMinutes + 2) * 60 * 1000;
    setTimeout(async () => {
      console.log(`[OBS] ⏰ Auto-stopping video after ${durationMinutes} minutes`);
      await stopSadhanaVideo();
    }, stopDelayMs);

    return {
      success: true,
      message: 'Video playback started - video now visible to all Zoom participants',
      pid: pid,
      type: validation.type,
    };
  } catch (err: any) {
    console.error('[OBS] Start video error:', err.message);
    return {
      success: false,
      message: `Error starting video: ${err.message}`,
    };
  }
}

/**
 * Stop video playback
 */
export async function stopSadhanaVideo(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!isPlayingVideo || !currentPlaybackProcess) {
      return {
        success: true,
        message: 'No video currently playing',
      };
    }

    console.log(`[OBS] 🛑 Stopping video playback (PID: ${currentPlaybackProcess.pid})`);

    currentPlaybackProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));

    if (!currentPlaybackProcess.killed) {
      currentPlaybackProcess.kill('SIGKILL');
      console.warn('[OBS] ⚠️ Had to force kill FFmpeg process');
    }

    isPlayingVideo = false;
    currentPlaybackProcess = null;
    currentVideoFile = null;

    console.log(`[OBS] ✅ Video playback stopped`);

    return {
      success: true,
      message: 'Video playback stopped',
    };
  } catch (err: any) {
    console.error('[OBS] Stop video error:', err);
    isPlayingVideo = false;
    currentPlaybackProcess = null;

    return {
      success: false,
      message: `Error stopping video: ${err.message}`,
    };
  }
}

/**
 * Get current playback status
 */
export function getPlaybackStatus(): {
  playing: boolean;
  currentVideo: string | null;
  pid: number | null;
  uptime: number;
  type?: 'url' | 'file';
} {
  return {
    playing: isPlayingVideo,
    currentVideo: currentVideoFile,
    pid: currentPlaybackProcess?.pid || null,
    uptime: currentPlaybackProcess ? Math.floor(process.uptime()) : 0,
    type: isUrl(currentVideoFile || '') ? 'url' : 'file',
  };
}

/**
 * List available local video files
 */
export function listAvailableVideos(): string[] {
  try {
    if (!fs.existsSync(VIDEO_DIRECTORY)) {
      console.warn(`[OBS] Video directory not found: ${VIDEO_DIRECTORY}`);
      return [];
    }

    const files = fs.readdirSync(VIDEO_DIRECTORY);
    const videoFiles = files.filter(f =>
      ['.mp4', '.mkv', '.avi', '.mov', '.webm'].some(ext => f.toLowerCase().endsWith(ext))
    );

    return videoFiles.map(f => path.join(VIDEO_DIRECTORY, f));
  } catch (err) {
    console.error('[OBS] Error listing videos:', err);
    return [];
  }
}

/**
 * Test OBS setup (diagnostic)
 */
export async function testOBSSetup(): Promise<{
  obsInstalled: boolean;
  obsRunning: boolean;
  virtualCameraAvailable: boolean;
  canPlayVideo: boolean;
  recommendations: string[];
}> {
  console.log('[OBS] 🧪 Testing OBS setup...');

  const obs = await checkOBSInstalled();
  const camera = await checkVirtualCamera();
  const recommendations: string[] = [];

  if (!obs.installed) {
    recommendations.push('Install OBS: sudo apt install obs-studio');
  }

  if (!camera.available) {
    recommendations.push('Install v4l2loopback: sudo apt install v4l2loopback-dkms');
    recommendations.push('Load module: sudo modprobe v4l2loopback');
  }

  if (camera.available && !camera.canWrite) {
    recommendations.push(`Fix permissions: sudo chmod 666 ${VIRTUAL_CAMERA_DEVICE}`);
  }

  const canPlayVideo = obs.installed && camera.available && camera.canWrite;

  const result = {
    obsInstalled: obs.installed,
    obsRunning: obs.running,
    virtualCameraAvailable: camera.available && camera.canWrite,
    canPlayVideo: canPlayVideo,
    recommendations: recommendations,
  };

  console.log('[OBS] 🧪 Test Results:', JSON.stringify(result, null, 2));

  return result;
}

/**
 * Get system information for debugging
 */
export async function getSystemInfo(): Promise<any> {
  try {
    const { stdout: uname } = await execAsync('uname -a');
    const { stdout: ffmpeg } = await execAsync('ffmpeg -version 2>/dev/null | head -1 || echo "Not installed"');
    const { stdout: processes } = await execAsync('ps aux | grep -E "obs|ffmpeg" | grep -v grep');

    return {
      system: uname.trim(),
      ffmpeg: ffmpeg.trim(),
      runningProcesses: processes.trim().split('\n').filter((l: string) => l.length > 0),
    };
  } catch (err) {
    return { error: String(err) };
  }
}

export default {
  isUrl,
  validateVideoSource,
  checkOBSInstalled,
  checkVirtualCamera,
  startSadhanaVideo,
  stopSadhanaVideo,
  getPlaybackStatus,
  listAvailableVideos,
  testOBSSetup,
  getSystemInfo,
};
