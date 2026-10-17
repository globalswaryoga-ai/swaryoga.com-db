import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getTenantDetails } from '@/lib/tenant/bunnyTenantRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tenants/details?email=<ownerEmail>&ownerUserId=<id>
 * Super-admin only. Aggregates full tenant profile from BunnyDB:
 *   - Login account from admin_users_sql
 *   - QR / WhatsApp settings from crm_user_settings_sql
 *   - Leads count and status breakdown from leads_sql
 */
export async function GET(req: NextRequest) {
  try {
    const decoded: any = verifyToken(req.headers.get('authorization')?.replace('Bearer ', '').trim() || '');
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

    const url = new URL(req.url);
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const ownerUserId = (url.searchParams.get('ownerUserId') || '').trim();

    if (!email && !ownerUserId) {
      return NextResponse.json({ error: 'email or ownerUserId required' }, { status: 400 });
    }

    const data = await getTenantDetails(email, ownerUserId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('[tenants/details] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch tenant details' }, { status: 500 });
  }
}
