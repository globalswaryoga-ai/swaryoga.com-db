import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { resetTenantPassword } from '@/lib/tenant/bunnyTenantRepository';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tenants/reset-password
 * Super-admin only. Resets a tenant's login password in BunnyDB (admin_users_sql).
 * Body: { email: string, ownerUserId?: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
  try {
    const decoded: any = verifyToken(req.headers.get('authorization')?.replace('Bearer ', '').trim() || '');
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const ownerUserId = String(body?.ownerUserId || '').trim().toLowerCase();
    const newPassword = String(body?.newPassword || '');

    if (!email && !ownerUserId) {
      return NextResponse.json({ error: 'email or ownerUserId required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const result = await resetTenantPassword({
      email,
      ownerUserId,
      newPassword,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[tenants/reset-password] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reset password' }, { status: 500 });
  }
}
