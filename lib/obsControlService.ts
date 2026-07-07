/**
 * OBS Control Service - Controls OBS for Sadhana video playback in Zoom
 * Plays recorded Sadhana video through virtual camera for all Zoom participants
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
 * Check if OBS is installed and running
 */
export async function checkOBSInstalled(): Promise<{
  installed: boolean;
  running: boolean;
  version?: string;
}> {
  try {
    // Check if OBS is installed
    const { stdout: obsVersion } = await execAsync('obs --version 2>/dev/null || obs-studio --version 2>/dev/null || echo ""');

    // Check if OBS is running
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
    // List all video devices
    const { stdout: devices } = await execAsync('ls -la /dev/video* 2>/dev/null || echo ""');

    const hasVirtualCamera = devices.includes('video10') || devices.includes('video20');

    if (hasVirtualCamera) {
      // Check if writable
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
 * Verify video file exists and is valid
 */
export function validateVideoFile(videoPath: string): {
  valid: boolean;
  exists: boolean;
  readable: boolean;
  size: number;
  duration?: number;
} {
  try {
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return {
        valid: false,
        exists: false,
        readable: false,
        size: 0,
      };
    }

    // Check if readable
    try {
      fs.accessSync(videoPath, fs.constants.R_OK);
    } catch (e) {
      return {
        valid: false,
        exists: true,
        readable: false,
        size: 0,
      };
    }

    // Get file size
    const stats = fs.statSync(videoPath);
    const size = stats.size;

    // Valid if: exists, readable, larger than 1MB
    return {
      valid: size > 1024 * 1024,
      exists: true,
      readable: true,
      size: size,
    };
  } catch (err) {
    console.error('[OBS] Video validation error:', err);
    return {
      valid: false,
      exists: false,
      readable: false,
      size: 0,
    };
  }
}

/**
 * Start video playback using FFmpeg to virtual camera
 * Video plays for all Zoom participants who see the bot
 */
export async function startSadhanaVideo(videoPath: string, durationMinutes: number = 40): Promise<{
  success: boolean;
  message: string;
  pid?: number;
}> {
  try {
    // Validate video file
    const validation = validateVideoFile(videoPath);
    if (!validation.valid) {
      return {
        success: false,
        message: `Video file invalid: ${JSON.stringify(validation)}`,
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

    console.log(`[OBS] 🎬 Starting video playback: ${videoPath}`);
    console.log(`[OBS] 📹 Video will output to: ${VIRTUAL_CAMERA_DEVICE}`);
    console.log(`[OBS] ⏱️ Expected duration: ${durationMinutes} minutes`);

    // FFmpeg command to stream video to virtual camera
    // -re: Read input at native frame rate (important for sync)
    // -i: Input file
    // -f v4l2: Output format (V4L2 - Video for Linux 2)
    // -pix_fmt yuv420p: Pixel format (compatible with most cameras)
    // Output device: /dev/video10

    const ffmpegCommand = [
      'ffmpeg',
      '-re', // Read at native rate (important!)
      '-i', videoPath, // Input video
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
      stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin, capture stdout/stderr
      detached: true, // Run as separate process group
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

    // Wait a moment for FFmpeg to initialize
    await new Promise(r => setTimeout(r, 2000));

    // Check if process started successfully
    if (!currentPlaybackProcess || currentPlaybackProcess.killed) {
      return {
        success: false,
        message: 'FFmpeg failed to start or was killed immediately',
      };
    }

    isPlayingVideo = true;
    currentVideoFile = videoPath;

    console.log(`[OBS] ✅ Video playback started successfully (PID: ${pid})`);

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

    // Kill FFmpeg process gracefully
    currentPlaybackProcess.kill('SIGTERM');

    // Wait for process to terminate
    await new Promise(r => setTimeout(r, 1000));

    // Force kill if still running
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
      message: 'Video playback stopped - participants see blank video',
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
  uptime: number; // Seconds
} {
  return {
    playing: isPlayingVideo,
    currentVideo: currentVideoFile,
    pid: currentPlaybackProcess?.pid || null,
    uptime: currentPlaybackProcess ? Math.floor(process.uptime()) : 0,
  };
}

/**
 * List available video files
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
  checkOBSInstalled,
  checkVirtualCamera,
  validateVideoFile,
  startSadhanaVideo,
  stopSadhanaVideo,
  getPlaybackStatus,
  listAvailableVideos,
  testOBSSetup,
  getSystemInfo,
};
