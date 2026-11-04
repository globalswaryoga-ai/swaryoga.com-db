import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  startFacialExtractionJob,
  getAllFacialJobs,
  getFacialExtractionDashboard,
  getFacialClipsForVideo,
  alignFacialExpressionsWithTranscript,
} from '@/lib/mohanRag/facialExpressionService';

export const dynamic = 'force-dynamic';

function requireAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return !!decoded && isSuperAdmin(decoded, request);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('video_url');

    if (videoUrl) {
      const clips = await getFacialClipsForVideo(videoUrl);
      return NextResponse.json({ success: true, clips });
    }

    const limit = Number(searchParams.get('limit') || 50);
    const offset = Number(searchParams.get('offset') || 0);
    const [jobs, extraction] = await Promise.all([
      getAllFacialJobs(),
      getFacialExtractionDashboard(limit, offset),
    ]);
    return NextResponse.json({ success: true, jobs, extraction });
  } catch (error: any) {
    console.error('Facial Expressions GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch facial expression data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start_extraction') {
      const { videoUrl, sourceId, sampleFps } = body;
      if (!videoUrl) {
        return NextResponse.json({ error: 'Video URL or YouTube URL is required' }, { status: 400 });
      }

      const job = await startFacialExtractionJob({
        videoUrl,
        sourceId,
        sampleFps: Number(sampleFps || 1.0),
      });

      return NextResponse.json({
        success: true,
        message: 'Facial landmark & expression extraction started in background',
        job,
      });
    }

    if (action === 'align_transcript') {
      const { sourceId, videoUrl } = body;
      if (!sourceId || !videoUrl) {
        return NextResponse.json({ error: 'sourceId and videoUrl are required' }, { status: 400 });
      }

      const clips = await getFacialClipsForVideo(videoUrl);
      const res = await alignFacialExpressionsWithTranscript(sourceId, clips);

      return NextResponse.json({
        success: true,
        message: `Successfully aligned ${res.alignedCount} real facial expression cues to transcript`,
        alignedCount: res.alignedCount,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Facial Expressions POST error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
