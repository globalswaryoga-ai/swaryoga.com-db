import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { listAiVideoJobs, updateAiVideoJob } from './lib/bunnyAiVideoJobRepository';
import { transcribeAudio } from './lib/aiVideo/transcribeAndCondense';

async function processJob(job) {
  console.log(`Processing job ${job._id}...`);
  try {
    // 1. Download video
    const videoUrl = job.sourceYoutubeUrl; // Assume this holds the Bunny Storage URL if it's an MP4
    if (!videoUrl || !videoUrl.startsWith('http')) {
      throw new Error('Invalid video URL');
    }

    const tempDir = path.join(process.cwd(), 'temp_video_processing');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    const mp4Path = path.join(tempDir, `${job._id}.mp4`);
    const mp3Path = path.join(tempDir, `${job._id}.mp3`);

    console.log(`Downloading ${videoUrl}...`);
    execSync(`curl -sL "${videoUrl}" -o "${mp4Path}"`);

    console.log('Extracting audio via FFmpeg...');
    execSync(`ffmpeg -y -i "${mp4Path}" -vn -acodec libmp3lame -q:a 5 "${mp3Path}"`);

    console.log('Transcribing audio...');
    const buffer = fs.readFileSync(mp3Path);
    // Transcribe handles chunking internally if we wrote it that way, otherwise we need to chunk here.
    // For now, let's assume transcribeAudio works. If not, this is where chunking goes.
    const transcript = await transcribeAudio({ buffer, mimeType: 'audio/mpeg' });

    console.log('Transcription complete! Updating database...');
    await updateAiVideoJob(job._id, {
      transcript,
      status: 'awaiting_correction_review'
    });

    // Cleanup
    fs.unlinkSync(mp4Path);
    fs.unlinkSync(mp3Path);

  } catch (error) {
    console.error(`Error processing job ${job._id}:`, error);
    await updateAiVideoJob(job._id, {
      status: 'failed',
      errorMessage: error.message
    });
  }
}

async function runWorker() {
  console.log("🎬 AI Video Worker Started");
  while (true) {
    try {
      const jobs = await listAiVideoJobs();
      const pendingJobs = jobs.filter(j => j.status === 'transcribing' && j.sourceYoutubeUrl && !j.transcript);
      
      for (const job of pendingJobs) {
        await processJob(job);
      }
    } catch (err) {
      console.error("Worker loop error:", err);
    }
    
    // Wait 30 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

runWorker();
