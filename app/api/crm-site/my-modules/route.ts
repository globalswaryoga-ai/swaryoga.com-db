import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';

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

    await connectDB();
    const crmDb = mongoose.connection.useDb(
      process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',
    );

    // Resolve the tenant identity from the login record.
    const uid = decoded.userId;
    const user = await crmDb.collection('admin_users').findOne(
      { $or: [{ userId: uid }, { email: uid }] },
      { projection: { tenantSlug: 1, email: 1, userId: 1 } },
    );

    const slug = String(user?.tenantSlug || '').trim();
    const email = String(user?.email || uid || '').trim().toLowerCase();

    const Tenant = getTenantModel();
    // Prefer the tenant slug; fall back to owner email / id for older records.
    const tenant: any = await Tenant.findOne(
      slug
        ? { slug }
        : { $or: [{ ownerEmail: email }, { ownerUserId: user?.userId || uid }] },
    ).lean();

    if (!tenant) {
      return apiSuccess({ found: false, slug: '', plan: '', status: '', moduleKeys: [] });
    }

    return apiSuccess({
      found: true,
      slug: tenant.slug || slug,
      plan: tenant.plan || 'free',
      status: tenant.status || 'active',
      moduleKeys: Array.isArray(tenant.moduleKeys) ? tenant.moduleKeys : [],
    });
  } catch (err) {
    console.error('[my-modules GET]', err);
    return apiError('Failed to load tenant modules', 500);
  }
}
