import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import {
  discoverSwarYogaChannelVideos,
  getYouTubeChannelInventoryVideos,
  hasAuthorizedYouTubeCookiesConfigured,
  listYouTubeChannelInventory,
  updateYouTubeChannelScreening,
} from '@/lib/mohanRag/youtubeChannelDiscovery';
import { listVideoIngestionJobsForUrls, enqueueVideoSources } from '@/lib/mohanRag/videoIngestionQueue';
import { getKnowledgeSource } from '@/lib/mohanRag/knowledgeRepository';
import { screenTranscriptTopic } from '@/lib/mohanRag/transcriptTopicScreening';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 240;

function getAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function GET(request: NextRequest) {
  if (!getAdmin(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }
  try {
    const inventory = await listYouTubeChannelInventory();
    const usesAuthorizedCookies = await hasAuthorizedYouTubeCookiesConfigured();
    return NextResponse.json({ success: true, inventory, usesAuthorizedCookies });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load YouTube channel inventory.',
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }
  try {
    let requestBody: unknown = null;
    if (request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      try {
        requestBody = await request.json();
      } catch {
        return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
      }
      if (!isRecord(requestBody)) {
        return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
      }
    }
    if (isRecord(requestBody) && requestBody.action === 'retry_screening') {
      const videoId = typeof requestBody.videoId === 'string' ? requestBody.videoId : '';
      if (!/^[\w-]{11}$/.test(videoId)) {
        return NextResponse.json({ error: 'A valid discovered video ID is required.' }, { status: 400 });
      }
      const [video] = await getYouTubeChannelInventoryVideos([videoId]);
      if (!video) {
        return NextResponse.json({ error: 'The video is not in the discovered channel inventory.' }, { status: 404 });
      }
      if (video.screeningStatus !== 'screening_failed') {
        return NextResponse.json({ error: 'Only videos with a failed topic screen can be retried.' }, { status: 409 });
      }
      const [job] = await listVideoIngestionJobsForUrls([video.videoUrl]);
      if (job?.status !== 'completed' || !job.sourceId) {
        return NextResponse.json({ error: 'The saved transcript job is unavailable. Retry ingestion from Ingestion & Jobs.' }, { status: 409 });
      }
      const source = await getKnowledgeSource(job.sourceId);
      if (!source || source.sourceReference !== video.videoUrl) {
        return NextResponse.json({ error: 'The saved transcript could not be matched to this channel video.' }, { status: 404 });
      }

      let screening: Awaited<ReturnType<typeof screenTranscriptTopic>>;
      try {
        screening = await screenTranscriptTopic({
          title: source.title,
          language: source.language || 'unknown',
          transcript: source.content,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Transcript topic screening failed.';
        await updateYouTubeChannelScreening(videoId, { status: 'screening_failed', errorMessage: message });
        return NextResponse.json({ error: message }, { status: 503 });
      }
      await updateYouTubeChannelScreening(videoId, {
        status: 'needs_review',
        language: source.language || 'unknown',
        topicMatch: `${screening.relevant ? 'Relevant' : 'Possibly unrelated'}: ${screening.topic} (${Math.round(screening.confidence * 100)}%) — ${screening.rationale}`,
        errorMessage: null,
      });
      return NextResponse.json({ success: true, message: 'Topic screening completed. The transcript remains a draft for review.' });
    }

    if (isRecord(requestBody) && requestBody.action === 'queue') {
      if (!Array.isArray(requestBody.videoIds) || requestBody.videoIds.length === 0) {
        return NextResponse.json({ error: 'Select at least one discovered video to queue.' }, { status: 400 });
      }
      if (requestBody.videoIds.length > 500) {
        return NextResponse.json({ error: 'Queue no more than 500 discovered videos at a time.' }, { status: 413 });
      }
      const videoIds: string[] = [];
      for (const id of requestBody.videoIds) {
        if (typeof id !== 'string') {
          return NextResponse.json({ error: 'One or more selected video IDs are invalid.' }, { status: 400 });
        }
        if (!videoIds.includes(id)) videoIds.push(id);
      }
      if (videoIds.some(id => !/^[\w-]{11}$/.test(id))) {
        return NextResponse.json({ error: 'One or more selected video IDs are invalid.' }, { status: 400 });
      }

      const inventory = await getYouTubeChannelInventoryVideos(videoIds);
      if (inventory.length !== videoIds.length) {
        return NextResponse.json({ error: 'Some selected videos are not in the discovered channel inventory. Refresh before queuing.' }, { status: 404 });
      }
      const usesAuthorizedCookies = await hasAuthorizedYouTubeCookiesConfigured();
      const restricted = inventory.filter(video => video.availability === 'subscriber_only');
      if (restricted.length && !usesAuthorizedCookies) {
        return NextResponse.json({
          error: 'The selected videos require an authorized YouTube session. Configure YOUTUBE_COOKIES_FILE for an account that can view them before queuing.',
        }, { status: 403 });
      }

      const candidates = inventory.filter(video => video.screeningStatus === 'not_screened');
      if (!candidates.length) {
        return NextResponse.json({ error: 'Selected videos are already queued or screened. Refresh the inventory for current status.' }, { status: 409 });
      }

      const userId = getViewerUserId(admin) || 'admin';
      const result = await enqueueVideoSources({
        urls: candidates.map(video => video.videoUrl),
        titles: candidates.map(video => video.title),
        moduleId: 'general',
        topic: 'YouTube channel transcript screening',
        language: 'auto',
        createdBy: userId,
      });
      const jobs = await listVideoIngestionJobsForUrls(candidates.map(video => video.videoUrl));
      const jobsByVideoId = new Map(jobs.map(job => [new URL(job.sourceUrl).searchParams.get('v'), job]));
      for (const video of candidates) {
        const job = jobsByVideoId.get(video.videoId);
        if (!job) continue;
        if (job.status === 'queued' || job.status === 'processing') {
          await updateYouTubeChannelScreening(video.videoId, { status: job.status, errorMessage: null });
        } else if (job.status === 'failed') {
          await updateYouTubeChannelScreening(video.videoId, { status: 'ingestion_failed', errorMessage: job.errorMessage });
        } else if (job.status === 'completed') {
          await updateYouTubeChannelScreening(video.videoId, {
            status: 'transcript_ready',
            errorMessage: 'An earlier ingestion job completed. Review its saved transcript before queuing this video again.',
          });
        }
      }
      return NextResponse.json({
        success: true,
        accepted: result.accepted,
        duplicateCount: result.duplicateCount,
        errors: result.errors,
        message: `${result.accepted} new video(s) queued; ${result.duplicateCount} already had an ingestion job. Transcripts will be saved as drafts and screened for language/topic.`,
      }, { status: 201 });
    }

    const result = await discoverSwarYogaChannelVideos();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Discovered ${result.discoveredCount} unique channel videos accessible to the configured YouTube session.`,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'YouTube channel discovery failed.',
    }, { status: 503 });
  }
}
