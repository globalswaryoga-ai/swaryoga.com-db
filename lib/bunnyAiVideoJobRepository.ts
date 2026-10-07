import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

function parse(value: unknown): any | null {
  try { return JSON.parse(String(value)); } catch { return null; }
}

export async function initBunnyAiVideoJobsSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS ai_video_jobs_sql (
        job_id TEXT PRIMARY KEY,
        source_youtube_url TEXT,
        source_file_name TEXT,
        source_language TEXT DEFAULT 'hi',
        topic_title TEXT NOT NULL,
        target_languages TEXT,
        workshop_name TEXT,
        day_order INTEGER,
        status TEXT DEFAULT 'pending',
        transcript TEXT,
        corrected_transcript TEXT,
        scripts_json TEXT,
        ebook_chapters_json TEXT,
        renders_json TEXT,
        error_message TEXT,
        created_by_user_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_ai_video_jobs_user_id ON ai_video_jobs_sql(created_by_user_id)`, args: [] }
  ]);
}

export interface AiVideoJob {
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
  scripts: any[];
  ebookChapters: any[];
  renders: any[];
  errorMessage?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAiVideoJobById(jobId: string): Promise<AiVideoJob | null> {
  await initBunnyAiVideoJobsSchema();
  const result = await bunnyExecute('SELECT * FROM ai_video_jobs_sql WHERE job_id = ?', [jobId]);
  if (!result.rows || result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    _id: String(row.job_id),
    sourceYoutubeUrl: row.source_youtube_url ? String(row.source_youtube_url) : undefined,
    sourceFileName: row.source_file_name ? String(row.source_file_name) : undefined,
    sourceLanguage: String(row.source_language || 'hi'),
    topicTitle: String(row.topic_title),
    targetLanguages: parse(row.target_languages) || [],
    workshopName: row.workshop_name ? String(row.workshop_name) : undefined,
    dayOrder: row.day_order ? Number(row.day_order) : undefined,
    status: String(row.status || 'pending'),
    transcript: row.transcript ? String(row.transcript) : undefined,
    correctedTranscript: row.corrected_transcript ? String(row.corrected_transcript) : undefined,
    scripts: parse(row.scripts_json) || [],
    ebookChapters: parse(row.ebook_chapters_json) || [],
    renders: parse(row.renders_json) || [],
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export async function createAiVideoJob(data: Partial<AiVideoJob>): Promise<AiVideoJob> {
  await initBunnyAiVideoJobsSchema();
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();
  await bunnyExecute(
    `INSERT INTO ai_video_jobs_sql (
      job_id, source_youtube_url, source_file_name, source_language, topic_title,
      target_languages, workshop_name, day_order, status, transcript,
      corrected_transcript, scripts_json, ebook_chapters_json, renders_json,
      error_message, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      data.sourceYoutubeUrl || null,
      data.sourceFileName || null,
      data.sourceLanguage || 'hi',
      data.topicTitle || 'Untitled',
      JSON.stringify(data.targetLanguages || []),
      data.workshopName || null,
      data.dayOrder || null,
      data.status || 'pending',
      data.transcript || null,
      data.correctedTranscript || null,
      JSON.stringify(data.scripts || []),
      JSON.stringify(data.ebookChapters || []),
      JSON.stringify(data.renders || []),
      data.errorMessage || null,
      data.createdByUserId || null,
      now,
      now
    ]
  );
  return (await getAiVideoJobById(jobId))!;
}

