import { bunnyExecute } from '@/lib/bunnyDatabase';

export async function resolveOwnerSessionKey(opts: {
  userId: string;
  tenantSlug?: string | null;
}): Promise<string | null> {
  const userId = String(opts.userId || '').trim();
  const tenantSlug = String(opts.tenantSlug || '').trim();
  if (!userId || !tenantSlug) return null;

  try {
    let ownerUserId = '';

    const tenantRs = await bunnyExecute({
      sql: 'SELECT owner_user_id FROM crm_tenants_sql WHERE slug = ?',
      args: [tenantSlug]
    });
    
    if (tenantRs.rows.length > 0) {
      ownerUserId = String(tenantRs.rows[0].owner_user_id || '').trim();
    }

    if (!ownerUserId || ownerUserId === userId) return null;

    const settingsRs = await bunnyExecute({
      sql: 'SELECT data_json FROM crm_user_settings_sql WHERE user_id = ?',
      args: [ownerUserId]
    });
    
    if (settingsRs.rows.length > 0) {
      const doc = JSON.parse(String(settingsRs.rows[0].data_json || '{}'));
      if (doc.permanentTenantId) return String(doc.permanentTenantId).trim();
    }

    return null;
  } catch (err) {
    console.error('[QR Bridge] Failed to resolve owner session key via Bunny DB:', err);
    return null;
  }
}
