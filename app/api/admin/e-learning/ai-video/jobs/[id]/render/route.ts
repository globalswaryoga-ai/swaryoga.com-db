import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import { submitAvatarVideo as submitHeyGenVideo } from '@/lib/aiVideo/heygen';
import { submitAvatarVideo as submitCustomAvatarVideo } from '@/lib/aiVideo/customAvatar';
import { SwarNeuralVideoService } from '@/lib/aiVideo/swarNeuralVideo';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Submits every approved-but-not-yet-rendered script to our custom Avatar system. 
// Returns immediately once each render is queued. The frontend polls GET /jobs/[id] 
// to find out when it's done.
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
    // avatarByLanguage: { hi: { avatarPrompt, voiceId }, en: { avatarPrompt, voiceId } }
    const avatarByLanguage: Record<string, { avatarPrompt?: string; avatarId?: string; voiceId: string }> = body?.avatarByLanguage || {};

    const job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const approvedScripts = (job.scripts || []).filter((s: any) => s.approved);
    if (!approvedScripts.length) {
      return NextResponse.json({ error: 'No approved scripts to render' }, { status: 400 });
    }

    const newRenders = [...(job.renders || [])];
    let anySubmitted = false;
    const errors: string[] = [];

    for (const script of approvedScripts) {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start render';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
