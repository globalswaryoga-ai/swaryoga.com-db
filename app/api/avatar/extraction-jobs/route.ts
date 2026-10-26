import { NextRequest, NextResponse } from 'next/server';
import {
  createAvatarExtractionJob,
  getExtractionJob,
  listExtractionJobs,
  stepExtractionJob,
  runFullExtractionPipeline,
  cancelExtractionJob,
  retryExtractionJob,
} from '@/lib/avatarExtraction/avatarExtractionService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const job = await getExtractionJob(id);
      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, job });
    }

    const jobs = await listExtractionJobs();
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error('Extraction Jobs GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch extraction jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, jobId, sourceVideoId, avatarName, provider, consentVerified } = body;

    if (action === 'create') {
      if (!sourceVideoId) {
        return NextResponse.json(
          { success: false, error: 'Source video ID is required' },
          { status: 400 }
        );
      }
      if (!avatarName || !avatarName.trim()) {
        return NextResponse.json(
          { success: false, error: 'Avatar name is required' },
          { status: 400 }
        );
      }

      const job = await createAvatarExtractionJob({
        source_video_id: sourceVideoId,
        avatar_name: avatarName.trim(),
        provider: provider || 'swar_neural',
        consent_verified: Boolean(consentVerified),
      });

      return NextResponse.json({ success: true, job });
    }

    if (action === 'step') {
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
      }
      const updatedJob = await stepExtractionJob(jobId);
      return NextResponse.json({ success: true, job: updatedJob });
    }

    if (action === 'run_full') {
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
      }
      const finalJob = await runFullExtractionPipeline(jobId);
      return NextResponse.json({ success: true, job: finalJob });
    }

    if (action === 'cancel') {
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
      }
      const job = await cancelExtractionJob(jobId);
      return NextResponse.json({ success: true, job });
    }

    if (action === 'retry') {
      if (!jobId) {
        return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
      }
      const job = await retryExtractionJob(jobId);
      return NextResponse.json({ success: true, job });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Extraction Jobs POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process extraction job' },
      { status: 500 }
    );
  }
}
