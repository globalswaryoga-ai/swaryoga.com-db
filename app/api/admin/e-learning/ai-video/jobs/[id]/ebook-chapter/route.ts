import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJobById, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import { rewriteForReading } from '@/lib/aiVideo/transcribeAndCondense';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Generates (or regenerates) one language's e-book chapter from the
// corrected transcript — independent of the spoken/condensed scripts and of
// HeyGen, so this is usable as soon as the correction review is done.
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
    const language = String(body?.language || '').trim();
    if (!language) return NextResponse.json({ error: 'language is required' }, { status: 400 });

    let job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!job.correctedTranscript) {
      return NextResponse.json({ error: 'No corrected transcript yet — finish the correction review first' }, { status: 400 });
    }

    const text = await rewriteForReading(job.correctedTranscript, job.sourceLanguage, language, job.topicTitle);

    const newEbookChapters = [...(job.ebookChapters || [])];
    const existingIndex = newEbookChapters.findIndex((c: any) => c.language === language);
    if (existingIndex >= 0) {
      newEbookChapters[existingIndex] = { ...newEbookChapters[existingIndex], text };
    } else {
      newEbookChapters.push({ language, text });
    }

    job = (await updateAiVideoJob(id, {
      ebookChapters: newEbookChapters,
      errorMessage: undefined
    }))!;

    return NextResponse.json({ success: true, data: job }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate e-book chapter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
