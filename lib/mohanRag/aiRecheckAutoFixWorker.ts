import { bunnyExecute } from '@/lib/bunnyDatabase';
import { saveKnowledgeSource } from './knowledgeRepository';
import { analyzeBunnyMediaUrl } from './mediaTranscription';

export interface VideoSourceHealth {
  id: string;
  title: string;
  moduleId: string;
  topic: string;
  language: string;
  sourceType: string;
  originalFileName: string;
  originalFileUrl: string;
  contentLength: number;
  needsFix: boolean;
  reason: string;
}

export interface AutoFixScanResult {
  totalSources: number;
  videoSources: number;
  healthyVideoSources: number;
  needingFixSources: number;
  sources: VideoSourceHealth[];
}

/**
 * Scan all sources in the database to identify which video sources
 * currently have placeholder / PDF syllabus data instead of authentic video audio transcription.
 */
export async function scanVideoSourcesForAutoFix(moduleId?: string): Promise<AutoFixScanResult> {
  const modFilter = moduleId && moduleId !== 'all' ? `WHERE module_id = ?` : '';
  const args = moduleId && moduleId !== 'all' ? [moduleId] : [];

  const res = await bunnyExecute({
    sql: `SELECT id, module_id, title, topic, language, source_type, original_file_name, original_file_url, source_reference, LENGTH(content) as content_len, SUBSTR(content, 1, 200) as preview FROM mohan_rag_sources_sql ${modFilter} ORDER BY content_len ASC`,
    args,
  });

  const allRows = res.rows || [];
  const sources: VideoSourceHealth[] = [];

  let videoSources = 0;
  let healthyVideoSources = 0;
  let needingFixSources = 0;

  for (const r of allRows) {
    const isVideo =
      (r.original_file_name && /\.(mp4|mov|webm|mp3|m4a|wav)$/i.test(r.original_file_name)) ||
      (r.original_file_url && (r.original_file_url.includes('.mp4') || r.original_file_url.includes('.mp3') || r.original_file_url.includes('mediadelivery.net'))) ||
      r.source_type === 'youtube' ||
      r.source_type === 'bunny_stream';

    if (!isVideo) continue;

    videoSources++;
    const len = Number(r.content_len || 0);
    const preview = String(r.preview || '');

    let needsFix = false;
    let reason = 'Authentic video transcription stored';

    if (len < 800) {
      needsFix = true;
      reason = `Content too short (${len} chars). Currently has outline/PDF summary data.`;
    } else if (preview.includes('दिवस ') && preview.includes('मार्गदर्शक: मोहन काळबुर्गी') && len < 2000) {
      needsFix = true;
      reason = 'Contains static syllabus outline instead of verbatim audio speech.';
    } else if ((preview.includes('[00:00–01:00]') || preview.includes('[00:00-01:00]')) && (preview.includes('[10:00–11:00]') || preview.includes('[10:00-11:00]')) && len < 2000) {
      needsFix = true;
      reason = 'Contains empty timestamp placeholders with no spoken words.';
    }

    if (needsFix) {
      needingFixSources++;
    } else {
      healthyVideoSources++;
    }

    sources.push({
      id: String(r.id),
      title: String(r.title),
      moduleId: String(r.module_id || 'level1'),
      topic: String(r.topic || ''),
      language: String(r.language || 'mr'),
      sourceType: String(r.source_type || 'mp4'),
      originalFileName: String(r.original_file_name || ''),
      originalFileUrl: String(r.original_file_url || r.source_reference || ''),
      contentLength: len,
      needsFix,
      reason,
    });
  }

  return {
    totalSources: allRows.length,
    videoSources,
    healthyVideoSources,
    needingFixSources,
    sources,
  };
}

/**
 * Auto-fix a single video source by downloading its real media audio and running verbatim transcription.
 */
