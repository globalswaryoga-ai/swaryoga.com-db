import { spawn } from 'node:child_process';
import { access, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { resolveYouTubeCookiesPath } from './youtubeCookiesHelper';

export const MOHAN_RAG_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@Swar-Yoga/videos';
const MAX_PLAYLIST_JSON_BYTES = 30 * 1024 * 1024;
const MAX_DISCOVERY_VIDEOS = 1000;

export type DiscoveredYouTubeVideo = {
  videoId: string;
  videoUrl: string;
  title: string;
  description: string;
  durationSeconds: number | null;
  availability: string;
  language: string;
  uploadDate: string;
};

export type YouTubeChannelInventoryRow = DiscoveredYouTubeVideo & {
  screeningStatus: string;
  transcriptLanguage: string;
  topicMatch: string;
  errorMessage: string | null;
  discoveredAt: string;
};

let schemaReady = false;

export function isAllowedSwarYogaChannelUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && ['youtube.com', 'www.youtube.com'].includes(url.hostname.toLowerCase())
      && url.pathname.replace(/\/+$/, '').toLowerCase() === '/@swar-yoga/videos'
      && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function buildChannelDiscoveryArgs(channelUrl: string, cookiesFile?: string): string[] {
  if (!isAllowedSwarYogaChannelUrl(channelUrl)) {
    throw new Error('Only the configured Swar Yoga YouTube channel can be scanned.');
  }
  const args = [
    '--flat-playlist',
    '--dump-single-json',
    '--playlist-end', String(MAX_DISCOVERY_VIDEOS),
    '--no-warnings',
    channelUrl,
  ];
  if (cookiesFile) args.splice(args.length - 1, 0, '--cookies', cookiesFile);
  return args;
}

export function mapChannelEntries(payload: unknown): DiscoveredYouTubeVideo[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('YouTube did not return a channel inventory.');
  }
  const entries = (payload as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) {
    throw new Error('The YouTube channel response did not contain a video list.');
  }

  const unique = new Map<string, DiscoveredYouTubeVideo>();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const videoId = typeof item.id === 'string' ? item.id : '';
    if (!/^[\w-]{11}$/.test(videoId) || unique.has(videoId)) continue;
    const duration = Number(item.duration);
    unique.set(videoId, {
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: typeof item.title === 'string' ? item.title.slice(0, 500) : `YouTube video ${videoId}`,
      description: typeof item.description === 'string' ? item.description.slice(0, 20_000) : '',
      durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
      availability: typeof item.availability === 'string' ? item.availability : 'unknown',
      language: typeof item.language === 'string' ? item.language.slice(0, 30) : '',
      uploadDate: typeof item.upload_date === 'string' ? item.upload_date.slice(0, 8) : '',
    });
  }
  return [...unique.values()];
}

