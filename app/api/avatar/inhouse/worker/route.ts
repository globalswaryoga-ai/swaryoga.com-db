import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { InhouseRenderQueue } from '@/lib/avatarEngine/inhouseRenderQueue';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.AVATAR_WORKER_TOKEN;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: NextRequest) {
  if (!process.env.AVATAR_WORKER_TOKEN) {
    return NextResponse.json({ success: false, error: 'Avatar worker authentication is not configured.' }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized worker request.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    switch (body?.action) {
      case 'claim': {
        const claim = await InhouseRenderQueue.claimNextJob(String(body.workerId || ''));
        return NextResponse.json({ success: true, claim });
      }
      case 'heartbeat': {
        if (!body.jobId || !body.claimToken) {
          return NextResponse.json({ success: false, error: 'jobId and claimToken are required.' }, { status: 400 });
        }
        const renewed = await InhouseRenderQueue.renewLease(String(body.jobId), String(body.claimToken));
        return NextResponse.json({ success: renewed }, { status: renewed ? 200 : 409 });
      }
      case 'complete': {
        if (!body.jobId || !body.claimToken || !body.videoUrl) {
          return NextResponse.json({ success: false, error: 'jobId, claimToken, and videoUrl are required.' }, { status: 400 });
        }
        const job = await InhouseRenderQueue.completeJob({
          jobId: String(body.jobId),
          claimToken: String(body.claimToken),
          videoUrl: String(body.videoUrl),
          durationSeconds: body.durationSeconds === undefined || body.durationSeconds === null
            ? undefined
            : Number(body.durationSeconds),
        });
        return NextResponse.json({ success: true, job });
      }
      case 'fail': {
        if (!body.jobId || !body.claimToken || !body.errorMessage) {
          return NextResponse.json({ success: false, error: 'jobId, claimToken, and errorMessage are required.' }, { status: 400 });
        }
        const job = await InhouseRenderQueue.failJob({
          jobId: String(body.jobId),
          claimToken: String(body.claimToken),
          errorMessage: String(body.errorMessage),
        });
        return NextResponse.json({ success: true, job });
      }
      default:
        return NextResponse.json({ success: false, error: 'Unsupported worker action.' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Avatar worker request failed.';
    console.error('[API avatar inhouse worker] Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
