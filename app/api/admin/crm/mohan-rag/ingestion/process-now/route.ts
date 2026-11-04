import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { processNextMohanRagVideo } from '@/lib/mohanRag/videoIngestionWorker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function getAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return decoded && isSuperAdmin(decoded, request) ? decoded : null;
  } catch { return null; }
}

function hasCronAuthorization(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

let isWorkerRunning = false;

async function runWorkerBatch(limit = 5) {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  try {
    for (let i = 0; i < limit; i++) {
      const res = await processNextMohanRagVideo();
      if (!res.processed) break; // No more queued jobs
    }
  } catch (err) {
    console.error('[Video Ingestion Worker Batch] Error:', err);
  } finally {
    isWorkerRunning = false;
  }
}

export async function GET(request: NextRequest) {
  if (!getAdmin(request)) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  try {
    const stats = await bunnyExecute({
      sql: `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM mohan_rag_video_ingestion_sql`,
      args: [],
    });

    const counts = stats.rows?.[0] || { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 };

    return NextResponse.json({
      success: true,
      stats: counts,
      isWorkerRunning,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch queue stats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!getAdmin(request) && !hasCronAuthorization(request)) {
    return NextResponse.json({ error: 'Super admin or valid cron authorization required' }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(10, Math.max(1, Number(body.batchSize || 1)));

    if (isWorkerRunning) {
      return NextResponse.json({
        success: true,
        message: 'A video ingestion worker is currently active and processing jobs in the background.',
        isWorkerRunning: true,
      });
    }

    // Launch worker batch in background
    runWorkerBatch(batchSize);

    return NextResponse.json({
      success: true,
      message: `Started background ingestion worker for up to ${batchSize} video(s). Transcripts will appear in the library as they complete.`,
      isWorkerRunning: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to trigger worker' }, { status: 500 });
  }
}
