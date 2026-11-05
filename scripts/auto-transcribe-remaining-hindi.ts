import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { autoFixSingleVideoSource } from '../lib/mohanRag/aiRecheckAutoFixWorker';
import { bunnyExecute } from '../lib/bunnyDatabase';

async function main() {
  console.log('🚀 Starting batch transcription for all remaining Hindi Outline lectures...');

  const query = await bunnyExecute({
    sql: `SELECT id, title, language, LENGTH(content) as len FROM mohan_rag_sources_sql 
          WHERE (title LIKE '%Hindi%' OR title LIKE '%hindi%') AND LENGTH(content) < 800 
          AND id != 'source_bunny_62803d4f-09ba-451a-93ae-4c655594e895'
          ORDER BY len ASC`,
    args: [],
  });

  const rows = query.rows || [];
  console.log(`Found ${rows.length} remaining Hindi outline records.`);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    console.log(`\n======================================================`);
    console.log(`[${i + 1}/${rows.length}] Transcribing "${r.title}" (ID: ${r.id})...`);
    console.log(`======================================================`);

    try {
      const res = await autoFixSingleVideoSource(String(r.id));
      console.log(`✅ [${i + 1}/${rows.length}] Done! Old: ${res.oldLength} chars -> New: ${res.newLength} chars`);
    } catch (err: any) {
      console.error(`❌ [${i + 1}/${rows.length}] Failed for "${r.title}":`, err.message);
    }

    // Polite pause between video transcriptions
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n🎉 Finished batch Hindi transcription pipeline!');
}

main().catch(console.error);