export async function autoFixSingleVideoSource(sourceId: string): Promise<{
  success: boolean;
  oldLength: number;
  newLength: number;
  message: string;
}> {
  const query = await bunnyExecute({
    sql: 'SELECT * FROM mohan_rag_sources_sql WHERE id = ?',
    args: [sourceId],
  });

  if (!query.rows.length) {
    throw new Error(`Source with ID ${sourceId} not found in database.`);
  }

  const s = query.rows[0];
  const oldLength = Number((s.content || '').length);
  const mediaUrl = String(s.original_file_url || s.source_reference || '').trim();

  if (!mediaUrl || (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://'))) {
    throw new Error(`Source "${s.title}" has no valid media URL to extract audio from.`);
  }

  // Determine language code (default mr for Mohan Sir's lectures)
  const rawLang = String(s.language || 'mr').toLowerCase();
  const lang = rawLang.startsWith('mr') || rawLang.includes('marathi')
    ? 'mr'
    : rawLang.startsWith('hi') || rawLang.includes('hindi')
    ? 'hi'
    : 'en';

  console.log(`[AI Auto-Fix] Extracting real audio and transcribing "${s.title}" from ${mediaUrl}...`);

  const extension = s.original_file_name ? s.original_file_name.split('.').pop()?.toLowerCase() || 'mp4' : 'mp4';

  const analysis = await analyzeBunnyMediaUrl({
    url: mediaUrl,
    title: String(s.title),
    extension,
    language: lang,
  });

  const newContent = analysis.annotatedTimeline.trim();
  if (!newContent || newContent.length < 200) {
    throw new Error(`Transcription output was empty or invalid for "${s.title}".`);
  }

  await saveKnowledgeSource({
    id: String(s.id),
    moduleId: String(s.module_id || 'level1') as any,
    title: String(s.title),
    content: newContent,
    topic: String(s.topic || 'all topices marathi L-1'),
    language: lang,
    sourceType: String(s.source_type || 'mp4'),
    sourceReference: String(s.source_reference || mediaUrl),
    originalFileName: String(s.original_file_name || `${s.title}.${extension}`),
    originalFileUrl: mediaUrl,
    originalMimeType: String(s.original_mime_type || 'video/mp4'),
    extractionType: 'whisper_timestamped_transcription',
  }, 'admin');

  console.log(`[AI Auto-Fix] Successfully auto-fixed "${s.title}"! Characters: ${oldLength} -> ${newContent.length}`);

  return {
    success: true,
    oldLength,
    newLength: newContent.length,
    message: `Successfully transcribed and updated "${s.title}" with ${newContent.length.toLocaleString()} characters of real spoken video data!`,
  };
}

/**
 * Batch auto-fix multiple video sources that currently have dummy / PDF data.
 */
export async function autoFixBatchVideoSources(options?: {
  moduleId?: string;
  limit?: number;
}): Promise<{
  totalAttempted: number;
  fixed: number;
  failed: number;
  results: Array<{ id: string; title: string; success: boolean; oldLength: number; newLength: number; error?: string }>;
}> {
  const scan = await scanVideoSourcesForAutoFix(options?.moduleId);
  const targets = scan.sources.filter(s => s.needsFix).slice(0, options?.limit || 5);

  const results: Array<{ id: string; title: string; success: boolean; oldLength: number; newLength: number; error?: string }> = [];
  let fixed = 0;
  let failed = 0;

  for (const t of targets) {
    try {
      const res = await autoFixSingleVideoSource(t.id);
      results.push({
        id: t.id,
        title: t.title,
        success: true,
        oldLength: res.oldLength,
        newLength: res.newLength,
      });
      fixed++;
    } catch (err: any) {
      results.push({
        id: t.id,
        title: t.title,
        success: false,
        oldLength: t.contentLength,
        newLength: t.contentLength,
        error: err.message,
      });
      failed++;
    }
  }

  return {
    totalAttempted: targets.length,
    fixed,
    failed,
    results,
  };
}

