import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { BroadcastRun, BroadcastRunMessage, Lead } from '@/lib/schemas/enterpriseSchemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  return decoded;
}

/**
 * GET /api/admin/crm/broadcast-runs/:id
 * Details: run + per-lead status.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    verifyAdmin(request);
    const { id } = await ctx.params;

    await connectDB();

    const run = await BroadcastRun.findById(id).lean();
    if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Recalculate stats from actual message statuses for accuracy
    const statsCounts = await BroadcastRunMessage.aggregate([
      { $match: { runId: (run as any)._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statsMap = new Map<string, number>();
    statsCounts.forEach((c: any) => statsMap.set(String(c._id).toLowerCase(), Number(c.count || 0)));
    
    const pendingRaw = (statsMap.get('pending') || 0) + (statsMap.get('sending') || 0);
    const sentRaw = statsMap.get('sent') || 0;
    const deliveredRaw = statsMap.get('delivered') || 0;
    const readRaw = statsMap.get('read') || 0;
    const failed = statsMap.get('failed') || 0;
    const skipped = statsMap.get('skipped') || 0;
    const blocked = statsMap.get('blocked') || 0;
    
    // Status is cumulative: read implies delivered implies sent
    const calculatedStats = {
      total: pendingRaw + sentRaw + deliveredRaw + readRaw + failed + skipped + blocked,
      pending: pendingRaw,
      sent: sentRaw + deliveredRaw + readRaw,
      delivered: deliveredRaw + readRaw,
      read: readRaw,
      failed,
      skipped,
      blocked,
    };

    // Merge with run data
    const runWithStats = { ...run, stats: calculatedStats };

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = Math.min(Number(url.searchParams.get('limit') || 200) || 200, 500);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    const filter: any = { runId: (run as any)._id };
    if (status) filter.status = String(status);

    const total = await BroadcastRunMessage.countDocuments(filter);
    const rows = await BroadcastRunMessage.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // enrich basic lead info
    const leadIds = rows.map((r: any) => r.leadId).filter(Boolean);
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select({ _id: 1, name: 1, phoneNumber: 1, status: 1, workshopName: 1, labels: 1 })
      .lean();
    const byId = new Map(leads.map((l: any) => [String(l._id), l]));

    const messages = rows.map((m: any) => ({
      ...m,
      lead: byId.get(String(m.leadId)) || null,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          run: runWithStats,
          messages,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-runs/:id');
  }
}

/**
 * PATCH /api/admin/crm/broadcast-runs/:id
 * Actions: cancel, reset-pending, retry-failed
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    verifyAdmin(request);
    const { id } = await ctx.params;

    await connectDB();

    const run = await BroadcastRun.findById(id);
    if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    const now = new Date();
    let result: any = { action };

    switch (action) {
      case 'cancel':
        // Cancel the broadcast - mark as cancelled, don't process pending
        await BroadcastRun.updateOne(
          { _id: id },
          { $set: { status: 'cancelled', updatedAt: now } }
        );
        result.message = 'Broadcast cancelled';
        break;

      case 'reset-pending':
        // Reset all messages back to pending (for retry)
        const resetResult = await BroadcastRunMessage.updateMany(
          { runId: run._id, status: { $in: ['failed', 'skipped', 'sending'] } },
          { $set: { status: 'pending', failureReason: null, updatedAt: now } }
        );
        // Update run status back to scheduled
        await BroadcastRun.updateOne(
          { _id: id },
          { $set: { status: 'scheduled', updatedAt: now }, $unset: { lastError: 1 } }
        );
        result.message = `Reset ${resetResult.modifiedCount} messages to pending`;
        result.modifiedCount = resetResult.modifiedCount;
        break;

      case 'retry-failed':
        // Only reset failed messages back to pending
        const retryResult = await BroadcastRunMessage.updateMany(
          { runId: run._id, status: 'failed' },
          { $set: { status: 'pending', failureReason: null, updatedAt: now } }
        );
        // Update run status back to scheduled if it was completed/failed
        if (['completed', 'failed', 'cancelled'].includes(run.status)) {
          await BroadcastRun.updateOne(
            { _id: id },
            { $set: { status: 'scheduled', updatedAt: now }, $unset: { lastError: 1, completedAt: 1 } }
          );
        }
        result.message = `Reset ${retryResult.modifiedCount} failed messages to pending`;
        result.modifiedCount = retryResult.modifiedCount;
        break;

      case 'reset-all':
        // Reset ALL messages back to pending (full restart)
        const resetAllResult = await BroadcastRunMessage.updateMany(
          { runId: run._id },
          { $set: { status: 'pending', failureReason: null, provider: null, waMessageId: null, updatedAt: now } }
        );
        await BroadcastRun.updateOne(
          { _id: id },
          { 
            $set: { 
              status: 'scheduled', 
              'stats.pending': resetAllResult.modifiedCount,
              'stats.sent': 0,
              'stats.failed': 0,
              'stats.skipped': 0,
              updatedAt: now 
            }, 
            $unset: { lastError: 1, completedAt: 1, startedAt: 1 } 
          }
        );
        result.message = `Reset all ${resetAllResult.modifiedCount} messages to pending`;
        result.modifiedCount = resetAllResult.modifiedCount;
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Refresh stats
    const counts = await BroadcastRunMessage.aggregate([
      { $match: { runId: run._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const map = new Map<string, number>();
    counts.forEach((c: any) => map.set(String(c._id).toLowerCase(), Number(c.count || 0)));
    
    await BroadcastRun.updateOne(
      { _id: id },
      {
        $set: {
          'stats.pending': (map.get('pending') || 0) + (map.get('sending') || 0),
          'stats.sent': map.get('sent') || 0,
          'stats.failed': map.get('failed') || 0,
          'stats.skipped': map.get('skipped') || 0,
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'PATCH broadcast-runs/:id');
  }
}

/**
 * DELETE /api/admin/crm/broadcast-runs/:id
 * Delete the broadcast run and all its messages.
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    verifyAdmin(request);
    const { id } = await ctx.params;

    await connectDB();

    const run = await BroadcastRun.findById(id);
    if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Delete all messages first
    const msgResult = await BroadcastRunMessage.deleteMany({ runId: run._id });
    
    // Delete the run
    await BroadcastRun.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Broadcast run deleted',
        deletedMessages: msgResult.deletedCount,
      },
    }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'DELETE broadcast-runs/:id');
  }
}
