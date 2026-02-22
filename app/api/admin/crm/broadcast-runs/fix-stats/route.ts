import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { BroadcastRun, BroadcastRunMessage } from '@/lib/schemas/enterpriseSchemas';

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
 * POST /api/admin/crm/broadcast-runs/fix-stats
 * Recalculate all broadcast run stats with cumulative status logic
 */
export async function POST(request: NextRequest) {
  try {
    verifyAdmin(request);
    await connectDB();

    const runs = await BroadcastRun.find({}).lean();
    const results: any[] = [];

    for (const run of runs) {
      const runId = (run as any)._id;

      // Aggregate message statuses
      const counts = await BroadcastRunMessage.aggregate([
        { $match: { runId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const map = new Map<string, number>();
      counts.forEach((c: any) => map.set(String(c._id || '').toLowerCase(), Number(c.count || 0)));

      // Count by actual status
      const pendingRaw = map.get('pending') || 0;
      const sendingRaw = map.get('sending') || 0;
      const sentRaw = map.get('sent') || 0;
      const deliveredRaw = map.get('delivered') || 0;
      const readRaw = map.get('read') || 0;
      const failed = map.get('failed') || 0;
      const skipped = map.get('skipped') || 0;
      const blocked = map.get('blocked') || 0;

      // Status is cumulative: read implies delivered implies sent
      const read = readRaw;
      const delivered = deliveredRaw + readRaw;
      const sent = sentRaw + deliveredRaw + readRaw;
      const pending = pendingRaw + sendingRaw;
      const total = pending + sent + failed + skipped + blocked;

      const newStats = { total, pending, sent, delivered, read, failed, skipped, blocked };

      // Update the run
      await BroadcastRun.updateOne(
        { _id: runId },
        { $set: { stats: newStats, updatedAt: new Date() } }
      );

      results.push({
        runId: String(runId),
        name: (run as any).name,
        oldStats: (run as any).stats,
        newStats,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Fixed stats for ${results.length} broadcast runs`,
      data: { runs: results },
    });
  } catch (error) {
    return handleCrmError(error, 'POST fix-stats');
  }
}
