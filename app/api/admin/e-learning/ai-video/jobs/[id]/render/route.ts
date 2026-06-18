import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJob } from '@/lib/schemas/enterpriseSchemas';
import { submitAvatarVideo } from '@/lib/aiVideo/heygen';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Submits every approved-but-not-yet-rendered script to HeyGen. Returns
// immediately once each render is queued — HeyGen does the actual work async,
// the frontend polls GET /jobs/[id] to find out when it's done.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    // avatarByLanguage: { hi: { avatarId, voiceId }, en: { avatarId, voiceId } }
    const avatarByLanguage: Record<string, { avatarId: string; voiceId: string }> = body?.avatarByLanguage || {};

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const job = await (AiVideoJob as any).findById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const approvedScripts = (job.scripts || []).filter((s: any) => s.approved);
    if (!approvedScripts.length) {
      return NextResponse.json({ error: 'No approved scripts to render' }, { status: 400 });
    }

    job.renders = job.renders || [];
    let anySubmitted = false;
    const errors: string[] = [];

    for (const script of approvedScripts) {
      const already = job.renders.find((r: any) => r.language === script.language);
      if (already && already.status !== 'failed') continue; // don't resubmit a render in progress or done

      const avatar = avatarByLanguage[script.language];
      if (!avatar?.avatarId || !avatar?.voiceId) {
        errors.push(`Missing avatarId/voiceId for language "${script.language}"`);
        continue;
      }

      try {
        const heygenVideoId = await submitAvatarVideo({
          avatarId: avatar.avatarId,
          voiceId: avatar.voiceId,
          script: script.text,
        });
        const renderEntry = { language: script.language, heygenVideoId, status: 'rendering' as const };
        if (already) {
          Object.assign(already, renderEntry);
        } else {
          job.renders.push(renderEntry);
        }
        anySubmitted = true;
      } catch (submitError) {
        errors.push(submitError instanceof Error ? submitError.message : `HeyGen submit failed for "${script.language}"`);
      }
    }

    if (anySubmitted) job.status = 'rendering';
    if (errors.length) job.errorMessage = errors.join('; ');
    await job.save();

    return NextResponse.json({ success: anySubmitted, data: job, errors }, { status: anySubmitted ? 200 : 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start render';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
