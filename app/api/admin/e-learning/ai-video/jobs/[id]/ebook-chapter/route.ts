import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getAiVideoJob } from '@/lib/schemas/enterpriseSchemas';
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({} as any));
    const language = String(body?.language || '').trim();
    if (!language) return NextResponse.json({ error: 'language is required' }, { status: 400 });

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const job = await (AiVideoJob as any).findById(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (!job.correctedTranscript) {
      return NextResponse.json({ error: 'No corrected transcript yet — finish the correction review first' }, { status: 400 });
    }

    const text = await rewriteForReading(job.correctedTranscript, job.sourceLanguage, language, job.topicTitle);

    job.ebookChapters = job.ebookChapters || [];
    const existing = job.ebookChapters.find((c: any) => c.language === language);
    if (existing) existing.text = text;
    else job.ebookChapters.push({ language, text });
    job.errorMessage = undefined;
    await job.save();

    return NextResponse.json({ success: true, data: job }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate e-book chapter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
