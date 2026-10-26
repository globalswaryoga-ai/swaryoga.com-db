import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, parsePagination } from '@/lib/crm-handlers';
import { apiError, apiSuccess } from '@/lib/api-error';
import { saveBunnyLead, getBunnyLeadByEmail, getBunnyLeadByPhone } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

/**
 * Super Admin Users API using Bunny Database
 * GET: List all website users with search, filter, pagination
 * POST: Convert a user to a CRM lead
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
    const role = url.searchParams.get('role') || '';

    let res = await bunnyExecute(
      `SELECT id, email, phone, full_name as name, role, data_json, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 1000`
    ).catch(() => ({ rows: [] }));

    let users = res.rows.map((row: any) => {
      let extra: any = {};
      try { extra = JSON.parse(String(row.data_json || '{}')); } catch {}
      return {
        _id: row.id,
        id: row.id,
        userId: extra.userId || row.email || row.id,
        name: row.name || extra.name || '',
        email: row.email || '',
        phone: row.phone || extra.phone || '',
        role: row.role || 'user',
        country: extra.country || '',
        gender: extra.gender || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    if (role) {
      users = users.filter(u => u.role === role);
    }

    if (search) {
      users = users.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.phone.includes(search) ||
        u.userId.toLowerCase().includes(search)
      );
    }

    const total = users.length;
    const paginated = users.slice(skip, skip + limit);

    return apiSuccess({
      users: paginated,
      pagination: {
        page: Math.floor(skip / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[super-admin/users] GET Error:', error);
    return apiError('SERVER_ERROR', 'Failed to fetch users');
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return apiError('UNAUTHORIZED');
    }

    const body = await request.json();
    const { userIds, assignTo } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return apiError('VALIDATION_ERROR', 'userIds array is required');
    }

    const placeholders = userIds.map(() => '?').join(', ');
    const res = await bunnyExecute({
      sql: `SELECT id, email, phone, full_name as name, data_json FROM users WHERE id IN (${placeholders}) OR email IN (${placeholders})`,
      args: [...userIds, ...userIds],
    });

    const results: any[] = [];
    const viewerUserId = decoded.userId || 'admincrm';

    for (const row of res.rows as any[]) {
      const email = String(row.email || '').trim().toLowerCase();
      const phone = String(row.phone || '').trim();

      const existing = (email ? await getBunnyLeadByEmail(email) : null)
        || (phone ? await getBunnyLeadByPhone(phone) : null);

      if (existing) {
        results.push({ userId: row.id, status: 'exists', leadId: existing._id });
        continue;
      }

      const newLead = await saveBunnyLead({
        linkedUserId: viewerUserId,
        assignedToUserId: assignTo || viewerUserId,
        name: row.name || 'Unknown',
        phoneNumber: phone,
        email,
        status: 'new',
        source: 'website_user',
        labels: ['Website User'],
        notes: `Imported from website user: ${row.id}`,
      });

      results.push({ userId: row.id, status: 'created', leadId: newLead._id || newLead.id });
    }

    return apiSuccess({ results, total: results.length });
  } catch (err: any) {
    console.error('[super-admin/users] POST Error:', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
