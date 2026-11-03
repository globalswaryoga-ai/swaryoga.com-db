import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
<<<<<<< HEAD
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import { submitAvatarVideo as submitHeyGenVideo } from '@/lib/aiVideo/heygen';
import { submitAvatarVideo as submitCustomAvatarVideo } from '@/lib/aiVideo/customAvatar';
import { SwarNeuralVideoService } from '@/lib/aiVideo/swarNeuralVideo';
=======
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/aiVideo/bunnyAiVideoRepository';
import { submitAvatarRender } from '@/lib/aiVideo/replicateAvatar';
import { uploadToBunnyStream } from '@/lib/bunny-stream';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

<<<<<<< HEAD
// Submits every approved-but-not-yet-rendered script to our custom Avatar system. 
// Returns immediately once each render is queued. The frontend polls GET /jobs/[id] 
// to find out when it's done.
=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { id } = params;
<<<<<<< HEAD

    const body = await request.json().catch(() => ({} as any));
    // avatarByLanguage: { hi: { avatarPrompt, voiceId }, en: { avatarPrompt, voiceId } }
    const avatarByLanguage: Record<string, { avatarPrompt?: string; avatarId?: string; voiceId: string }> = body?.avatarByLanguage || {};

    const job = await getAiVideoJobById(id);
=======
    const body = await request.json().catch(() => ({} as any));
    const avatarByLanguage: Record<string, { voiceId?: string; sourceImageUrl?: string }> = body?.avatarByLanguage || {};

    let job = await getAiVideoJobById(id);
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const approvedScripts = (job.scripts || []).filter((s) => s.approved);
    if (!approvedScripts.length) {
      return NextResponse.json({ error: 'No approved scripts to render' }, { status: 400 });
    }

<<<<<<< HEAD
    const newRenders = [...(job.renders || [])];
=======
    const updatedRenders = [...(job.renders || [])];
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
    let anySubmitted = false;
    const errors: string[] = [];

    for (const script of approvedScripts) {
<<<<<<< HEAD
      const alreadyIndex = newRenders.findIndex((r: any) => r.language === script.language);
      const already = alreadyIndex >= 0 ? newRenders[alreadyIndex] : undefined;
      
      if (already && already.status !== 'failed') continue; // don't resubmit a render in progress or done

      const avatar = avatarByLanguage[script.language];
      const voiceId = avatar?.voiceId || '43961498a7894b25be7eb6c3382b6502';
      const avatarId = avatar?.avatarId || '11236c340a0f4ece98638134c021b166';

      try {
        // Primary: In-House Swar Yoga Digital Human Engine (Zero HeyGen fees, Multilingual, Sitting/Standing/Walking)
        const swarJob = await SwarNeuralVideoService.createJob({
          avatarName: 'Mohan Sir (Vedic Twin)',
          posture: 'sitting',
          backgroundId: 'bg_meditation_room',
          script: script.text,
          language: script.language,
          voiceId: voiceId,
          adminId: 'admin',
        });

        // Trigger processing
        const processed = await SwarNeuralVideoService.processJob(swarJob.jobId);
        const renderEntry = {
          language: script.language,
          heygenVideoId: swarJob.jobId,
          videoUrl: processed.videoUrl,
          status: (processed.status === 'completed' ? 'completed' : processed.status === 'failed' ? 'failed' : 'rendering') as any,
        };
        if (already) {
          newRenders[alreadyIndex] = { ...already, ...renderEntry };
        } else {
          newRenders.push(renderEntry);
        }
        anySubmitted = true;
      } catch (submitError) {
        errors.push(submitError instanceof Error ? submitError.message : `Avatar submit failed for "${script.language}"`);
      }
    }

    let jobStatus = job.status;
    let errorMessage = job.errorMessage;
    if (anySubmitted) jobStatus = 'rendering';
    if (errors.length) errorMessage = errors.join('; ');

    const updatedJob = await updateAiVideoJob(id, { 
      renders: newRenders, 
      status: jobStatus,
      errorMessage
    });

    return NextResponse.json({ success: anySubmitted, data: updatedJob, errors }, { status: anySubmitted ? 200 : 400 });
=======
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
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start render';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
