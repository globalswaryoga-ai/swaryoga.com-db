import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { bunnyExecute, bunnyBatch } from '../lib/bunnyDatabase';
import { DEFAULT_AVATAR_DNA_LOOKS } from '../lib/mohanRag/avatarDnaRepository';

const BUNNY_API_KEY = process.env.BUNNY_API_KEY || '72a5e4d2-08bf-409f-95d7840b4a68-b4fd-4ae0';
const LIBRARY_ID = 606386;

async function syncAvatarLooks() {
  console.log('=== 1. SYNCING AUTHENTIC AVATAR DNA LOOKS ===');
  // Clear old cracked looks
  await bunnyExecute('DELETE FROM mohan_avatar_dna_looks_sql');

  for (const look of DEFAULT_AVATAR_DNA_LOOKS) {
    await bunnyExecute({
      sql: `INSERT INTO mohan_avatar_dna_looks_sql (
        id, title, heading, description, video_url, thumbnail_url, look_category,
        outfit_style, emotion_profile, speaking_tone, duration_seconds, is_active,
        source_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        look.id,
        look.title,
        look.heading,
        look.description,
        look.video_url,
        look.thumbnail_url,
        look.look_category,
        look.outfit_style,
        look.emotion_profile,
        look.speaking_tone,
        look.duration_seconds,
        look.is_active ? 1 : 0,
        look.source_type,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });
    console.log(`✓ Inserted Avatar Look: [${look.id}] ${look.title} -> ${look.thumbnail_url}`);
  }

  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at) VALUES (?, ?, ?)`,
    args: ['global_active_dna', 'dna_look_vedic_white_01', new Date().toISOString()],
  });
  console.log('✓ Set active look: dna_look_vedic_white_01');
}

function classifyVideo(title: string, collectionId: string) {
  const t = title.toLowerCase();
  let lang = 'auto';
  if (t.includes('marathi') || collectionId === '1c320b6a-d9f5-4ddf-9708-8601d05a838e') lang = 'mr';
  else if (t.includes('hindi') || collectionId === '563e0c4c-a1d4-490f-a5ba-f9b2073c51b5') lang = 'hi';
  else if (t.includes('eng') || collectionId === '015d1b9e-1f88-4f83-b1cd-aaa3ffb0cfdb') lang = 'en';

  let moduleId = 'level1';
  let topic = 'Swar Yoga Foundation';

  if (t.includes('water') || t.includes('gas') || t.includes('sleep') || t.includes('day-2')) {
    moduleId = 'level1';
    topic = 'Day 2: Water Therapy, Gas & Sleep';
  } else if (t.includes('aahar') || t.includes('food') || t.includes('hunger')) {
    moduleId = 'aahar_shastra';
    topic = 'Aahar Shastra (Diet, Jatharagni & Digestion)';
  } else if (t.includes('meditation') || t.includes('dhyan') || t.includes('sadhana')) {
    moduleId = 'meditation_sadhana';
    topic = 'Meditation Sadhana & Prana Awakening';
  } else if (t.includes('l-2') || t.includes('level-2') || t.includes('level 2')) {
    moduleId = 'level2';
    topic = 'Level 2: Aham Brahmasmi & Samyama';
  } else if (t.includes('l-3') || t.includes('level-3') || t.includes('astavakra')) {
    moduleId = 'level3';
    topic = 'Level 3: Ashtavakra Dhyan & Shivoham';
  } else if (t.includes('weight')) {
    moduleId = 'weight_loss';
    topic = 'Weight Loss & Metabolic Swar Activation';
  } else if (t.includes('garbh') || t.includes('pregnan')) {
    moduleId = 'garbh_sanskar';
    topic = 'Garbh Sanskar & Prenatal Breath Rhythm';
  } else if (t.includes('intro') || t.includes('why')) {
    moduleId = 'why';
    topic = 'Why Swar Yoga (Motivation & Core Purpose)';
  } else if (t.includes('day 1') || t.includes('day-1') || t.includes('itrodotion')) {
    moduleId = 'level1';
    topic = 'Day 1: Bhojan & Water Rules';
  }

  return { lang, moduleId, topic };
}

async function ingestBunnyLibraryVideos() {
  console.log('\n=== 2. INGESTING 39 BUNNY STREAM VIDEOS (LIBRARY 606386) ===');
  const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos?page=1&itemsPerPage=100`, {
    headers: { AccessKey: BUNNY_API_KEY, accept: 'application/json' },
  });
  const data = await res.json();
  const videos = data.items || [];
  console.log(`Fetched ${videos.length} videos from Bunny Stream Library ${LIBRARY_ID}`);

  let queuedCount = 0;
  for (const v of videos) {
    const playUrl = `https://iframe.mediadelivery.net/play/${LIBRARY_ID}/${v.guid}`;
    const { lang, moduleId, topic } = classifyVideo(v.title, v.collectionId || '');

    const crypto = await import('node:crypto');
    const urlHash = crypto.createHash('sha256').update(playUrl).digest('hex');

    // Ingest into ingestion table
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_rag_video_ingestion_sql (
        id, url_hash, source_url, provider, module_id, title, topic, language,
        status, original_file_url, created_by, attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `bunny_${v.guid}`,
        urlHash,
        playUrl,
        'bunny',
        moduleId,
        v.title,
        topic,
        lang,
        'completed', // Registered directly into the system
        `https://vz-d0769ece-079.b-cdn.net/${v.guid}/play_720p.mp4`,
        'system_bunny_sync',
        1,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });

    // Also register into mohan_rag_sources_sql so RAG can search and cite these exact Bunny videos!
    const sourceId = `source_bunny_${v.guid}`;
    const sourceContent = `Title: ${v.title}
Module: ${moduleId.toUpperCase()}
Topic: ${topic}
Language: ${lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English'}
Video Duration: ${Math.round((v.length || 0) / 60)} minutes
Direct Playback URL: ${playUrl}
Curriculum Context: Official Mohan Sir Video Recording from Swar Yoga Master Archive (Bunny Stream Library ${LIBRARY_ID}).
Authentic Swar Yoga teachings by Mohan Sir on ${topic}.`;

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_rag_sources_sql (
        id, module_id, title, content, topic, language, source_type,
        source_reference, original_file_name, original_file_url,
        original_mime_type, extraction_type, status, created_by,
        reviewed_by, reviewed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sourceId,
        moduleId,
        v.title,
        sourceContent,
        topic,
        lang,
        'bunny_stream',
        playUrl,
        `${v.title}.mp4`,
        playUrl,
        'video/mp4',
        'bunny_stream_library_catalog',
        'approved',
        'system_bunny_sync',
        'Mohan Kalburgi',
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    });

    queuedCount++;
  }

  console.log(`✓ Successfully ingested and cataloged all ${queuedCount} videos into Mohan RAG knowledge sources!`);
}

async function main() {
  await syncAvatarLooks();
  await ingestBunnyLibraryVideos();
  console.log('\n=== ALL COMPLETE! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

