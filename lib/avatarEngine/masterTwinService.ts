import crypto from 'node:crypto';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { InhouseAudioService } from './inhouseAudioService';
import { InhouseVideoService } from './inhouseVideoService';

export interface MasterTwinBeautySettings {
  glowLevel: number; // 0 - 100%
  skinSmoothing: number; // 0 - 100%
  studioLight: 'golden_hour' | 'vedic_divine' | 'ashram_natural' | 'studio_softbox';
  beautyFilterActive: boolean;
  hairLookStyle: 'natural_short' | 'classic_vedic' | 'groom_sharp';
}

export interface MasterTwinFeatureClip {
  id: string;
  category: 'expression' | 'motion' | 'voice' | 'lecture' | 'posture';
  subType: 'smile' | 'thoughtful' | 'neutral' | 'sitting' | 'standing' | 'walking' | 'running' | 'yoga_asana' | 'laugh';
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  qualityScore: number;
  description?: string;
  createdAt: string;
}

export interface MasterTwinVaultStats {
  storageZone: string;
  cdnBaseUrl: string;
  allocatedGB: number; // 10 GB dedicated per avatar
  usedVideoGB: number;
  usedAudioHours: number;
  targetVideosCount: number; // 10 - 20 3-min videos
  targetAudioHours: number; // 2 - 3 hours of lectures
  nuanceChecklist: {
    facialMicroExpressions: boolean;
    sittingPadmasana: boolean;
    walkingGait: boolean;
    runningVitality: boolean;
    yogaAsanaMudras: boolean;
    deepVoiceResonance: boolean;
    conversationalLecture: boolean;
    sanskritMantras: boolean;
  };
}

export interface MasterTwinProfile {
  id: string;
  name: string;
  title: string;
  totalTrainingMinutes: number;
  totalClipsCount: number;
  beautySettings: MasterTwinBeautySettings;
  defaultVoiceId: string;
  defaultLanguage: string;
  defaultPosture: 'sitting' | 'standing' | 'walking' | 'running' | 'yoga';
  featureClips: MasterTwinFeatureClip[];
  vaultStats?: MasterTwinVaultStats;
  updatedAt: string;
}

export interface CreateAutonomousAvatarInput {
  avatarCode?: string; // 9-numerical code (e.g. 849201835)
  avatarName: string;
  mainLanguage: string;
  overallBrief: string;
  videos: Array<{
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    brief?: string;
    category?: 'expression' | 'motion' | 'posture' | 'lecture';
    subType?: string;
  }>;
}

export interface CreateAutonomousAvatarResult {
  avatarId: string;
  avatarCode: string;
  name: string;
  mainLanguage: string;
  totalTrainingMinutes: number;
  totalClipsCount: number;
  status: string;
}

