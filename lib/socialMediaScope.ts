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

  if (ownerUserId || ownerEmail) {
    try {
      const { bunnyExecute } = await import('@/lib/bunnyDatabase');
      const res = await bunnyExecute({
        sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'admin_users'"
      });
      let currentUser = null;
      for (const row of res.rows) {
        try {
          const parsed = JSON.parse(String(row.document_json || '{}'));
          if (
            (ownerUserId && parsed.userId === ownerUserId) ||
            (ownerEmail && parsed.email === ownerEmail)
          ) {
            currentUser = parsed;
            break;
          }
        } catch {}
      }

      if (currentUser) {
        const tenantSlug = String(currentUser.tenantSlug || '').trim().toLowerCase();
        if (tenantSlug) {
          return {
            scopeType: 'tenant',
            scopeKey: tenantSlug,
            scopeLabel: `Tenant settings (${tenantSlug})`,
            ownerUserId: ownerUserId || String(currentUser.userId || '').trim(),
            tenantSlug,
          };
        }
      }
    } catch (err) {
      console.warn('[SocialMediaScope] Bunny DB lookup failed:', err);
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
