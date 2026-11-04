import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { isSupportedFacialMediaUrl, resolveBunnyStreamMediaUrl } from './bunnyStreamMedia';

const execFileAsync = promisify(execFile);

export interface FacialExtractionJob {
  id: string;
  source_id?: string;
  video_url: string;
  status: 'pending' | 'downloading' | 'analyzing' | 'completed' | 'failed';
  progress_pct: number;
  total_frames_analyzed: number;
  expressions_distribution_json: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedFacialFrame {
  timestamp_ms: number;
  timestamp_sec: number;
  timestamp_formatted: string; // e.g. "05:13"
  face_detected: boolean;
  primary_expression: string;
  intensity: number; // 0-100
  confidence: number;
  blendshapes: Record<string, number>;
  head_pose?: { pitch: number; yaw: number; roll: number };
}

export interface FacialExpressionClip {
  id: string;
  job_id: string;
  video_url: string;
  timestamp_ms: number;
  timestamp_formatted: string;
  primary_expression: string;
  intensity: number;
  confidence: number;
  created_at: string;
}

export interface FacialExtractionDashboard {
  clips: FacialExpressionClip[];
  totalClips: number;
  videoCount: number;
  orphanedClipCount: number;
  expressionCounts: Array<{ expression: string; count: number }>;
}

let isFacialSchemaReady = false;

export async function initFacialExtractionSchema(): Promise<void> {
  if (isFacialSchemaReady) return;

  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_facial_extraction_jobs_sql (
        id TEXT PRIMARY KEY,
        source_id TEXT,
        video_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress_pct INTEGER NOT NULL DEFAULT 0,
        total_frames_analyzed INTEGER NOT NULL DEFAULT 0,
        expressions_distribution_json TEXT NOT NULL DEFAULT '{}',
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_facial_expression_clips_sql (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        video_url TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL,
        timestamp_formatted TEXT NOT NULL,
        primary_expression TEXT NOT NULL,
        intensity INTEGER NOT NULL DEFAULT 50,
        confidence REAL NOT NULL DEFAULT 0.0,
        blendshapes_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_transcript_aligned_cues_sql (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        timestamp_formatted TEXT NOT NULL,
        aligned_expression TEXT NOT NULL,
        intensity INTEGER NOT NULL,
        cue_tag TEXT NOT NULL,
        matched_text TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_facial_job_status ON mohan_facial_extraction_jobs_sql(status, updated_at DESC)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_facial_clips_time ON mohan_facial_expression_clips_sql(video_url, timestamp_ms)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_aligned_cues_source ON mohan_transcript_aligned_cues_sql(source_id)`,
      args: [],
    },
  ]);

  isFacialSchemaReady = true;
}

/**
 * Start a facial expression extraction job for supported Bunny or YouTube media.
 */
export async function startFacialExtractionJob(input: {
  videoUrl: string;
  sourceId?: string;
  sampleFps?: number;
}): Promise<FacialExtractionJob> {
  const videoUrl = typeof input.videoUrl === 'string' ? input.videoUrl.trim() : '';
  if (!videoUrl || videoUrl.length > 2048 || !isSupportedFacialMediaUrl(videoUrl)) {
    throw new Error('Use an HTTPS Bunny CDN/Stream or YouTube video URL for facial extraction.');
  }
  const sampleFps = Number(input.sampleFps ?? 1);
  if (!Number.isFinite(sampleFps) || sampleFps < 0.1 || sampleFps > 2) {
    throw new Error('Sampling rate must be between 0.1 and 2 frames per second.');
  }

  await initFacialExtractionSchema();

  const jobId = `face_job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT INTO mohan_facial_extraction_jobs_sql (
      id, source_id, video_url, status, progress_pct, total_frames_analyzed,
      expressions_distribution_json, error_message, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [jobId, input.sourceId || null, videoUrl, 'pending', 0, 0, '{}', null, now, now],
  });

  // Launch extraction asynchronously in background
  runFacialExtractionBackground(jobId, videoUrl, input.sourceId, sampleFps).catch(
    (err) => console.error(`[FacialExtraction] Job ${jobId} failed:`, err)
  );

  return {
    id: jobId,
    source_id: input.sourceId,
    video_url: videoUrl,
    status: 'pending',
    progress_pct: 0,
    total_frames_analyzed: 0,
    expressions_distribution_json: '{}',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Background worker to run Python MediaPipe extraction on Contabo VPS.
 */
async function runFacialExtractionBackground(
  jobId: string,
  videoUrl: string,
  sourceId?: string,
  sampleFps: number = 1.0
): Promise<void> {
  const now = new Date().toISOString();
  const tmpOutputDir = '/tmp/mohan_face_runs';
  if (!fs.existsSync(tmpOutputDir)) fs.mkdirSync(tmpOutputDir, { recursive: true });

  const outputJsonFile = path.join(tmpOutputDir, `${jobId}.json`);

  try {
    // 1. Update status to analyzing
    await bunnyExecute({
      sql: `UPDATE mohan_facial_extraction_jobs_sql SET status = 'analyzing', progress_pct = 10, updated_at = ? WHERE id = ?`,
      args: [now, jobId],
    });

    // 2. Locate Python binary (virtualenv on VPS or local python3)
    const venvPython = '/var/www/swaryoga/venv-vision/bin/python3';
    const pythonBin = fs.existsSync(venvPython) ? venvPython : 'python3';
    const scriptPath = path.resolve(process.cwd(), 'scripts/extract_facial_expressions.py');
    const mediaUrl = await resolveBunnyStreamMediaUrl(videoUrl);

    console.log(`[FacialExtraction] Running MediaPipe for job ${jobId}`);

    // Build environment for the Python subprocess, forwarding YouTube cookies config
    const childEnv: Record<string, string> = { ...process.env } as Record<string, string>;
    const cookiesFile = process.env.YOUTUBE_COOKIES_FILE?.trim();
    if (cookiesFile) {
      childEnv.YOUTUBE_COOKIES_FILE = cookiesFile;
    }

    const { stdout, stderr } = await execFileAsync(pythonBin, [
      scriptPath,
      '--video', mediaUrl,
      '--output', outputJsonFile,
      '--fps', String(sampleFps),
      '--video-id', jobId,
    ], { maxBuffer: 1024 * 1024 * 50, env: childEnv });
    console.log(`[FacialExtraction] Python complete:`, stdout.slice(0, 300));

    // 3. Parse generated JSON
    if (!fs.existsSync(outputJsonFile)) {
      throw new Error(`Extraction script did not produce output at: ${outputJsonFile}`);
    }

    const fileContent = fs.readFileSync(outputJsonFile, 'utf-8');
    const parsedData = JSON.parse(fileContent);
    const timeline: ExtractedFacialFrame[] = parsedData.timeline || [];
    const distribution = parsedData.expressions_distribution || {};

    // 4. Batch store extracted frames into Bunny DB
    const batchStatements: Array<{ sql: string; args: any[] }> = [];
    const sampleBatch = timeline.filter((frame, idx) => frame.face_detected && idx % 2 === 0);

    for (const frame of sampleBatch) {
      const clipId = `clip_${jobId}_${frame.timestamp_ms}`;
      batchStatements.push({
        sql: `INSERT OR REPLACE INTO mohan_facial_expression_clips_sql (
          id, job_id, video_url, timestamp_ms, timestamp_formatted, primary_expression,
          intensity, confidence, blendshapes_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          clipId,
          jobId,
          videoUrl,
          frame.timestamp_ms,
          frame.timestamp_formatted,
          frame.primary_expression,
          frame.intensity,
          frame.confidence,
          JSON.stringify(frame.blendshapes),
          new Date().toISOString(),
        ],
      });
    }

    if (batchStatements.length > 0) {
      await bunnyBatch(batchStatements);
    }

    // 5. Phase 2: If sourceId was provided, align with existing transcript!
    if (sourceId) {
      await alignFacialExpressionsWithTranscript(sourceId, timeline);
    }

    // 6. Mark Job Completed
    await bunnyExecute({
      sql: `UPDATE mohan_facial_extraction_jobs_sql SET
        status = 'completed',
        progress_pct = 100,
        total_frames_analyzed = ?,
        expressions_distribution_json = ?,
        updated_at = ?
      WHERE id = ?`,
      args: [timeline.length, JSON.stringify(distribution), new Date().toISOString(), jobId],
    });

    // Cleanup temp file
    if (fs.existsSync(outputJsonFile)) fs.unlinkSync(outputJsonFile);
  } catch (err: any) {
    const rawMsg = err.message || 'Unknown extraction error';

    // Extract the most useful error from Python stderr (yt-dlp / MediaPipe)
    let errorMessage = rawMsg;
    const stderrMatch = rawMsg.match(/RuntimeError:\s*(.+?)(?:\n|$)/);
    if (stderrMatch) {
      errorMessage = stderrMatch[1].trim();
    }
    // Surface YouTube auth errors clearly
    const lower = rawMsg.toLowerCase();
    if (lower.includes('sign in to confirm') || lower.includes('cookies') || lower.includes('not a bot')) {
      const hasCookiesFile = !!process.env.YOUTUBE_COOKIES_FILE?.trim();
      if (hasCookiesFile) {
        errorMessage = 'YouTube rejected the configured cookies. Refresh the Netscape cookies file from an authorized account and restart the worker.';
      } else {
        errorMessage = 'YouTube requires sign-in for this video. Configure YOUTUBE_COOKIES_FILE on the server with a Netscape-format cookies file from an authorized account.';
      }
    }

    console.error(`[FacialExtraction] Error in job ${jobId}:`, errorMessage);
    await bunnyExecute({
      sql: `UPDATE mohan_facial_extraction_jobs_sql SET
        status = 'failed',
        error_message = ?,
        updated_at = ?
      WHERE id = ?`,
      args: [errorMessage, new Date().toISOString(), jobId],
    });
  }
}

/**
 * Phase 2: Transcript Alignment Engine.
 * Matches extracted expressions to transcript timestamps and writes empirical cues.
 */
export async function alignFacialExpressionsWithTranscript(
  sourceId: string,
  timeline: ExtractedFacialFrame[]
): Promise<{ alignedCount: number; updatedTranscript: string }> {
  await initFacialExtractionSchema();

  // 1. Fetch current knowledge source
  const res = await bunnyExecute({
    sql: 'SELECT id, title, content FROM mohan_rag_sources_sql WHERE id = ? LIMIT 1',
    args: [sourceId],
  });

  if (!res.rows?.length) {
    return { alignedCount: 0, updatedTranscript: '' };
  }

  const source = res.rows[0];
  const content = String(source.content || '');

  // Regex to find timestamps like [05:13-05:34] or [05:13]
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?\]/g;
  let alignedCount = 0;
  const alignmentStatements: Array<{ sql: string; args: any[] }> = [];

  const updatedContent = content.replace(timestampRegex, (fullMatch, m1, s1) => {
    const mins = parseInt(m1, 10);
    const secs = parseInt(s1, 10);
    const targetMs = (mins * 60 + secs) * 1000;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Find closest frame in timeline within 5 seconds
    const closestFrame = timeline.find((f) => Math.abs(f.timestamp_ms - targetMs) <= 5000);

    if (closestFrame && closestFrame.face_detected) {
      alignedCount++;
      const cueTag = `[${closestFrame.primary_expression}:${closestFrame.intensity}]`;

      alignmentStatements.push({
        sql: `INSERT OR REPLACE INTO mohan_transcript_aligned_cues_sql (
          id, source_id, timestamp_formatted, aligned_expression, intensity, cue_tag, matched_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `cue_${sourceId}_${formatted}`,
          sourceId,
          formatted,
          closestFrame.primary_expression,
          closestFrame.intensity,
          cueTag,
          fullMatch,
          new Date().toISOString(),
        ],
      });

      return `${fullMatch} ${cueTag}`;
    }

    return fullMatch;
  });

  if (alignmentStatements.length > 0) {
    await bunnyBatch(alignmentStatements);

    // Save updated transcript back to knowledge source
    await bunnyExecute({
      sql: 'UPDATE mohan_rag_sources_sql SET content = ?, updated_at = ? WHERE id = ?',
      args: [updatedContent, new Date().toISOString(), sourceId],
    });
  }

  return { alignedCount, updatedTranscript: updatedContent };
}

/**
 * Phase 3: Retrieve real empirical facial cues for avatar video generation.
 */
export async function getRealFacialCuesForTimestamp(
  videoUrl: string,
  timestampMs: number
): Promise<{ expression: string; intensity: number; blendshapes: Record<string, number> } | null> {
  await initFacialExtractionSchema();

  const res = await bunnyExecute({
    sql: `SELECT primary_expression, intensity, blendshapes_json
          FROM mohan_facial_expression_clips_sql
          WHERE video_url = ? AND blendshapes_json != '{}'
          ORDER BY ABS(timestamp_ms - ?) ASC
          LIMIT 1`,
    args: [videoUrl, timestampMs],
  });

  if (!res.rows?.length) return null;

  const row = res.rows[0] as any;
  let blendshapes = {};
  try {
    blendshapes = JSON.parse(row?.blendshapes_json || '{}');
  } catch {}

  return {
    expression: row?.primary_expression,
    intensity: Number(row?.intensity || 50),
    blendshapes,
  };
}

/**
 * Fetch all extraction jobs.
 */
export async function getAllFacialJobs(): Promise<FacialExtractionJob[]> {
  await initFacialExtractionSchema();
  const res = await bunnyExecute(
    'SELECT * FROM mohan_facial_extraction_jobs_sql ORDER BY created_at DESC LIMIT 50'
  );
  return (res.rows || []) as unknown as FacialExtractionJob[];
}

/**
 * Fetch a bounded, reviewable page of extracted clips and aggregate counts.
 */
export async function getFacialExtractionDashboard(
  limit = 50,
  offset = 0
): Promise<FacialExtractionDashboard> {
  await initFacialExtractionSchema();
  const requestedLimit = Number.isSafeInteger(limit) ? limit : 50;
  const requestedOffset = Number.isSafeInteger(offset) ? Math.max(0, offset) : 0;
  const safeLimit = Math.max(1, Math.min(100, requestedLimit));
  const safeOffset = Math.min(1_000_000, requestedOffset);

  const [clipsResult, summaryResult, orphanResult, expressionResult] = await Promise.all([
    bunnyExecute({
      sql: `SELECT id, job_id, video_url, timestamp_ms, timestamp_formatted,
                   primary_expression, intensity, confidence, created_at
            FROM mohan_facial_expression_clips_sql
            WHERE blendshapes_json != '{}'
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?`,
      args: [safeLimit, safeOffset],
    }),
    bunnyExecute(
      `SELECT COUNT(*) AS clip_count, COUNT(DISTINCT video_url) AS video_count
       FROM mohan_facial_expression_clips_sql WHERE blendshapes_json != '{}'`
    ),
    bunnyExecute({
      sql: `SELECT COUNT(*) AS orphaned_clip_count
            FROM mohan_facial_expression_clips_sql AS clips
            LEFT JOIN mohan_facial_extraction_jobs_sql AS jobs ON jobs.id = clips.job_id
            WHERE jobs.id IS NULL AND clips.blendshapes_json != '{}'`,
      args: [],
    }),
    bunnyExecute({
      sql: `SELECT primary_expression, COUNT(*) AS count
            FROM mohan_facial_expression_clips_sql
      WHERE blendshapes_json != '{}'
      GROUP BY primary_expression
            ORDER BY count DESC
            LIMIT 20`,
      args: [],
    }),
  ]);

  const summary = summaryResult.rows[0] as Record<string, unknown> | undefined;
  const orphanSummary = orphanResult.rows[0] as Record<string, unknown> | undefined;
  return {
    clips: (clipsResult.rows || []) as unknown as FacialExpressionClip[],
    totalClips: Number(summary?.clip_count || 0),
    videoCount: Number(summary?.video_count || 0),
    orphanedClipCount: Number(orphanSummary?.orphaned_clip_count || 0),
    expressionCounts: (expressionResult.rows || []).map((row) => ({
      expression: String(row.primary_expression || 'unknown'),
      count: Number(row.count || 0),
    })),
  };
}

/**
 * Fetch timeline clips for a specific video.
 */
export async function getFacialClipsForVideo(videoUrl: string): Promise<any[]> {
  await initFacialExtractionSchema();
  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_facial_expression_clips_sql
          WHERE video_url = ? AND blendshapes_json != '{}'
          ORDER BY timestamp_ms ASC`,
    args: [videoUrl],
  });
  return (res.rows || []).flatMap((row: any) => {
    try {
      const blendshapes = JSON.parse(String(row.blendshapes_json || '{}'));
      if (!blendshapes || typeof blendshapes !== 'object' || Object.keys(blendshapes).length === 0) return [];
      return [{
        ...row,
        timestamp_sec: Number(row.timestamp_ms || 0) / 1000,
        face_detected: true,
        blendshapes,
      }];
    } catch {
      return [];
    }
  });
}
