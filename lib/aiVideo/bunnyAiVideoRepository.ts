import { bunnyExecute } from '../bunnyDatabase';
import * as crypto from 'crypto';

export interface AiVideoScript {
  language: string;
  text: string;
  approved: boolean;
}

export interface AiVideoRender {
  language: string;
  replicatePredictionId?: string;
  replicateStatus?: string;
  status: 'pending' | 'rendering' | 'uploading' | 'completed' | 'failed';
  bunnyVideoId?: string;
  bunnyEmbedUrl?: string;
  courseVideoId?: string;
  errorMessage?: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface EbookChapter {
  language: string;
  text: string;
}

export interface AiVideoJobData {
  _id: string;
  sourceYoutubeUrl?: string;
  sourceFileName?: string;
  sourceLanguage: string;
  topicTitle: string;
  targetLanguages: string[];
  workshopName?: string;
  dayOrder?: number;
  status: string;
  transcript?: string;
  correctedTranscript?: string;
  scripts: AiVideoScript[];
  ebookChapters?: EbookChapter[];
  renders: AiVideoRender[];
  errorMessage?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

function parseRow(row: any): AiVideoJobData {
  let targetLanguages: string[] = [];
  try {
    targetLanguages = typeof row.target_languages === 'string'
      ? (row.target_languages.startsWith('[') ? JSON.parse(row.target_languages) : row.target_languages.split(',').map((s: string) => s.trim()).filter(Boolean))
      : [];
  } catch {
    targetLanguages = [];
  }

  let scripts: AiVideoScript[] = [];
  try {
    scripts = row.scripts_json ? JSON.parse(row.scripts_json) : [];
  } catch {
    scripts = [];
  }

  let ebookChapters: EbookChapter[] = [];
  try {
    ebookChapters = row.ebook_chapters_json ? JSON.parse(row.ebook_chapters_json) : [];
  } catch {
    ebookChapters = [];
  }

  let renders: AiVideoRender[] = [];
  try {
    renders = row.renders_json ? JSON.parse(row.renders_json) : [];
  } catch {
    renders = [];
  }

  return {
    _id: row.job_id,
    sourceYoutubeUrl: row.source_youtube_url || undefined,
    sourceFileName: row.source_file_name || undefined,
    sourceLanguage: row.source_language || 'hi',
    topicTitle: row.topic_title || '',
    targetLanguages,
    workshopName: row.workshop_name || undefined,
    dayOrder: row.day_order !== null && row.day_order !== undefined ? Number(row.day_order) : undefined,
    status: row.status || 'pending',
    transcript: row.transcript || undefined,
    correctedTranscript: row.corrected_transcript || undefined,
    scripts,
    ebookChapters,
    renders,
    errorMessage: row.error_message || undefined,
    createdByUserId: row.created_by_user_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function listAiVideoJobs(): Promise<AiVideoJobData[]> {
  const result = await bunnyExecute({
    sql: 'SELECT * FROM ai_video_jobs_sql ORDER BY updated_at DESC LIMIT 100',
    args: [],
  });

  return result.rows.map(parseRow);
}

export async function getAiVideoJobById(jobId: string): Promise<AiVideoJobData | null> {
  const result = await bunnyExecute({
    sql: 'SELECT * FROM ai_video_jobs_sql WHERE job_id = ? LIMIT 1',
    args: [jobId],
  });

  if (!result.rows.length) return null;
  return parseRow(result.rows[0]);
}

export async function createAiVideoJob(data: {
  sourceYoutubeUrl?: string;
  sourceFileName?: string;
  sourceLanguage: string;
  topicTitle: string;
  targetLanguages: string[];
  workshopName?: string;
  dayOrder?: number;
  status: string;
  transcript?: string;
  correctedTranscript?: string;
  createdByUserId?: string;
}): Promise<AiVideoJobData> {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT INTO ai_video_jobs_sql (
      job_id, source_youtube_url, source_file_name, source_language, topic_title,
      target_languages, workshop_name, day_order, status, transcript,
      corrected_transcript, scripts_json, ebook_chapters_json, renders_json,
      created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      jobId,
      data.sourceYoutubeUrl || null,
      data.sourceFileName || null,
      data.sourceLanguage || 'hi',
      data.topicTitle,
      JSON.stringify(data.targetLanguages || []),
      data.workshopName || null,
      data.dayOrder !== undefined && Number.isFinite(data.dayOrder) ? data.dayOrder : null,
      data.status || 'pending',
      data.transcript || null,
      data.correctedTranscript || null,
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      data.createdByUserId || 'admin',
      now,
      now,
    ],
  });

  return (await getAiVideoJobById(jobId))!;
}

export async function updateAiVideoJob(
  jobId: string,
  updates: Partial<{
    topicTitle: string;
    sourceLanguage: string;
    sourceYoutubeUrl?: string;
    workshopName?: string;
    dayOrder?: number;
    targetLanguages: string[];
    status: string;
    transcript?: string;
    correctedTranscript?: string;
    scripts: AiVideoScript[];
    ebookChapters?: EbookChapter[];
    renders: AiVideoRender[];
    errorMessage?: string;
  }>
): Promise<AiVideoJobData | null> {
  const current = await getAiVideoJobById(jobId);
  if (!current) return null;

  const now = new Date().toISOString();
  const setClauses: string[] = ['updated_at = ?'];
  const args: any[] = [now];

  if (updates.topicTitle !== undefined) {
    setClauses.push('topic_title = ?');
    args.push(updates.topicTitle);
  }
  if (updates.sourceLanguage !== undefined) {
    setClauses.push('source_language = ?');
    args.push(updates.sourceLanguage);
  }
  if (updates.sourceYoutubeUrl !== undefined) {
    setClauses.push('source_youtube_url = ?');
    args.push(updates.sourceYoutubeUrl || null);
  }
  if (updates.workshopName !== undefined) {
    setClauses.push('workshop_name = ?');
    args.push(updates.workshopName || null);
  }
  if (updates.dayOrder !== undefined) {
    setClauses.push('day_order = ?');
    args.push(updates.dayOrder !== null && Number.isFinite(updates.dayOrder) ? updates.dayOrder : null);
  }
  if (updates.targetLanguages !== undefined) {
    setClauses.push('target_languages = ?');
    args.push(JSON.stringify(updates.targetLanguages));
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    args.push(updates.status);
  }
  if (updates.transcript !== undefined) {
    setClauses.push('transcript = ?');
    args.push(updates.transcript || null);
  }
  if (updates.correctedTranscript !== undefined) {
    setClauses.push('corrected_transcript = ?');
    args.push(updates.correctedTranscript || null);
  }
  if (updates.scripts !== undefined) {
    setClauses.push('scripts_json = ?');
    args.push(JSON.stringify(updates.scripts));
  }
  if (updates.ebookChapters !== undefined) {
    setClauses.push('ebook_chapters_json = ?');
    args.push(JSON.stringify(updates.ebookChapters));
  }
  if (updates.renders !== undefined) {
    setClauses.push('renders_json = ?');
    args.push(JSON.stringify(updates.renders));
  }
  if (updates.errorMessage !== undefined) {
    setClauses.push('error_message = ?');
    args.push(updates.errorMessage || null);
  }

  args.push(jobId);

  await bunnyExecute({
    sql: `UPDATE ai_video_jobs_sql SET ${setClauses.join(', ')} WHERE job_id = ?`,
    args,
  });

  return getAiVideoJobById(jobId);
}

export async function deleteAiVideoJob(jobId: string): Promise<boolean> {
  const result = await bunnyExecute({
    sql: 'DELETE FROM ai_video_jobs_sql WHERE job_id = ?',
    args: [jobId],
  });

  return result.rowsAffected > 0;
}
