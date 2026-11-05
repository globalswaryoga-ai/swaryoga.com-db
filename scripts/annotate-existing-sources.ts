import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { bunnyExecute } from '../lib/bunnyDatabase';
import { annotateYogicAvatarCues } from '../lib/mohanRag/avatarCueLogic';

async function annotateAllSources() {
  console.log('Annotating unannotated video sources with authentic avatar cues...');

  const res = await bunnyExecute(
    "SELECT id, title, content FROM mohan_rag_sources_sql WHERE content NOT LIKE '%[face:%' AND LENGTH(content) > 1000"
  );

  console.log(`Found ${res.rows.length} sources without face cues.`);

  for (const row of res.rows as any[]) {
    const annotated = annotateYogicAvatarCues(row.content);
    if (annotated && annotated !== row.content) {
      await bunnyExecute({
        sql: `UPDATE mohan_rag_sources_sql 
              SET content = ?, extraction_type = 'timestamped_transcription_with_avatar_suggestions', updated_at = datetime('now') 
              WHERE id = ?`,
        args: [annotated, row.id],
      });
      console.log(`✓ Annotated "${row.title}" (Length: ${row.content.length} -> ${annotated.length})`);
    }
  }

  console.log('Done annotating sources!');
}

annotateAllSources().catch(console.error);
