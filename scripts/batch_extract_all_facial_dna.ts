#!/usr/bin/env npx tsx
import { bunnyExecute } from '../lib/bunnyDatabase';
import {
  getBunnyStreamIdentity,
  type BunnyStreamIdentity,
} from '../lib/mohanRag/bunnyStreamMedia';
import {
  initFacialExtractionSchema,
  startFacialExtractionJob,
  type FacialExtractionJob,
} from '../lib/mohanRag/facialExpressionService';

type VideoSource = {
  id: string;
  title: string;
  url: string;
  identity: BunnyStreamIdentity;
};

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

function log(message: string) {
  process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);
}

async function getJob(jobId: string): Promise<FacialExtractionJob | null> {
  const result = await bunnyExecute({
    sql: 'SELECT * FROM mohan_facial_extraction_jobs_sql WHERE id = ? LIMIT 1',
    args: [jobId],
  });
  return result.rows[0] as unknown as FacialExtractionJob || null;
}

async function waitForJob(job: FacialExtractionJob): Promise<'completed' | 'failed'> {
  let latest = job;
  while (latest.status !== 'completed' && latest.status !== 'failed') {
    await delay(30_000);
    const refreshed = await getJob(job.id);
    if (!refreshed) throw new Error(`Facial extraction job ${job.id} disappeared from Bunny Database.`);
    latest = refreshed;
  }

  if (latest.status === 'failed') {
    log(`FAILED ${job.id}: ${latest.error_message || 'No error detail was saved.'}`);
  } else {
    log(`COMPLETED ${job.id}; analyzed ${latest.total_frames_analyzed} sampled frames.`);
  }
  return latest.status;
}

async function runBatchExtraction() {
  await initFacialExtractionSchema();

  const sourcesResult = await bunnyExecute({
    sql: `SELECT id, title, original_file_url, source_reference
          FROM mohan_rag_sources_sql
          WHERE source_type = 'bunny_stream'
          ORDER BY created_at ASC`,
    args: [],
  });

  const sources: VideoSource[] = (sourcesResult.rows || []).flatMap((row: any) => {
    const url = String(row.original_file_url || row.source_reference || '').trim();
    const identity = getBunnyStreamIdentity(url);
    if (!identity) {
      log(`Skipping Bunny Stream source ${String(row.id)} because its player URL is invalid.`);
      return [];
    }
    return [{
      id: String(row.id),
      title: String(row.title || 'Untitled Bunny Stream recording'),
      url,
      identity,
    }];
  });
  if (!sources.length) {
    log('No valid Bunny Stream sources are available; no job was created.');
    return;
  }

  const [jobsResult, clipsResult] = await Promise.all([
    bunnyExecute({
      sql: `SELECT id, source_id, video_url, status, progress_pct, total_frames_analyzed,
                   expressions_distribution_json, error_message, created_at, updated_at
            FROM mohan_facial_extraction_jobs_sql
            WHERE source_id IN (${sources.map(() => '?').join(',')})
            ORDER BY created_at DESC`,
      args: sources.map(source => source.id),
    }),
    bunnyExecute({
      sql: `SELECT DISTINCT video_url
            FROM mohan_facial_expression_clips_sql
            WHERE blendshapes_json != '{}'`,
      args: [],
    }),
  ]);

  const latestJobBySource = new Map<string, FacialExtractionJob>();
  for (const row of jobsResult.rows || []) {
    const job = row as unknown as FacialExtractionJob;
    if (job.source_id && !latestJobBySource.has(job.source_id)) latestJobBySource.set(job.source_id, job);
  }
  const extractedVideoIds = new Set(
    (clipsResult.rows || [])
      .map((row: any) => getBunnyStreamIdentity(String(row.video_url || ''))?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId))
  );
  const pending = sources.filter(source => !extractedVideoIds.has(source.identity.videoId));
  log(`Found ${sources.length} approved Bunny Stream sources; ${pending.length} need facial extraction.`);

  for (const [index, source] of pending.entries()) {
    const existingJob = latestJobBySource.get(source.id);
    log(`[${index + 1}/${pending.length}] ${source.title}`);

    if (existingJob?.status === 'completed') {
      log(`Skipping ${source.id}; its Bunny extraction job is already complete.`);
      continue;
    }
    if (existingJob?.status === 'failed') {
      log(`Skipping ${source.id}; its previous job failed. Review the saved error before retrying.`);
      continue;
    }

    const job = existingJob || await startFacialExtractionJob({
      videoUrl: source.url,
      sourceId: source.id,
      sampleFps: 0.5,
    });
    const status = await waitForJob(job);
    if (status === 'completed') latestJobBySource.set(source.id, job);
  }

  log('Bunny Stream facial extraction batch finished.');
}

runBatchExtraction().catch(error => {
  log(`Fatal Bunny facial extraction error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
