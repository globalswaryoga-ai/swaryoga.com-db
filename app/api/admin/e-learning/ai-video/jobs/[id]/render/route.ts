import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

import { getAiVideoJobById, updateAiVideoJob } from '@/lib/aiVideo/bunnyAiVideoRepository';
import { submitAvatarRender } from '@/lib/aiVideo/replicateAvatar';
import { uploadToBunnyStream } from '@/lib/bunny-stream';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}


export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { id } = params;

    const body = await request.json().catch(() => ({} as any));
    const avatarByLanguage: Record<string, { voiceId?: string; sourceImageUrl?: string }> = body?.avatarByLanguage || {};

    let job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const approvedScripts = (job.scripts || []).filter((s) => s.approved);
    if (!approvedScripts.length) {
      return NextResponse.json({ error: 'No approved scripts to render' }, { status: 400 });
    }


    const updatedRenders = [...(job.renders || [])];
    let anySubmitted = false;
    const errors: string[] = [];

    for (const script of approvedScripts) {

      let renderEntry = updatedRenders.find((r) => r.language === script.language);
      if (renderEntry && renderEntry.status === 'completed') continue;

      const avatar = avatarByLanguage[script.language] || {};

      try {
        const result = await submitAvatarRender({
          script: script.text,
          language: script.language,
          voice: avatar.voiceId || 'alloy',
          sourceImageUrl: avatar.sourceImageUrl || 'https://swaryogacrm.b-cdn.net/mohan.jpg',
        });

        if (result.status === 'completed' && result.audioBuffer) {
          // If OpenAI generated speech or immediate video, upload to Bunny Stream
          let bunnyVideoId: string | undefined;
          let bunnyEmbedUrl: string | undefined;

          try {
            const upload = await uploadToBunnyStream(result.audioBuffer, `${job.topicTitle} (${script.language})`);
            if (upload.success) {
              bunnyVideoId = upload.videoId;
              bunnyEmbedUrl = upload.embedUrl;
            }
          } catch (uploadErr) {
            console.warn('Bunny upload notice:', uploadErr);
          }

          const entry = {
            language: script.language,
            status: 'completed' as const,
            bunnyVideoId,
            bunnyEmbedUrl,
            videoUrl: result.videoUrl,
          };

          if (renderEntry) {
            Object.assign(renderEntry, entry);
          } else {
            updatedRenders.push(entry);
          }
          anySubmitted = true;
        } else if (result.predictionId) {
          const entry = {
            language: script.language,
            replicatePredictionId: result.predictionId,
            status: 'rendering' as const,
          };

          if (renderEntry) {
            Object.assign(renderEntry, entry);
          } else {
            updatedRenders.push(entry);
          }
          anySubmitted = true;
        }
      } catch (submitError: any) {
        errors.push(submitError instanceof Error ? submitError.message : `Render failed for "${script.language}"`);
      }
    }

    const anyPending = updatedRenders.some((r) => r.status === 'rendering' || r.status === 'uploading');
    const updated = await updateAiVideoJob(id, {
      renders: updatedRenders,
      status: anyPending ? 'rendering' : 'completed',
      errorMessage: errors.length ? errors.join('; ') : undefined,
    });

    return NextResponse.json({ success: anySubmitted, data: updated, errors }, { status: anySubmitted ? 200 : 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start render';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
