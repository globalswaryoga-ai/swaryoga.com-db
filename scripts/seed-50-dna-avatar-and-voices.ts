import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { bunnyExecute, bunnyBatch } from '../lib/bunnyDatabase';
import { AVATAR_DNA_50_CATALOG, MOHAN_VOCAL_DNA_MODELS } from '../lib/mohanAiClone/avatarDna50Catalog';

async function seedDnaCatalog() {
  console.log('🚀 Starting Seeding of 50 DNA Avatar Looks and Vocal Models to Bunny Database...');

  // 1. Ensure Table Structure for mohan_avatar_dna_looks_sql
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS mohan_avatar_dna_looks_sql (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      heading TEXT NOT NULL,
      description TEXT NOT NULL,
      video_url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      look_category TEXT NOT NULL DEFAULT 'vedic_traditional',
      outfit_style TEXT NOT NULL DEFAULT '',
      emotion_profile TEXT NOT NULL DEFAULT '',
      speaking_tone TEXT NOT NULL DEFAULT '',
      duration_seconds REAL DEFAULT 0.0,
      is_active INTEGER NOT NULL DEFAULT 0,
      source_type TEXT NOT NULL DEFAULT 'direct_mp4',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 2. Ensure Table Structure for mohan_avatar_vocal_dna_sql
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS mohan_avatar_vocal_dna_sql (
      id TEXT PRIMARY KEY,
      language TEXT NOT NULL,
      tone_name TEXT NOT NULL,
      pitch_hz INTEGER NOT NULL DEFAULT 130,
      cadence_words_per_minute INTEGER NOT NULL DEFAULT 115,
      characteristic TEXT NOT NULL DEFAULT '',
      sample_phrase TEXT NOT NULL DEFAULT '',
      audio_sample_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 3. Ensure Table Structure for mohan_voice_identity_sql
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS mohan_voice_identity_sql (
      id TEXT PRIMARY KEY,
      training_project_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'elevenlabs',
      provider_voice_id TEXT NOT NULL,
      voice_name TEXT NOT NULL DEFAULT 'Mohan Master Voice',
      fundamental_pitch_hz REAL,
      speaking_rate_wpm REAL,
      supported_languages_json TEXT,
      terminology_pronunciation_overrides_json TEXT,
      sample_audio_keys_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Upsert all 50 Avatars into mohan_avatar_dna_looks_sql
  const now = new Date().toISOString();
  console.log(`📦 Upserting ${AVATAR_DNA_50_CATALOG.length} DNA Avatar Looks...`);
  
  const avatarStatements = AVATAR_DNA_50_CATALOG.map((item, index) => {
    return {
      sql: `INSERT INTO mohan_avatar_dna_looks_sql (
        id, title, heading, description, video_url, thumbnail_url,
        look_category, outfit_style, emotion_profile, speaking_tone,
        duration_seconds, is_active, source_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        heading = excluded.heading,
        description = excluded.description,
        video_url = excluded.video_url,
        thumbnail_url = excluded.thumbnail_url,
        look_category = excluded.look_category,
        outfit_style = excluded.outfit_style,
        emotion_profile = excluded.emotion_profile,
        speaking_tone = excluded.speaking_tone,
        duration_seconds = excluded.duration_seconds,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      args: [
        item.id,
        item.name,
        item.heading,
        item.description,
        item.videoUrl,
        item.thumbnailUrl,
        item.category,
        item.outfitStyle,
        item.emotionProfile,
        item.speakingTone,
        item.durationSeconds,
        index === 0 ? 1 : 0,
        'direct_mp4',
        now,
        now,
      ],
    };
  });

  // Execute in batches of 10 to ensure safety on libSQL
  for (let i = 0; i < avatarStatements.length; i += 10) {
    const chunk = avatarStatements.slice(i, i + 10);
    await bunnyBatch(chunk);
    console.log(`  ✓ Inserted avatars ${i + 1} to ${Math.min(i + 10, avatarStatements.length)}`);
  }

  // Upsert all 8 Vocal DNA Models into mohan_avatar_vocal_dna_sql
  console.log(`🎙️ Upserting ${MOHAN_VOCAL_DNA_MODELS.length} Vocal DNA Models...`);
  for (const voice of MOHAN_VOCAL_DNA_MODELS) {
    await bunnyExecute({
      sql: `INSERT INTO mohan_avatar_vocal_dna_sql (
        id, language, tone_name, pitch_hz, cadence_words_per_minute,
        characteristic, sample_phrase, audio_sample_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        language = excluded.language,
        tone_name = excluded.tone_name,
        pitch_hz = excluded.pitch_hz,
        cadence_words_per_minute = excluded.cadence_words_per_minute,
        characteristic = excluded.characteristic,
        sample_phrase = excluded.sample_phrase,
        audio_sample_url = excluded.audio_sample_url,
        updated_at = excluded.updated_at`,
      args: [
        voice.id,
        voice.language,
        voice.toneName,
        voice.pitchHz,
        voice.cadenceWordsPerMinute,
        voice.characteristic,
        voice.samplePhrase,
        voice.audioSampleUrl,
        now,
        now,
      ],
    });

    // Also populate mohan_voice_identity_sql for standard identity querying
    await bunnyExecute({
      sql: `INSERT INTO mohan_voice_identity_sql (
        id, training_project_id, provider, provider_voice_id, voice_name,
        fundamental_pitch_hz, speaking_rate_wpm, supported_languages_json,
        terminology_pronunciation_overrides_json, sample_audio_keys_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        voice_name = excluded.voice_name,
        provider_voice_id = excluded.provider_voice_id,
        fundamental_pitch_hz = excluded.fundamental_pitch_hz,
        speaking_rate_wpm = excluded.speaking_rate_wpm,
        supported_languages_json = excluded.supported_languages_json`,
      args: [
        voice.id,
        'mohan_master_clone_proj_v1',
        'edge_tts_inhouse',
        voice.providerVoiceId,
        voice.toneName,
        voice.pitchHz,
        voice.cadenceWordsPerMinute,
        JSON.stringify([voice.language, 'hi', 'en', 'mr']),
        JSON.stringify({
          'स्वर योग': 'Swar Yoga',
          'प्राणायाम': 'Pranayama',
          'सूर्य नाड़ी': 'Surya Nadi',
          'चंद्र नाड़ी': 'Chandra Nadi',
          'सुषुम्ना': 'Sushumna',
          'जठराग्नि': 'Jatharagni',
        }),
        JSON.stringify([voice.audioSampleUrl]),
        now,
      ],
    });
    console.log(`  ✓ Vocal DNA registered: ${voice.id} (${voice.languageLabel})`);
  }

  // Verification counts
  const avatarCount = await bunnyExecute('SELECT count(*) as cnt FROM mohan_avatar_dna_looks_sql');
  const vocalCount = await bunnyExecute('SELECT count(*) as cnt FROM mohan_avatar_vocal_dna_sql');
  const identityCount = await bunnyExecute('SELECT count(*) as cnt FROM mohan_voice_identity_sql');

  console.log('\n🎉 VERIFICATION SUCCESS:');
  console.log(`  • mohan_avatar_dna_looks_sql total: ${avatarCount.rows[0].cnt}`);
  console.log(`  • mohan_avatar_vocal_dna_sql total: ${vocalCount.rows[0].cnt}`);
  console.log(`  • mohan_voice_identity_sql total:   ${identityCount.rows[0].cnt}`);
}

seedDnaCatalog()
  .then(() => {
    console.log('✅ Seeding completed cleanly!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
