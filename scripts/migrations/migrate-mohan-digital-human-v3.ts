import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Clean helper for environment variables
function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.replace(/\r/g, '').replace(/\n/g, '').replace(/^["']|["']$/g, '').trim();
}

// Read env from .env.local or process.env
let dbUrl = cleanEnv(process.env.BUNNY_DATABASE_URL);
let dbToken = cleanEnv(process.env.BUNNY_DATABASE_AUTH_TOKEN);

if (!dbUrl || !dbToken) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const urlMatch = content.match(/^BUNNY_DATABASE_URL=(.*)$/m);
    const tokenMatch = content.match(/^BUNNY_DATABASE_AUTH_TOKEN=(.*)$/m);
    if (urlMatch) dbUrl = cleanEnv(urlMatch[1]);
    if (tokenMatch) dbToken = cleanEnv(tokenMatch[1]);
  }
}

if (!dbUrl || !dbToken) {
  console.error('❌ Bunny Database URL or Auth Token missing. Aborting migration.');
  process.exit(1);
}

const client = createClient({
  url: dbUrl,
  authToken: dbToken,
});

async function runMigration() {
  console.log('🚀 Starting Mohan Digital Human v3.0 Database Migration (Bunny Edge SQL)...');

  const statements = [
    // 1. Projects
    `CREATE TABLE IF NOT EXISTS mohan_projects_sql (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 2. Training Projects (The 20-Video Master Training Set)
    `CREATE TABLE IF NOT EXISTS mohan_clone_training_projects_sql (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      target_identity_name TEXT NOT NULL DEFAULT 'Mohan Kalburgi',
      status TEXT NOT NULL DEFAULT 'draft',
      total_videos INTEGER NOT NULL DEFAULT 0,
      approved_videos INTEGER NOT NULL DEFAULT 0,
      coverage_score REAL NOT NULL DEFAULT 0.0,
      coverage_report_json TEXT,
      master_avatar_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 3. Individual Training Videos (Max 20 Per Project, Unique Slot Number)
    `CREATE TABLE IF NOT EXISTS mohan_clone_training_videos_sql (
      id TEXT PRIMARY KEY,
      training_project_id TEXT NOT NULL,
      slot_number INTEGER NOT NULL,
      original_filename TEXT NOT NULL,
      storage_object_key TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_checksum_sha256 TEXT,
      duration_seconds REAL NOT NULL DEFAULT 0,
      resolution_width INTEGER NOT NULL DEFAULT 1280,
      resolution_height INTEGER NOT NULL DEFAULT 720,
      frame_rate REAL NOT NULL DEFAULT 30,
      audio_sample_rate INTEGER NOT NULL DEFAULT 44100,
      audio_snr_db REAL NOT NULL DEFAULT 0,
      face_visibility_score REAL NOT NULL DEFAULT 0,
      body_visibility_score REAL NOT NULL DEFAULT 0,
      lighting_score REAL NOT NULL DEFAULT 0,
      analysis_status TEXT NOT NULL DEFAULT 'pending',
      analysis_metrics_json TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(training_project_id, slot_number),
      FOREIGN KEY (training_project_id) REFERENCES mohan_clone_training_projects_sql(id) ON DELETE CASCADE
    );`,

    // 4. Master Face Identity Profile
    `CREATE TABLE IF NOT EXISTS mohan_face_identity_sql (
      id TEXT PRIMARY KEY,
      training_project_id TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0',
      face_shape TEXT NOT NULL DEFAULT 'oval',
      landmarks_3d_json TEXT,
      forehead_ratio REAL,
      eye_spacing REAL,
      jaw_width REAL,
      skin_tone_hex TEXT,
      natural_asymmetry_metrics_json TEXT,
      reference_frame_keys_json TEXT,
      approval_status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (training_project_id) REFERENCES mohan_clone_training_projects_sql(id) ON DELETE CASCADE
    );`,

    // 5. Dedicated Lip, Teeth & Smile Intelligence
    `CREATE TABLE IF NOT EXISTS mohan_lip_smile_profiles_sql (
      id TEXT PRIMARY KEY,
      face_identity_id TEXT NOT NULL,
      upper_lip_thickness REAL,
      lower_lip_thickness REAL,
      mouth_width_rest REAL,
      mouth_width_smile REAL,
      teeth_exposure_ratio REAL,
      smile_types_json TEXT,
      phoneme_viseme_map_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (face_identity_id) REFERENCES mohan_face_identity_sql(id) ON DELETE CASCADE
    );`,

    // 6. Facial Expression & Emotion Library
    `CREATE TABLE IF NOT EXISTS mohan_expression_library_sql (
      id TEXT PRIMARY KEY,
      training_project_id TEXT NOT NULL,
      expression_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'teaching',
      source_video_id TEXT,
      source_timestamp_start REAL,
      source_timestamp_end REAL,
      intensity REAL NOT NULL DEFAULT 1.0,
      landmark_deltas_json TEXT,
      reference_thumbnail_key TEXT,
      confidence_score REAL NOT NULL DEFAULT 0.0,
      human_verification_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (training_project_id) REFERENCES mohan_clone_training_projects_sql(id) ON DELETE CASCADE
    );`,

    // 7. Full Body Identity Profile
    `CREATE TABLE IF NOT EXISTS mohan_body_identity_sql (
      id TEXT PRIMARY KEY,
      training_project_id TEXT NOT NULL,
      shoulder_width_ratio REAL,
      torso_ratio REAL,
      arm_span_ratio REAL,
      posture_type TEXT NOT NULL DEFAULT 'upright_guru',
      keypoints_3d_json TEXT,
      reference_frame_keys_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (training_project_id) REFERENCES mohan_clone_training_projects_sql(id) ON DELETE CASCADE
    );`,

    // 8. Body Pose Library (Sitting, Standing, Meditation, Asanas)
    `CREATE TABLE IF NOT EXISTS mohan_body_pose_library_sql (
      id TEXT PRIMARY KEY,
      pose_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'teaching',
      camera_distance TEXT NOT NULL DEFAULT 'medium',
      keypoint_structure_json TEXT,
      reference_image_key TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 9. Hand & Teaching Gestures Library
    `CREATE TABLE IF NOT EXISTS mohan_gesture_library_sql (
      id TEXT PRIMARY KEY,
      gesture_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'teaching',
      source_video_id TEXT,
      timestamp_start REAL,
      timestamp_end REAL,
      keyframe_motion_json TEXT,
      confidence_score REAL NOT NULL DEFAULT 0.0,
      human_verification_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 10. Voice Identity & Audio Clones
    `CREATE TABLE IF NOT EXISTS mohan_voice_identity_sql (
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (training_project_id) REFERENCES mohan_clone_training_projects_sql(id) ON DELETE CASCADE
    );`,

    // 11. Wardrobe & Clothing Library
    `CREATE TABLE IF NOT EXISTS mohan_wardrobe_library_sql (
      id TEXT PRIMARY KEY,
      clothing_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'indian',
      color_hex TEXT,
      fabric_description TEXT,
      front_image_key TEXT NOT NULL,
      back_image_key TEXT,
      side_image_key TEXT,
      fabric_texture_key TEXT,
      is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 12. Scene Background Library
    `CREATE TABLE IF NOT EXISTS mohan_scene_library_sql (
      id TEXT PRIMARY KEY,
      scene_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'ashram',
      background_type TEXT NOT NULL DEFAULT 'image',
      storage_object_key TEXT NOT NULL,
      preview_url TEXT NOT NULL,
      lighting_preset TEXT NOT NULL DEFAULT 'warm_natural',
      is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 13. Reusable Appearance Presets
    `CREATE TABLE IF NOT EXISTS mohan_appearance_presets_sql (
      id TEXT PRIMARY KEY,
      preset_name TEXT NOT NULL,
      hairstyle_id TEXT NOT NULL,
      hair_length TEXT NOT NULL DEFAULT 'medium',
      hair_texture TEXT NOT NULL DEFAULT 'wavy',
      hair_density REAL NOT NULL DEFAULT 1.0,
      hair_color_hex TEXT NOT NULL DEFAULT '#1a1a1a',
      grey_percentage INTEGER NOT NULL DEFAULT 0,
      hairline_style TEXT NOT NULL DEFAULT 'natural',
      parting_style TEXT NOT NULL DEFAULT 'side',
      eyebrow_style TEXT NOT NULL DEFAULT 'natural',
      facial_hair_id TEXT NOT NULL DEFAULT 'guru_beard',
      beard_length TEXT NOT NULL DEFAULT 'medium',
      beard_color_hex TEXT NOT NULL DEFAULT '#1a1a1a',
      moustache_style TEXT NOT NULL DEFAULT 'classic',
      spectacles_id TEXT NOT NULL DEFAULT 'none',
      clothing_id TEXT NOT NULL,
      default_background_id TEXT NOT NULL DEFAULT 'himalayas',
      default_camera_view TEXT NOT NULL DEFAULT 'waist',
      is_favorite BOOLEAN NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 14. Performance DNA Library
    `CREATE TABLE IF NOT EXISTS mohan_performance_dna_sql (
      id TEXT PRIMARY KEY,
      training_project_id TEXT NOT NULL,
      dna_name TEXT NOT NULL,
      speaking_style TEXT NOT NULL,
      wpm_range TEXT NOT NULL DEFAULT '120-140',
      pause_frequency TEXT NOT NULL DEFAULT 'moderate',
      gesture_affinity_json TEXT,
      smile_frequency_ratio REAL NOT NULL DEFAULT 0.25,
      source_video_id TEXT,
      timestamp_start REAL,
      timestamp_end REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 15. Master Clone Versions (v1.0, v1.1, etc.)
    `CREATE TABLE IF NOT EXISTS mohan_clone_versions_sql (
      id TEXT PRIMARY KEY,
      version_tag TEXT NOT NULL UNIQUE,
      training_project_id TEXT NOT NULL,
      face_identity_id TEXT NOT NULL,
      voice_identity_id TEXT NOT NULL,
      body_identity_id TEXT NOT NULL,
      is_active_master BOOLEAN NOT NULL DEFAULT 0,
      release_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (training_project_id) REFERENCES mohan_clone_training_projects_sql(id)
    );`,

    // 16. Background AI Processing Jobs
    `CREATE TABLE IF NOT EXISTS mohan_ai_jobs_sql (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      job_type TEXT NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL,
      provider_job_id TEXT,
      idempotency_key TEXT UNIQUE,
      attempt_number INTEGER NOT NULL DEFAULT 0,
      heartbeat_at TEXT,
      locked_until TEXT,
      cost_estimate_usd REAL DEFAULT 0.0,
      actual_cost_usd REAL DEFAULT 0.0,
      error_log TEXT,
      input_payload_json TEXT,
      output_result_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 17. Generated Video Projects (The Main Output)
    `CREATE TABLE IF NOT EXISTS mohan_generated_video_projects_sql (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      script_text TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'hi',
      appearance_preset_id TEXT,
      voice_identity_id TEXT,
      camera_view TEXT NOT NULL DEFAULT 'waist',
      aspect_ratio TEXT NOT NULL DEFAULT '16:9',
      timeline_segments_json TEXT,
      generated_audio_url TEXT,
      final_video_url TEXT,
      storage_object_key TEXT,
      subtitles_vtt_key TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      render_duration_seconds REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 18. Transcript Segments (Linked to Video & Performance)
    `CREATE TABLE IF NOT EXISTS mohan_transcript_segments_sql (
      id TEXT PRIMARY KEY,
      source_video_id TEXT NOT NULL,
      start_ms INTEGER NOT NULL,
      end_ms INTEGER NOT NULL,
      speaker_label TEXT DEFAULT 'Mohan Kalburgi',
      original_text TEXT NOT NULL,
      corrected_text TEXT,
      confidence_score REAL DEFAULT 0.95,
      emotion_detected TEXT DEFAULT 'neutral',
      gesture_detected TEXT DEFAULT 'neutral',
      is_approved BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 19. Translation Segments (Linked to Original Transcripts)
    `CREATE TABLE IF NOT EXISTS mohan_translation_segments_sql (
      id TEXT PRIMARY KEY,
      transcript_segment_id TEXT NOT NULL,
      target_language TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      is_approved BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transcript_segment_id) REFERENCES mohan_transcript_segments_sql(id) ON DELETE CASCADE
    );`,

    // 20. Provider Usage & Real Cost Tracking
    `CREATE TABLE IF NOT EXISTS mohan_provider_usage_sql (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      provider_name TEXT NOT NULL,
      model_name TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      duration_seconds REAL,
      tokens_used INTEGER,
      cost_usd REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,

    // 21. Audit & Change Logs
    `CREATE TABLE IF NOT EXISTS mohan_audit_logs_sql (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      old_value_json TEXT,
      new_value_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.execute(stmt);
      const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS ([a-z0-9_]+)/i)?.[1] || `table_${i}`;
      console.log(`✅ [${i + 1}/${statements.length}] Synced table: ${tableName}`);
    } catch (err: any) {
      console.error(`❌ Failed statement ${i + 1}:`, err.message);
    }
  }

  // Verify all tables exist
  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'mohan_%' ORDER BY name ASC");
  console.log('\n📊 Tables Verified in Bunny Database:');
  for (const row of res.rows) {
    console.log(` - ${row.name}`);
  }

  console.log(`\n🎉 Phase 1 Database Migration Complete! Total Mohan SQL Tables: ${res.rows.length}`);
}

runMigration().catch((e) => {
  console.error('Fatal Migration Error:', e);
  process.exit(1);
});

