import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getAiVideoJob } from '@/lib/schemas/enterpriseSchemas';
import { transcribeAudio, correctTranscript, ExtractedAudio } from '@/lib/aiVideo/transcribeAndCondense';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const jobs = await (AiVideoJob as any)
      .find({})
      .select('topicTitle sourceYoutubeUrl targetLanguages status createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, data: jobs }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Creates the job and runs stages 1+2 only (transcribe, then faithfully
// correct) — stops at awaiting_correction_review so the admin can verify
// nothing was invented before any condensing/translation happens. Stage 3
// (condense+translate per language) is a separate step, POST .../condense.
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const formData = await request.formData();

    const audioFile = formData.get('audioFile') as File | null;
    const topicTitle = String(formData.get('topicTitle') || '').trim();
    const sourceYoutubeUrl = String(formData.get('sourceYoutubeUrl') || '').trim(); // optional reference only
    const sourceLanguage = String(formData.get('sourceLanguage') || 'hi').trim();
    const workshopName = String(formData.get('workshopName') || '').trim();
    const dayOrderRaw = String(formData.get('dayOrder') || '').trim();
    const dayOrder = dayOrderRaw ? Number(dayOrderRaw) : undefined;
    const targetLanguages: string[] = String(formData.get('targetLanguages') || '')
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!audioFile || !topicTitle || !targetLanguages.length) {
      return NextResponse.json(
        { error: 'audioFile, topicTitle, and at least one targetLanguage are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const AiVideoJob = getAiVideoJob();
    const job = await (AiVideoJob as any).create({
      sourceYoutubeUrl: sourceYoutubeUrl || undefined,
      sourceFileName: audioFile.name,
      sourceLanguage,
      topicTitle,
      workshopName: workshopName || undefined,
      dayOrder: Number.isFinite(dayOrder) ? dayOrder : undefined,
      targetLanguages,
      status: 'transcribing',
      createdByUserId: viewerUserId,
    });

    try {
      const audio: ExtractedAudio = {
        buffer: Buffer.from(await audioFile.arrayBuffer()),
        mimeType: audioFile.type || 'audio/mpeg',
      };

      const rawTranscript = await transcribeAudio(audio, topicTitle);
      job.transcript = rawTranscript;
      await job.save();

      const corrected = await correctTranscript(rawTranscript, sourceLanguage);
      job.correctedTranscript = corrected;
      job.status = 'awaiting_correction_review';
      await job.save();
    } catch (pipelineError) {
      job.status = 'failed';
      job.errorMessage = pipelineError instanceof Error ? pipelineError.message : 'Transcription/correction failed';
      await job.save();
    }

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
