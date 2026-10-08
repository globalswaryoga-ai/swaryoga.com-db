import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { listAiVideoJobs, createAiVideoJob, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
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
    const sourceText = String(formData.get('sourceText') || '').trim();
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

    const sourceMode = String(formData.get('sourceMode') || '').trim();

    if ((sourceMode !== 'url' && !audioFile && !sourceText) || !topicTitle || !targetLanguages.length) {
      return NextResponse.json(
        { error: 'audioFile or sourceText (or URL mode), topicTitle, and at least one targetLanguage are required' },
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

    if (sourceMode === 'url') {
      job = await updateAiVideoJob(job._id, { 
        transcript: '',
        correctedTranscript: '',
        status: 'awaiting_correction_review',
        errorMessage: undefined
      }) as any;
    } else {
      try {
        // Pasted text skips transcription entirely — it's already the raw
        // transcript, so go straight to the correction stage.
        const rawTranscript = audioFile
          ? await transcribeAudio(
              { buffer: Buffer.from(await audioFile.arrayBuffer()), mimeType: audioFile.type || 'audio/mpeg' } as ExtractedAudio
            )
          : sourceText;

        job = await updateAiVideoJob(job._id, { transcript: rawTranscript }) as any;

        const corrected = await correctTranscript(rawTranscript, sourceLanguage);
        job = await updateAiVideoJob(job._id, { 
          correctedTranscript: corrected,
          status: 'awaiting_correction_review',
          errorMessage: undefined
        }) as any;
      } catch (pipelineError) {
        job = await updateAiVideoJob(job._id, {
          status: 'failed',
          errorMessage: pipelineError instanceof Error ? pipelineError.message : 'Transcription/correction failed'
        }) as any;
      }
    }

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
