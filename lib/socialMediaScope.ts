import mongoose from 'mongoose';
import type { TokenPayload } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export type SocialMediaScope = {
  scopeType: 'super_admin' | 'tenant';
  scopeKey: string;
  scopeLabel: string;
  ownerUserId: string;
  tenantSlug?: string;
};

const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

export async function resolveSocialMediaScope(decoded: TokenPayload | null | undefined): Promise<SocialMediaScope> {
  const ownerUserId = String(decoded?.userId || decoded?.username || '').trim();
  const ownerEmail = String(decoded?.email || '').trim().toLowerCase();

  if (isSuperAdmin(decoded)) {
    return {
      scopeType: 'super_admin',
      scopeKey: 'super_admin',
      scopeLabel: 'Super Admin shared settings',
      ownerUserId: ownerUserId || 'admincrm',
    };
  }

  const tokenTenantSlug = String(decoded?.tenantSlug || '').trim().toLowerCase();
  if (tokenTenantSlug) {
    return {
      scopeType: 'tenant',
      scopeKey: tokenTenantSlug,
      scopeLabel: `Tenant settings (${tokenTenantSlug})`,
      ownerUserId,
      tenantSlug: tokenTenantSlug,
    };
  }

  if (!mongoose.connection?.db) {
    return {
      scopeType: 'super_admin',
      scopeKey: 'super_admin',
      scopeLabel: 'Super Admin shared settings',
      ownerUserId: ownerUserId || 'admincrm',
    };
  }

  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  const lookupFilters: Record<string, string>[] = [];
  if (ownerUserId) lookupFilters.push({ userId: ownerUserId });
  if (ownerEmail) lookupFilters.push({ email: ownerEmail });

  if (lookupFilters.length > 0) {
    const currentUser = await crmDb.collection('admin_users').findOne({ $or: lookupFilters });
    const tenantSlug = String(currentUser?.tenantSlug || '').trim().toLowerCase();
    if (tenantSlug) {
      return {
        scopeType: 'tenant',
        scopeKey: tenantSlug,
        scopeLabel: `Tenant settings (${tenantSlug})`,
        ownerUserId: ownerUserId || String(currentUser?.userId || '').trim(),
        tenantSlug,
      };
    }
  }

  return {
    scopeType: 'super_admin',
    scopeKey: 'super_admin',
    scopeLabel: 'Super Admin shared settings',
    ownerUserId: ownerUserId || 'admincrm',
  };
}

export function buildSocialMediaScopeFilter(scope: SocialMediaScope) {
  if (scope.scopeType === 'super_admin') {
    return {
      $or: [
        { scopeType: 'super_admin', scopeKey: scope.scopeKey },
        { scopeType: { $exists: false } },
      ],
    };
  }

  return {
    scopeType: 'tenant',
    scopeKey: scope.scopeKey,
  };
}
