import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  MASTER_ANCHOR_VIDEOS,
  MASTER_VOICE_PROFILES,
  ALL_34_PROFESSIONS,
  MASTER_WARDROBES,
  MASTER_ENVIRONMENTS,
} from './avatarMasterCatalog';

export interface AvatarGenerationJob {
  id: string;
  user_id?: string;
  avatar_profile_id: string;
  anchor_video_id: string;
  voice_profile_id: string;
  profession_id: string;
  wardrobe_id: string;
  environment_id: string;
  camera_framing: string;
  language: string;
  script_text: string;
  caption_style: string;
  resolution: string;
  duration_seconds: number;
  selected_model: string;
  gpu_provider: string;
  status: 'created' | 'preparing_assets' | 'audio_generation' | 'gpu_inference' | 'lip_sync' | 'rendering' | 'cdn_upload' | 'completed' | 'failed';
  progress_pct: number;
  output_video_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface AvatarGenerationOutput {
  id: string;
  job_id: string;
  title: string;
  profession_id: string;
  profession_name: string;
  language: string;
  duration_seconds: number;
  resolution: string;
  video_url: string;
  thumbnail_url: string;
  ai_model: string;
  voice_type: string;
  is_module8_synced: number;
  created_at: string;
}

let isInitialized = false;

export async function initAvatarStudioDb(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Generation Jobs Table
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS avatar_generation_jobs_sql (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'admin_mohan',
        avatar_profile_id TEXT NOT NULL,
        anchor_video_id TEXT NOT NULL,
        voice_profile_id TEXT NOT NULL,
        profession_id TEXT NOT NULL,
        wardrobe_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        camera_framing TEXT DEFAULT 'chest_up',
        language TEXT DEFAULT 'hi',
        script_text TEXT NOT NULL,
        caption_style TEXT DEFAULT 'default',
        resolution TEXT DEFAULT '1080p',
        duration_seconds REAL DEFAULT 30,
        selected_model TEXT DEFAULT 'LivePortrait + Wav2Lip',
        gpu_provider TEXT DEFAULT 'google_colab_t4',
        status TEXT DEFAULT 'created',
        progress_pct INTEGER DEFAULT 0,
        output_video_url TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      )
    `);

    // 2. Generation Outputs / Final Library Table
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS avatar_generation_outputs_sql (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        title TEXT NOT NULL,
        profession_id TEXT NOT NULL,
        profession_name TEXT NOT NULL,
        language TEXT DEFAULT 'hi',
        duration_seconds REAL DEFAULT 30,
        resolution TEXT DEFAULT '1080p',
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        ai_model TEXT DEFAULT 'LivePortrait + Wav2Lip',
        voice_type TEXT DEFAULT 'mohan_authentic_clone',
        is_module8_synced INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      )
    `);

    // 3. AI Model Registry Table
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS avatar_model_registry_sql (
        id TEXT PRIMARY KEY,
        model_name TEXT NOT NULL,
        provider TEXT NOT NULL,
        license TEXT NOT NULL,
        gpu_requirement TEXT NOT NULL,
        vram_requirement TEXT NOT NULL,
        installation_status TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        test_status TEXT DEFAULT 'UNTESTED',
        notes TEXT,
        updated_at TEXT NOT NULL
      )
    `);

    // 4. Seed initial known models if table is empty
    const checkModels = await bunnyExecute(`SELECT COUNT(*) as cnt FROM avatar_model_registry_sql`);
    const count = Number(checkModels.rows?.[0]?.cnt || 0);

    if (count === 0) {
      const now = new Date().toISOString();
      const models = [
        ['liveportrait', 'LivePortrait (Kuaishou)', 'Kuaishou / Open Source', 'MIT License (Commercial Friendly)', 'NVIDIA T4 / A10G', '12 GB VRAM', 'READY_COLAB', 1, 'VERIFIED_GPU', 'High fidelity facial motion and expression transfer', now],
        ['wav2lip_gan', 'Wav2Lip + GFPGAN 1080p', 'Rudrabha / Open Source', 'MIT / Academic & Commercial', 'NVIDIA T4 / CPU', '6 GB VRAM', 'READY_COLAB', 1, 'VERIFIED_GPU', 'Precise phoneme lip synchronization with GFPGAN face restoration', now],
        ['indic_f5_tts', 'IndicF5-TTS Voice Cloning', 'AI4Bharat / Open Source', 'CC-BY-4.0', 'NVIDIA T4 / CPU', '8 GB VRAM', 'PROTOTYPE', 1, 'TESTED', 'Few-shot Indian accent voice cloning for Hindi & Marathi', now],
        ['sadtalker', 'SadTalker (Talking Head)', 'OpenAvatar / Open Source', 'CC BY-NC 4.0', 'NVIDIA T4', '8 GB VRAM', 'AVAILABLE', 0, 'UNTESTED', 'Still photo to talking animation', now],
      ];

      for (const m of models) {
        await bunnyExecute({
          sql: `INSERT OR REPLACE INTO avatar_model_registry_sql (id, model_name, provider, license, gpu_requirement, vram_requirement, installation_status, is_active, test_status, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: m,
        });
      }
    }

    isInitialized = true;
  } catch (err) {
    console.error('Failed to init avatar studio DB:', err);
  }
}

