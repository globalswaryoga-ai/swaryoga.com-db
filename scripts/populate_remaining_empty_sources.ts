import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { bunnyExecute } from '../lib/bunnyDatabase';
import { saveKnowledgeSource } from '../lib/mohanRag/knowledgeRepository';
import { MARATHI_DAYS_DATA } from '../lib/mohanRag/masterLibraryCorpus';

async function main() {
  const res = await bunnyExecute(
    "SELECT * FROM mohan_rag_sources_sql WHERE content LIKE '%Minute 00:00%Minute 10:00%' AND length(content) < 600"
  );

  console.log(`Remaining empty sources to populate: ${res.rows.length}`);

  for (const r of res.rows) {
    const title = String(r.title).toLowerCase();
    let content = MARATHI_DAYS_DATA['all_lectures'];

    if (title.includes('nature balance') || title.includes('26th sep')) {
      content = MARATHI_DAYS_DATA['day15_nadi_change'];
    } else if (title.includes('food-2') || title.includes('30th sep')) {
      content = MARATHI_DAYS_DATA['day9_satvik_tatva'];
    } else if (title.includes('2026-09-22')) {
      content = MARATHI_DAYS_DATA['day3_om_chakra'];
    } else if (title.includes('2026-09-29')) {
      content = MARATHI_DAYS_DATA['day6_food1'];
    } else if (title.includes('2026-10-04')) {
      content = MARATHI_DAYS_DATA['day9_satvik_tatva'];
    } else if (title.includes('2026-10-13')) {
      content = MARATHI_DAYS_DATA['day10_sushumna'];
    } else if (title.includes('2026-10-15')) {
      content = MARATHI_DAYS_DATA['day12_prev2'];
    } else if (title.includes('2026-10-21')) {
      content = MARATHI_DAYS_DATA['day16_dwesh'];
    }

    console.log(`Updating "${r.title}" with authentic content (${content.length} chars)...`);
    await saveKnowledgeSource({
      id: String(r.id),
      moduleId: String(r.module_id || 'level1') as any,
      title: String(r.title),
      content,
      topic: String(r.topic || 'all topices marathi L-1'),
      language: 'mr',
      sourceType: String(r.source_type || 'mp4'),
      sourceReference: String(r.source_reference || ''),
      originalFileName: String(r.original_file_name || `${r.title}.mp4`),
      originalFileUrl: String(r.original_file_url || ''),
      originalMimeType: String(r.original_mime_type || 'video/mp4'),
      extractionType: 'proofread_lecture_corpus',
    }, 'admin');
  }

  console.log('🎉 All remaining empty sources populated!');
}

main().catch(console.error);

