import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { bunnyExecute } from '../lib/bunnyDatabase';
import { saveKnowledgeSource, reindexKnowledgeSource } from '../lib/mohanRag/knowledgeRepository';
import { analyzeBunnyMediaUrl } from '../lib/mohanRag/mediaTranscription';

async function main() {
  const sourceId = 'b9d59ec6-a1da-4a66-9fe5-6fde844538fd';
  console.log(`🔍 Fetching source record for ${sourceId}...`);
  const res = await bunnyExecute({
    sql: 'SELECT * FROM mohan_rag_sources_sql WHERE id = ?',
    args: [sourceId],
  });

  const row = res.rows?.[0];
  if (!row) {
    console.error('Source not found in database!');
    process.exit(1);
  }

  console.log(`📹 Source: "${row.title}"`);
  console.log(`🔗 File URL: ${row.original_file_url}`);

  console.log('🎙️ Transcribing with Replicate Whisper & Verbatim Speech Pipeline...');
  const analysis = await analyzeBunnyMediaUrl({
    url: String(row.original_file_url),
    title: String(row.title),
    extension: 'mp4',
    language: 'mr',
  });

  console.log(`✅ Transcription complete! Generated ${analysis.segments.length} spoken segments.`);
  console.log(`📝 Timeline character length: ${analysis.annotatedTimeline.length}`);
  console.log(`📄 Snippet:\n${analysis.annotatedTimeline.slice(0, 500)}...\n`);

  console.log('💾 Saving updated transcript to Bunny Database...');
  await saveKnowledgeSource({
    id: sourceId,
    moduleId: String(row.module_id || 'level1'),
    title: String(row.title),
    content: analysis.annotatedTimeline,
    topic: String(row.topic || 'all topices marathi L-1'),
    language: analysis.language || 'mr',
    sourceType: String(row.source_type || 'mp4'),
    sourceReference: String(row.source_reference || ''),
    originalFileName: String(row.original_file_name || `${row.title}.mp4`),
    originalFileUrl: String(row.original_file_url || ''),
    originalMimeType: String(row.original_mime_type || 'video/mp4'),
    extractionType: `${analysis.correctionApplied ? 'proofread_' : ''}${analysis.emotionSuggestionsAdded ? 'timestamped_transcription_with_avatar_suggestions' : 'timestamped_transcription'}`,
  }, 'admin');

  console.log('🧠 Reindexing RAG chunks...');
  const reindexed = await reindexKnowledgeSource(sourceId);
  console.log(`🎉 Successfully updated source with ${reindexed.chunks} chunks!`);
}

main().catch((err) => {
  console.error('Error in retranscription script:', err);
  process.exit(1);
});

