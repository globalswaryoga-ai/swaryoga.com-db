import { NextRequest } from 'next/server';
import { connectDB, getUser } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';


/**
 * Super Admin Dashboard Stats
 * GET: Returns aggregate stats — total users, signups, payments, plans breakdown
 * Only accessible by super admins (admincrm / admin)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return apiError('UNAUTHORIZED');
    }

    await connectDB();

    const User = getUser();
    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.db;
    if (!db) return apiError('SERVER_ERROR', 'Database not connected');

    // Orders collection (main DB)
    const ordersCol = db.collection('orders');
    const signinsCol = db.collection('signins');
    const contactsCol = db.collection('contacts');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);
    const monthAgo = new Date(todayStart.getTime() - 30 * 86400000);

    // ── All aggregations in parallel ──
    const [
      totalUsers,
      signupsToday,
      signupsWeek,
      signupsMonth,
      totalOrders,
      completedOrders,
      pendingOrders,
      failedOrders,
      revenueAgg,
      totalSignins,
      signinsToday,
      totalContacts,
      recentSignups,
      recentOrders,
      planBreakdown,
      genderBreakdown,
      countryBreakdown,
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ createdAt: { $gte: monthAgo } }),
      // Orders
      ordersCol.countDocuments(),
      ordersCol.countDocuments({ paymentStatus: 'completed' }),
      ordersCol.countDocuments({ paymentStatus: 'pending' }),
      ordersCol.countDocuments({ paymentStatus: 'failed' }),
      // Revenue aggregation
      ordersCol.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]).toArray(),
      // Signins
      signinsCol.countDocuments(),
      signinsCol.countDocuments({ createdAt: { $gte: todayStart } }),
      // Contacts
      contactsCol.countDocuments(),
      // Recent signups (last 10)
      User.find({}, 'userId name email phone createdAt country')
        .sort({ createdAt: -1 }).limit(10).lean(),
      // Recent orders (last 10)
      ordersCol.find({}).sort({ createdAt: -1 }).limit(10).toArray(),
      // Role / plan breakdown
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      // Gender breakdown
      User.aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
      // Country breakdown
      User.aggregate([
        { $match: { country: { $exists: true, $ne: '' } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Currency breakdown from completed orders
    const currencyAgg = await ordersCol.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.currency', total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]).toArray();

    const currencyBreakdown: Record<string, { total: number; count: number }> = {};
    for (const c of currencyAgg) {
      currencyBreakdown[c._id || 'INR'] = { total: c.total, count: c.count };
    }

    const revenue = revenueAgg[0]?.total || 0;

    // Signup trend (last 30 days)
    const signupTrend = await User.aggregate([
      { $match: { createdAt: { $gte: monthAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Payment trend (last 30 days)
    const paymentTrend = await ordersCol.aggregate([
      { $match: { createdAt: { $gte: monthAgo }, paymentStatus: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    return apiSuccess({
      users: {
        total: totalUsers,
        signupsToday,
        signupsWeek,
        signupsMonth,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders,
        failed: failedOrders,
        revenue,
        currencyBreakdown,
      },
      signins: {
        total: totalSignins,
        today: signinsToday,
      },
      contacts: { total: totalContacts },
      breakdowns: {
        plans: planBreakdown.map((p: any) => ({ plan: p._id || 'user', count: p.count })),
        gender: genderBreakdown.map((g: any) => ({ gender: g._id || 'Not specified', count: g.count })),
        country: countryBreakdown.map((c: any) => ({ country: c._id, count: c.count })),
      },
      trends: {
        signups: signupTrend,
        payments: paymentTrend,
      },
      recent: {
        signups: recentSignups,
        orders: recentOrders,
      },
    });
  } catch (err: any) {
    console.error('[super-admin/stats] Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
