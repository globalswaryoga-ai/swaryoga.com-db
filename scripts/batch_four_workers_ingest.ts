import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { bunnyExecute } from '../lib/bunnyDatabase';
import { runFullFourWorkerPipeline, runWorker2_CheckConversion } from '../lib/mohanRag/fourWorkerPipeline';

async function runBatch() {
  console.log('🚀 Starting Universal 4-Worker Pipeline Batch Runner...');

  // Select all sources
  const query = await bunnyExecute({
    sql: 'SELECT id, title, content, original_file_name, original_file_url, source_reference, source_type, language FROM mohan_rag_sources_sql ORDER BY id ASC',
    args: [],
  });

  const allSources = query.rows;
  console.log(`Auditing ${allSources.length} total sources across Worker 2 quality gates...`);

  // Filter sources that fail Worker 2 (dummy metadata, outline, empty timestamps, or short)
  const needingConversion: any[] = [];
  for (const s of allSources) {
    const check = runWorker2_CheckConversion(s as any);
    if (check.isDummyOrPdf) {
      needingConversion.push({
        id: String(s.id),
        title: String(s.title),
        reason: check.rejectionReason,
        charCount: check.charCount,
      });
    }
  }

  console.log(`📊 Found ${needingConversion.length} sources that need real spoken audio conversion & distribution.`);

  // Process sequentially with clean logging
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < needingConversion.length; i++) {
    const item = needingConversion[i];
    console.log(`\n============================================================`);
    console.log(`[${i + 1}/${needingConversion.length}] Processing "${item.title}" (${item.id})`);
    console.log(`   Worker 2 Rejection Reason: ${item.reason}`);

    try {
      const report = await runFullFourWorkerPipeline(item.id);
      console.log(`✅ Success for "${item.title}":`);
      console.log(`   Worker 1: Transcribed ${report.worker1_conversion.charCount} chars (${report.worker1_conversion.method})`);
      console.log(`   Worker 2: ${report.worker2_verification.status} (${report.worker2_verification.wordCount} words)`);
      console.log(`   Worker 3: Distributed to all destinations (Search Chunks, Library, PlainText, Twin Brain)`);
      console.log(`   Worker 4: Audit status "${report.worker4_audit.status}" (Confidence: ${report.worker4_audit.confidenceScore}%)`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ Worker Pipeline Failed for "${item.title}": ${err.message}`);
      failCount++;
    }

    // Gentle sleep between items to respect Replicate/OpenAI rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n============================================================');
  console.log(`🎉 Batch Run Finished!`);
  console.log(`   Successfully converted & distributed: ${successCount}`);
  console.log(`   Failed / Skipped: ${failCount}`);
}

runBatch().catch(console.error);