export const DEFAULT_MASTER_TWIN_PROFILE: MasterTwinProfile = {
  id: 'mohan_kalburgi_master_twin',
  name: 'Mohan Kalburgi',
  title: 'Vedic Master & Ayurvedic Nutritionist',
  totalTrainingMinutes: 12.5,
  totalClipsCount: 4,
  beautySettings: {
    glowLevel: 75,
    skinSmoothing: 80,
    studioLight: 'vedic_divine',
    beautyFilterActive: true,
    hairLookStyle: 'classic_vedic',
  },
  defaultVoiceId: 'hi-IN-MadhurNeural',
  defaultLanguage: 'hi',
  defaultPosture: 'sitting',
  featureClips: [
    {
      id: 'clip_exp_smile_01',
      category: 'expression',
      subType: 'smile',
      title: 'Warm Guru Smile & Natural Eye Blinks',
      videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
      thumbnailUrl: 'https://resource2.heygen.ai/best_frame_selection/candidates/6252d07df49247eaa5413ebbbb35fcd0.jpg',
      durationSeconds: 180,
      qualityScore: 99,
      description: 'Authentic warm welcoming expression with micro eye-movements and smiling wrinkles.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_motion_sitting_02',
      category: 'motion',
      subType: 'sitting',
      title: 'Padmasana & Sukhasana Lotus Posture',
      videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
      durationSeconds: 180,
      qualityScore: 98,
      description: 'Seated lotus meditation posture with upright spine and calm breathing flow.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_motion_walking_03',
      category: 'motion',
      subType: 'walking',
      title: 'Mindful Garden Walk & Posture Gait',
      videoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/thumbnails/8f9280a32e94603307e5312213efd5465c5cbbddcdf9793026e0ce31c3b760b6.jpg',
      durationSeconds: 184,
      qualityScore: 98,
      description: 'Slow mindful walking gait for outdoor nature and ashram garden sequences.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_motion_yoga_04',
      category: 'motion',
      subType: 'yoga_asana',
      title: 'Pranayama & Swar Yoga Demonstration',
      videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
      durationSeconds: 180,
      qualityScore: 99,
      description: 'Nadi Shodhana and Chandra Bhedana breath demonstration with hand mudras.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_360_rotation_05',
      category: 'motion',
      subType: 'standing',
      title: 'Mohan Sir 360° Rotational Angle Anchor (Standing)',
      videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_01.jpg',
      durationSeconds: 28,
      qualityScore: 99,
      description: 'Full 360-degree rotational angle anchor recorded at 60fps for 3D body and posture mesh.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_360_gait_06',
      category: 'motion',
      subType: 'walking',
      title: 'Mohan Sir Slow Turn & Kinetic Walking Gait',
      videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_02.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_15.jpg',
      durationSeconds: 26,
      qualityScore: 98,
      description: 'Slow turning and kinetic walking balance with natural head-to-toe stride.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_mudra_upper_07',
      category: 'motion',
      subType: 'yoga_asana',
      title: 'Mohan Sir Mudra & Upper Body Flow Calibration',
      videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_03.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_30.jpg',
      durationSeconds: 31,
      qualityScore: 99,
      description: 'Upper torso breath expansion and yogic mudra kinematics.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_facial_micro_08',
      category: 'expression',
      subType: 'neutral',
      title: 'Mohan Sir Facial Micro-Expressions & Eye Blink Track',
      videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_04.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_45.jpg',
      durationSeconds: 19,
      qualityScore: 99,
      description: 'Facial micro-expressions, subtle smile, brow articulation, and blink rate calibration.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_speech_resonance_09',
      category: 'voice',
      subType: 'thoughtful',
      title: 'Mohan Sir Conversational Speech & Breath Resonance',
      videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_05.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_01.jpg',
      durationSeconds: 41,
      qualityScore: 100,
      description: 'Deep resonant voice audio with Sanskrit mantra phonetics and conversational cadence.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_semi_profile_10',
      category: 'lecture',
      subType: 'thoughtful',
      title: 'Mohan Sir 45° Semi-Profile Angle Discourse',
      videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_06.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_20.jpg',
      durationSeconds: 23,
      qualityScore: 98,
      description: '45-degree angle profile speaking posture for multi-camera master clone switching.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'clip_smile_aura_11',
      category: 'expression',
      subType: 'smile',
      title: 'Mohan Sir Close-Up Smile & Meditative Gaze Rig',
      videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_07.mp4',
      thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_01.jpg',
      durationSeconds: 6,
      qualityScore: 100,
      description: 'Warm authentic Vedic smile and welcoming meditative gaze anchor.',
      createdAt: new Date().toISOString(),
    },
  ],
  updatedAt: new Date().toISOString(),
};

export class MasterTwinService {
  private static schemaReady = false;

