import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface FacialAngleReference {
  angle: 'frontal' | 'left_profile' | 'right_profile' | 'three_quarter_left' | 'three_quarter_right' | 'close_texture';
  label: string;
  url: string;
  resolution: string;
  isMasterAnchor: boolean;
}

export interface ExpressionProfile {
  id: string;
  name: string;
  emotion: 'smile_warm' | 'neutral_serene' | 'teaching_authority' | 'punchline_humor' | 'inquisitive_eyebrow' | 'satsang_focus';
  landmarkPoints: number;
  sampleVideoUrl: string;
  referenceImageUrl: string;
  intensity: number;
}

export interface VideoDnaReference {
  id: string;
  title: string;
  category: string;
  durationSeconds: number;
  videoUrl: string;
  thumbnailUrl: string;
  emotionProfile: string;
}

export interface GenerationModeConfig {
  id: 'talking_presenter' | 'full_body_professional' | 'walking_gesturing' | 'teaching_lecture' | 'news_corporate' | 'cinematic_professional' | 'custom_scene';
  nameEn: string;
  nameHi: string;
  description: string;
  status: 'PLANNED_NOT_IMPLEMENTED';
  aspectRatios: ('16:9' | '9:16' | '1:1')[];
  defaultCameraFraming: string;
  bodyMotionIntensity: number; // 0.0 to 1.0
  gestureFrequency: 'subtle' | 'moderate' | 'dynamic';
}

