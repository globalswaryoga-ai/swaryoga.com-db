import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { BroadcastRun, BroadcastRunMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/qr-broadcast-stats
 * Aggregate stats for QR broadcast runs.
 *
 * Query params:
 *   days: number of days to look back (default 30)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const days = Math.min(Math.max(Number(url.searchParams.get('days') || 30), 7), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const baseFilter: any = { provider: 'qr' };
    if (!isSuperAdmin(decoded)) {
      const uid = getViewerUserId(decoded);
      if (uid) baseFilter.createdByUserId = uid;
    }

    // ── Overall run counts ────────────────────────────────────────────────────
    const [totalRuns, runsByStatus] = await Promise.all([
      BroadcastRun.countDocuments(baseFilter),
      BroadcastRun.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    runsByStatus.forEach((r: any) => { statusMap[r._id] = r.count; });

    // ── Aggregate message stats from all QR runs ───────────────────────────
    const runIds = (await BroadcastRun.find(baseFilter).select({ _id: 1 }).lean())
      .map((r: any) => r._id);

    const msgFilter: any = { runId: { $in: runIds } };

    const [totalMessages, msgByStatus] = await Promise.all([
      BroadcastRunMessage.countDocuments(msgFilter),
      BroadcastRunMessage.aggregate([
        { $match: msgFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const msgMap: Record<string, number> = {};
    msgByStatus.forEach((r: any) => { msgMap[r._id] = r.count; });

    const totalSent = (msgMap.sent || 0) + (msgMap.delivered || 0) + (msgMap.read || 0);
    const totalFailed = msgMap.failed || 0;
    const successRate = totalMessages > 0 ? Math.round((totalSent / Math.max(1, totalSent + totalFailed)) * 100) : 0;

    // ── Daily activity — sent messages per day (last N days) ─────────────────
    const recentRunIds = (await BroadcastRun.find({
      ...baseFilter,
      createdAt: { $gte: since },
    }).select({ _id: 1 }).lean()).map((r: any) => r._id);

    const dailyAgg = await BroadcastRunMessage.aggregate([
      {
        $match: {
          runId: { $in: recentRunIds },
          status: { $in: ['sent', 'delivered', 'read'] },
          sentAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$sentAt', timezone: 'Asia/Kolkata' },
          },
          sent: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build dense date array for the chart
    const dailyMap: Record<string, number> = {};
    dailyAgg.forEach((d: any) => { dailyMap[d._id] = d.sent; });

    const dailyActivity: Array<{ date: string; sent: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyActivity.push({ date: key, sent: dailyMap[key] || 0 });
    }

    // ── Template usage breakdown ───────────────────────────────────────────
    const templateAgg = await BroadcastRun.aggregate([
      { $match: { ...baseFilter, 'templateSnapshot.templateName': { $exists: true } } },
      {
        $group: {
          _id: '$templateSnapshot.templateName',
          runs: { $sum: 1 },
          totalSent: { $sum: '$stats.sent' },
        },
      },
      { $sort: { totalSent: -1 } },
      { $limit: 10 },
    ]);

    // ── Recent runs ────────────────────────────────────────────────────────
    const recentRuns = await BroadcastRun.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRuns,
          completedRuns: statusMap.completed || 0,
          runningRuns: statusMap.running || 0,
          failedRuns: statusMap.failed || 0,
          totalMessages,
          totalSent,
          totalFailed,
          successRate,
        },
        dailyActivity,
        templateUsage: templateAgg.map((t: any) => ({
          name: t._id || 'Unknown',
          runs: t.runs,
          sent: t.totalSent || 0,
        })),
        recentRuns,
        days,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
