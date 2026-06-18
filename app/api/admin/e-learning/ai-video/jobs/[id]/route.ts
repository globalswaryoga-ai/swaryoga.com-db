import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJob } from '@/lib/schemas/enterpriseSchemas';
import { checkVideoStatus } from '@/lib/aiVideo/heygen';
import { uploadToBunnyStream } from '@/lib/bunny-stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function guard(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return { error: unauthorized() };
  if (!isSuperAdmin(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 }) };
  }
  return { decoded };
}

// Poll endpoint: for any render still in progress, checks HeyGen; once a
// render completes there, downloads the video and uploads it to Bunny
// Stream, so the frontend can just keep calling this until everything's done.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const job = await (AiVideoJob as any).findById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    let anyPending = false;
    for (const render of job.renders || []) {
      if (render.status !== 'rendering' || !render.heygenVideoId) continue;
      try {
        const heygenStatus = await checkVideoStatus(render.heygenVideoId);
        render.heygenStatus = heygenStatus.status;

        if (heygenStatus.status === 'completed' && heygenStatus.videoUrl) {
          render.status = 'uploading';
          const videoRes = await fetch(heygenStatus.videoUrl);
          if (!videoRes.ok) throw new Error(`Failed to download HeyGen video: ${videoRes.status}`);
          const buffer = Buffer.from(await videoRes.arrayBuffer());

          const upload = await uploadToBunnyStream(buffer, `${job.topicTitle} (${render.language})`);
          if (!upload.success) throw new Error(upload.error || 'Bunny Stream upload failed');

          render.bunnyVideoId = upload.videoId;
          render.bunnyEmbedUrl = upload.embedUrl;
          render.status = 'completed';
        } else if (heygenStatus.status === 'failed') {
          render.status = 'failed';
          render.errorMessage = heygenStatus.errorMessage || 'HeyGen render failed';
        } else {
          anyPending = true;
        }
      } catch (renderError) {
        render.status = 'failed';
        render.errorMessage = renderError instanceof Error ? renderError.message : 'Render check failed';
      }
    }

    if (job.status === 'rendering' && !anyPending) {
      const anyFailed = (job.renders || []).some((r: any) => r.status === 'failed');
      job.status = anyFailed ? 'failed' : 'completed';
    }

    await job.save();

    return NextResponse.json({ success: true, data: job }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Edits the corrected transcript (no language given) before condensing, or
// edits/approves a language's condensed script (language given) before any
// HeyGen render fires.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const language = String(body?.language || '').trim();

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const job = await (AiVideoJob as any).findById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (language) {
      const script = (job.scripts || []).find((s: any) => s.language === language);
      if (!script) return NextResponse.json({ error: `No script found for language "${language}"` }, { status: 404 });

      if (typeof body?.text === 'string') script.text = body.text;
      if (typeof body?.approved === 'boolean') script.approved = body.approved;

      await job.save();
      return NextResponse.json({ success: true, data: job }, { status: 200 });
    }

    if (typeof body?.correctedTranscript === 'string') {
      job.correctedTranscript = body.correctedTranscript;
      await job.save();
      return NextResponse.json({ success: true, data: job }, { status: 200 });
    }

    // Metadata edit: topic title, workshop grouping, source language. Lets
    // the admin fix a typo or regroup a topic without recreating the job
    // (and re-spending a transcription call) from scratch.
    const metaFields = ['topicTitle', 'workshopName', 'dayOrder', 'sourceLanguage', 'sourceYoutubeUrl'] as const;
    const hasMetaUpdate = metaFields.some((f) => body?.[f] !== undefined);
    if (hasMetaUpdate) {
      if (typeof body.topicTitle === 'string') job.topicTitle = body.topicTitle.trim();
      if (typeof body.workshopName === 'string') job.workshopName = body.workshopName.trim() || undefined;
      if (body.dayOrder !== undefined) job.dayOrder = body.dayOrder === '' || body.dayOrder === null ? undefined : Number(body.dayOrder);
      if (typeof body.sourceLanguage === 'string') job.sourceLanguage = body.sourceLanguage.trim();
      if (typeof body.sourceYoutubeUrl === 'string') job.sourceYoutubeUrl = body.sourceYoutubeUrl.trim() || undefined;

      await job.save();
      return NextResponse.json({ success: true, data: job }, { status: 200 });
    }

    return NextResponse.json({ error: 'No recognized fields to update' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const deleted = await (AiVideoJob as any).findByIdAndDelete(id).lean();
    if (!deleted) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