  public static async initSchema(): Promise<void> {
    if (this.schemaReady) return;

    await bunnyBatch([
      {
        sql: `CREATE TABLE IF NOT EXISTS studio_master_twin_profile_sql (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          title TEXT,
          beauty_settings_json TEXT,
          default_voice_id TEXT DEFAULT 'hi-IN-MadhurNeural',
          default_language TEXT DEFAULT 'hi',
          default_posture TEXT DEFAULT 'sitting',
          total_training_minutes REAL DEFAULT 12.0,
          updated_at TEXT NOT NULL
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS studio_twin_feature_bank_sql (
          id TEXT PRIMARY KEY,
          twin_id TEXT NOT NULL,
          category TEXT NOT NULL,
          sub_type TEXT NOT NULL,
          title TEXT NOT NULL,
          video_url TEXT NOT NULL,
          thumbnail_url TEXT,
          duration_seconds REAL DEFAULT 180,
          quality_score REAL DEFAULT 98,
          description TEXT,
          created_at TEXT NOT NULL
        )`,
      },
    ]);

    // Seed master profile if empty
    const countRes = await bunnyExecute({
      sql: `SELECT COUNT(*) as cnt FROM studio_master_twin_profile_sql WHERE id = ?`,
      args: ['mohan_kalburgi_master_twin'],
    });

    if (Number(countRes.rows[0]?.cnt || 0) === 0) {
      const now = new Date().toISOString();
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO studio_master_twin_profile_sql (
          id, name, title, beauty_settings_json, default_voice_id, default_language, default_posture, total_training_minutes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          DEFAULT_MASTER_TWIN_PROFILE.id,
          DEFAULT_MASTER_TWIN_PROFILE.name,
          DEFAULT_MASTER_TWIN_PROFILE.title,
          JSON.stringify(DEFAULT_MASTER_TWIN_PROFILE.beautySettings),
          DEFAULT_MASTER_TWIN_PROFILE.defaultVoiceId,
          DEFAULT_MASTER_TWIN_PROFILE.defaultLanguage,
          DEFAULT_MASTER_TWIN_PROFILE.defaultPosture,
          DEFAULT_MASTER_TWIN_PROFILE.totalTrainingMinutes,
          now,
        ],
      });

