#!/usr/bin/env npx tsx
import fs from 'node:fs';
import { bunnyExecute } from '../lib/bunnyDatabase';
import {
  initFacialExtractionSchema,
  startFacialExtractionJob,
  type FacialExtractionJob,
} from '../lib/mohanRag/facialExpressionService';

const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=_27tyc20PKk';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== Test Single YouTube Facial Extraction ===');
  console.log(`Target Video: ${TEST_YOUTUBE_URL}`);

  // 1. Check cookies configuration without revealing contents
  const cookiePath = process.env.YOUTUBE_COOKIES_FILE?.trim();
  console.log(`\n[Step 1] Checking YOUTUBE_COOKIES_FILE...`);
  if (!cookiePath) {
    console.error('❌ YOUTUBE_COOKIES_FILE environment variable is NOT set.');
    process.exit(1);
  }

  if (!fs.existsSync(cookiePath)) {
    console.error(`❌ Cookies file does not exist at path: ${cookiePath}`);
    process.exit(1);
  }

  try {
    fs.accessSync(cookiePath, fs.constants.R_OK);
    const stats = fs.statSync(cookiePath);
    if (stats.size === 0) {
      console.error(`❌ Cookies file is empty (0 bytes). Please place authorized Netscape cookies in ${cookiePath}.`);
      process.exit(1);
    }
    console.log(`✅ Cookies file is verified readable (size: ${stats.size} bytes). [Contents NOT displayed]`);
  } catch (err: any) {
    console.error(`❌ Cannot read cookies file: ${err.message}`);
    process.exit(1);
  }

  // 2. Initialize schema & launch test job
  console.log(`\n[Step 2] Initializing Bunny Database schema & launching extraction...`);
  await initFacialExtractionSchema();

  // Conservative sample rate: 0.2 fps (1 frame every 5 seconds) to be gentle on bandwidth & CPU
  const job = await startFacialExtractionJob({
    videoUrl: TEST_YOUTUBE_URL,
    sampleFps: 0.2,
  });

  console.log(`🚀 Job started with ID: ${job.id}`);
  console.log(`Status: ${job.status}`);

  // 3. Poll until completed or failed
  console.log(`\n[Step 3] Monitoring job execution...`);
  let finished = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s * 60)

  while (!finished && attempts < maxAttempts) {
    await delay(5000);
    attempts++;

    const res = await bunnyExecute({
      sql: 'SELECT id, status, progress_pct, total_frames_analyzed, expressions_distribution_json, error_message, updated_at FROM mohan_facial_extraction_jobs_sql WHERE id = ?',
      args: [job.id],
    });

    const current = res.rows?.[0] as any;
    if (!current) {
      console.log(`Waiting for job ${job.id} to register...`);
      continue;
    }

    console.log(`[${current.updated_at || new Date().toISOString()}] Status: ${current.status} | Progress: ${current.progress_pct}% | Frames: ${current.total_frames_analyzed}`);

    if (current.status === 'completed') {
      finished = true;
      console.log('\n🎉 Job COMPLETED successfully!');
      console.log(`Total Frames Analyzed: ${current.total_frames_analyzed}`);
      console.log(`Expressions Distribution: ${current.expressions_distribution_json}`);

      // Count clips in DB
      const clipsRes = await bunnyExecute({
        sql: 'SELECT COUNT(*) as clip_count FROM mohan_facial_expression_clips_sql WHERE job_id = ?',
        args: [job.id],
      });
      const clipCount = clipsRes.rows?.[0]?.clip_count || 0;
      console.log(`✅ Facial Expression Clips saved in Bunny DB: ${clipCount}`);
      break;
    }

    if (current.status === 'failed') {
      finished = true;
      console.error('\n❌ Job FAILED.');
      console.error(`Error Details: ${current.error_message}`);
      break;
    }
  }

  if (!finished) {
    console.warn('\n⚠️ Timed out waiting for job completion. Please check job status in dashboard.');
  }
}

main().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});

