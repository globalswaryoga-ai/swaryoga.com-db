import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * Super Admin Dashboard Stats using Bunny Database
 * GET: Returns aggregate stats — total users, signups, payments, plans breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return apiError('UNAUTHORIZED');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      usersStatsRes,
      ordersStatsRes,
      revenueRes,
      signinsStatsRes,
      recentUsersRes,
      recentOrdersRes,
      leadsCountRes,
    ] = await Promise.all([
      // Users stats
      bunnyExecute({
        sql: `SELECT
          COUNT(*) as totalUsers,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as signupsToday,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as signupsWeek,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as signupsMonth
        FROM users`,
        args: [todayStart, weekAgo, monthAgo],
      }).catch(() => ({ rows: [{ totalUsers: 0, signupsToday: 0, signupsWeek: 0, signupsMonth: 0 }] })),

      // Orders stats
      bunnyExecute({
        sql: `SELECT
          COUNT(*) as totalOrders,
          SUM(CASE WHEN payment_status = 'completed' OR payment_status = 'PAID' THEN 1 ELSE 0 END) as completedOrders,
          SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
          SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failedOrders
        FROM orders_sql`,
      }).catch(() => ({ rows: [{ totalOrders: 0, completedOrders: 0, pendingOrders: 0, failedOrders: 0 }] })),

      // Revenue
      bunnyExecute({
        sql: `SELECT COALESCE(SUM(CAST(total AS REAL)), 0) as totalRevenue, COUNT(*) as count
          FROM orders_sql
          WHERE payment_status = 'completed' OR payment_status = 'PAID'`,
      }).catch(() => ({ rows: [{ totalRevenue: 0, count: 0 }] })),

      // Signins
      bunnyExecute({
        sql: `SELECT
          COUNT(*) as totalSignins,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as signinsToday
        FROM user_signins`,
        args: [todayStart],
      }).catch(() => ({ rows: [{ totalSignins: 0, signinsToday: 0 }] })),

      // Recent users (last 10)
      bunnyExecute({
        sql: `SELECT id, email, phone, full_name as name, created_at, role FROM users ORDER BY created_at DESC LIMIT 10`,
      }).catch(() => ({ rows: [] })),

      // Recent orders (last 10)
      bunnyExecute({
        sql: `SELECT document_id, user_id, total, currency, payment_status, created_at FROM orders_sql ORDER BY created_at DESC LIMIT 10`,
      }).catch(() => ({ rows: [] })),

      // Total Leads
      bunnyExecute({
        sql: `SELECT COUNT(*) as totalLeads FROM leads_sql`,
      }).catch(() => ({ rows: [{ totalLeads: 0 }] })),
    ]);

    const uRow: any = usersStatsRes.rows[0] || {};
    const oRow: any = ordersStatsRes.rows[0] || {};
    const rRow: any = revenueRes.rows[0] || {};
    const sRow: any = signinsStatsRes.rows[0] || {};

    const totalUsers = Number(uRow.totalUsers || 0);
    const signupsToday = Number(uRow.signupsToday || 0);
    const signupsWeek = Number(uRow.signupsWeek || 0);
    const signupsMonth = Number(uRow.signupsMonth || 0);

    const totalOrders = Number(oRow.totalOrders || 0);
    const completedOrders = Number(oRow.completedOrders || 0);
    const pendingOrders = Number(oRow.pendingOrders || 0);
    const failedOrders = Number(oRow.failedOrders || 0);
    const revenue = Number(rRow.totalRevenue || 0);

    const totalSignins = Number(sRow.totalSignins || 0);
    const signinsToday = Number(sRow.signinsToday || 0);
    const totalLeads = Number(leadsCountRes.rows[0]?.totalLeads || 0);

    return apiSuccess({
      overview: {
        totalUsers,
        signupsToday,
        signupsWeek,
        signupsMonth,
        totalOrders,
        completedOrders,
        pendingOrders,
        failedOrders,
        revenue,
        totalSignins,
        signinsToday,
        totalContacts: totalLeads,
      },
      recentSignups: recentUsersRes.rows,
      recentOrders: recentOrdersRes.rows,
      breakdowns: {
        plans: [{ _id: 'free', count: totalUsers }],
        currency: { INR: { total: revenue, count: completedOrders } },
      },
      trends: {
        signups: [],
        payments: [],
      },
    });
  } catch (error) {
    console.error('[Super Admin Stats] Error:', error);
    return apiError('Failed to fetch super admin stats', 500);
  }
}
