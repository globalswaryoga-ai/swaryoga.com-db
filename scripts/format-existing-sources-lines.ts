import { bunnyExecute, bunnyBatch } from '../lib/bunnyDatabase';
import { formatTranscriptLines } from '../lib/mohanRag/transcriptFormatter';

async function main() {
  console.log('Fetching sources with timestamps...');
  const result = await bunnyExecute({
    sql: "SELECT id, title, content FROM mohan_rag_sources_sql WHERE content LIKE '%[%:%]%'",
    args: [],
  });

  const sources = result.rows || [];
  console.log(`Found ${sources.length} sources with timestamps.`);

  let updatedCount = 0;
  for (const s of sources) {
    const id = String(s.id);
    const title = String(s.title || '');
    const original = String(s.content || '');
    const formatted = formatTranscriptLines(original);

    if (formatted !== original) {
      await bunnyExecute({
        sql: 'UPDATE mohan_rag_sources_sql SET content = ?, updated_at = ? WHERE id = ?',
        args: [formatted, new Date().toISOString(), id],
      });
      updatedCount++;
      console.log(`✅ [${updatedCount}/${sources.length}] Formatted line-by-line: "${title}" (${id})`);
    }
  }

  console.log(`🎉 Finished! Updated ${updatedCount} sources to be line-by-line.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

