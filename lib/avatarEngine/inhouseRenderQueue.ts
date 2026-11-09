import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { InhouseAudioService, INHOUSE_NEURAL_VOICES } from './inhouseAudioService';
import { verifyAvatarConsent } from './consentService';
import { getAvatarProfileById } from './faceIdentityService';

const TABLE = 'studio_inhouse_render_jobs_sql';
const LEASE_MILLISECONDS = 15 * 60 * 1000;

export type InhouseRenderStatus =
  | 'synthesizing_speech'
  | 'ready_for_worker'
  | 'rendering_video'
  | 'completed'
  | 'failed';

export interface InhouseRenderJob {
  id: string;
  ownerUserId: string;
  avatarName: string;
  avatarProfileId: string;
  sourceImageUrl: string;
  script: string;
  voiceId: string;
  language: string;
  speechSpeed: number;
  speechPitchHz: number;
  backgroundId: string;
  clothingId: string;
  posture: 'sitting' | 'standing' | 'walking';
  status: InhouseRenderStatus;
  progressPercent: number;
  audioUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InhouseRenderClaim {
  job: InhouseRenderJob;
  claimToken: string;
  sourceImageUrl: string;
}

export class AvatarRenderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarRenderInputError';
  }
}

function mapJob(row: Record<string, unknown>): InhouseRenderJob {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    avatarName: String(row.avatar_name),
    avatarProfileId: String(row.avatar_profile_id),
    sourceImageUrl: String(row.source_image_url),
    script: String(row.script_text),
    voiceId: String(row.voice_id),
    language: String(row.language),
    speechSpeed: Number(row.speech_speed || 1),
    speechPitchHz: Number(row.speech_pitch_hz || 0),
    backgroundId: String(row.background_id),
    clothingId: String(row.clothing_id),
    posture: row.posture as InhouseRenderJob['posture'],
    status: row.status as InhouseRenderStatus,
    progressPercent: Number(row.progress_percent || 0),
    audioUrl: row.audio_url ? String(row.audio_url) : undefined,
    videoUrl: row.video_url ? String(row.video_url) : undefined,
    durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function trustedBunnyUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The render asset must be a valid Bunny CDN HTTPS URL.');
  }
  const allowedHost = (process.env.BUNNY_STORAGE_CDN_HOST || 'swaryogacrm.b-cdn.net').toLowerCase();
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== allowedHost) {
    throw new Error('Render assets must be stored on the configured Bunny CDN.');
  }
  return url;
}

export class InhouseRenderQueue {
  private static schemaPromise: Promise<void> | null = null;

