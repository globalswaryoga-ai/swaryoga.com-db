import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, TokenPayload } from '@/lib/auth';

export type CrmSiteTenantAccess = {
  decoded: TokenPayload;
  crmDb: any;
  currentUser: any;
  tenant: any;
  tenantSlug: string;
  viewerId: string;
  viewerEmail: string;
};

type ResolveOptions = {
  requestedTenantSlug?: string | null;
};

export async function resolveCrmSiteTenantAccess(
  request: NextRequest,
  options: ResolveOptions = {},
): Promise<CrmSiteTenantAccess | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  await connectDB();

  const mongoose = (await import('mongoose')).default;
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  const viewerId = String(decoded.userId || '').trim();
  const viewerEmail = String(decoded.email || '').trim().toLowerCase();
  if (!viewerId && !viewerEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userLookupFilters: Record<string, string>[] = [];
  if (viewerId) userLookupFilters.push({ userId: viewerId });
  if (viewerEmail) userLookupFilters.push({ email: viewerEmail });

  const currentUser = await crmDb.collection('admin_users').findOne({
    $or: userLookupFilters,
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const resolvedTenantSlug = String(decoded.tenantSlug || currentUser.tenantSlug || '').trim();
  if (!resolvedTenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
  }

  const requestedTenantSlug = String(options.requestedTenantSlug || '').trim();
  if (requestedTenantSlug && requestedTenantSlug !== resolvedTenantSlug) {
    return NextResponse.json({ error: 'Access denied for this tenant' }, { status: 403 });
  }

  const tenant = await crmDb.collection('crm_tenants').findOne({ slug: resolvedTenantSlug });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  return {
    decoded,
    crmDb,
    currentUser,
    tenant,
    tenantSlug: resolvedTenantSlug,
    viewerId,
    viewerEmail,
  };
}
