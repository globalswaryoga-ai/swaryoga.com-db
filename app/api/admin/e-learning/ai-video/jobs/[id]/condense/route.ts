import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJob } from '@/lib/schemas/enterpriseSchemas';
import { condenseAndTranslate } from '@/lib/aiVideo/transcribeAndCondense';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Stage 3: runs only after the admin has reviewed/edited the corrected
// transcript. Condenses + translates it into each target language — cutting
// material, never adding it (see lib/aiVideo/transcribeAndCondense.ts).
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

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const job = await (AiVideoJob as any).findById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (!job.correctedTranscript) {
      return NextResponse.json({ error: 'No corrected transcript to condense yet' }, { status: 400 });
    }

    job.status = 'condensing';
    await job.save();

    try {
      const scripts: { language: string; text: string; approved: boolean }[] = [];
      for (const language of job.targetLanguages) {
        const text = await condenseAndTranslate(job.correctedTranscript, job.sourceLanguage, language, job.topicTitle);
        scripts.push({ language, text, approved: false });
      }
      job.scripts = scripts;
      job.status = 'awaiting_review';
      await job.save();
    } catch (condenseError) {
      job.status = 'failed';
      job.errorMessage = condenseError instanceof Error ? condenseError.message : 'Condensing/translation failed';
      await job.save();
    }

    return NextResponse.json({ success: true, data: job }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to condense job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
