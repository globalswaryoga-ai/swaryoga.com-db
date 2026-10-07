import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
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

    let job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (!job.correctedTranscript) {
      return NextResponse.json({ error: 'No corrected transcript to condense yet' }, { status: 400 });
    }

    job = (await updateAiVideoJob(id, { status: 'condensing' }))!;

    try {
      const scripts: { language: string; text: string; approved: boolean }[] = [];
      for (const language of job.targetLanguages) {
        const text = await condenseAndTranslate(job.correctedTranscript, job.sourceLanguage, language, job.topicTitle);
        scripts.push({ language, text, approved: false });
      }
      job = (await updateAiVideoJob(id, {
        scripts,
        status: 'awaiting_review',
        errorMessage: undefined
      }))!;
    } catch (condenseError) {
      job = (await updateAiVideoJob(id, {
        status: 'failed',
        errorMessage: condenseError instanceof Error ? condenseError.message : 'Condensing/translation failed'
      }))!;
    }

    return NextResponse.json({ success: true, data: job }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to condense job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
