import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { MASTER_BACKGROUNDS, MASTER_CLOTHING } from './avatarStudioMasterConfig';

// 1. Interfaces
export interface VideoAvatar {
  id: string;
  name: string;
  originalVideoUrl?: string;
  thumbnailUrl: string;
  cutoutUrl?: string;
  transparentAvatarUrl?: string;
  faceDataJson?: string;
  languageCapabilities: string[];
  status: 'ready' | 'processing' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface VoiceAvatar {
  id: string;
  name: string;
  sampleAudioUrl?: string;
  gender: 'male' | 'female' | 'neutral';
  supportedLanguages: string[];
  speakingStyle: string;
  pitch: number;
  speed: number;
  tone: string;
  quality: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinalAvatar {
  id: string;
  name: string;
  videoAvatarId: string;
  voiceAvatarId: string;
  backgroundId?: string;
  clothingId?: string;
  defaultSpeakingStyle: string;
  defaultEmotion: string;
  defaultLanguage: string;
  previewImageUrl: string;
  customCutoutUrl?: string;
  framingJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TextGrammarProject {
  id: string;
  title: string;
  language: string;
  originalText: string;
  correctedText: string;
  improvedText: string;
  status: 'draft' | 'approved' | 'sent_to_translation' | 'sent_to_video';
  createdAt: string;
  updatedAt: string;
}

export interface MultilingualTextProject {
  id: string;
  title: string;
  sourceLanguage: string;
  sourceText: string;
  translationsJson: string; // Record<string, string>
  createdAt: string;
  updatedAt: string;
}

export interface VideoProductionProject {
  id: string;
  title: string;
  contentType: 'full_video' | 'shorts' | 'live_avatar';
  finalAvatarId: string;
  scriptText: string;
  timelineJson?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: '720p' | '1080p' | '4k';
  targetLanguages: string[];
  status: 'draft' | 'synthesizing' | 'rendering' | 'completed' | 'published';
  outputVideosJson?: string;
  createdAt: string;
  updatedAt: string;
}

let studioSchemaInitialized = false;

export async function initStudioSchema(): Promise<void> {
  if (studioSchemaInitialized) return;

  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS studio_video_avatars_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_video_url TEXT,
        thumbnail_url TEXT NOT NULL,
        face_data_json TEXT,
        language_capabilities_json TEXT,
        status TEXT DEFAULT 'ready',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS studio_voice_avatars_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sample_audio_url TEXT,
        gender TEXT DEFAULT 'male',
        supported_languages_json TEXT,
        speaking_style TEXT DEFAULT 'teaching',
        pitch REAL DEFAULT 1.0,
        speed REAL DEFAULT 1.0,
        tone TEXT DEFAULT 'calm',
        quality TEXT DEFAULT 'hd_studio',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS studio_final_avatars_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        video_avatar_id TEXT NOT NULL,
        voice_avatar_id TEXT NOT NULL,
        background_id TEXT,
        clothing_id TEXT,
        default_speaking_style TEXT DEFAULT 'teaching',
        default_emotion TEXT DEFAULT 'smile:80',
        default_language TEXT DEFAULT 'hi',
        preview_image_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS studio_text_grammar_sql (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        language TEXT DEFAULT 'hi',
        original_text TEXT NOT NULL,
        corrected_text TEXT,
        improved_text TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS studio_multilingual_text_sql (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_language TEXT DEFAULT 'hi',
        source_text TEXT NOT NULL,
        translations_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS studio_video_production_sql (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content_type TEXT DEFAULT 'full_video',
        final_avatar_id TEXT,
        script_text TEXT NOT NULL,
        timeline_json TEXT,
        aspect_ratio TEXT DEFAULT '16:9',
        resolution TEXT DEFAULT '1080p',
        target_languages_json TEXT,
        status TEXT DEFAULT 'draft',
        output_videos_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
  ]);

  // Seed default Mohan Sir Digital Twin Video Avatar & Voice if empty
  const videoCount = await bunnyExecute({ sql: 'SELECT COUNT(*) as cnt FROM studio_video_avatars_sql' });
  if (Number(videoCount.rows[0]?.cnt || 0) === 0) {
    const now = new Date().toISOString();
    await bunnyBatch([
      {
        sql: `INSERT OR REPLACE INTO studio_video_avatars_sql (
          id, name, original_video_url, thumbnail_url, language_capabilities_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'v_avatar_mohan_sir',
          'Mohan Sir (Swar Yoga Founder - Vedic Twin)',
          'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
          JSON.stringify(['hi', 'mr', 'en', 'gu', 'kn', 'ta', 'te', 'bn']),
          'ready',
          now,
          now,
        ],
      },
      {
        sql: `INSERT OR REPLACE INTO studio_video_avatars_sql (
          id, name, original_video_url, thumbnail_url, language_capabilities_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'v_avatar_chef_mohan',
          'Mohan Sir (Ayurvedic Chef & Kitchen Studio)',
          'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
          'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop&q=80',
          JSON.stringify(['hi', 'mr', 'en', 'gu']),
          'ready',
          now,
          now,
        ],
      },
      {
        sql: `INSERT OR REPLACE INTO studio_voice_avatars_sql (
          id, name, gender, supported_languages_json, speaking_style, pitch, speed, tone, quality, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'voice_mohan_sir_authoritative',
          'Mohan Sir - Authoritative Guru Voice',
          'male',
          JSON.stringify(['hi', 'mr', 'en', 'sa']),
          'teaching',
          1.0,
          1.0,
          'calm_resonant',
          '24bit_96khz_neural',
          now,
          now,
        ],
      },
      {
        sql: `INSERT OR REPLACE INTO studio_voice_avatars_sql (
          id, name, gender, supported_languages_json, speaking_style, pitch, speed, tone, quality, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'voice_mohan_sir_conversational',
          'Mohan Sir - Conversational & Kitchen Host',
          'male',
          JSON.stringify(['hi', 'mr', 'en', 'gu', 'kn']),
          'conversational',
          1.05,
          1.05,
          'warm_approachable',
          '24bit_96khz_neural',
          now,
          now,
        ],
      },
      {
        sql: `INSERT OR REPLACE INTO studio_final_avatars_sql (
          id, name, video_avatar_id, voice_avatar_id, background_id, clothing_id, default_speaking_style, default_emotion, default_language, preview_image_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'final_avatar_kitchen_guru',
          'Swar Yoga Kitchen Master (सत्त्विक रसोई)',
          'v_avatar_chef_mohan',
          'voice_mohan_sir_conversational',
          'bg_kitchen',
          'cloth_chef_apron',
          'conversational',
          'smile:80',
          'hi',
          'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
          now,
          now,
        ],
      },
      {
        sql: `INSERT OR REPLACE INTO studio_final_avatars_sql (
          id, name, video_avatar_id, voice_avatar_id, background_id, clothing_id, default_speaking_style, default_emotion, default_language, preview_image_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'final_avatar_vedic_ashram',
          'Swar Yoga Breath Master (वैदिक साधना)',
          'v_avatar_mohan_sir',
          'voice_mohan_sir_authoritative',
          'bg_meditation_room',
          'cloth_white_kurta',
          'teaching',
          'spiritual:95',
          'hi',
          'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
          now,
          now,
        ],
      },
    ]);
  }

  studioSchemaInitialized = true;
}

// 2. Video Avatars CRUD
export async function listVideoAvatars(): Promise<VideoAvatar[]> {
  await initStudioSchema();
  // Ensure columns exist
  try {
    await bunnyExecute({ sql: 'ALTER TABLE studio_video_avatars_sql ADD COLUMN cutout_url TEXT' });
  } catch {}
  try {
    await bunnyExecute({ sql: 'ALTER TABLE studio_video_avatars_sql ADD COLUMN transparent_avatar_url TEXT' });
  } catch {}

  const res = await bunnyExecute({ sql: 'SELECT * FROM studio_video_avatars_sql ORDER BY created_at DESC' });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    originalVideoUrl: row.original_video_url ? String(row.original_video_url) : undefined,
    thumbnailUrl: String(row.thumbnail_url),
    cutoutUrl: row.cutout_url ? String(row.cutout_url) : (row.transparent_avatar_url ? String(row.transparent_avatar_url) : undefined),
    transparentAvatarUrl: row.transparent_avatar_url ? String(row.transparent_avatar_url) : (row.cutout_url ? String(row.cutout_url) : undefined),
    faceDataJson: row.face_data_json || undefined,
    languageCapabilities: JSON.parse(row.language_capabilities_json || '["hi","mr","en"]'),
    status: row.status as any,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function saveVideoAvatar(data: Partial<VideoAvatar>): Promise<VideoAvatar> {
  await initStudioSchema();
  const id = data.id || `v_avatar_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  const cutout = data.cutoutUrl || data.transparentAvatarUrl || null;
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO studio_video_avatars_sql (
      id, name, original_video_url, thumbnail_url, cutout_url, transparent_avatar_url, face_data_json, language_capabilities_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.name || 'Untitled Video Avatar',
      data.originalVideoUrl || null,
      data.thumbnailUrl || 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
      cutout,
      cutout,
      data.faceDataJson || null,
      JSON.stringify(data.languageCapabilities || ['hi', 'mr', 'en']),
      data.status || 'ready',
      data.createdAt || now,
      now,
    ],
  });
  return {
    id,
    name: data.name || 'Untitled Video Avatar',
    originalVideoUrl: data.originalVideoUrl,
    thumbnailUrl: data.thumbnailUrl || 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
    cutoutUrl: cutout || undefined,
    transparentAvatarUrl: cutout || undefined,
    faceDataJson: data.faceDataJson,
    languageCapabilities: data.languageCapabilities || ['hi', 'mr', 'en'],
    status: data.status || 'ready',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteVideoAvatar(id: string): Promise<boolean> {
  await initStudioSchema();
  await bunnyExecute({ sql: 'DELETE FROM studio_video_avatars_sql WHERE id = ?', args: [id] });
  return true;
}

// 3. Voice Avatars CRUD
export async function listVoiceAvatars(): Promise<VoiceAvatar[]> {
  await initStudioSchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM studio_voice_avatars_sql ORDER BY created_at DESC' });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    sampleAudioUrl: row.sample_audio_url ? String(row.sample_audio_url) : undefined,
    gender: (row.gender || 'male') as any,
    supportedLanguages: JSON.parse(row.supported_languages_json || '["hi","mr","en"]'),
    speakingStyle: String(row.speaking_style || 'teaching'),
    pitch: Number(row.pitch || 1.0),
    speed: Number(row.speed || 1.0),
    tone: String(row.tone || 'calm'),
    quality: String(row.quality || 'hd_studio'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function saveVoiceAvatar(data: Partial<VoiceAvatar>): Promise<VoiceAvatar> {
  await initStudioSchema();
  const id = data.id || `voice_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO studio_voice_avatars_sql (
      id, name, sample_audio_url, gender, supported_languages_json, speaking_style, pitch, speed, tone, quality, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.name || 'Untitled Voice Avatar',
      data.sampleAudioUrl || null,
      data.gender || 'male',
      JSON.stringify(data.supportedLanguages || ['hi', 'mr', 'en']),
      data.speakingStyle || 'teaching',
      data.pitch || 1.0,
      data.speed || 1.0,
      data.tone || 'calm',
      data.quality || 'hd_studio',
      data.createdAt || now,
      now,
    ],
  });
  return {
    id,
    name: data.name || 'Untitled Voice Avatar',
    sampleAudioUrl: data.sampleAudioUrl,
    gender: data.gender || 'male',
    supportedLanguages: data.supportedLanguages || ['hi', 'mr', 'en'],
    speakingStyle: data.speakingStyle || 'teaching',
    pitch: data.pitch || 1.0,
    speed: data.speed || 1.0,
    tone: data.tone || 'calm',
    quality: data.quality || 'hd_studio',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteVoiceAvatar(id: string): Promise<boolean> {
  await initStudioSchema();
  await bunnyExecute({ sql: 'DELETE FROM studio_voice_avatars_sql WHERE id = ?', args: [id] });
  return true;
}

// 4. Final Avatars CRUD
export async function listFinalAvatars(): Promise<FinalAvatar[]> {
  await initStudioSchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM studio_final_avatars_sql ORDER BY created_at DESC' });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    videoAvatarId: String(row.video_avatar_id),
    voiceAvatarId: String(row.voice_avatar_id),
    backgroundId: row.background_id ? String(row.background_id) : undefined,
    clothingId: row.clothing_id ? String(row.clothing_id) : undefined,
    defaultSpeakingStyle: String(row.default_speaking_style || 'teaching'),
    defaultEmotion: String(row.default_emotion || 'smile:80'),
    defaultLanguage: String(row.default_language || 'hi'),
    previewImageUrl: String(row.preview_image_url || ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function saveFinalAvatar(data: Partial<FinalAvatar>): Promise<FinalAvatar> {
  await initStudioSchema();
  const id = data.id || `final_avatar_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO studio_final_avatars_sql (
      id, name, video_avatar_id, voice_avatar_id, background_id, clothing_id, default_speaking_style, default_emotion, default_language, preview_image_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.name || 'Untitled Final Avatar',
      data.videoAvatarId || 'v_avatar_mohan_sir',
      data.voiceAvatarId || 'voice_mohan_sir_authoritative',
      data.backgroundId || 'bg_meditation_room',
      data.clothingId || 'cloth_white_kurta',
      data.defaultSpeakingStyle || 'teaching',
      data.defaultEmotion || 'smile:80',
      data.defaultLanguage || 'hi',
      data.previewImageUrl || 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
      data.createdAt || now,
      now,
    ],
  });
  return {
    id,
    name: data.name || 'Untitled Final Avatar',
    videoAvatarId: data.videoAvatarId || 'v_avatar_mohan_sir',
    voiceAvatarId: data.voiceAvatarId || 'voice_mohan_sir_authoritative',
    backgroundId: data.backgroundId,
    clothingId: data.clothingId,
    defaultSpeakingStyle: data.defaultSpeakingStyle || 'teaching',
    defaultEmotion: data.defaultEmotion || 'smile:80',
    defaultLanguage: data.defaultLanguage || 'hi',
    previewImageUrl: data.previewImageUrl || 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteFinalAvatar(id: string): Promise<boolean> {
  await initStudioSchema();
  await bunnyExecute({ sql: 'DELETE FROM studio_final_avatars_sql WHERE id = ?', args: [id] });
  return true;
}

// 5. Grammar Projects CRUD
export async function listGrammarProjects(): Promise<TextGrammarProject[]> {
  await initStudioSchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM studio_text_grammar_sql ORDER BY created_at DESC LIMIT 30' });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    language: String(row.language || 'hi'),
    originalText: String(row.original_text),
    correctedText: String(row.corrected_text || ''),
    improvedText: String(row.improved_text || ''),
    status: row.status as any,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function saveGrammarProject(data: Partial<TextGrammarProject>): Promise<TextGrammarProject> {
  await initStudioSchema();
  const id = data.id || `grammar_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO studio_text_grammar_sql (
      id, title, language, original_text, corrected_text, improved_text, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.title || 'Untitled Grammar Project',
      data.language || 'hi',
      data.originalText || '',
      data.correctedText || '',
      data.improvedText || '',
      data.status || 'draft',
      data.createdAt || now,
      now,
    ],
  });
  return {
    id,
    title: data.title || 'Untitled Grammar Project',
    language: data.language || 'hi',
    originalText: data.originalText || '',
    correctedText: data.correctedText || '',
    improvedText: data.improvedText || '',
    status: data.status || 'draft',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

// 6. Multilingual Text Projects CRUD
export async function listMultilingualProjects(): Promise<MultilingualTextProject[]> {
  await initStudioSchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM studio_multilingual_text_sql ORDER BY created_at DESC LIMIT 30' });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    sourceLanguage: String(row.source_language || 'hi'),
    sourceText: String(row.source_text),
    translationsJson: String(row.translations_json || '{}'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function saveMultilingualProject(data: Partial<MultilingualTextProject>): Promise<MultilingualTextProject> {
  await initStudioSchema();
  const id = data.id || `multilang_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO studio_multilingual_text_sql (
      id, title, source_language, source_text, translations_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.title || 'Untitled Multilingual Project',
      data.sourceLanguage || 'hi',
      data.sourceText || '',
      data.translationsJson || '{}',
      data.createdAt || now,
      now,
    ],
  });
  return {
    id,
    title: data.title || 'Untitled Multilingual Project',
    sourceLanguage: data.sourceLanguage || 'hi',
    sourceText: data.sourceText || '',
    translationsJson: data.translationsJson || '{}',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

// 7. Video Production Projects CRUD
export async function listProductionProjects(): Promise<VideoProductionProject[]> {
  await initStudioSchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM studio_video_production_sql ORDER BY created_at DESC LIMIT 30' });
  return res.rows.map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    contentType: (row.content_type || 'full_video') as any,
    finalAvatarId: String(row.final_avatar_id || ''),
    scriptText: String(row.script_text || ''),
    timelineJson: row.timeline_json || undefined,
    aspectRatio: (row.aspect_ratio || '16:9') as any,
    resolution: (row.resolution || '1080p') as any,
    targetLanguages: JSON.parse(row.target_languages_json || '["hi","mr","en"]'),
    status: row.status as any,
    outputVideosJson: row.output_videos_json || undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function saveProductionProject(data: Partial<VideoProductionProject>): Promise<VideoProductionProject> {
  await initStudioSchema();
  const id = data.id || `prod_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO studio_video_production_sql (
      id, title, content_type, final_avatar_id, script_text, timeline_json, aspect_ratio, resolution, target_languages_json, status, output_videos_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.title || 'Untitled Video Production Project',
      data.contentType || 'full_video',
      data.finalAvatarId || 'final_avatar_kitchen_guru',
      data.scriptText || '',
      data.timelineJson || null,
      data.aspectRatio || '16:9',
      data.resolution || '1080p',
      JSON.stringify(data.targetLanguages || ['hi', 'mr', 'en']),
      data.status || 'draft',
      data.outputVideosJson || null,
      data.createdAt || now,
      now,
    ],
  });
  return {
    id,
    title: data.title || 'Untitled Video Production Project',
    contentType: data.contentType || 'full_video',
    finalAvatarId: data.finalAvatarId || 'final_avatar_kitchen_guru',
    scriptText: data.scriptText || '',
    timelineJson: data.timelineJson,
    aspectRatio: data.aspectRatio || '16:9',
    resolution: data.resolution || '1080p',
    targetLanguages: data.targetLanguages || ['hi', 'mr', 'en'],
    status: data.status || 'draft',
    outputVideosJson: data.outputVideosJson,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}
