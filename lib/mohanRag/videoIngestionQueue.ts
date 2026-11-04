import { createHash, randomUUID } from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import type { MohanRagModule } from './knowledgeRepository';

export type VideoIngestionJob = {
  id: string;
  sourceUrl: string;
  provider: 'youtube' | 'bunny';
  moduleId: MohanRagModule;
  title: string;
  topic: string;
  language: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  sourceId: string | null;
  originalFileUrl: string | null;
  errorMessage: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

let schemaReady = false;

export async function ensureVideoIngestionSchema() {
  if (schemaReady) return;
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_rag_video_ingestion_sql (
      id TEXT PRIMARY KEY, url_hash TEXT NOT NULL UNIQUE, source_url TEXT NOT NULL,
      provider TEXT NOT NULL, module_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '', language TEXT NOT NULL DEFAULT 'auto',
      status TEXT NOT NULL DEFAULT 'queued', source_id TEXT, original_file_url TEXT,
      error_message TEXT, created_by TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`, args: []
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_mohan_rag_video_ingestion_status ON mohan_rag_video_ingestion_sql(status, created_at)', args: [] },
  ]);
  schemaReady = true;
}

export function normalizeVideoSourceUrl(value: unknown): { url: string; provider: 'youtube' | 'bunny' } | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const videoId = host === 'youtu.be' ? pathParts[0] : parsed.searchParams.get('v') || pathParts[pathParts.length - 1];
      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
      return { url: `https://www.youtube.com/watch?v=${videoId}`, provider: 'youtube' };
    }
    if (host === 'iframe.mediadelivery.net') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'play' || !/^\d+$/.test(parts[1] || '') || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(parts[2] || '')) return null;
      return { url: `https://iframe.mediadelivery.net/play/${parts[1]}/${parts[2]}`, provider: 'bunny' };
    }
    const configuredCdn = process.env.BUNNY_STORAGE_CDN_HOST?.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const isBunnyHost = host.endsWith('.b-cdn.net') || host === 'mediadelivery.net' || host.endsWith('.mediadelivery.net') || (configuredCdn && host === configuredCdn);
    if (!isBunnyHost || !/\.(mp3|mp4|m4a|mpga|mpeg|wav|webm|mov)$/i.test(parsed.pathname)) return null;
    return { url: parsed.toString(), provider: 'bunny' };
  } catch {
    return null;
  }
}

function mapJob(row: any): VideoIngestionJob {
  return {
    id: String(row.id), sourceUrl: String(row.source_url), provider: row.provider,
    moduleId: row.module_id, title: String(row.title || ''), topic: String(row.topic || ''),
    language: String(row.language || 'auto'), status: row.status,
    sourceId: row.source_id ? String(row.source_id) : null,
    originalFileUrl: row.original_file_url ? String(row.original_file_url) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdBy: String(row.created_by || 'admin'),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function enqueueVideoSources(input: {
  urls: string[]; moduleId: MohanRagModule; topic: string; language: string; createdBy: string; titles?: string[];
}) {
  await ensureVideoIngestionSchema();
  const timestamp = new Date().toISOString();
  const parsedUrls = new Set<string>();
  const errors: Array<{ url: string; error: string }> = [];
  const statements = input.urls.map((rawUrl, index) => {
    const parsed = normalizeVideoSourceUrl(rawUrl);
    if (!parsed) {
      errors.push({ url: rawUrl.slice(0, 250), error: 'Use a valid YouTube URL or Bunny CDN/Stream media URL.' });
      return null;
    }
    if (parsedUrls.has(parsed.url)) return null;
    parsedUrls.add(parsed.url);
    const id = randomUUID();
    const hash = createHash('sha256').update(parsed.url).digest('hex');
    return {
      sql: `INSERT OR IGNORE INTO mohan_rag_video_ingestion_sql
        (id,url_hash,source_url,provider,module_id,title,topic,language,status,created_by,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,'queued',?,?,?)`,
      args: [id, hash, parsed.url, parsed.provider, input.moduleId, (input.titles?.[index] || '').slice(0, 240), input.topic.slice(0, 300), input.language, input.createdBy, timestamp, timestamp],
    };
  }).filter(Boolean) as Array<{ sql: string; args: any[] }>;

  let accepted = 0;
  for (let offset = 0; offset < statements.length; offset += 80) {
    const results = await bunnyBatch(statements.slice(offset, offset + 80));
    accepted += results.reduce((count, result) => count + Number(result.rowsAffected || 0), 0);
  }
  const jobs = await listVideoIngestionJobs(100);
  return { accepted, duplicateCount: parsedUrls.size - accepted, errors, jobs };
}

export async function listVideoIngestionJobs(limit = 100) {
  await ensureVideoIngestionSchema();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM mohan_rag_video_ingestion_sql ORDER BY created_at DESC LIMIT ?',
    args: [Math.max(1, Math.min(250, limit))],
  });
  return result.rows.map(mapJob);
}

export async function listVideoIngestionJobsForUrls(urls: string[]) {
  await ensureVideoIngestionSchema();
  const normalized = [...new Set(urls.map(url => normalizeVideoSourceUrl(url)?.url).filter((url): url is string => Boolean(url)))];
  const jobs: VideoIngestionJob[] = [];
  for (let offset = 0; offset < normalized.length; offset += 80) {
    const chunk = normalized.slice(offset, offset + 80);
    if (!chunk.length) continue;
    const result = await bunnyExecute({
      sql: `SELECT * FROM mohan_rag_video_ingestion_sql WHERE source_url IN (${chunk.map(() => '?').join(',')})`,
      args: chunk,
    });
    jobs.push(...result.rows.map(mapJob));
  }
  return jobs;
}

export async function claimNextVideoIngestionJob() {
  await ensureVideoIngestionSchema();
  const timestamp = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const result = await bunnyExecute({
    sql: `UPDATE mohan_rag_video_ingestion_sql SET status='processing', attempts=attempts+1, error_message=NULL, updated_at=?
      WHERE id=(SELECT id FROM mohan_rag_video_ingestion_sql
        WHERE status='queued' OR (status='processing' AND updated_at < ?)
        ORDER BY created_at LIMIT 1)
      AND (status='queued' OR (status='processing' AND updated_at < ?)) RETURNING *`,
    args: [timestamp, staleBefore, staleBefore],
  });
  return result.rows[0] ? mapJob(result.rows[0]) : null;
}

export async function retryFailedVideoIngestionJob(id: string) {
  await ensureVideoIngestionSchema();
  const result = await bunnyExecute({
    sql: `UPDATE mohan_rag_video_ingestion_sql
      SET status='queued', error_message=NULL, updated_at=?
      WHERE id=? AND status='failed'`,
    args: [new Date().toISOString(), id],
  });
  return Number(result.rowsAffected || 0) > 0;
}

export async function finishVideoIngestionJob(id: string, values: {
  status: 'completed' | 'failed'; sourceId?: string | null; originalFileUrl?: string | null; errorMessage?: string | null; title?: string | null;
}) {
  await ensureVideoIngestionSchema();
  await bunnyExecute({
    sql: `UPDATE mohan_rag_video_ingestion_sql SET status=?, source_id=?, original_file_url=?, error_message=?, title=CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE title END, updated_at=? WHERE id=?`,
    args: [values.status, values.sourceId ?? null, values.originalFileUrl ?? null, values.errorMessage?.slice(0, 2000) ?? null, values.title ?? null, values.title ?? null, values.title ?? null, new Date().toISOString(), id],
  });
}