export interface MasterIdentityRecord {
  identity_id: string;
  name: string;
  version: string;
  dataset_manifest_json: string;
  landmark_embedding_json: string;
  approved_reference_images_json: string;
  training_history_json: string;
  model_compatibility_json: string;
  identity_quality_score: number | null;
  validation_results_json: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const MOHAN_SIR_MASTER_IDENTITY_ID = 'MOHAN_SIR_MASTER_IDENTITY';

export const MASTER_ANGLES: FacialAngleReference[] = [];

export const MASTER_EXPRESSION_PROFILES: ExpressionProfile[] = [];

export const MASTER_GENERATION_MODES: GenerationModeConfig[] = [
  {
    id: 'talking_presenter',
    nameEn: 'A. Talking Presenter Videos',
    nameHi: 'A. टॉकिंग प्रिजेंटर वीडियो',
    description: 'Planned mode only. No in-house real-time renderer or generation pipeline is connected.',
    status: 'PLANNED_NOT_IMPLEMENTED',
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultCameraFraming: 'chest_up',
    bodyMotionIntensity: 0.35,
    gestureFrequency: 'subtle',
  },
  {
    id: 'full_body_professional',
    nameEn: 'B. Full-Body Professional Videos',
    nameHi: 'B. फुल-बॉडी प्रोफेशनल वीडियो',
    description: 'Planned mode only. No in-house real-time renderer or generation pipeline is connected.',
    status: 'PLANNED_NOT_IMPLEMENTED',
    aspectRatios: ['16:9', '9:16'],
    defaultCameraFraming: 'full_body',
    bodyMotionIntensity: 0.65,
    gestureFrequency: 'moderate',
  },
  {
    id: 'walking_gesturing',
    nameEn: 'C. Walking and Gesturing Videos',
    nameHi: 'C. वॉकिंग व जेस्चरिंग वीडियो',
    description: 'Planned mode only. No in-house real-time renderer or generation pipeline is connected.',
    status: 'PLANNED_NOT_IMPLEMENTED',
    aspectRatios: ['16:9', '9:16'],
    defaultCameraFraming: 'waist_up',
    bodyMotionIntensity: 0.85,
    gestureFrequency: 'dynamic',
  },
  {
    id: 'teaching_lecture',
    nameEn: 'D. Teaching & Lecture Videos',
    nameHi: 'D. शिक्षण व व्याख्यान वीडियो',
    description: 'Planned mode only. No in-house real-time renderer or generation pipeline is connected.',
    status: 'PLANNED_NOT_IMPLEMENTED',
    aspectRatios: ['16:9'],
    defaultCameraFraming: 'presenter_slides',
    bodyMotionIntensity: 0.5,
    gestureFrequency: 'moderate',
  },
  {
    id: 'news_corporate',
    nameEn: 'E. News & Corporate Presentation Videos',
    nameHi: 'E. समाचार व कॉर्पोरेट प्रस्तुति वीडियो',
    description: 'Planned mode only. No in-house real-time renderer or generation pipeline is connected.',
    status: 'PLANNED_NOT_IMPLEMENTED',
    aspectRatios: ['16:9'],
    defaultCameraFraming: 'seated_presenter',
    bodyMotionIntensity: 0.3,
    gestureFrequency: 'subtle',
  },
  {
    id: 'cinematic_professional',
    nameEn: 'F. Cinematic Professional Videos',
    nameHi: 'F. सिनेमैटिक प्रोफेशनल वीडियो',
    description: 'Planned mode only. No in-house real-time renderer or generation pipeline is connected.',
    status: 'PLANNED_NOT_IMPLEMENTED',
    aspectRatios: ['16:9', '9:16'],
    defaultCameraFraming: 'chest_up',
    bodyMotionIntensity: 0.45,
    gestureFrequency: 'subtle',
  },
  {
    id: 'custom_scene',
    nameEn: 'G. Custom Scene Generation',
    nameHi: 'G. कस्टम सीन जेनरेशन',
    description: 'Planned mode only. No in-house real-time renderer or generation pipeline is connected.',
    status: 'PLANNED_NOT_IMPLEMENTED',
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultCameraFraming: 'chest_up',
    bodyMotionIntensity: 0.5,
    gestureFrequency: 'moderate',
  },
];

/**
 * Initializes the mohan_master_identity_sql table and registers MOHAN_SIR_MASTER_IDENTITY
 */
export async function initMasterIdentityDatabase(): Promise<void> {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS mohan_master_identity_sql (
      identity_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      dataset_manifest_json TEXT NOT NULL,
      landmark_embedding_json TEXT NOT NULL,
      approved_reference_images_json TEXT NOT NULL,
      training_history_json TEXT NOT NULL,
      model_compatibility_json TEXT NOT NULL,
      identity_quality_score REAL DEFAULT NULL,
      validation_results_json TEXT,
      status TEXT DEFAULT 'REFERENCE_ONLY',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const looksRes = await bunnyExecute({
    sql: `SELECT id, title, video_url, thumbnail_url, look_category, emotion_profile, duration_seconds
          FROM mohan_avatar_dna_looks_sql LIMIT 39`,
    args: [],
  });
  const dnaVideos: VideoDnaReference[] = (looksRes.rows || []).map((row) => ({
    id: String(row['id'] ?? ''),
    title: String(row['title'] ?? ''),
    category: String(row['look_category'] ?? ''),
    durationSeconds: Number(row['duration_seconds'] ?? 0),
    videoUrl: String(row['video_url'] ?? ''),
    thumbnailUrl: String(row['thumbnail_url'] ?? ''),
    emotionProfile: String(row['emotion_profile'] ?? ''),
  }));
  const sourceCatalogRes = await bunnyExecute({
    sql: `SELECT source_type, COUNT(*) AS count
          FROM mohan_rag_sources_sql
          WHERE source_type IN ('youtube', 'bunny_stream', 'mp4')
          GROUP BY source_type`,
    args: [],
  });
  const sourceTypeCounts = Object.fromEntries(
    (sourceCatalogRes.rows || []).map((row) => [
      String(row['source_type'] ?? ''),
      Number(row['count'] ?? 0),
    ])
  );
  const cataloguedMediaCount = Object.values(sourceTypeCounts).reduce((total, count) => total + count, 0);
  const now = new Date().toISOString();
  const datasetManifest = {
    identity_id: MOHAN_SIR_MASTER_IDENTITY_ID,
    status: 'METADATA_ONLY_NOT_ANALYZED',
    target: 'real_time_3d_chest_up',
    source_video_count: {
      catalogued_media_count: cataloguedMediaCount,
      catalog_type_counts: sourceTypeCounts,
      catalog_snapshot_verified: true,
      analyzed: 0,
    },
    dna_video_references: {
      loaded_metadata_count: dnaVideos.length,
      analyzed: 0,
      records: dnaVideos,
    },
    note: 'Catalog counts describe Bunny SQL metadata only, not verified playback, consent, media quality, reconstruction, or identity training.',
  };
  const landmarkEmbedding = {
    status: 'NOT_GENERATED',
    reason: 'No face-landmark or identity-embedding inference is configured.',
  };
  const modelCompatibility = {
    real_time_3d_twin: {
      status: 'NOT_IMPLEMENTED',
      supported: false,
    },
  };
  const validationResults = {
    status: 'NOT_RUN',
    overall_identity_fidelity: null,
    reason: 'No rendered twin or identity-validation inference is available.',
  };

  await bunnyExecute({
    sql: `INSERT INTO mohan_master_identity_sql
          (identity_id, name, version, dataset_manifest_json, landmark_embedding_json,
           approved_reference_images_json, training_history_json, model_compatibility_json,
           identity_quality_score, validation_results_json, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(identity_id) DO UPDATE SET
            name = excluded.name,
            version = excluded.version,
            dataset_manifest_json = excluded.dataset_manifest_json,
            landmark_embedding_json = excluded.landmark_embedding_json,
            approved_reference_images_json = excluded.approved_reference_images_json,
            training_history_json = excluded.training_history_json,
            model_compatibility_json = excluded.model_compatibility_json,
            identity_quality_score = NULL,
            validation_results_json = excluded.validation_results_json,
            status = excluded.status,
            updated_at = excluded.updated_at`,
    args: [
      MOHAN_SIR_MASTER_IDENTITY_ID,
      'मोहन कलबुर्गी (Mohan Kalburgi) – Reference Identity Profile',
      '0.1.0-reference-only',
      JSON.stringify(datasetManifest),
      JSON.stringify(landmarkEmbedding),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify(modelCompatibility),
      null,
      JSON.stringify(validationResults),
      'REFERENCE_ONLY',
      now,
      now,
    ],
  });
}

/**
 * Reports validation as unavailable until a real face-analysis pipeline is configured.
 */
export async function validateVideoIdentityConsistency(_videoUrl: string): Promise<{
  available: boolean;
  passed: boolean;
  score: null;
  sampledTimestamps: [];
  message: string;
}> {
  return {
    available: false,
    passed: false,
    score: null,
    sampledTimestamps: [],
    message: 'Identity validation is unavailable: no configured face-analysis inference has run.',
  };
}
