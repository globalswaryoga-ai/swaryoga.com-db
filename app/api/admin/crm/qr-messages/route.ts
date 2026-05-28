import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function getUserId(decoded: any): string {
  return decoded?.userId || decoded?.username || decoded?.id || '';
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = getUserId(decoded);
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();
    const QrMsg = getQrWhatsAppMessage();

    const url = new URL(req.url);
    const direction = url.searchParams.get('direction') || 'outbound';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const status = url.searchParams.get('status'); // 'sent', 'failed', 'pending'
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build filter
    const filter: any = { userId };
    if (direction !== 'all') filter.direction = direction;

    // Date range filter using timestamp (stored in seconds)
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = Math.floor(new Date(startDate).getTime() / 1000);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filter.timestamp.$lt = Math.floor(end.getTime() / 1000);
      }
    }

    // Status filter: Baileys numeric status — 0=pending, 1=sent, 2=delivered, 3=read, -1=error
    if (status === 'sent') filter.status = { $gte: 1 };
    else if (status === 'pending') filter.status = 0;
    else if (status === 'failed') filter.status = -1;

    const messages = await QrMsg.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await QrMsg.countDocuments(filter);

    // Compute stats for Today / This Week / This Month / This Year
    const now = new Date();
    const todayStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
    const weekStart = Math.floor((Date.now() / 1000) - 7 * 24 * 3600);
    const monthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    const yearStart = Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);

    const statsFilter = { userId, direction: 'outbound' };

    const [todayCounts, weekCounts, monthCounts, yearCounts] = await Promise.all([
      QrMsg.aggregate([
        { $match: { ...statsFilter, timestamp: { $gte: todayStart } } },
        { $group: { _id: null, sent: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 0] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', -1] }, 1, 0] } } } }
      ]),
      QrMsg.aggregate([
        { $match: { ...statsFilter, timestamp: { $gte: weekStart } } },
        { $group: { _id: null, sent: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 0] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', -1] }, 1, 0] } } } }
      ]),
      QrMsg.aggregate([
        { $match: { ...statsFilter, timestamp: { $gte: monthStart } } },
        { $group: { _id: null, sent: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 0] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', -1] }, 1, 0] } } } }
      ]),
      QrMsg.aggregate([
        { $match: { ...statsFilter, timestamp: { $gte: yearStart } } },
        { $group: { _id: null, sent: { $sum: { $cond: [{ $gte: ['$status', 1] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 0] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', -1] }, 1, 0] } } } }
      ]),
    ]);

    const extract = (arr: any[]) => arr[0] || { sent: 0, pending: 0, failed: 0 };

    return NextResponse.json({
      success: true,
      messages,
      total,
      stats: {
        today: extract(todayCounts),
        week: extract(weekCounts),
        month: extract(monthCounts),
        year: extract(yearCounts),
      },
    });
  } catch (err: any) {
    console.error('[QR Messages API]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
