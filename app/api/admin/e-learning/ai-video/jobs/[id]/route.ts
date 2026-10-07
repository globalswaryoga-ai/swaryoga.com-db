import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob, deleteAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import { checkCustomVideoStatus as checkVideoStatus } from '@/lib/aiVideo/customAvatar'; // Switched from heygen.ts to customAvatar.ts
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
    let job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    let anyPending = false;
    let rendersChanged = false;
    const newRenders = [...(job.renders || [])];

    for (const render of newRenders) {
      if (render.status !== 'rendering' || !render.heygenVideoId) continue;
      try {
        const heygenStatus = await checkVideoStatus(render.heygenVideoId);
        render.heygenStatus = heygenStatus.status;
        rendersChanged = true;

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
        rendersChanged = true;
      }
    }

    let jobStatus = job.status;
    if (job.status === 'rendering' && !anyPending) {
      const anyFailed = newRenders.some((r: any) => r.status === 'failed');
      jobStatus = anyFailed ? 'failed' : 'completed';
    }

    if (rendersChanged || jobStatus !== job.status) {
      job = (await updateAiVideoJob(id, { renders: newRenders, status: jobStatus }))!;
    }

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

    const body = await request.json().catch(() => ({} as any));
    const language = String(body?.language || '').trim();

    let job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (language) {
      const newScripts = [...(job.scripts || [])];
      const scriptIndex = newScripts.findIndex((s: any) => s.language === language);
      if (scriptIndex === -1) return NextResponse.json({ error: `No script found for language "${language}"` }, { status: 404 });

      const script = { ...newScripts[scriptIndex] };
      if (typeof body?.text === 'string') script.text = body.text;
      if (typeof body?.approved === 'boolean') script.approved = body.approved;
      newScripts[scriptIndex] = script;

      job = (await updateAiVideoJob(id, { scripts: newScripts }))!;
      return NextResponse.json({ success: true, data: job }, { status: 200 });
    }

    if (typeof body?.correctedTranscript === 'string') {
      job = (await updateAiVideoJob(id, { correctedTranscript: body.correctedTranscript }))!;
      return NextResponse.json({ success: true, data: job }, { status: 200 });
    }

    // Metadata edit: topic title, workshop grouping, source language. Lets
    // the admin fix a typo or regroup a topic without recreating the job
    // (and re-spending a transcription call) from scratch.
    const metaFields = ['topicTitle', 'workshopName', 'dayOrder', 'sourceLanguage', 'sourceYoutubeUrl'] as const;
    const hasMetaUpdate = metaFields.some((f) => body?.[f] !== undefined);
    if (hasMetaUpdate) {
      const updates: any = {};
      if (typeof body.topicTitle === 'string') updates.topicTitle = body.topicTitle.trim();
      if (typeof body.workshopName === 'string') updates.workshopName = body.workshopName.trim() || undefined;
      if (body.dayOrder !== undefined) updates.dayOrder = body.dayOrder === '' || body.dayOrder === null ? undefined : Number(body.dayOrder);
      if (typeof body.sourceLanguage === 'string') updates.sourceLanguage = body.sourceLanguage.trim();
      if (typeof body.sourceYoutubeUrl === 'string') updates.sourceYoutubeUrl = body.sourceYoutubeUrl.trim() || undefined;

      job = (await updateAiVideoJob(id, updates))!;
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

    const job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    await deleteAiVideoJob(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
