import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

import { getAiVideoJobById, updateAiVideoJob } from '@/lib/aiVideo/bunnyAiVideoRepository';
import { rewriteForReading } from '@/lib/aiVideo/transcribeAndCondense';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

    const body = await request.json().catch(() => ({}));
    const language = String(body?.language || '').trim();


    if (!language) {
      return NextResponse.json({ error: 'language is required' }, { status: 400 });
    }

    let job = await getAiVideoJobById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });


    if (!job.correctedTranscript) {
      return NextResponse.json({ error: 'No corrected transcript to write e-book from yet' }, { status: 400 });
    }

    const chapterText = await rewriteForReading(
      job.correctedTranscript,
      job.sourceLanguage,
      language,
      job.topicTitle
    );

    const existingChapters = [...(job.ebookChapters || [])];
    const matchIndex = existingChapters.findIndex((c) => c.language === language);
    if (matchIndex >= 0) {
      existingChapters[matchIndex].text = chapterText;
    } else {
      existingChapters.push({ language, text: chapterText });
    }

    const updated = await updateAiVideoJob(id, {
      ebookChapters: existingChapters,
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate e-book chapter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