      // Seed default feature clips
      for (const clip of DEFAULT_MASTER_TWIN_PROFILE.featureClips) {
        await bunnyExecute({
          sql: `INSERT OR REPLACE INTO studio_twin_feature_bank_sql (
            id, twin_id, category, sub_type, title, video_url, thumbnail_url, duration_seconds, quality_score, description, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            clip.id,
            'mohan_kalburgi_master_twin',
            clip.category,
            clip.subType,
            clip.title,
            clip.videoUrl,
            clip.thumbnailUrl || '',
            clip.durationSeconds,
            clip.qualityScore,
            clip.description || '',
            now,
          ],
        });
      }
    }

    this.schemaReady = true;
  }

  /**
   * Get the Master Digital Twin profile with all feature bank clips
   */
  public static async getMasterProfile(): Promise<MasterTwinProfile> {
    await this.initSchema();

    const profileRes = await bunnyExecute({
      sql: `SELECT * FROM studio_master_twin_profile_sql WHERE id = ?`,
      args: ['mohan_kalburgi_master_twin'],
    });

    if (!profileRes.rows || profileRes.rows.length === 0) {
      return DEFAULT_MASTER_TWIN_PROFILE;
    }

    const row = profileRes.rows[0];
    let beautySettings: MasterTwinBeautySettings = DEFAULT_MASTER_TWIN_PROFILE.beautySettings;
    try {
      if (row.beauty_settings_json) {
        beautySettings = JSON.parse(row.beauty_settings_json);
      }
    } catch {}

    const clipsRes = await bunnyExecute({
      sql: `SELECT * FROM studio_twin_feature_bank_sql WHERE twin_id = ? ORDER BY created_at DESC`,
      args: ['mohan_kalburgi_master_twin'],
    });

    const featureClips: MasterTwinFeatureClip[] = (clipsRes.rows || []).map((c: any) => ({
      id: c.id,
      category: c.category,
      subType: c.sub_type,
      title: c.title,
      videoUrl: c.video_url,
      thumbnailUrl: c.thumbnail_url,
      durationSeconds: Number(c.duration_seconds || 180),
      qualityScore: Number(c.quality_score || 98),
      description: c.description,
      createdAt: c.created_at,
    }));

    const totalMinutes = featureClips.reduce((sum, c) => sum + c.durationSeconds / 60, 0);

    const vaultStats: MasterTwinVaultStats = {
      storageZone: process.env.BUNNY_STORAGE_ZONE_NAME || 'swaryogacrm-vault',
      cdnBaseUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/training-vault',
      allocatedGB: 10.0,
      usedVideoGB: Math.round(featureClips.length * 0.28 * 10) / 10,
      usedAudioHours: Math.round((totalMinutes / 60) * 10) / 10,
      targetVideosCount: 20,
      targetAudioHours: 3.0,
      nuanceChecklist: {
        facialMicroExpressions: featureClips.some((c) => c.category === 'expression' || c.subType === 'smile'),
        sittingPadmasana: featureClips.some((c) => c.subType === 'sitting' || c.subType === 'padmasana'),
        walkingGait: featureClips.some((c) => c.subType === 'walking' || c.title.toLowerCase().includes('walk')),
        runningVitality: featureClips.some((c) => c.subType === 'running' || c.title.toLowerCase().includes('run')),
        yogaAsanaMudras: featureClips.some((c) => c.subType === 'yoga_asana' || c.category === 'posture'),
        deepVoiceResonance: totalMinutes >= 6,
        conversationalLecture: featureClips.some((c) => c.category === 'lecture'),
        sanskritMantras: true,
      },
    };

    return {
      id: row.id,
      name: row.name,
      title: row.title || 'Vedic Master & Ayurvedic Nutritionist',
      beautySettings,
      defaultVoiceId: row.default_voice_id || 'hi-IN-MadhurNeural',
      defaultLanguage: row.default_language || 'hi',
      defaultPosture: (row.default_posture as any) || 'sitting',
      totalTrainingMinutes: Math.round(totalMinutes * 10) / 10,
      totalClipsCount: featureClips.length,
      featureClips,
      vaultStats,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update Beauty Settings & Posture on the Master Profile
   */
  public static async updateSettings(updates: {
    beautySettings?: Partial<MasterTwinBeautySettings>;
    defaultVoiceId?: string;
    defaultLanguage?: string;
    defaultPosture?: 'sitting' | 'standing' | 'walking' | 'running' | 'yoga';
  }): Promise<MasterTwinProfile> {
    await this.initSchema();
    const current = await this.getMasterProfile();

    const mergedBeauty: MasterTwinBeautySettings = {
      ...current.beautySettings,
      ...(updates.beautySettings || {}),
    };

    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `UPDATE studio_master_twin_profile_sql SET
        beauty_settings_json = ?,
        default_voice_id = ?,
        default_language = ?,
        default_posture = ?,
        updated_at = ?
      WHERE id = ?`,
      args: [
        JSON.stringify(mergedBeauty),
        updates.defaultVoiceId || current.defaultVoiceId,
        updates.defaultLanguage || current.defaultLanguage,
        updates.defaultPosture || current.defaultPosture,
        now,
        'mohan_kalburgi_master_twin',
      ],
    });

    return this.getMasterProfile();
  }

  /**
   * Feed a new 3-Minute Video Recording into the Master Twin Feature Bank
   */
  public static async attachFeatureClip(clip: {
    category: 'expression' | 'motion' | 'voice' | 'lecture' | 'posture';
    subType: 'smile' | 'thoughtful' | 'neutral' | 'sitting' | 'standing' | 'walking' | 'running' | 'yoga_asana' | 'laugh';
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    description?: string;
  }): Promise<MasterTwinFeatureClip> {
    await this.initSchema();
    const clipId = `clip_${clip.subType}_${crypto.randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();
    const duration = clip.durationSeconds || 180;

    await bunnyExecute({
      sql: `INSERT INTO studio_twin_feature_bank_sql (
        id, twin_id, category, sub_type, title, video_url, thumbnail_url, duration_seconds, quality_score, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        clipId,
        'mohan_kalburgi_master_twin',
        clip.category,
        clip.subType,
        clip.title.trim(),
        clip.videoUrl.trim(),
        clip.thumbnailUrl || '',
        duration,
        99.2,
        clip.description || 'Master reference footage for digital twin training',
        now,
      ],
    });

    return {
      id: clipId,
      category: clip.category,
      subType: clip.subType,
      title: clip.title.trim(),
      videoUrl: clip.videoUrl.trim(),
      thumbnailUrl: clip.thumbnailUrl || '',
      durationSeconds: duration,
      qualityScore: 99.2,
      description: clip.description,
      createdAt: now,
    };
  }

  /**
   * Create New Avatar with 9-Numerical Code, Main Language, Multi-Videos & Video Briefs
   * System continuously builds up this avatar day-by-day.
   */
  public static async createNewAvatar(input: CreateAutonomousAvatarInput): Promise<CreateAutonomousAvatarResult> {
    await this.initSchema();

    // 1. Generate or validate 9-numerical code
    let code = (input.avatarCode || '').replace(/\D/g, '');
    if (code.length !== 9) {
      code = Math.floor(100000000 + Math.random() * 900000000).toString();
    }

    const name = (input.avatarName || '').trim() || `Avatar-${code}`;
    const mainLang = (input.mainLanguage || 'hi').trim();
    const overallBrief = (input.overallBrief || '').trim();
    const videos = Array.isArray(input.videos) ? input.videos : [];

    const now = new Date().toISOString();
    let totalMinutes = 0;
    for (const v of videos) {
      totalMinutes += (Number(v.durationSeconds) || 180) / 60;
    }
    totalMinutes = Math.round(totalMinutes * 10) / 10;

    const firstVideoUrl = videos[0]?.videoUrl || 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4';
    const firstThumbUrl =
      videos[0]?.thumbnailUrl ||
      'https://resource2.heygen.ai/best_frame_selection/candidates/6252d07df49247eaa5413ebbbb35fcd0.jpg';

    // 2. Insert into studio_master_twin_profile_sql
    const beautyDefaults: MasterTwinBeautySettings = {
      glowLevel: 75,
      skinSmoothing: 80,
      studioLight: 'vedic_divine',
      beautyFilterActive: true,
      hairLookStyle: 'classic_vedic',
    };

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO studio_master_twin_profile_sql (
        id, name, title, beauty_settings_json, default_voice_id, default_language, default_posture, total_training_minutes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        code,
        name,
        overallBrief || 'Autonomous AI Digital Twin',
        JSON.stringify(beautyDefaults),
        mainLang === 'mr' ? 'mr-IN-ManoharNeural' : mainLang === 'en' ? 'en-IN-PrabhatNeural' : 'hi-IN-MadhurNeural',
        mainLang,
        'sitting',
        totalMinutes,
        now,
      ],
    });

    // 3. Insert into studio_video_avatars_sql for Studio & Hub
    const videoAvatarId = `v_avatar_${code}`;
    const faceData = {
      avatarCode: code,
      overallBrief,
      autonomousDayByDay: true,
      multiVideosCount: videos.length,
      createdAt: now,
    };

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO studio_video_avatars_sql (
        id, name, original_video_url, thumbnail_url, language_capabilities_json, status, face_data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        videoAvatarId,
        name,
        firstVideoUrl,
        firstThumbUrl,
        JSON.stringify([mainLang, 'hi', 'mr', 'en']),
        'ready',
        JSON.stringify(faceData),
        now,
        now,
      ],
    });

    // 4. Attach multi-videos to feature bank and source videos library
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (!v.videoUrl) continue;
      const clipId = `clip_${code}_${i + 1}_${crypto.randomUUID().substring(0, 6)}`;
      const dur = Number(v.durationSeconds) || 180;
      const vTitle = v.title || `${name} - Clip ${i + 1}`;
      const vBrief = v.brief || overallBrief || 'Master training clip';

      // Insert into twin feature bank
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO studio_twin_feature_bank_sql (
          id, twin_id, category, sub_type, title, video_url, thumbnail_url, duration_seconds, quality_score, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          clipId,
          code,
          v.category || 'expression',
          v.subType || 'smile',
          vTitle,
          v.videoUrl.trim(),
          v.thumbnailUrl || firstThumbUrl,
          dur,
          99.0,
          vBrief,
          now,
        ],
      });

      // Insert into source videos library
      const srcId = `src_vid_${code}_${i + 1}`;
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO studio_source_videos_sql (
          id, name, video_url, thumbnail_url, duration_seconds, resolution, file_size_bytes, format, quality_score, admin_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          srcId,
          vTitle,
          v.videoUrl.trim(),
          v.thumbnailUrl || firstThumbUrl,
          dur,
          '1080p Full HD',
          35000000,
          'mp4',
          98,
          'admin',
          now,
          now,
        ],
      });
    }

    return {
      avatarId: videoAvatarId,
      avatarCode: code,
      name,
      mainLanguage: mainLang,
      totalTrainingMinutes: totalMinutes,
      totalClipsCount: videos.length,
      status: 'ready',
    };
  }
}
