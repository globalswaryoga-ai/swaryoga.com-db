import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, parsePagination } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';


/**
 * Super Admin Payments API
 * GET: List all orders/payments with filters
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

    const ordersCol = db.collection('orders');

    const url = new URL(request.url);
    const { limit, skip } = parsePagination(request);
    const status = url.searchParams.get('status') || '';
    const search = url.searchParams.get('search') || '';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const paymentMethod = url.searchParams.get('paymentMethod') || '';
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const filter: any = {};

    if (status) filter.paymentStatus = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (search) {
      filter.$or = [
        { userId: { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } },
        { payuTxnId: { $regex: search, $options: 'i' } },
        { cashfreeOrderId: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder;

    const [orders, total] = await Promise.all([
      ordersCol.find(filter).sort(sortObj).skip(skip).limit(limit).toArray(),
      ordersCol.countDocuments(filter),
    ]);

    // Revenue summary for current filter
    const summaryAgg = await ordersCol.aggregate([
      { $match: { ...filter, paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          count: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]).toArray();

    // Status breakdown
    const statusBreakdown = await ordersCol.aggregate([
      { $match: filter.createdAt ? { createdAt: filter.createdAt } : {} },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]).toArray();

    return apiSuccess({
      orders,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
      summary: {
        totalRevenue: summaryAgg[0]?.totalRevenue || 0,
        completedCount: summaryAgg[0]?.count || 0,
        avgOrderValue: summaryAgg[0]?.avgOrderValue || 0,
      },
      statusBreakdown: statusBreakdown.map((s: any) => ({
        status: s._id || 'unknown',
        count: s.count,
        total: s.total,
      })),
    });
  } catch (err: any) {
    console.error('[super-admin/payments] Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
