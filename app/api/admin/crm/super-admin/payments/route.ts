import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, parsePagination } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * Super Admin Payments API using Bunny Database
 * GET: List all orders/payments from orders_sql
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return apiError('UNAUTHORIZED');
    }

    const url = new URL(request.url);
    const { limit, skip } = parsePagination(request);
    const status = url.searchParams.get('status') || '';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();

    const res = await bunnyExecute(
      `SELECT * FROM orders_sql ORDER BY created_at DESC LIMIT 1000`
    ).catch(() => ({ rows: [] }));

    let orders = res.rows.map((row: any) => {
      let data: any = {};
      try { data = JSON.parse(String(row.data_json || '{}')); } catch {}
      return {
        _id: row.document_id,
        id: row.document_id,
        userId: row.user_id || data.userId || '',
        total: Number(row.total || data.total || 0),
        currency: row.currency || data.currency || 'INR',
        paymentStatus: row.payment_status || data.paymentStatus || 'pending',
        paymentMethod: data.paymentMethod || 'online',
        items: data.items || [],
        createdAt: row.created_at || data.createdAt,
        updatedAt: row.updated_at || data.updatedAt,
      };
    });

    if (status) {
      orders = orders.filter(o => o.paymentStatus.toLowerCase() === status.toLowerCase());
    }

    if (search) {
      orders = orders.filter(o =>
        o.userId.toLowerCase().includes(search) ||
        o.id.toLowerCase().includes(search)
      );
    }

    const total = orders.length;
    const paginated = orders.slice(skip, skip + limit);

    const completed = orders.filter(o => o.paymentStatus === 'completed' || o.paymentStatus === 'PAID');
    const totalRevenue = completed.reduce((sum, o) => sum + (o.total || 0), 0);

    return apiSuccess({
      orders: paginated,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
      summary: {
        totalRevenue,
        completedCount: completed.length,
        avgOrderValue: completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0,
      },
      statusBreakdown: [
        { status: 'completed', count: completed.length, total: totalRevenue },
        { status: 'pending', count: orders.length - completed.length, total: 0 },
      ],
    });
  } catch (err: any) {
    console.error('[super-admin/payments] Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
