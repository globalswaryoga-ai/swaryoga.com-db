import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { bunnyExecute } from '../lib/bunnyDatabase';

async function main() {
  const sources = await bunnyExecute(`
    SELECT id, title, topic, language, source_reference, content
    FROM mohan_rag_sources_sql 
    WHERE content LIKE '%शिकले%' OR content LIKE '%रम रम%' OR topic LIKE '%Global Community%' OR topic LIKE '%all topices%'
    LIMIT 10
  `);
  console.log('Matching Sources Count:', sources.rows?.length);
  for (const row of sources.rows || []) {
    console.log('Source:', { id: row.id, topic: row.topic, language: row.language, title: row.title, ref: row.source_reference });
    console.log('Snippet:\n', String(row.content).slice(0, 500));
    console.log('---');
  }

  // Also search for Global Community
  const gc = await bunnyExecute(`
    SELECT id, title, topic, language, source_reference, length(content) as len
    FROM mohan_rag_sources_sql 
    WHERE topic LIKE '%Global%' OR title LIKE '%Global%'
  `);
  console.log('Global Community rows:', gc.rows);
}

main().catch(console.error);
