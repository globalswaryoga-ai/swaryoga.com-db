import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, parsePagination } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * Super Admin Signins API using Bunny Database
 * GET: List all signin activity from user_signins
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
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();

    const res = await bunnyExecute(
      `SELECT * FROM user_signins ORDER BY created_at DESC LIMIT 1000`
    ).catch(() => ({ rows: [] }));

    let signins = res.rows.map((row: any) => {
      let data: any = {};
      try { data = JSON.parse(String(row.data_json || '{}')); } catch {}
      return {
        _id: row.id || row.document_id,
        id: row.id || row.document_id,
        userId: row.user_id || data.userId || '',
        email: row.email || data.email || '',
        ipAddress: row.ip_address || data.ipAddress || '',
        userAgent: row.user_agent || data.userAgent || '',
        createdAt: row.created_at || data.createdAt,
      };
    });

    if (search) {
      signins = signins.filter(s =>
        s.email.toLowerCase().includes(search) ||
        s.userId.toLowerCase().includes(search) ||
        s.ipAddress.includes(search)
      );
    }

    const total = signins.length;
    const paginated = signins.slice(skip, skip + limit);

    return apiSuccess({
      signins: paginated,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
      trends: [],
    });
  } catch (err: any) {
    console.error('[super-admin/signins] Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
