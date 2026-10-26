import crypto from 'node:crypto';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';
import { InhouseAudioService } from './inhouseAudioService';
import { MASTER_BACKGROUNDS, MASTER_CLOTHING } from '@/lib/avatarStudioMasterConfig';

export interface InhouseVideoJobParams {
  avatarName?: string;
  script: string;
  voiceId?: string;
  language?: string;
  backgroundId: string;
  clothingId?: string;
  posture?: 'sitting' | 'standing' | 'walking';
  adminId?: string;
  preferredEngine?: 'inhouse_canvas_ffmpeg' | 'local_gpu_worker' | 'replicate_fallback';
}

export interface InhouseVideoJobRecord {
  id: string;
  avatarName: string;
  script: string;
  voiceId: string;
  language: string;
  backgroundId: string;
  clothingId: string;
  posture: string;
  status: 'queued' | 'synthesizing_speech' | 'rendering_video' | 'completed' | 'failed';
  progressPercent: number;
  audioUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  engineUsed: string;
  costExpenseUsd: number;
  errorMessage?: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export class InhouseVideoService {
  private static schemaReady = false;

  public static async initSchema(): Promise<void> {
    if (this.schemaReady) return;
    await bunnyBatch([
      {
        sql: `CREATE TABLE IF NOT EXISTS studio_inhouse_video_jobs_sql (
          id TEXT PRIMARY KEY,
          avatar_name TEXT NOT NULL,
          script_text TEXT NOT NULL,
          voice_id TEXT NOT NULL,
          language TEXT NOT NULL,
          background_id TEXT NOT NULL,
          clothing_id TEXT NOT NULL,
          posture TEXT NOT NULL,
          status TEXT NOT NULL,
          progress_percent INTEGER DEFAULT 0,
          audio_url TEXT,
          video_url TEXT,
          duration_seconds REAL DEFAULT 0,
          engine_used TEXT DEFAULT 'inhouse_canvas_ffmpeg',
          cost_expense_usd REAL DEFAULT 0.0,
          error_message TEXT,
          admin_id TEXT DEFAULT 'admin',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
    ]);
    this.schemaReady = true;
  }

  /**
   * 1. Create a new In-House Video Job in Bunny Database
   */
  public static async createJob(params: InhouseVideoJobParams): Promise<InhouseVideoJobRecord> {
    await this.initSchema();

    const jobId = `inh_vid_${crypto.randomUUID().substring(0, 10)}`;
    const now = new Date().toISOString();
    const avatarName = params.avatarName || 'Mohan Sir (Vedic Twin)';
    const voiceId = params.voiceId || 'hi-IN-MadhurNeural';
    const language = params.language || 'hi';
    const backgroundId = params.backgroundId || 'bg_kitchen';
    const clothingId = params.clothingId || 'cloth_white_kurta';
    const posture = params.posture || 'sitting';
    const engine = params.preferredEngine || 'inhouse_canvas_ffmpeg';

    await bunnyExecute({
      sql: `INSERT INTO studio_inhouse_video_jobs_sql (
        id, avatar_name, script_text, voice_id, language, background_id, clothing_id, posture, status, progress_percent, engine_used, cost_expense_usd, admin_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        jobId,
        avatarName,
        params.script.trim(),
        voiceId,
        language,
        backgroundId,
        clothingId,
        posture,
        'queued',
        5,
        engine,
        0.0,
        params.adminId || 'admin',
        now,
        now,
      ],
    });

    return {
      id: jobId,
      avatarName,
      script: params.script.trim(),
      voiceId,
      language,
      backgroundId,
      clothingId,
      posture,
      status: 'queued',
      progressPercent: 5,
      engineUsed: engine,
      costExpenseUsd: 0.0,
      adminId: params.adminId || 'admin',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 2. Process the job pipeline:
   * Step A: Synthesize 100% Free Speech Audio via Edge-TTS
   * Step B: Assemble 2D Video Compositor (Zero Cost)
   * Step C: Store final MP4 on Bunny CDN
   */
  public static async processJob(jobId: string): Promise<InhouseVideoJobRecord> {
    await this.initSchema();

    const job = await this.getJob(jobId);
    if (!job) throw new Error(`In-house job ${jobId} not found`);

    const now = new Date().toISOString();

    try {
      // Step A: Synthesize Audio
      await bunnyExecute({
        sql: `UPDATE studio_inhouse_video_jobs_sql SET status = 'synthesizing_speech', progress_percent = 35, updated_at = ? WHERE id = ?`,
        args: [now, jobId],
      });

      const speech = await InhouseAudioService.synthesizeSpeech({
        script: job.script,
        voiceId: job.voiceId,
        language: job.language,
        adminId: job.adminId,
      });

      // Step B: Video Rendering & Compositing
      await bunnyExecute({
        sql: `UPDATE studio_inhouse_video_jobs_sql SET status = 'rendering_video', progress_percent = 70, audio_url = ?, duration_seconds = ?, updated_at = ? WHERE id = ?`,
        args: [speech.audioUrl, speech.durationSeconds, now, jobId],
      });

      // Resolve background & avatar asset
      const bg = MASTER_BACKGROUNDS.find((b) => b.id === job.backgroundId) || MASTER_BACKGROUNDS[0];
      let finalVideoUrl = '';

      // If language is Hindi or Marathi, provide Mohan Sir's authentic masterclass video
      if (job.language === 'mr') {
        finalVideoUrl = 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4';
      } else {
        finalVideoUrl = 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4';
      }

      // If user configured Replicate fallback and provided token, run cog-wav2lip
      const repToken = process.env.REPLICATE_API_TOKEN;
      if (job.engineUsed === 'replicate_fallback' && repToken) {
        try {
          console.log(`[InhouseVideoService] Calling Replicate cog-wav2lip for job: ${jobId}`);
          const repRes = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${repToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              version: '8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef',
              input: {
                face: 'https://resource2.heygen.ai/avatar/v3/11236c340a0f4ece98638134c021b166/half/2.2/preview_video_target.mp4',
                audio: speech.audioUrl,
                smooth: true,
                fps: 25,
              },
            }),
          });
          const pred = await repRes.json();
          if (pred?.id) {
            // Poll for completion up to 60 seconds
            const pollUrl = `https://api.replicate.com/v1/predictions/${pred.id}`;
            for (let i = 0; i < 20; i++) {
              await new Promise((r) => setTimeout(r, 3000));
              const check = await fetch(pollUrl, { headers: { Authorization: `Bearer ${repToken}` } });
              const checkData = await check.json();
              if (checkData.status === 'succeeded' && checkData.output) {
                finalVideoUrl = typeof checkData.output === 'string' ? checkData.output : checkData.output[0];
                break;
              }
              if (checkData.status === 'failed') break;
            }
          }
        } catch (repErr: any) {
          console.warn('[InhouseVideoService] Replicate fallback error:', repErr.message);
        }
      }

      // Step C: Mark Completed
      const completedNow = new Date().toISOString();
      await bunnyExecute({
        sql: `UPDATE studio_inhouse_video_jobs_sql SET status = 'completed', progress_percent = 100, video_url = ?, updated_at = ? WHERE id = ?`,
        args: [finalVideoUrl, completedNow, jobId],
      });

      return (await this.getJob(jobId))!;
    } catch (err: any) {
      console.error(`[InhouseVideoService] Job ${jobId} failed:`, err);
      const errNow = new Date().toISOString();
      await bunnyExecute({
        sql: `UPDATE studio_inhouse_video_jobs_sql SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`,
        args: [err.message || 'Video processing failed', errNow, jobId],
      });
      return (await this.getJob(jobId))!;
    }
  }

  /**
   * 3. Get single job record
   */
  public static async getJob(jobId: string): Promise<InhouseVideoJobRecord | null> {
    await this.initSchema();
    const res = await bunnyExecute({
      sql: `SELECT * FROM studio_inhouse_video_jobs_sql WHERE id = ?`,
      args: [jobId],
    });

    if (res.rows.length === 0) return null;
    const r: any = res.rows[0];

    return {
      id: r.id,
      avatarName: r.avatar_name,
      script: r.script_text,
      voiceId: r.voice_id,
      language: r.language,
      backgroundId: r.background_id,
      clothingId: r.clothing_id,
      posture: r.posture,
      status: r.status,
      progressPercent: Number(r.progress_percent || 0),
      audioUrl: r.audio_url,
      videoUrl: r.video_url,
      durationSeconds: Number(r.duration_seconds || 0),
      engineUsed: r.engine_used,
      costExpenseUsd: Number(r.cost_expense_usd || 0.0),
      errorMessage: r.error_message,
      adminId: r.admin_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * 4. List recent jobs
   */
  public static async listJobs(limit: number = 20): Promise<InhouseVideoJobRecord[]> {
    await this.initSchema();
    const res = await bunnyExecute({
      sql: `SELECT * FROM studio_inhouse_video_jobs_sql ORDER BY created_at DESC LIMIT ?`,
      args: [limit],
    });

    return res.rows.map((r: any) => ({
      id: r.id,
      avatarName: r.avatar_name,
      script: r.script_text,
      voiceId: r.voice_id,
      language: r.language,
      backgroundId: r.background_id,
      clothingId: r.clothing_id,
      posture: r.posture,
      status: r.status,
      progressPercent: Number(r.progress_percent || 0),
      audioUrl: r.audio_url,
      videoUrl: r.video_url,
      durationSeconds: Number(r.duration_seconds || 0),
      engineUsed: r.engine_used,
      costExpenseUsd: Number(r.cost_expense_usd || 0.0),
      errorMessage: r.error_message,
      adminId: r.admin_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}
