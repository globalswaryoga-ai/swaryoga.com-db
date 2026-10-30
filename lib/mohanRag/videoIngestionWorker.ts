import { uploadToBunnyStorage } from '@/lib/bunny-storage';
import { saveKnowledgeSource } from './knowledgeRepository';
import { claimNextVideoIngestionJob, finishVideoIngestionJob } from './videoIngestionQueue';
import { analyzeBunnyMediaUrl, analyzeMediaBuffer, fetchYouTubeMedia } from './mediaTranscription';

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', mpga: 'audio/mpeg', mpeg: 'audio/mpeg',
  webm: 'video/webm', mov: 'video/quicktime', mp4: 'video/mp4',
};

export async function processNextMohanRagVideo(): Promise<{ processed: boolean; jobId?: string; status?: string; error?: string }> {
  const job = await claimNextVideoIngestionJob();
  if (!job) return { processed: false };
  try {
    const bunnyExtension = new URL(job.sourceUrl).pathname.split('.').pop()?.toLowerCase() || 'mp4';
    const media = job.provider === 'youtube' ? await fetchYouTubeMedia(job.sourceUrl) : null;
    let bunnyTitle = new URL(job.sourceUrl).pathname.split('/').pop() || 'Bunny media';
    try { bunnyTitle = decodeURIComponent(bunnyTitle); } catch { /* Preserve the URL-encoded fallback title. */ }
    const title = job.title || (media?.title ?? bunnyTitle.replace(/\.[^.]+$/, ''));
    const extension = media?.extension || bunnyExtension;
    const analysis = media
      ? await analyzeMediaBuffer({ ...media, language: job.language })
      : await analyzeBunnyMediaUrl({ url: job.sourceUrl, title, extension, language: job.language });
    const originalFileUrl = job.provider === 'youtube'
      ? await uploadToBunnyStorage(media!.buffer, `${job.id}.mp4`, { contentType: 'video/mp4' })
      : job.sourceUrl;
    const source = await saveKnowledgeSource({
      moduleId: job.moduleId,
      title: title || analysis.title,
      content: analysis.annotatedTimeline,
      topic: job.topic,
      language: job.language,
      sourceType: job.provider === 'youtube' ? 'youtube' : extension,
      sourceReference: job.sourceUrl,
      originalFileName: `${analysis.title}.${extension}`.slice(0, 240),
      originalFileUrl,
      originalMimeType: CONTENT_TYPES[extension] || 'application/octet-stream',
      extractionType: `${analysis.correctionApplied ? 'proofread_' : ''}${analysis.emotionSuggestionsAdded ? 'timestamped_transcription_with_avatar_suggestions' : 'timestamped_transcription'}`,
    }, job.createdBy);
    if (!source?.id) throw new Error('Bunny saved the media but did not return the knowledge source record.');
    await finishVideoIngestionJob(job.id, { status: 'completed', sourceId: source.id, originalFileUrl });
    return { processed: true, jobId: job.id, status: 'completed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video ingestion failed.';
    await finishVideoIngestionJob(job.id, { status: 'failed', errorMessage: message });
    console.error(`[Mohan RAG ingestion] Job ${job.id} failed:`, message);
    return { processed: true, jobId: job.id, status: 'failed', error: message };
  }
}
