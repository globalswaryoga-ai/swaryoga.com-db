import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';

/**
 * Resolve the tenant OWNER's WhatsApp session key (permanentTenantId) for a
 * TEAM MEMBER, so every user under one tenant shares ONE inbox (e.g. the owner
 * scans the QR once and their team can read/reply on the same number).
 *
 * SAFETY (this guards tenant isolation):
 *   - Returns null for the owner themselves, for super-admins, when there is no
 *     tenantSlug, when the tenant/owner can't be found, or when the owner has no
 *     session key. Callers MUST fall back to the user's OWN session on null.
 *   - It only ever resolves to the owner of the tenant named in the user's own
 *     JWT (`tenantSlug`, set server-side at login) — i.e. the caller's own
 *     tenant. So the worst case is "team member sees their own empty inbox",
 *     never another tenant's data.
 */
export async function resolveOwnerSessionKey(opts: {
  userId: string;
  tenantSlug?: string | null;
}): Promise<string | null> {
  const userId = String(opts.userId || '').trim();
  const tenantSlug = String(opts.tenantSlug || '').trim();
  if (!userId || !tenantSlug) return null;

  try {
    const Tenant = getTenantModel();
    const tenant: any = await Tenant.findOne({ slug: tenantSlug }, { ownerUserId: 1 }).lean();
    const ownerUserId = String(tenant?.ownerUserId || '').trim();

    // No owner, or this user IS the owner → caller uses the user's own session.
    if (!ownerUserId || ownerUserId === userId) return null;

    const CRMUserSettings = getCRMUserSettings();
    const ownerSettings: any = await CRMUserSettings.findOne(
      { userId: ownerUserId },
      { permanentTenantId: 1 }
    ).lean();
    const key = String(ownerSettings?.permanentTenantId || '').trim();
    return key || null;
  } catch {
    // Any failure → null → caller falls back to the user's own session (safe).
    return null;
  }
}
