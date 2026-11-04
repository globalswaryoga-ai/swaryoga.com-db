import { bunnyExecute } from '../lib/bunnyDatabase';
import { processNextMohanRagVideo } from '../lib/mohanRag/videoIngestionWorker';

async function main() {
  console.log('🔄 [Batch Ingestion] Resetting uncompleted YouTube jobs to "queued"...');
  await bunnyExecute(
    "UPDATE mohan_rag_video_ingestion_sql SET status = 'queued', attempts = 0, error_message = NULL WHERE status != 'completed' AND provider = 'youtube'"
  );

  const countRes = await bunnyExecute(
    "SELECT count(*) as total FROM mohan_rag_video_ingestion_sql WHERE status = 'queued' AND provider = 'youtube'"
  );
  const total = Number(countRes.rows[0]?.total ?? countRes.rows[0]?.['count(*)'] ?? 0);
  console.log(`📋 [Batch Ingestion] Total YouTube video jobs to process: ${total}`);

  let processedCount = 0;
  let successCount = 0;
  let failCount = 0;

  while (true) {
    const res = await processNextMohanRagVideo(['youtube']);
    if (!res.processed) {
      const checkRes = await bunnyExecute(
        "SELECT count(*) as count FROM mohan_rag_video_ingestion_sql WHERE status = 'queued' AND provider = 'youtube'"
      );
      const remaining = Number(checkRes.rows[0]?.count ?? checkRes.rows[0]?.['count(*)'] ?? 0);
      if (remaining === 0) {
        console.log('🎉 [Batch Ingestion] All YouTube video jobs completed!');
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    processedCount++;
    if (res.status === 'completed') {
      successCount++;
      console.log(`✅ [${processedCount}/${total}] COMPLETED -> Job: ${res.jobId}`);
    } else {
      failCount++;
      console.error(`❌ [${processedCount}/${total}] FAILED -> Job: ${res.jobId}: ${res.error}`);
    }

    // 1-second breather between jobs
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=============================================`);
  console.log(`🏆 Final Summary: ${successCount} completed, ${failCount} failed.`);
  console.log(`=============================================\n`);
}

main().catch(err => {
  console.error('Fatal batch ingestion error:', err);
  process.exit(1);
});