async function ensureSchema() {
  if (schemaReady) return;
  await bunnyBatch([{
    sql: `CREATE TABLE IF NOT EXISTS mohan_rag_youtube_channel_inventory_sql (
      video_id TEXT PRIMARY KEY,
      channel_url TEXT NOT NULL,
      video_url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER,
      availability TEXT NOT NULL DEFAULT 'unknown',
      language TEXT NOT NULL DEFAULT '',
      upload_date TEXT NOT NULL DEFAULT '',
      screening_status TEXT NOT NULL DEFAULT 'not_screened',
      transcript_language TEXT NOT NULL DEFAULT '',
      topic_match TEXT NOT NULL DEFAULT '',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    args: [],
  }, {
    sql: 'CREATE INDEX IF NOT EXISTS idx_mohan_rag_youtube_inventory_date ON mohan_rag_youtube_channel_inventory_sql(updated_at DESC)',
    args: [],
  }]);
  schemaReady = true;
}

function mapInventoryRow(row: Record<string, unknown>): YouTubeChannelInventoryRow {
  return {
    videoId: String(row.video_id),
    videoUrl: String(row.video_url),
    title: String(row.title || ''),
    description: String(row.description || ''),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    availability: String(row.availability || 'unknown'),
    language: String(row.language || ''),
    uploadDate: String(row.upload_date || ''),
    screeningStatus: String(row.screening_status || 'not_screened'),
    transcriptLanguage: String(row.transcript_language || ''),
    topicMatch: String(row.topic_match || ''),
    errorMessage: row.error_message ? String(row.error_message) : null,
    discoveredAt: String(row.updated_at || row.created_at || ''),
  };
}

export async function listYouTubeChannelInventory(limit = 1000): Promise<YouTubeChannelInventoryRow[]> {
  await ensureSchema();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM mohan_rag_youtube_channel_inventory_sql ORDER BY updated_at DESC LIMIT ?',
    args: [Math.max(1, Math.min(MAX_DISCOVERY_VIDEOS, Math.floor(limit)))],
  });
  return result.rows.map((row) => mapInventoryRow(row as Record<string, unknown>));
}

export async function getYouTubeChannelInventoryVideos(videoIds: string[]) {
  await ensureSchema();
  const ids = [...new Set(videoIds)];
  const videos: YouTubeChannelInventoryRow[] = [];
  for (let offset = 0; offset < ids.length; offset += 80) {
    const chunk = ids.slice(offset, offset + 80);
    if (!chunk.length) continue;
    const result = await bunnyExecute({
      sql: `SELECT * FROM mohan_rag_youtube_channel_inventory_sql WHERE video_id IN (${chunk.map(() => '?').join(',')})`,
      args: chunk,
    });
    videos.push(...result.rows.map((row) => mapInventoryRow(row as Record<string, unknown>)));
  }
  return videos;
}

export async function updateYouTubeChannelScreening(videoId: string, values: {
  status: string;
  language?: string;
  topicMatch?: string;
  errorMessage?: string | null;
}) {
  await ensureSchema();
  await bunnyExecute({
    sql: `UPDATE mohan_rag_youtube_channel_inventory_sql
      SET screening_status=?, transcript_language=COALESCE(?, transcript_language),
          topic_match=COALESCE(?, topic_match), error_message=?, updated_at=?
      WHERE video_id=?`,
    args: [
      values.status,
      values.language ?? null,
      values.topicMatch ?? null,
      values.errorMessage ?? null,
      new Date().toISOString(),
      videoId,
    ],
  });
}

async function getCookiesFile(): Promise<string | undefined> {
  return await resolveYouTubeCookiesPath();
}

export async function hasAuthorizedYouTubeCookiesConfigured() {
  return Boolean(await getCookiesFile());
}

function readYtDlpJson(channelUrl: string, cookiesFile?: string): Promise<unknown> {
  const binary = process.env.YT_DLP_PATH || 'yt-dlp';
  const args = buildChannelDiscoveryArgs(channelUrl, cookiesFile);
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    let bytes = 0;
    let stderr = '';
    const timeout = setTimeout(() => child.kill('SIGKILL'), 180_000);
    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_PLAYLIST_JSON_BYTES) {
        child.kill('SIGKILL');
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-3000);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`yt-dlp could not start. Install it on the server or set YT_DLP_PATH. ${error.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (bytes > MAX_PLAYLIST_JSON_BYTES) {
        reject(new Error('The channel inventory exceeded the safe response limit.'));
        return;
      }
      if (code !== 0) {
        reject(new Error(`YouTube channel discovery failed: ${stderr.trim() || `yt-dlp exited ${code}`}`));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(stdout, bytes).toString('utf8')));
      } catch {
        reject(new Error('yt-dlp returned invalid channel inventory data.'));
      }
    });
  });
}

export async function discoverSwarYogaChannelVideos() {
  await ensureSchema();
  const channelUrl = MOHAN_RAG_YOUTUBE_CHANNEL_URL;
  const cookiesFile = await getCookiesFile();
  const payload = await readYtDlpJson(channelUrl, cookiesFile);
  const videos = mapChannelEntries(payload);
  if (!videos.length) {
    throw new Error('No videos were discoverable from the channel with the current YouTube access.');
  }

  const now = new Date().toISOString();
  const statements = videos.map((video) => ({
    sql: `INSERT INTO mohan_rag_youtube_channel_inventory_sql
      (video_id,channel_url,video_url,title,description,duration_seconds,availability,language,upload_date,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(video_id) DO UPDATE SET
        channel_url=excluded.channel_url, video_url=excluded.video_url, title=excluded.title,
        description=excluded.description, duration_seconds=excluded.duration_seconds,
        availability=excluded.availability, language=excluded.language, upload_date=excluded.upload_date,
        updated_at=excluded.updated_at`,
    args: [
      video.videoId, channelUrl, video.videoUrl, video.title, video.description,
      video.durationSeconds, video.availability, video.language, video.uploadDate, now, now,
    ],
  }));
  for (let offset = 0; offset < statements.length; offset += 80) {
    await bunnyBatch(statements.slice(offset, offset + 80));
  }

  const inventory = await listYouTubeChannelInventory(MAX_DISCOVERY_VIDEOS);
  return {
    discoveredCount: videos.length,
    uniqueCount: new Set(videos.map((video) => video.videoId)).size,
    usesAuthorizedCookies: Boolean(cookiesFile),
    inventory,
  };
}
