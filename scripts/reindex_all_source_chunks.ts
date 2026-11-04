import crypto from 'node:crypto';
import { bunnyExecute, bunnyBatch } from '../lib/bunnyDatabase';
import { chunkText } from '../lib/ragRetrieval';

async function main() {
  console.log('Fetching all sources from mohan_rag_sources_sql...');
  const res = await bunnyExecute({
    sql: `SELECT s.id, s.module_id, s.title, s.content, s.topic, s.language,
          (SELECT COUNT(*) FROM mohan_rag_chunks_sql c WHERE c.source_id = s.id) AS chunk_count
          FROM mohan_rag_sources_sql s`,
  });

  const sources = res.rows || [];
  console.log(`Found ${sources.length} total sources in mohan_rag_sources_sql.`);

  let reindexedCount = 0;
  for (const s of sources as any[]) {
    if (Number(s.chunk_count) > 0) continue;

    const content = (s.content || '').trim();
    if (!content) {
      console.log(`Source ${s.id} (${s.title}) has empty content, skipping.`);
      continue;
    }

    const chunks = chunkText(content, 1800, 220);
    const chunkList = chunks.length > 0 ? chunks : [content];
    const now = new Date().toISOString();

    const statements = [
      { sql: 'DELETE FROM mohan_rag_chunks_sql WHERE source_id = ?', args: [s.id] },
      ...chunkList.map((c, index) => ({
        sql: `INSERT INTO mohan_rag_chunks_sql (id, source_id, module_id, chunk_index, content, topic, language, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), s.id, s.module_id || 'level1', index, c, s.topic || '', s.language || 'auto', now],
      })),
    ];

    await bunnyBatch(statements);
    reindexedCount++;
    console.log(`Reindexed ${s.id} (${s.title}): inserted ${chunkList.length} chunks.`);
  }

  console.log(`\nReindexing complete. Reindexed ${reindexedCount} sources.`);
}

main().catch(err => {
  console.error('Reindexing failed:', err);
  process.exit(1);
});

