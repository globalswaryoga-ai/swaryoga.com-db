import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { bunnyExecute } from '../lib/bunnyDatabase';
import { saveKnowledgeSource } from '../lib/mohanRag/knowledgeRepository';
import { MARATHI_DAYS_DATA } from '../lib/mohanRag/masterLibraryCorpus';

async function main() {
  console.log('🔄 Checking all empty sources in mohan_rag_sources_sql...');
  const res = await bunnyExecute(
    "SELECT * FROM mohan_rag_sources_sql WHERE content LIKE '%Minute 00:00%Minute 10:00%' AND length(content) < 600"
  );

  console.log(`Found ${res.rows.length} empty sources to populate.`);
  let updatedCount = 0;

  for (const r of res.rows) {
    const title = String(r.title).toLowerCase();
    let matchedKey: string | null = null;

    if (title.includes('day-5') || title.includes('day 5')) matchedKey = 'day5_ajapa';
    else if (title.includes('day-6') || title.includes('day 6') || title.includes('food 1')) matchedKey = 'day6_food1';
    else if (title.includes('day-7') || title.includes('day 7') || title.includes('tamas')) matchedKey = 'day7_tamas_rajas';
    else if (title.includes('day-8') || title.includes('day 8') || title.includes('satvik')) matchedKey = 'day8_rajas_satvik';
    else if (title.includes('day-09') || title.includes('day 9') || title.includes('day-9')) matchedKey = 'day9_satvik_tatva';
    else if (title.includes('day 10') || title.includes('day-10') || title.includes('sushumna')) matchedKey = 'day10_sushumna';
    else if (title.includes('day 11') || title.includes('day-11')) matchedKey = 'day11_prev1';
    else if (title.includes('day 12') || title.includes('day-12')) matchedKey = 'day12_prev2';
    else if (title.includes('day-13') || title.includes('day 13')) matchedKey = 'day13_sadhana';
    else if (title.includes('day-14') || title.includes('day 14')) matchedKey = 'day14_nadi_work';
    else if (title.includes('day-15') || title.includes('day 15')) matchedKey = 'day15_nadi_change';
    else if (title.includes('day-16') || title.includes('day 16') || title.includes('dwesh')) matchedKey = 'day16_dwesh';
    else if (title.includes('day-1') || title.includes('day 1') || title.includes('basic day-1')) matchedKey = 'day1_bhojan';
    else if (title.includes('day-2') || title.includes('day 2') || title.includes('basic day-2')) matchedKey = 'day2_pani_gas';
    else if (title.includes('day-3') || title.includes('day 3')) matchedKey = 'day3_om_chakra';
    else if (title.includes('day-4') || title.includes('day 4')) matchedKey = 'day4_meditation';

    if (matchedKey && MARATHI_DAYS_DATA[matchedKey]) {
      const authenticContent = MARATHI_DAYS_DATA[matchedKey];
      console.log(`✅ Updating "${r.title}" (${r.id}) with authentic ${matchedKey} content (${authenticContent.length} chars)...`);
      await saveKnowledgeSource({
        id: String(r.id),
        moduleId: String(r.module_id || 'level1') as any,
        title: String(r.title),
        content: authenticContent,
        topic: String(r.topic || 'all topices marathi L-1'),
        language: 'mr',
        sourceType: String(r.source_type || 'mp4'),
        sourceReference: String(r.source_reference || ''),
        originalFileName: String(r.original_file_name || `${r.title}.mp4`),
        originalFileUrl: String(r.original_file_url || ''),
        originalMimeType: String(r.original_mime_type || 'video/mp4'),
        extractionType: 'proofread_lecture_corpus',
      }, 'admin');
      updatedCount++;
    }
  }

  console.log(`🎉 Successfully populated ${updatedCount} sources with authentic master lecture transcripts and indexed chunks!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

