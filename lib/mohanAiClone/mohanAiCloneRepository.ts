import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export interface MediaAssetRecord {
  id: string;
  project_id: string;
  asset_type: 'original_video' | 'extracted_audio' | 'keyframe' | 'clip' | 'render';
  storage_object_key: string;
  cdn_url: string;
  file_checksum_sha256: string;
  file_size_bytes: number;
  duration_seconds: number;
  resolution_w?: number;
  resolution_h?: number;
  fps?: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegmentRecord {
  id: string;
  asset_id: string;
  segment_index: number;
  start_ms: number;
  end_ms: number;
  text_content: string;
  language: string;
  words_timing_json?: string;
  speaking_wpm: number;
  pause_duration_after_ms: number;
  voice_pitch_emphasis?: string;
  observed_emotion: string;
  emotion_confidence: number;
  observed_expression: string;
  observed_gesture?: string;
  observed_posture?: string;
  human_verified: number;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface TranslationSegmentRecord {
  id: string;
  transcript_segment_id: string;
  target_language: string;
  translated_text: string;
  terminology_checked: number;
  flagged_terms_json?: string;
  syllable_count?: number;
  estimated_speech_duration_ms?: number;
  human_approved: number;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface AiJobRecord {
  id: string;
  project_id: string;
  asset_id?: string;
  stage: 'audio_extraction' | 'frame_extraction' | 'transcription' | 'facial_analysis' | 'gesture_analysis' | 'performance_dna' | 'translation' | 'voice_generation' | 'lip_sync' | 'rendering' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  progress_pct: number;
  provider_name: string;
  provider_job_id?: string;
  retry_count: number;
  max_retries: number;
  error_log?: string;
  stage_input_json?: string;
  stage_output_json?: string;
  processing_cost_usd: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AvatarVersionRecord {
  id: string;
  version_tag: string;
  identity_name: string;
  face_model_ref: string;
  voice_clone_id: string;
  clothing_preset_id: string;
  camera_profile: string;
  consent_record_url?: string;
  is_active_master: number;
  created_at: string;
  updated_at: string;
}

export interface VideoIntelligenceRecord {
  id: string;
  video_name: string;
  video_url: string;
  duration_seconds: number;
  language: string;
  transcript_json: string; // JSON array of segments
  analysis_status: 'pending' | 'analyzing' | 'ready' | 'approved' | 'error';
  confidence_overall: number;
  approved_by?: string;
  rag_status: 'unindexed' | 'pending_approval' | 'indexed' | 'rejected';
  rag_category?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceDnaRecord {
  id: string;
  source_video_id: string;
  phrase_text: string;
  start_ms: number;
  end_ms: number;
  emotion: string;
  facial_expression: string;
  head_movement: string;
  hand_gesture: string;
  body_posture: string;
  speaking_speed: number;
  voice_emphasis: string;
  confidence_score: number;
  clip_video_url?: string;
  is_approved: number;
  created_at: string;
}

let schemaInitialized = false;

export async function initMohanCloneSchema(): Promise<void> {
  if (schemaInitialized) return;

  await bunnyBatch([
    // 1. Normalized Media Assets Table (Bunny Storage Keys + Hashes)
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_media_assets_sql (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        storage_object_key TEXT NOT NULL,
        cdn_url TEXT NOT NULL,
        file_checksum_sha256 TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        duration_seconds REAL DEFAULT 0.0,
        resolution_w INTEGER,
        resolution_h INTEGER,
        fps REAL,
        mime_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_media_project_type ON mohan_media_assets_sql(project_id, asset_type)`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_media_checksum ON mohan_media_assets_sql(file_checksum_sha256)`,
    },

    // 2. Normalized Transcript Segments Table (Word Timestamps, Emotion, Gestures)
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_transcript_segments_sql (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES mohan_media_assets_sql(id) ON DELETE CASCADE,
        segment_index INTEGER NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        text_content TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'hi',
        words_timing_json TEXT,
        speaking_wpm REAL DEFAULT 120.0,
        pause_duration_after_ms INTEGER DEFAULT 0,
        voice_pitch_emphasis TEXT,
        observed_emotion TEXT NOT NULL,
        emotion_confidence REAL NOT NULL,
        observed_expression TEXT NOT NULL,
        observed_gesture TEXT,
        observed_posture TEXT,
        human_verified INTEGER DEFAULT 0,
        verified_by TEXT,
        verified_at TEXT,
        created_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_transcript_asset_idx ON mohan_transcript_segments_sql(asset_id, segment_index)`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_transcript_timing ON mohan_transcript_segments_sql(asset_id, start_ms)`,
    },

    // 3. Translation Segments Table (Linked to Transcript, Terminology Guarded)
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_translation_segments_sql (
        id TEXT PRIMARY KEY,
        transcript_segment_id TEXT NOT NULL REFERENCES mohan_transcript_segments_sql(id) ON DELETE CASCADE,
        target_language TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        terminology_checked INTEGER DEFAULT 0,
        flagged_terms_json TEXT,
        syllable_count INTEGER,
        estimated_speech_duration_ms INTEGER,
        human_approved INTEGER DEFAULT 0,
        approved_by TEXT,
        approved_at TEXT,
        created_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_translation_seg_lang ON mohan_translation_segments_sql(transcript_segment_id, target_language)`,
    },

    // 4. Asynchronous Background Jobs Table (Resumable, Retries, Costs)
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_ai_jobs_sql (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        asset_id TEXT REFERENCES mohan_media_assets_sql(id),
        stage TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress_pct INTEGER DEFAULT 0,
        provider_name TEXT NOT NULL,
        provider_job_id TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_log TEXT,
        stage_input_json TEXT,
        stage_output_json TEXT,
        processing_cost_usd REAL DEFAULT 0.0,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_ai_jobs_proj_stage ON mohan_ai_jobs_sql(project_id, stage, status)`,
    },

    // 5. Decoupled Avatar Versions Table (Version Tags, Likeness Consent)
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_avatar_versions_sql (
        id TEXT PRIMARY KEY,
        version_tag TEXT NOT NULL UNIQUE,
        identity_name TEXT NOT NULL DEFAULT 'Mohanji Swar Yoga Master',
        face_model_ref TEXT NOT NULL,
        voice_clone_id TEXT NOT NULL,
        clothing_preset_id TEXT NOT NULL,
        camera_profile TEXT DEFAULT 'medium_close_up',
        consent_record_url TEXT,
        is_active_master INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },

    // 6. Yoga Motion Catalog (Safety First: is_anatomically_verified DEFAULT 0)
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_yoga_motion_sql (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        sanskrit_name TEXT NOT NULL,
        english_name TEXT NOT NULL,
        instruction_text TEXT NOT NULL,
        breath_timing_json TEXT NOT NULL,
        target_dosha TEXT,
        swar_alignment TEXT,
        is_anatomically_verified INTEGER DEFAULT 0,
        manual_review_status TEXT DEFAULT 'pending',
        reviewer_notes TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        demo_video_url TEXT,
        created_at TEXT NOT NULL
      )`,
    },

    // 7. Video Intelligence High-Level Projects & Performance DNA
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_video_intelligence_sql (
        id TEXT PRIMARY KEY,
        video_name TEXT NOT NULL,
        video_url TEXT NOT NULL,
        duration_seconds REAL DEFAULT 0.0,
        language TEXT DEFAULT 'hi',
        transcript_json TEXT,
        analysis_status TEXT DEFAULT 'pending',
        confidence_overall REAL DEFAULT 0.0,
        approved_by TEXT,
        rag_status TEXT DEFAULT 'unindexed',
        rag_category TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_performance_dna_sql (
        id TEXT PRIMARY KEY,
        source_video_id TEXT NOT NULL,
        phrase_text TEXT NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        emotion TEXT NOT NULL,
        facial_expression TEXT NOT NULL,
        head_movement TEXT,
        hand_gesture TEXT,
        body_posture TEXT,
        speaking_speed REAL DEFAULT 1.0,
        voice_emphasis TEXT,
        confidence_score REAL NOT NULL,
        clip_video_url TEXT,
        is_approved INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_scene_library_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position_id TEXT NOT NULL,
        background_id TEXT NOT NULL,
        clothing_preset_id TEXT NOT NULL,
        camera_framing TEXT DEFAULT 'medium_close_up',
        custom_background_url TEXT,
        created_at TEXT NOT NULL
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_export_projects_sql (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        source_video_id TEXT,
        target_languages_json TEXT NOT NULL,
        aspect_ratios_json TEXT NOT NULL,
        storage_folder_path TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    },
  ]);

  schemaInitialized = true;
}

// ── 1. VIDEO INTELLIGENCE OPERATIONS ──
export async function getAllVideoIntelligence(): Promise<VideoIntelligenceRecord[]> {
  await initMohanCloneSchema();
  const res = await bunnyExecute(
    `SELECT * FROM mohan_video_intelligence_sql ORDER BY created_at DESC`,
  );
  return (res.rows || []) as unknown as VideoIntelligenceRecord[];
}

export async function getVideoIntelligenceById(id: string): Promise<VideoIntelligenceRecord | null> {
  await initMohanCloneSchema();
  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_video_intelligence_sql WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (!res.rows || res.rows.length === 0) return null;
  return res.rows[0] as unknown as VideoIntelligenceRecord;
}

export async function saveVideoIntelligence(record: Partial<VideoIntelligenceRecord>): Promise<VideoIntelligenceRecord> {
  await initMohanCloneSchema();
  const now = new Date().toISOString();
  const id = record.id || `mvi_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  await bunnyExecute({
    sql: `INSERT INTO mohan_video_intelligence_sql 
          (id, video_name, video_url, duration_seconds, language, transcript_json, analysis_status, confidence_overall, approved_by, rag_status, rag_category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            video_name = excluded.video_name,
            video_url = excluded.video_url,
            duration_seconds = excluded.duration_seconds,
            language = excluded.language,
            transcript_json = excluded.transcript_json,
            analysis_status = excluded.analysis_status,
            confidence_overall = excluded.confidence_overall,
            approved_by = excluded.approved_by,
            rag_status = excluded.rag_status,
            rag_category = excluded.rag_category,
            updated_at = excluded.updated_at`,
    args: [
      id,
      record.video_name || 'Untitled Video',
      record.video_url || '',
      record.duration_seconds || 0,
      record.language || 'hi',
      record.transcript_json || '[]',
      record.analysis_status || 'pending',
      record.confidence_overall || 0.85,
      record.approved_by || null,
      record.rag_status || 'unindexed',
      record.rag_category || null,
      record.created_at || now,
      now,
    ],
  });

  return (await getVideoIntelligenceById(id))!;
}

// ── 2. PERFORMANCE DNA OPERATIONS ──
export async function getAllPerformanceDna(approvedOnly = false): Promise<PerformanceDnaRecord[]> {
  await initMohanCloneSchema();
  const sql = approvedOnly
    ? `SELECT * FROM mohan_performance_dna_sql WHERE is_approved = 1 ORDER BY created_at DESC`
    : `SELECT * FROM mohan_performance_dna_sql ORDER BY created_at DESC`;
  const res = await bunnyExecute(sql);
  return (res.rows || []) as unknown as PerformanceDnaRecord[];
}

export async function savePerformanceDna(dna: Partial<PerformanceDnaRecord>): Promise<PerformanceDnaRecord> {
  await initMohanCloneSchema();
  const now = new Date().toISOString();
  const id = dna.id || `dna_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  await bunnyExecute({
    sql: `INSERT INTO mohan_performance_dna_sql
          (id, source_video_id, phrase_text, start_ms, end_ms, emotion, facial_expression, head_movement, hand_gesture, body_posture, speaking_speed, voice_emphasis, confidence_score, clip_video_url, is_approved, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            phrase_text = excluded.phrase_text,
            start_ms = excluded.start_ms,
            end_ms = excluded.end_ms,
            emotion = excluded.emotion,
            facial_expression = excluded.facial_expression,
            head_movement = excluded.head_movement,
            hand_gesture = excluded.hand_gesture,
            body_posture = excluded.body_posture,
            speaking_speed = excluded.speaking_speed,
            voice_emphasis = excluded.voice_emphasis,
            confidence_score = excluded.confidence_score,
            clip_video_url = excluded.clip_video_url,
            is_approved = excluded.is_approved`,
    args: [
      id,
      dna.source_video_id || 'manual_entry',
      dna.phrase_text || '',
      dna.start_ms || 0,
      dna.end_ms || 0,
      dna.emotion || 'calm',
      dna.facial_expression || 'serene',
      dna.head_movement || 'still',
      dna.hand_gesture || 'none',
      dna.body_posture || 'standing',
      dna.speaking_speed || 1.0,
      dna.voice_emphasis || 'neutral',
      dna.confidence_score || 0.9,
      dna.clip_video_url || null,
      dna.is_approved ? 1 : 0,
      dna.created_at || now,
    ],
  });

  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_performance_dna_sql WHERE id = ? LIMIT 1`,
    args: [id],
  });
  return res.rows[0] as unknown as PerformanceDnaRecord;
}

export async function approvePerformanceDna(id: string, isApproved = true): Promise<void> {
  await initMohanCloneSchema();
  await bunnyExecute({
    sql: `UPDATE mohan_performance_dna_sql SET is_approved = ? WHERE id = ?`,
    args: [isApproved ? 1 : 0, id],
  });
}

