import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { computeTrialState } from '@/lib/tenant/trial';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm-site/my-modules
 *
 * Returns the logged-in tenant's enabled module keys + plan, read from the
 * registry tenant record (swaryoga_admin_crm.tenants) — the SAME document the
 * super-admin edits in Tenant Management. This is the single source of truth
 * that drives the tenant CRM sidebar, so any module a super-admin enables for
 * a tenant automatically appears as a page in that tenant's sidebar.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }

    const uid = String(decoded.userId || '');
    const userResult = await bunnyExecute({ sql: 'SELECT tenant_slug,email,user_id FROM admin_users_sql WHERE lower(user_id)=lower(?) OR lower(email)=lower(?) LIMIT 1', args: [uid, uid] });
    const user: any = userResult.rows[0] || {};
    const slug = String(user.tenant_slug || (decoded as any).tenantSlug || '').trim();
    const tenantResult = slug
      ? await bunnyExecute({ sql: 'SELECT data_json FROM crm_tenants_sql WHERE tenant_slug = ? LIMIT 1', args: [slug] })
      : await bunnyExecute({ sql: 'SELECT data_json FROM crm_tenants_sql WHERE json_extract(data_json, \'$.ownerUserId\') = ? OR lower(json_extract(data_json, \'$.ownerEmail\')) = lower(?) LIMIT 1', args: [uid, String(user.email || uid)] });
    let tenant: any = null;
    if (tenantResult.rows[0]) { try { tenant = JSON.parse(String(tenantResult.rows[0].data_json)); } catch {} }

    if (!tenant) {
      return apiSuccess({ found: false, slug: '', plan: '', status: '', moduleKeys: [], trial: computeTrialState(null) });
    }

    return apiSuccess({
      found: true,
      slug: tenant.slug || slug,
      plan: tenant.plan || 'free',
      status: tenant.status || 'active',
      moduleKeys: Array.isArray(tenant.moduleKeys) ? tenant.moduleKeys : [],
      trial: computeTrialState(tenant),
    });
  } catch (err) {
    console.error('[my-modules GET]', err);
    return apiError('Failed to load tenant modules', 500);
  }
}
