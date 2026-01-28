import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { BulkMessageManager } from '@/lib/bulkMessageManager';

export const dynamic = 'force-dynamic';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  return decoded;
}

/**
 * GET /api/admin/crm/bulk-status
 * Get bulk messaging status including quota, active runs, and stats
 */
export async function GET(request: NextRequest) {
  try {
    verifyAdmin(request);
    await connectDB();

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'quota') {
      const quota = await BulkMessageManager.getDailyQuotaStatus();
      return NextResponse.json({ success: true, data: quota });
    }

    if (action === 'progress') {
      const runId = url.searchParams.get('runId');
      if (runId) {
        const progress = await BulkMessageManager.getBroadcastProgress(runId);
        return NextResponse.json({ success: true, data: progress });
      }
      const allProgress = await BulkMessageManager.getAllActiveProgress();
      return NextResponse.json({ success: true, data: allProgress });
    }

    if (action === 'validate') {
      const count = Number(url.searchParams.get('count') || 0);
      const validation = await BulkMessageManager.validateBroadcast(count);
      return NextResponse.json({ success: true, data: validation });
    }

    // Default: return full stats
    const stats = await BulkMessageManager.getBroadcastStats();
    return NextResponse.json({ success: true, data: stats });

  } catch (error: any) {
    console.error('[bulk-status] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to get bulk status' },
      { status: error?.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

/**
 * POST /api/admin/crm/bulk-status
 * Control bulk messaging (pause, resume, cancel)
 */
export async function POST(request: NextRequest) {
  try {
    verifyAdmin(request);
    await connectDB();

    const body = await request.json();
    const { action, runId, reason } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action required' }, { status: 400 });
    }

    if (action === 'pause' && runId) {
      const success = await BulkMessageManager.pauseBroadcast(runId, reason || 'Manual pause');
      return NextResponse.json({ success, message: success ? 'Broadcast paused' : 'Failed to pause' });
    }

    if (action === 'resume' && runId) {
      const success = await BulkMessageManager.resumeBroadcast(runId);
      return NextResponse.json({ success, message: success ? 'Broadcast resumed' : 'Failed to resume' });
    }

    if (action === 'cancel' && runId) {
      const success = await BulkMessageManager.cancelBroadcast(runId, reason || 'Manual cancel');
      return NextResponse.json({ success, message: success ? 'Broadcast cancelled' : 'Failed to cancel' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[bulk-status] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to perform action' },
      { status: error?.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
