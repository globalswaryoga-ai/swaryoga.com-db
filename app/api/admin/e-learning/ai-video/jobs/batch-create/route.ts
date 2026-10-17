import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { createAiVideoJob, updateAiVideoJob } from '@/lib/bunnyAiVideoJobRepository';
import { transcribeAudio, correctTranscript, ExtractedAudio } from '@/lib/aiVideo/transcribeAndCondense';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SPLIT_DIR_BASE = path.join(os.tmpdir(), 'swaryoga_rag_splits');

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Unauthorized: Superadmin access required' }, { status: 403 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const body = await request.json();
    const { batchId, sourceLanguage = 'hi', targetLanguages = ['hi', 'en'], workshopName, dayOrder } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    const cleanBatchId = String(batchId).replace(/[^a-zA-Z0-9_-]/g, '');
    const batchDir = path.join(SPLIT_DIR_BASE, cleanBatchId);
    const metaPath = path.join(batchDir, 'metadata.json');

    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ error: 'Split batch metadata not found or expired' }, { status: 404 });
    }

    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const parts = metadata.parts || [];

    if (!Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ error: 'No split parts found in batch' }, { status: 400 });
    }

    const createdJobs: any[] = [];
    const errors: string[] = [];

    for (const part of parts) {
      const partNumber = part.partNumber;
      const partTitle = part.topicTitle || `${metadata.topicTitle || 'Audio'} - Part ${partNumber}`;
      const partFilePath = path.join(batchDir, `part_${partNumber}.m4a`);

      if (!fs.existsSync(partFilePath)) {
        errors.push(`Part ${partNumber} file missing on server`);
        continue;
      }

      const audioBuffer = fs.readFileSync(partFilePath);

      // Create job
      let job = await createAiVideoJob({
        sourceFileName: part.fileName || `part_${partNumber}.m4a`,
        sourceLanguage,
        topicTitle: partTitle,
        workshopName: workshopName || undefined,
        dayOrder: Number.isFinite(dayOrder) ? dayOrder : undefined,
        targetLanguages: Array.isArray(targetLanguages) ? targetLanguages : ['hi', 'en'],
        status: 'transcribing',
        createdByUserId: viewerUserId,
      });

      try {
        const rawTranscript = await transcribeAudio({
          buffer: audioBuffer,
          mimeType: 'audio/mp4',
        } as ExtractedAudio);

        job = (await updateAiVideoJob(job._id, { transcript: rawTranscript })) as any;

        const corrected = await correctTranscript(rawTranscript, sourceLanguage);
        job = (await updateAiVideoJob(job._id, {
          correctedTranscript: corrected,
          status: 'awaiting_correction_review',
          errorMessage: undefined,
        })) as any;

        createdJobs.push(job);
      } catch (pipelineError: any) {
        console.error(`[Batch Create Job ${job._id} Error]:`, pipelineError);
        job = (await updateAiVideoJob(job._id, {
          status: 'failed',
          errorMessage: pipelineError instanceof Error ? pipelineError.message : 'Transcription failed',
        })) as any;
        createdJobs.push(job);
        errors.push(`Part ${partNumber}: ${pipelineError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      batchId,
      createdCount: createdJobs.length,
      jobs: createdJobs,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Batch Create Jobs Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create batch jobs' },
      { status: 500 }
    );
  }
}