  private static async initSchema(): Promise<void> {
    if (!this.schemaPromise) {
      this.schemaPromise = bunnyBatch([{
        sql: `CREATE TABLE IF NOT EXISTS ${TABLE} (
          id TEXT PRIMARY KEY,
          avatar_name TEXT NOT NULL,
          avatar_profile_id TEXT NOT NULL,
          source_image_url TEXT NOT NULL,
          script_text TEXT NOT NULL,
          voice_id TEXT NOT NULL,
          language TEXT NOT NULL,
          speech_speed REAL NOT NULL DEFAULT 1,
          speech_pitch_hz REAL NOT NULL DEFAULT 0,
          background_id TEXT NOT NULL,
          clothing_id TEXT NOT NULL,
          posture TEXT NOT NULL,
          owner_user_id TEXT NOT NULL,
          status TEXT NOT NULL,
          progress_percent INTEGER NOT NULL DEFAULT 0,
          audio_url TEXT,
          video_url TEXT,
          duration_seconds REAL,
          worker_id TEXT,
          claim_token TEXT,
          lease_expires_at TEXT,
          error_message TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      }]).then(() => undefined).catch((error) => {
        this.schemaPromise = null;
        throw error;
      });
    }
    await this.schemaPromise;
  }

  public static async createAndPrepare(params: {
    requesterId: string;
    allowSharedProfile: boolean;
    avatarProfileId: string;
    script: string;
    voiceId?: string;
    language?: string;
    speed?: number;
    pitchHz?: number;
    backgroundId?: string;
    clothingId?: string;
    posture?: 'sitting' | 'standing' | 'walking';
  }): Promise<InhouseRenderJob> {
    await this.initSchema();
    const script = params.script?.trim();
    if (!script) throw new AvatarRenderInputError('Script text is required.');
    if (script.length > 10_000) throw new AvatarRenderInputError('Script text cannot exceed 10,000 characters.');

    const profileId = params.avatarProfileId?.trim();
    if (!profileId) throw new AvatarRenderInputError('Choose a consented avatar profile before rendering.');
    const profile = await getAvatarProfileById(profileId);
    if (!profile?.consentRecordId) throw new AvatarRenderInputError('Avatar profile was not found or has no consent record.');
    if (!params.allowSharedProfile && profile.userId !== params.requesterId) {
      throw new AvatarRenderInputError('This avatar profile is not owned by the signed-in user.');
    }
    if (!(await verifyAvatarConsent({
      consentId: profile.consentRecordId,
      userId: profile.userId,
      avatarName: profile.name,
    }))) {
      throw new AvatarRenderInputError('Avatar consent is invalid or does not match the selected profile.');
    }

    const sourceImageUrl = profile.bgRemovedUrl || profile.frontalFaceUrl;
    try {
      trustedBunnyUrl(sourceImageUrl);
    } catch (error) {
      throw new AvatarRenderInputError(error instanceof Error ? error.message : 'Invalid avatar source image.');
    }
    const id = `inh_render_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();
    const language = params.language || 'hi';
    const speed = params.speed ?? 1;
    const pitchHz = params.pitchHz ?? 0;
    if (!Number.isFinite(speed) || speed < 0.8 || speed > 1.3) {
      throw new AvatarRenderInputError('Speech speed must be between 0.8 and 1.3.');
    }
    if (!Number.isFinite(pitchHz) || pitchHz < -10 || pitchHz > 10) {
      throw new AvatarRenderInputError('Speech pitch must be between -10Hz and +10Hz.');
    }
    const defaultVoice = INHOUSE_NEURAL_VOICES.find((voice) => voice.langCode === language);
    const voiceId = params.voiceId || defaultVoice?.id;
    if (!voiceId) {
      throw new AvatarRenderInputError(`No in-house voice is configured for language "${language}".`);
    }
    const values = {
      avatarName: profile.name,
      ownerUserId: params.requesterId,
      avatarProfileId: profile.id,
      sourceImageUrl,
      script,
      voiceId,
      language,
      speechSpeed: speed,
      speechPitchHz: pitchHz,
      backgroundId: params.backgroundId || 'bg_kitchen',
      clothingId: params.clothingId || 'cloth_white_kurta',
      posture: params.posture || 'sitting',
    };

    await bunnyExecute({
      sql: `INSERT INTO ${TABLE} (
        id, avatar_name, avatar_profile_id, source_image_url, script_text, voice_id, language, speech_speed, speech_pitch_hz,
        background_id, clothing_id, posture, owner_user_id, status, progress_percent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synthesizing_speech', 10, ?, ?)`,
      args: [
        id, values.avatarName, values.avatarProfileId, values.sourceImageUrl, values.script,
        values.voiceId, values.language, values.speechSpeed, values.speechPitchHz,
        values.backgroundId, values.clothingId, values.posture,
        values.ownerUserId, now, now,
      ],
    });

    try {
      const audio = await InhouseAudioService.synthesizeSpeech({
        script: values.script,
        voiceId: values.voiceId,
        language: values.language,
        speed: values.speechSpeed,
        pitchHz: values.speechPitchHz,
      });
      await bunnyExecute({
        sql: `UPDATE ${TABLE}
          SET status = 'ready_for_worker', progress_percent = 40, audio_url = ?, duration_seconds = ?, updated_at = ?
          WHERE id = ? AND status = 'synthesizing_speech'`,
        args: [audio.audioUrl, audio.durationSeconds, new Date().toISOString(), id],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audio preparation failed.';
      await bunnyExecute({
        sql: `UPDATE ${TABLE} SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`,
        args: [message.slice(0, 1000), new Date().toISOString(), id],
      });
      throw error;
    }

    const job = await this.getJob(id);
    if (!job) throw new Error(`Render job ${id} could not be reloaded after preparation.`);
    return job;
  }

  public static async getJob(id: string, ownerUserId?: string): Promise<InhouseRenderJob | null> {
    await this.initSchema();
    const result = await bunnyExecute({
      sql: ownerUserId
        ? `SELECT * FROM ${TABLE} WHERE id = ? AND owner_user_id = ?`
        : `SELECT * FROM ${TABLE} WHERE id = ?`,
      args: ownerUserId ? [id, ownerUserId] : [id],
    });
    return result.rows[0] ? mapJob(result.rows[0] as Record<string, unknown>) : null;
  }

  public static async listJobs(ownerUserId?: string, limit = 25): Promise<InhouseRenderJob[]> {
    await this.initSchema();
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const result = await bunnyExecute({
      sql: ownerUserId
        ? `SELECT * FROM ${TABLE} WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT ?`
        : `SELECT * FROM ${TABLE} ORDER BY created_at DESC LIMIT ?`,
      args: ownerUserId ? [ownerUserId, boundedLimit] : [boundedLimit],
    });
    return result.rows.map((row) => mapJob(row as Record<string, unknown>));
  }

  public static async claimNextJob(workerId: string): Promise<InhouseRenderClaim | null> {
    await this.initSchema();
    const id = workerId.trim().slice(0, 100);
    if (!id) throw new Error('Worker ID is required.');
    const claimToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + LEASE_MILLISECONDS).toISOString();
    const result = await bunnyExecute({
      sql: `UPDATE ${TABLE}
        SET status = 'rendering_video', progress_percent = 50, worker_id = ?, claim_token = ?,
            lease_expires_at = ?, updated_at = ?
        WHERE id = (
          SELECT id FROM ${TABLE}
          WHERE status = 'ready_for_worker'
             OR (status = 'rendering_video' AND lease_expires_at < ?)
          ORDER BY created_at ASC LIMIT 1
        )`,
      args: [id, claimToken, expires, now, now],
    });
    if (result.rowsAffected === 0) return null;

    const claimed = await bunnyExecute({
      sql: `SELECT * FROM ${TABLE} WHERE worker_id = ? AND claim_token = ?`,
      args: [id, claimToken],
    });
    const row = claimed.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const job = mapJob(row);
    if (!job.audioUrl) throw new Error(`Claimed render job ${job.id} has no audio URL.`);
    return { job, claimToken, sourceImageUrl: job.sourceImageUrl };
  }

  public static async renewLease(jobId: string, claimToken: string): Promise<boolean> {
    await this.initSchema();
    const result = await bunnyExecute({
      sql: `UPDATE ${TABLE} SET lease_expires_at = ?, updated_at = ?
        WHERE id = ? AND status = 'rendering_video' AND claim_token = ?`,
      args: [
        new Date(Date.now() + LEASE_MILLISECONDS).toISOString(),
        new Date().toISOString(),
        jobId,
        claimToken,
      ],
    });
    return result.rowsAffected > 0;
  }

  public static async completeJob(params: {
    jobId: string;
    claimToken: string;
    videoUrl: string;
    durationSeconds?: number;
  }): Promise<InhouseRenderJob> {
    await this.initSchema();
    const outputUrl = trustedBunnyUrl(params.videoUrl).toString();
    if (params.durationSeconds !== undefined &&
      (!Number.isFinite(params.durationSeconds) || params.durationSeconds <= 0)) {
      throw new Error('Duration must be a positive finite number.');
    }
    const result = await bunnyExecute({
      sql: `UPDATE ${TABLE}
        SET status = 'completed', progress_percent = 100, video_url = ?,
            duration_seconds = COALESCE(?, duration_seconds), claim_token = NULL,
            lease_expires_at = NULL, error_message = NULL, updated_at = ?
        WHERE id = ? AND status = 'rendering_video' AND claim_token = ?`,
      args: [outputUrl, params.durationSeconds ?? null, new Date().toISOString(), params.jobId, params.claimToken],
    });
    if (result.rowsAffected === 0) throw new Error('Worker claim is no longer valid for this job.');
    const job = await this.getJob(params.jobId);
    if (!job) throw new Error(`Completed render job ${params.jobId} could not be reloaded.`);
    return job;
  }

  public static async failJob(params: {
    jobId: string;
    claimToken: string;
    errorMessage: string;
  }): Promise<InhouseRenderJob> {
    await this.initSchema();
    const message = params.errorMessage.trim().slice(0, 1000) || 'GPU render failed.';
    const result = await bunnyExecute({
      sql: `UPDATE ${TABLE}
        SET status = 'failed', error_message = ?, claim_token = NULL, lease_expires_at = NULL, updated_at = ?
        WHERE id = ? AND status = 'rendering_video' AND claim_token = ?`,
      args: [message, new Date().toISOString(), params.jobId, params.claimToken],
    });
    if (result.rowsAffected === 0) throw new Error('Worker claim is no longer valid for this job.');
    const job = await this.getJob(params.jobId);
    if (!job) throw new Error(`Failed render job ${params.jobId} could not be reloaded.`);
    return job;
  }
}
