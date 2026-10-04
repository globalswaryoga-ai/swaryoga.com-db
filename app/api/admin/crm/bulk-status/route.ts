import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { listBroadcastRuns, broadcastRunFindOne, broadcastRunUpdateOne, broadcastRunMessageUpdateMany } from '@/lib/bunnyBroadcastRepository';

export const dynamic = 'force-dynamic';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin && !decoded?.userId) throw new Error('Unauthorized');
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || '');
    const superAdmin = isSuperAdmin(decoded);
    const action = new URL(request.url).searchParams.get('action');

    const listed = await listBroadcastRuns({ createdByUserId: viewerUserId, isSuperAdmin: superAdmin }, { limit: 100, skip: 0 });
    const runs = listed.runs;
    if (action === 'validate') {
      const count = Math.max(0, Number(new URL(request.url).searchParams.get('count') || 0));
      const dailyLimit = 10000;
      return NextResponse.json({ success: true, data: { allowed: count > 0 && count <= dailyLimit, count, dailyLimit, remaining: Math.max(0, dailyLimit - count), reason: count > dailyLimit ? `Daily limit is ${dailyLimit}` : undefined } });
    }
    if (action === 'progress') {
      const runId = new URL(request.url).searchParams.get('runId');
      const data = runId ? (await broadcastRunFindOne(runId)) : runs.filter((run: any) => ['draft', 'scheduled', 'running'].includes(String(run.status)));
      return NextResponse.json({ success: true, data });
    }

    const sentToday = runs.reduce((sum: number, run: any) => sum + Number(run.stats?.sent || 0), 0);
    const dailyLimit = 10000;
    const remaining = Math.max(0, dailyLimit - sentToday);
    const percentage = dailyLimit ? Math.round((sentToday / dailyLimit) * 100) : 0;
    const status = sentToday >= dailyLimit ? 'exhausted' : percentage >= 90 ? 'critical' : percentage >= 75 ? 'warning' : 'normal';
    const activeRuns = runs.filter((run: any) => ['draft', 'scheduled', 'running'].includes(String(run.status))).length;
    return NextResponse.json({ success: true, data: {
      today: { sent: sentToday, failed: 0, pending: runs.reduce((sum: number, run: any) => sum + Number(run.stats?.pending || 0), 0) },
      thisWeek: { sent: sentToday, failed: 0 },
      thisMonth: { sent: sentToday, failed: 0 },
      quota: { date: new Date().toISOString().slice(0, 10), sent: sentToday, limit: dailyLimit, remaining, percentage, status, canSend: remaining > 0 },
      dailyLimit, sentToday, remaining, activeRuns, runs,
    } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to get bulk status' }, { status: error?.message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);
    const body = await request.json().catch(() => ({}));
    const runId = String(body.runId || '');
    const action = String(body.action || '');
    if (!runId || !['pause', 'resume', 'cancel'].includes(action)) return NextResponse.json({ success: false, error: 'Valid action and runId are required' }, { status: 400 });
    const run = await broadcastRunFindOne(runId);
    if (!run) return NextResponse.json({ success: false, error: 'Broadcast not found' }, { status: 404 });
    if (!isSuperAdmin(decoded) && String(run.createdByUserId) !== String(getViewerUserId(decoded) || decoded?.userId)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    const status = action === 'cancel' ? 'cancelled' : action === 'pause' ? 'scheduled' : 'draft';
    await broadcastRunUpdateOne(runId, { status });
    if (action === 'cancel') await broadcastRunMessageUpdateMany({ runId, status: ['pending', 'sending', 'retrying'] }, { status: 'cancelled', failureReason: String(body.reason || 'Parent run cancelled') });
    return NextResponse.json({ success: true, message: `Broadcast ${action}d` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update broadcast' }, { status: error?.message === 'Unauthorized' ? 401 : 500 });
  }
}
