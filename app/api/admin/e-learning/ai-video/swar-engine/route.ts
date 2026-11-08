import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { SwarNeuralVideoService, SwarVideoJobParams } from '@/lib/aiVideo/swarNeuralVideo';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body: SwarVideoJobParams = await request.json().catch(() => ({} as any));

    if (!body.script || !body.script.trim()) {
      return NextResponse.json({ error: 'Script text is required.' }, { status: 400 });
    }

    // Create the job record in Bunny Database
    const job = await SwarNeuralVideoService.createJob({
      avatarName: body.avatarName || 'Mohan Sir (Vedic Twin)',
      sourceAvatarUrl: body.sourceAvatarUrl,
      cutoutUrl: body.cutoutUrl,
      posture: body.posture || 'sitting',
      backgroundId: body.backgroundId || 'bg_meditation_room',
      customBackgroundUrl: body.customBackgroundUrl,
      script: body.script.trim(),
      language: body.language || 'hi',
      voiceId: body.voiceId || 'onyx',
      framing: body.framing,
      adminId: decoded.userId || 'admin',
    });

    // Execute job processing (multilingual audio -> neural lip-sync / motion -> Bunny CDN)
    const processed = await SwarNeuralVideoService.processJob(job.jobId, (job as any).row);

    return NextResponse.json({
      success: true,
      job: processed,
    });
  } catch (error: any) {
    console.error('[API swar-engine POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process Swar Neural Video Job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId query param required' }, { status: 400 });
    }

    const job = await SwarNeuralVideoService.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('[API swar-engine GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get job status' },
      { status: 500 }
    );
  }
}
