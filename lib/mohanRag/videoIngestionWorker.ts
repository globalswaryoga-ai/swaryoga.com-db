import { uploadToBunnyStorage } from '@/lib/bunny-storage';
import { saveKnowledgeSource } from './knowledgeRepository';
import { claimNextVideoIngestionJob, finishVideoIngestionJob } from './videoIngestionQueue';
import { analyzeBunnyMediaUrl, analyzeMediaBuffer, fetchYouTubeMedia, fetchYouTubeSubtitlesAnalysis, type AnalyzedMedia } from './mediaTranscription';
import { getYouTubeChannelInventoryVideos, updateYouTubeChannelScreening } from './youtubeChannelDiscovery';
import { screenTranscriptTopic } from './transcriptTopicScreening';
import { getBunnyStreamIdentity, resolveBunnyStreamMediaUrl } from './bunnyStreamMedia';

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', mpga: 'audio/mpeg', mpeg: 'audio/mpeg',
  webm: 'video/webm', mov: 'video/quicktime', mp4: 'video/mp4',
};

export async function processNextMohanRagVideo(): Promise<{ processed: boolean; jobId?: string; status?: string; error?: string }> {
  const job = await claimNextVideoIngestionJob();
  if (!job) return { processed: false };
  const channelVideoId = job.provider === 'youtube'
    ? new URL(job.sourceUrl).searchParams.get('v')
    : null;
  try {
    const isBunnyStream = job.provider === 'bunny' && getBunnyStreamIdentity(job.sourceUrl) !== null;
    const mediaUrl = isBunnyStream ? await resolveBunnyStreamMediaUrl(job.sourceUrl) : job.sourceUrl;
    const bunnyExtension = isBunnyStream ? 'mp4' : new URL(job.sourceUrl).pathname.split('.').pop()?.toLowerCase() || 'mp4';
    
    let analysis: AnalyzedMedia | null = null;
    let originalFileUrl = job.sourceUrl;
    let title = job.title;
    let extension = bunnyExtension;

    if (job.provider === 'youtube') {
      // 1. Try direct subtitle extraction first (bypasses bot challenges, fast & accurate)
      try {
        analysis = await fetchYouTubeSubtitlesAnalysis({
          url: job.sourceUrl,
          title: job.title,
          language: job.language,
        });
      } catch (subErr) {
        console.warn(`[Mohan RAG ingestion] YouTube subtitle fetch note:`, subErr);
      }

      // 2. Fall back to audio/video download if no subtitles found
      if (!analysis) {
        const media = await fetchYouTubeMedia(job.sourceUrl);
        title = title || media.title;
        extension = media.extension;
        analysis = await analyzeMediaBuffer({ ...media, language: job.language });
        originalFileUrl = await uploadToBunnyStorage(media.buffer, `${job.id}.mp4`, { contentType: 'video/mp4' });
      } else {
        title = title || analysis.title;
        extension = 'mp4';
      }
    } else {
      let bunnyTitle = new URL(job.sourceUrl).pathname.split('/').pop() || 'Bunny media';
      try { bunnyTitle = decodeURIComponent(bunnyTitle); } catch { /* Preserve the URL-encoded fallback title. */ }
      title = job.title || bunnyTitle.replace(/\.[^.]+$/, '');
      analysis = await analyzeBunnyMediaUrl({ url: mediaUrl, title, extension, language: job.language });
    }

    if (!analysis) {
      throw new Error('Unable to extract transcript analysis from media.');
    }
    const inventoryVideo = channelVideoId
      ? (await getYouTubeChannelInventoryVideos([channelVideoId]))[0]
      : null;
    let screening: Awaited<ReturnType<typeof screenTranscriptTopic>> | null = null;
    let screeningError: string | null = null;
    if (inventoryVideo) {
      try {
        screening = await screenTranscriptTopic({
          title: title || analysis.title,
          language: analysis.language || job.language || 'unknown',
          transcript: analysis.timeline,
        });
      } catch (error) {
        screeningError = error instanceof Error ? error.message : 'Transcript topic screening failed.';
      }
    }
    const source = await saveKnowledgeSource({
      moduleId: job.moduleId,
      title: title || analysis.title,
      content: analysis.annotatedTimeline,
      topic: screening?.topic || job.topic,
      language: analysis.language || job.language,
      sourceType: job.provider === 'youtube' ? 'youtube' : isBunnyStream ? 'bunny_stream' : extension,
      sourceReference: job.sourceUrl,
      originalFileName: `${analysis.title}.${extension}`.slice(0, 240),
      originalFileUrl,
      originalMimeType: CONTENT_TYPES[extension] || 'application/octet-stream',
      extractionType: `${analysis.correctionApplied ? 'proofread_' : ''}${analysis.emotionSuggestionsAdded ? 'timestamped_transcription_with_avatar_suggestions' : 'timestamped_transcription'}`,
      status: 'draft',
    }, job.createdBy);
    if (!source?.id) throw new Error('Bunny saved the media but did not return the knowledge source record.');
    let screeningPersistenceError: string | null = null;
    if (inventoryVideo) {
      try {
        await updateYouTubeChannelScreening(inventoryVideo.videoId, {
          status: screening ? 'needs_review' : 'screening_failed',
          language: analysis.language || 'unknown',
          topicMatch: screening
            ? `${screening.relevant ? 'Relevant' : 'Possibly unrelated'}: ${screening.topic} (${Math.round(screening.confidence * 100)}%) — ${screening.rationale}`
            : undefined,
          errorMessage: screeningError,
        });
      } catch (error) {
        screeningPersistenceError = error instanceof Error ? error.message : 'Could not save channel screening results.';
        console.error(`[Mohan RAG ingestion] Screening result for ${inventoryVideo.videoId} was not saved:`, screeningPersistenceError);
      }
    }
    const warning = screeningError
      ? `Transcript saved as a draft, but topic screening needs retry: ${screeningError}`
      : screeningPersistenceError
        ? `Transcript saved as a draft, but screening results could not be saved: ${screeningPersistenceError}`
        : null;
    await finishVideoIngestionJob(job.id, {
      status: 'completed',
      sourceId: source.id,
      originalFileUrl,
      title: title || analysis.title,
      errorMessage: warning,
    });
    return {
      processed: true,
      jobId: job.id,
      status: 'completed',
      ...(warning ? { error: warning } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video ingestion failed.';
    await finishVideoIngestionJob(job.id, { status: 'failed', errorMessage: message });
    if (channelVideoId) {
      try {
        await updateYouTubeChannelScreening(channelVideoId, { status: 'ingestion_failed', errorMessage: message });
      } catch (screeningUpdateError) {
        console.error(
          `[Mohan RAG ingestion] Could not update channel inventory for ${channelVideoId}:`,
          screeningUpdateError instanceof Error ? screeningUpdateError.message : screeningUpdateError,
        );
      }
    }
    console.error(`[Mohan RAG ingestion] Job ${job.id} failed:`, message);
    return { processed: true, jobId: job.id, status: 'failed', error: message };
  }
}
