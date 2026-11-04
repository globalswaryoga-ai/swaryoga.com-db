import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { processNextMohanRagVideo } from '../lib/mohanRag/videoIngestionWorker';
import { bunnyExecute } from '../lib/bunnyDatabase';
import { runFullFourWorkerPipeline, runWorker2_CheckConversion } from '../lib/mohanRag/fourWorkerPipeline';

async function main() {
  console.log('🚀 [Universal Ingestion & 4-Worker Engine] Starting continuous background worker...');
  let idleCycles = 0;
  const failedSourceIds = new Set<string>();
  let lastFailedReset = Date.now();

  while (true) {
    try {
      // Reset failed list every 30 minutes to allow retries
      if (Date.now() - lastFailedReset > 30 * 60 * 1000) {
        failedSourceIds.clear();
        lastFailedReset = Date.now();
      }

      // 1. First process any manual upload jobs in video queue
      const queueRes = await processNextMohanRagVideo();
      if (queueRes.processed) {
        console.log(`✅ [Queue Ingestion] Job ${queueRes.jobId} completed -> Status: ${queueRes.status}`);
        idleCycles = 0;
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // 2. Scan mohan_rag_sources_sql for any sources needing 4-Worker conversion & distribution
      const sourcesQuery = await bunnyExecute({
        sql: `SELECT id, title, content, original_file_name, original_file_url, source_reference, source_type, language FROM mohan_rag_sources_sql ORDER BY id ASC`,
        args: [],
      });

      let nextPendingSource: any = null;
      for (const s of sourcesQuery.rows) {
        if (failedSourceIds.has(String(s.id))) continue;
        const check = runWorker2_CheckConversion(s as any);
        if (check.isDummyOrPdf) {
          nextPendingSource = s;
          break;
        }
      }

      if (nextPendingSource) {
        const sourceId = String(nextPendingSource.id);
        const title = String(nextPendingSource.title);
        console.log(`\n⚡ [4-Worker Daemon] Converting & distributing: "${title}" (${sourceId})...`);

        try {
          const report = await runFullFourWorkerPipeline(sourceId);
          console.log(`✅ [4-Worker Daemon] Success for "${title}":`);
          console.log(`   Worker 1: ${report.worker1_conversion.charCount} chars (${report.worker1_conversion.method})`);
          console.log(`   Worker 2: ${report.worker2_verification.status} (${report.worker2_verification.wordCount} words)`);
          console.log(`   Worker 3: Distributed to all 7 destinations & RAG chunks indexed!`);
          console.log(`   Worker 4: Audit score ${report.worker4_audit.confidenceScore}%`);
        } catch (convErr: any) {
          console.error(`⚠️ [4-Worker Daemon] Error on "${title}":`, convErr.message);
          failedSourceIds.add(sourceId);
        }

        idleCycles = 0;
        // Pause 3 seconds between sources to prevent API rate-limiting
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // 3. Both queue and sources are up-to-date
      idleCycles++;
      if (idleCycles === 1 || idleCycles % 20 === 0) {
        console.log('✨ [4-Worker Daemon] All video/audio sources verified & distributed. Watching for new media...');
      }
      await new Promise(r => setTimeout(r, 15000));
    } catch (err: any) {
      console.error('❌ [4-Worker Daemon] Worker error:', err.message);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

main().catch(console.error);
