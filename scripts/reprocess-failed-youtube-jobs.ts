import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { bunnyExecute } from '../lib/bunnyDatabase';
import { processNextMohanRagVideo } from '../lib/mohanRag/videoIngestionWorker';

async function reprocessFailedYouTube() {
  console.log('--- Reprocessing Failed YouTube Ingestion Jobs ---');

  // 1. Reset all failed YouTube jobs to queued
  const resetRes = await bunnyExecute(
    "UPDATE mohan_rag_video_ingestion_sql SET status = 'queued', error_message = NULL, updated_at = datetime('now') WHERE provider = 'youtube' AND status = 'failed'"
  );
  console.log(`Reset failed YouTube jobs: ${resetRes.rowsAffected || 0} rows affected.`);

  // 2. Also check if there are any inventory rows with 'ingestion_failed' that don't have a job yet, queue them
  const failedInv = await bunnyExecute(
    "SELECT video_id, video_url, title, language FROM mohan_rag_youtube_channel_inventory_sql WHERE screening_status = 'ingestion_failed'"
  );
  console.log(`Found ${failedInv.rows.length} inventory videos marked ingestion_failed.`);

  for (const row of failedInv.rows as any[]) {
    const existingJob = await bunnyExecute({
      sql: 'SELECT id, status FROM mohan_rag_video_ingestion_sql WHERE source_url = ?',
      args: [row.video_url],
    });
    if (!existingJob.rows.length) {
      const jobId = `job_yt_${row.video_id}_${Date.now()}`;
      await bunnyExecute({
        sql: `INSERT INTO mohan_rag_video_ingestion_sql (
          id, provider, source_url, title, language, topic, module_id, status, created_by, created_at, updated_at
        ) VALUES (?, 'youtube', ?, ?, ?, 'general', 'general', 'queued', 'system_reprocess', datetime('now'), datetime('now'))`,
        args: [jobId, row.video_url, row.title, row.language || 'hi'],
      });
      console.log(`Created new ingestion job for ${row.video_id} (${row.title})`);
    } else if (existingJob.rows[0].status === 'failed') {
      await bunnyExecute({
        sql: "UPDATE mohan_rag_video_ingestion_sql SET status = 'queued', error_message = NULL, updated_at = datetime('now') WHERE id = ?",
        args: [existingJob.rows[0].id],
      });
      console.log(`Re-queued existing job for ${row.video_id}`);
    }
  }

  // 3. Process the queue sequentially
  let count = 0;
  while (true) {
    const res = await processNextMohanRagVideo();
    if (!res.processed) {
      console.log('No more queued jobs to process.');
      break;
    }
    count++;
    console.log(`[Job ${count}] Status: ${res.status}, JobId: ${res.jobId}, Error: ${res.error || 'None'}`);
    // Brief sleep to avoid hitting API rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`--- Finished processing ${count} YouTube jobs! ---`);
}

reprocessFailedYouTube().catch(err => {
  console.error('Reprocess failed:', err);
  process.exit(1);
});

