import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

import {
  getAiVideoJobById,
  updateAiVideoJob,
  deleteAiVideoJob,
} from '@/lib/aiVideo/bunnyAiVideoRepository';
import { checkReplicateStatus } from '@/lib/aiVideo/replicateAvatar';
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

// Poll endpoint for Bunny Database jobs
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;
    let job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });


    let modified = false;
    const updatedRenders = [...(job.renders || [])];

    for (const render of updatedRenders) {
      if (render.status !== 'rendering' || !render.replicatePredictionId) continue;
      try {
        const repStatus = await checkReplicateStatus(render.replicatePredictionId);
        render.replicateStatus = repStatus.status;

        if (repStatus.status === 'completed' && repStatus.videoUrl) {
          render.status = 'uploading';
          render.videoUrl = repStatus.videoUrl;

          // Upload to Bunny Stream
          try {
            const videoRes = await fetch(repStatus.videoUrl);
            if (videoRes.ok) {
              const buffer = Buffer.from(await videoRes.arrayBuffer());
              const upload = await uploadToBunnyStream(buffer, `${job.topicTitle} (${render.language})`);
              if (upload.success) {
                render.bunnyVideoId = upload.videoId;
                render.bunnyEmbedUrl = upload.embedUrl;
              }
            }
          } catch (uploadErr) {
            console.warn('Bunny Stream upload warning:', uploadErr);
          }

          render.status = 'completed';
          modified = true;
        } else if (repStatus.status === 'failed') {
          render.status = 'failed';
          render.errorMessage = repStatus.errorMessage || 'Replicate render failed';
          modified = true;
        }
      } catch (renderError: any) {
        render.status = 'failed';
        render.errorMessage = renderError instanceof Error ? renderError.message : 'Render check failed';

        modified = true;
      }
    }

    if (modified) {
      const anyPending = updatedRenders.some((r) => r.status === 'rendering' || r.status === 'uploading');
      let nextStatus = job.status;
      if (job.status === 'rendering' && !anyPending) {
        const anyFailed = updatedRenders.some((r) => r.status === 'failed');
        nextStatus = anyFailed ? 'failed' : 'completed';
      }

      const updated = await updateAiVideoJob(id, {
        renders: updatedRenders,
        status: nextStatus,
      });
      if (updated) job = updated;
    }

    return NextResponse.json({ success: true, data: job }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Edits the corrected transcript, scripts, or job metadata in Bunny Database
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = guard(request);
    if (error) return error;

    const { id } = params;

    const body = await request.json().catch(() => ({} as any));
    const language = String(body?.language || '').trim();

    const job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (language) {
      const scripts = [...(job.scripts || [])];
      const scriptIndex = scripts.findIndex((s) => s.language === language);
      if (scriptIndex === -1) {
        return NextResponse.json({ error: `No script found for language "${language}"` }, { status: 404 });
      }

      if (typeof body?.text === 'string') scripts[scriptIndex].text = body.text;
      if (typeof body?.approved === 'boolean') scripts[scriptIndex].approved = body.approved;

      const updated = await updateAiVideoJob(id, { scripts });
      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    }

    if (typeof body?.correctedTranscript === 'string') {
      const updated = await updateAiVideoJob(id, { correctedTranscript: body.correctedTranscript });
      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    }

    const updates: any = {};
    if (typeof body?.topicTitle === 'string') updates.topicTitle = body.topicTitle.trim();
    if (typeof body?.workshopName === 'string') updates.workshopName = body.workshopName.trim() || undefined;
    if (body?.dayOrder !== undefined) updates.dayOrder = body.dayOrder === '' || body.dayOrder === null ? undefined : Number(body.dayOrder);
    if (typeof body?.sourceLanguage === 'string') updates.sourceLanguage = body.sourceLanguage.trim();
    if (typeof body?.sourceYoutubeUrl === 'string') updates.sourceYoutubeUrl = body.sourceYoutubeUrl.trim() || undefined;

    if (Object.keys(updates).length > 0) {
      const updated = await updateAiVideoJob(id, updates);
      return NextResponse.json({ success: true, data: updated }, { status: 200 });
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

    const deleted = await deleteAiVideoJob(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
