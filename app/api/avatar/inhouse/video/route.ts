import { NextRequest, NextResponse } from 'next/server';
import { InhouseVideoService } from '@/lib/avatarEngine/inhouseVideoService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      script,
      avatarName,
      voiceId,
      language,
      backgroundId,
      clothingId,
      posture,
      preferredEngine,
    } = body;

    if (!script || !script.trim()) {
      return NextResponse.json(
        { success: false, error: 'Script text is required to render avatar video.' },
        { status: 400 }
      );
    }

    // 1. Create Job in Bunny DB
    const job = await InhouseVideoService.createJob({
      avatarName: avatarName || 'Mohan Sir (Vedic Twin)',
      script: script.trim(),
      voiceId: voiceId || 'hi-IN-MadhurNeural',
      language: language || 'hi',
      backgroundId: backgroundId || 'bg_kitchen',
      clothingId: clothingId || 'cloth_white_kurta',
      posture: posture || 'sitting',
      preferredEngine: preferredEngine || 'inhouse_canvas_ffmpeg',
    });

    // 2. Process Job (Synthesize Free Audio -> Composite Video -> Upload to Bunny CDN)
    const processed = await InhouseVideoService.processJob(job.id);

    return NextResponse.json({
      success: true,
      job: processed,
      message: 'In-house avatar video generated successfully with $0 expense!',
    });
  } catch (error: any) {
    console.error('[API inhouse-video POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process in-house video job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      const job = await InhouseVideoService.getJob(jobId);
      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, job });
    }

    const jobs = await InhouseVideoService.listJobs(25);
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error('[API inhouse-video GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
