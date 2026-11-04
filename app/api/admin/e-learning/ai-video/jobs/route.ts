import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

import { listAiVideoJobs, createAiVideoJob, updateAiVideoJob } from '@/lib/aiVideo/bunnyAiVideoRepository';
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

    const jobs = await listAiVideoJobs();

    return NextResponse.json({ success: true, data: jobs }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Creates the job in Bunny Database and runs stages 1+2 only (transcribe, then faithfully
// correct) — stops at awaiting_correction_review so the admin can verify.
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

    // Accept either audioFile or videoFile
    const audioFile = (formData.get('audioFile') || formData.get('videoFile')) as File | null;
    const sourceText = String(formData.get('sourceText') || '').trim();
    const topicTitle = String(formData.get('topicTitle') || '').trim();
    const sourceYoutubeUrl = String(formData.get('sourceYoutubeUrl') || '').trim();
    const sourceLanguage = String(formData.get('sourceLanguage') || 'hi').trim();
    const workshopName = String(formData.get('workshopName') || '').trim();
    const dayOrderRaw = String(formData.get('dayOrder') || '').trim();
    const dayOrder = dayOrderRaw ? Number(dayOrderRaw) : undefined;
    const targetLanguages: string[] = String(formData.get('targetLanguages') || '')
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const sourceMode = String(formData.get('sourceMode') || '').trim();

    if ((sourceMode !== 'url' && !audioFile && !sourceText) || !topicTitle || !targetLanguages.length) {
      return NextResponse.json(

        { error: 'audioFile/videoFile or sourceText, topicTitle, and at least one targetLanguage are required' },
        { status: 400 }
      );
    }


    let job = await createAiVideoJob({
      sourceYoutubeUrl: sourceYoutubeUrl || undefined,
      sourceFileName: audioFile ? audioFile.name : undefined,
      sourceLanguage,
      topicTitle,
      workshopName: workshopName || undefined,
      dayOrder: Number.isFinite(dayOrder) ? dayOrder : undefined,
      targetLanguages,
      status: audioFile ? 'transcribing' : 'awaiting_correction_review',
      createdByUserId: viewerUserId,
    });

    try {

      const rawTranscript = audioFile
        ? await transcribeAudio({
            buffer: Buffer.from(await audioFile.arrayBuffer()),
            mimeType: audioFile.type || 'audio/mpeg',
          } as ExtractedAudio)
        : sourceText;

      const corrected = await correctTranscript(rawTranscript, sourceLanguage);

      const updated = await updateAiVideoJob(job._id, {
        transcript: rawTranscript,
        correctedTranscript: corrected,
        status: 'awaiting_correction_review',
        errorMessage: undefined,
      });

      if (updated) job = updated;
    } catch (pipelineError: any) {
      const failed = await updateAiVideoJob(job._id, {
        status: 'failed',
        errorMessage: pipelineError instanceof Error ? pipelineError.message : 'Transcription/correction failed',
      });
      if (failed) job = failed;
    }

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
