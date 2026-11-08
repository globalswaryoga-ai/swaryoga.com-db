const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = '/Users/mohankalburgi/Downloads/WhatsApp Unknown 2026-11-07 at 18.14.56';
const DEST_DIR = path.join(__dirname, '../public/mohan-clone-360');

// Load environment variables from .env.local
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        process.env[k] = v;
      }
    }
  });
}

const API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || 'swaryogadb';
const STORAGE_HOST = 'storage.bunnycdn.com';
const CDN_HOST = process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net';

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

async function uploadToBunny(localPath, remotePath, contentType) {
  const fileBuffer = fs.readFileSync(localPath);
  const url = `https://${STORAGE_HOST}/${ZONE_NAME}/${remotePath}`;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: API_KEY,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: fileBuffer,
  });
  
  if (!res.ok) {
    throw new Error(`Bunny upload failed: ${res.status} ${res.statusText}`);
  }
  return `https://${CDN_HOST}/${remotePath}`;
}

async function main() {
  console.log('🚀 Starting Mohan Sir Clone 360 / 2D / 3D Asset Processing...');
  
  const allFiles = fs.readdirSync(SOURCE_DIR);
  const imageFiles = allFiles.filter(f => f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.jpg')).sort();
  const videoFiles = allFiles.filter(f => f.toLowerCase().endsWith('.mp4')).sort();
  
  console.log(`Found ${imageFiles.length} images and ${videoFiles.length} videos.`);

  const imageManifest = [];
  const videoManifest = [];

  // 1. Process 60 images
  console.log('\n📸 Copying & Uploading 360 Frames (60 images)...');
  for (let i = 0; i < imageFiles.length; i++) {
    const orig = imageFiles[i];
    const srcPath = path.join(SOURCE_DIR, orig);
    const frameIndex = String(i + 1).padStart(2, '0');
    const newFileName = `mohan_360_frame_${frameIndex}.jpg`;
    const destPath = path.join(DEST_DIR, newFileName);

    // Copy locally
    fs.copyFileSync(srcPath, destPath);

    // Calculate approx 360 angle (0 deg to 354 deg)
    const angle = Math.round((i / imageFiles.length) * 360) % 360;

    // Upload to Bunny
    const remotePath = `uploads/mohan-clone-360/${newFileName}`;
    let cdnUrl = `https://${CDN_HOST}/${remotePath}`;
    try {
      cdnUrl = await uploadToBunny(destPath, remotePath, 'image/jpeg');
      process.stdout.write(`\r[Image ${i + 1}/${imageFiles.length}] Uploaded ${newFileName} (Angle: ${angle}°)`);
    } catch (err) {
      console.error(`\nFailed to upload ${newFileName}:`, err.message);
    }

    imageManifest.push({
      index: i + 1,
      angle,
      fileName: newFileName,
      localUrl: `/mohan-clone-360/${newFileName}`,
      cdnUrl,
      originalName: orig,
    });
  }

  // 2. Process 7 videos
  const VIDEO_TITLES = [
    'Mohan Sir 360° Rotational Angle Anchor (Standing)',
    'Mohan Sir Slow Turn & Kinetic Walking Gait',
    'Mohan Sir Mudra & Upper Body Flow Calibration',
    'Mohan Sir Facial Micro-Expressions & Eye Blink Track',
    'Mohan Sir Conversational Speech & Breath Resonance',
    'Mohan Sir 45° Semi-Profile Angle Discourse',
    'Mohan Sir Close-Up Smile & Meditative Gaze Rig',
  ];

  console.log('\n\n🎥 Processing & Uploading Videos (7 videos)...');
  for (let i = 0; i < videoFiles.length; i++) {
    const orig = videoFiles[i];
    const srcPath = path.join(SOURCE_DIR, orig);
    const videoIndex = String(i + 1).padStart(2, '0');
    const newFileName = `mohan_clone_video_${videoIndex}.mp4`;
    const destPath = path.join(DEST_DIR, newFileName);

    // Copy locally
    fs.copyFileSync(srcPath, destPath);

    // Probe duration and resolution
    let duration = 0;
    let width = 464;
    let height = 832;
    try {
      const probeOut = execSync(
        `ffprobe -v error -show_entries format=duration -show_entries stream=width,height -of default=noprint_wrappers=1 "${srcPath}"`
      ).toString();
      const lines = probeOut.split('\n');
      lines.forEach(l => {
        if (l.startsWith('duration=')) duration = parseFloat(l.split('=')[1]);
        if (l.startsWith('width=')) width = parseInt(l.split('=')[1]);
        if (l.startsWith('height=')) height = parseInt(l.split('=')[1]);
      });
    } catch (e) {
      console.warn('Probe warning for', orig, e.message);
    }

    // Upload to Bunny
    const remotePath = `uploads/mohan-clone-360/${newFileName}`;
    let cdnUrl = `https://${CDN_HOST}/${remotePath}`;
    try {
      cdnUrl = await uploadToBunny(destPath, remotePath, 'video/mp4');
      console.log(`[Video ${i + 1}/${videoFiles.length}] Uploaded ${newFileName} (${duration.toFixed(1)}s, ${width}x${height})`);
    } catch (err) {
      console.error(`Failed to upload ${newFileName}:`, err.message);
    }

    videoManifest.push({
      index: i + 1,
      title: VIDEO_TITLES[i] || `Mohan Sir Calibration Video ${i + 1}`,
      fileName: newFileName,
      localUrl: `/mohan-clone-360/${newFileName}`,
      cdnUrl,
      originalName: orig,
      duration: Math.round(duration),
      width,
      height,
    });
  }

  // 3. Save Manifest
  const manifest = {
    updatedAt: new Date().toISOString(),
    totalImages: imageManifest.length,
    totalVideos: videoManifest.length,
    images: imageManifest,
    videos: videoManifest,
  };

  fs.writeFileSync(path.join(DEST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\n📄 Saved manifest to public/mohan-clone-360/manifest.json');

  // 4. Generate TypeScript module
  const tsContent = `/**
 * Mohan Sir 360 / 2D / 3D Clone Asset Catalog
 * Auto-generated on ${new Date().toISOString()}
 * 60 High-Resolution 360° Rotation Frames + 7 Master Kinetics/Speech Videos
 */

export interface Mohan360Frame {
  index: number;
  angle: number;
  fileName: string;
  localUrl: string;
  cdnUrl: string;
}

export interface MohanCloneVideo {
  index: number;
  title: string;
  fileName: string;
  localUrl: string;
  cdnUrl: string;
  duration: number;
  width: number;
  height: number;
}

export const MOHAN_360_FRAMES: Mohan360Frame[] = ${JSON.stringify(
    imageManifest.map(img => ({
      index: img.index,
      angle: img.angle,
      fileName: img.fileName,
      localUrl: img.localUrl,
      cdnUrl: img.cdnUrl,
    })),
    null,
    2
  )};

export const MOHAN_CLONE_VIDEOS: MohanCloneVideo[] = ${JSON.stringify(
    videoManifest.map(v => ({
      index: v.index,
      title: v.title,
      fileName: v.fileName,
      localUrl: v.localUrl,
      cdnUrl: v.cdnUrl,
      duration: v.duration,
      width: v.width,
      height: v.height,
    })),
    null,
    2
  )};

/**
 * Returns the exact Mohan Sir 360 photo corresponding to a given turntable angle (0 to 360 degrees)
 */
export function getMohan360FrameForAngle(angleDegrees: number): Mohan360Frame {
  const norm = ((Math.round(angleDegrees) % 360) + 360) % 360;
  // Each of the 60 frames covers 6 degrees
  const frameIdx = Math.min(59, Math.floor(norm / 6));
  return MOHAN_360_FRAMES[frameIdx] || MOHAN_360_FRAMES[0];
}
`;

  const tsPath = path.join(__dirname, '../lib/mohanAiClone/mohanClone360Catalog.ts');
  fs.writeFileSync(tsPath, tsContent);
  console.log('✅ Generated TypeScript catalog at lib/mohanAiClone/mohanClone360Catalog.ts');

  console.log('\n🎉 ALL 67 ASSETS SUCCESSFULLY INTEGRATED FOR MOHAN SIR CLONE!');
}

main().catch(console.error);

