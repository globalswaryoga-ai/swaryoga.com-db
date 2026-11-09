import { NextRequest, NextResponse } from 'next/server';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { AvatarRenderInputError, InhouseRenderQueue } from '@/lib/avatarEngine/inhouseRenderQueue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(request));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const requesterId = getViewerUserId(decoded);
  if (!requesterId) {
    return NextResponse.json({ success: false, error: 'Admin user identity is missing.' }, { status: 401 });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    const {
      script,
      avatarProfileId,
      voiceId,
      language,
      speed,
      pitchHz,
      backgroundId,
      clothingId,
      posture,
    } = body;

    if (typeof script !== 'string' || !script.trim()) {
      return NextResponse.json(
        { success: false, error: 'Script text is required to render avatar video.' },
        { status: 400 }
      );
    }

    const job = await InhouseRenderQueue.createAndPrepare({
      requesterId,
      allowSharedProfile: isSuperAdmin(decoded),
      avatarProfileId: typeof avatarProfileId === 'string' ? avatarProfileId : '',
      script: script.trim(),
      voiceId: typeof voiceId === 'string' ? voiceId : undefined,
      language: language || 'hi',
      speed: speed === undefined ? undefined : Number(speed),
      pitchHz: pitchHz === undefined ? undefined : Number(pitchHz),
      backgroundId: backgroundId || 'bg_kitchen',
      clothingId: clothingId || 'cloth_white_kurta',
      posture: posture || 'sitting',
    });

    return NextResponse.json({
      success: true,
      job,
      message: 'Speech is prepared. The render is queued for the configured GPU worker.',
    }, { status: 202 });
  } catch (error) {
    console.error('[API inhouse-video POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue in-house video job',
      },
      { status: error instanceof AvatarRenderInputError ? 400 : 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(request));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const requesterId = getViewerUserId(decoded);
  if (!requesterId) {
    return NextResponse.json({ success: false, error: 'Admin user identity is missing.' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      const job = await InhouseRenderQueue.getJob(jobId, isSuperAdmin(decoded) ? undefined : requesterId);
      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, job });
    }

    const jobs = await InhouseRenderQueue.listJobs(isSuperAdmin(decoded) ? undefined : requesterId, 25);
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error('[API inhouse-video GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