export async function updateAiVideoJob(jobId: string, updates: Partial<AiVideoJob>): Promise<AiVideoJob | null> {
  await initBunnyAiVideoJobsSchema();
  const current = await getAiVideoJobById(jobId);
  if (!current) return null;
  const now = new Date().toISOString();
  
  const targetLanguages = updates.targetLanguages !== undefined ? JSON.stringify(updates.targetLanguages) : JSON.stringify(current.targetLanguages);
  const scriptsJson = updates.scripts !== undefined ? JSON.stringify(updates.scripts) : JSON.stringify(current.scripts);
  const ebookChaptersJson = updates.ebookChapters !== undefined ? JSON.stringify(updates.ebookChapters) : JSON.stringify(current.ebookChapters);
  const rendersJson = updates.renders !== undefined ? JSON.stringify(updates.renders) : JSON.stringify(current.renders);
  
  await bunnyExecute(
    `UPDATE ai_video_jobs_sql SET
      source_youtube_url = ?, source_file_name = ?, source_language = ?, topic_title = ?,
      target_languages = ?, workshop_name = ?, day_order = ?, status = ?, transcript = ?,
      corrected_transcript = ?, scripts_json = ?, ebook_chapters_json = ?, renders_json = ?,
      error_message = ?, updated_at = ?
    WHERE job_id = ?`,
    [
      updates.sourceYoutubeUrl !== undefined ? updates.sourceYoutubeUrl : current.sourceYoutubeUrl || null,
      updates.sourceFileName !== undefined ? updates.sourceFileName : current.sourceFileName || null,
      updates.sourceLanguage !== undefined ? updates.sourceLanguage : current.sourceLanguage,
      updates.topicTitle !== undefined ? updates.topicTitle : current.topicTitle,
      targetLanguages,
      updates.workshopName !== undefined ? updates.workshopName : current.workshopName || null,
      updates.dayOrder !== undefined ? updates.dayOrder : current.dayOrder || null,
      updates.status !== undefined ? updates.status : current.status,
      updates.transcript !== undefined ? updates.transcript : current.transcript || null,
      updates.correctedTranscript !== undefined ? updates.correctedTranscript : current.correctedTranscript || null,
      scriptsJson,
      ebookChaptersJson,
      rendersJson,
      updates.errorMessage !== undefined ? updates.errorMessage : current.errorMessage || null,
      now,
      jobId
    ]
  );
  return await getAiVideoJobById(jobId);
}

export async function deleteAiVideoJob(jobId: string): Promise<void> {
  await initBunnyAiVideoJobsSchema();
  await bunnyExecute('DELETE FROM ai_video_jobs_sql WHERE job_id = ?', [jobId]);
}

export async function listAiVideoJobs(): Promise<AiVideoJob[]> {
  await initBunnyAiVideoJobsSchema();
  const result = await bunnyExecute('SELECT * FROM ai_video_jobs_sql ORDER BY updated_at DESC', []);
  if (!result.rows) return [];
  return result.rows.map(row => ({
    _id: String(row.job_id),
    sourceYoutubeUrl: row.source_youtube_url ? String(row.source_youtube_url) : undefined,
    sourceFileName: row.source_file_name ? String(row.source_file_name) : undefined,
    sourceLanguage: String(row.source_language || 'hi'),
    topicTitle: String(row.topic_title),
    targetLanguages: parse(row.target_languages) || [],
    workshopName: row.workshop_name ? String(row.workshop_name) : undefined,
    dayOrder: row.day_order ? Number(row.day_order) : undefined,
    status: String(row.status || 'pending'),
    transcript: row.transcript ? String(row.transcript) : undefined,
    correctedTranscript: row.corrected_transcript ? String(row.corrected_transcript) : undefined,
    scripts: parse(row.scripts_json) || [],
    ebookChapters: parse(row.ebook_chapters_json) || [],
    renders: parse(row.renders_json) || [],
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }));
}

export async function getAiVideoJobsByWorkshop(workshopName: string, language: string): Promise<AiVideoJob[]> {
  const result = await bunnyExecute(
    "SELECT * FROM ai_video_jobs_sql WHERE workshop_name = ? ORDER BY day_order ASC, created_at ASC",
    [workshopName]
  );
  if (!result.rows) return [];
  const jobs = result.rows.map(row => ({
    _id: String(row.job_id),
    sourceYoutubeUrl: row.source_youtube_url ? String(row.source_youtube_url) : undefined,
    sourceFileName: row.source_file_name ? String(row.source_file_name) : undefined,
    sourceLanguage: String(row.source_language || 'hi'),
    topicTitle: String(row.topic_title),
    targetLanguages: parse(row.target_languages) || [],
    workshopName: row.workshop_name ? String(row.workshop_name) : undefined,
    dayOrder: row.day_order ? Number(row.day_order) : undefined,
    status: String(row.status || 'pending'),
    transcript: row.transcript ? String(row.transcript) : undefined,
    correctedTranscript: row.corrected_transcript ? String(row.corrected_transcript) : undefined,
    scripts: parse(row.scripts_json) || [],
    ebookChapters: parse(row.ebook_chapters_json) || [],
    renders: parse(row.renders_json) || [],
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }));
  
  // Filter for jobs that have the language in ebookChapters
  return jobs.filter(job => job.ebookChapters.some((c: any) => c.language === language));
}
