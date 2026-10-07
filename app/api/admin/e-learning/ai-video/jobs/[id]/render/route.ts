import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import { submitAvatarVideo } from '@/lib/aiVideo/customAvatar'; // Switched from heygen.ts to customAvatar.ts

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
      if (!avatar?.voiceId) {
        errors.push(`Missing voiceId for language "${script.language}"`);
        continue;
      }

      try {
        const providerJobId = await submitAvatarVideo({
          avatarPrompt: avatar.avatarPrompt,
          avatarId: avatar.avatarId,
          voiceId: avatar.voiceId,
          script: script.text,
        });
        
        // We keep the key named 'heygenVideoId' for frontend backwards compatibility 
        // during polling, even though it's now a Replicate/Fal job ID.
        const renderEntry = { language: script.language, heygenVideoId: providerJobId, status: 'rendering' as const };
        if (already) {
          newRenders[alreadyIndex] = { ...already, ...renderEntry };
        } else {
          newRenders.push(renderEntry);
        }
        anySubmitted = true;
      } catch (submitError) {
        errors.push(submitError instanceof Error ? submitError.message : `Custom Avatar submit failed for "${script.language}"`);
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
