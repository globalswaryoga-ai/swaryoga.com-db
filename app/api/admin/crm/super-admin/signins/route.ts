import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, parsePagination } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * Super Admin Signins API
 * GET: List all signin activity with filters
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return apiError('UNAUTHORIZED');
    }

    await connectDB();

    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.db;
    if (!db) return apiError('SERVER_ERROR', 'Database not connected');

    const signinsCol = db.collection('signins');

    const url = new URL(request.url);
    const { limit, skip } = parsePagination(request);
    const search = url.searchParams.get('search') || '';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const filter: any = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [signins, total] = await Promise.all([
      signinsCol.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      signinsCol.countDocuments(filter),
    ]);

    // Daily signin trend (last 30 days)
    const monthAgo = new Date(Date.now() - 30 * 86400000);
    const signinTrend = await signinsCol.aggregate([
      { $match: { createdAt: { $gte: monthAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // Unique users who signed in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const uniqueToday = await signinsCol.distinct('email', { createdAt: { $gte: todayStart } });

    return apiSuccess({
      signins,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
      uniqueTodayCount: uniqueToday.length,
      signinTrend,
    });
  } catch (err: any) {
    console.error('[super-admin/signins] Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
