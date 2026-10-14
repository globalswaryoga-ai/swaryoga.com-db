import { bunnyExecute } from '@/lib/bunnyDatabase';
import { decryptCredential, encryptCredential } from '@/lib/auth';
import { requestGoogleFormsTokens } from '@/lib/googleFormsOAuth';

export type GoogleAccount = {
  account: Record<string, any>;
  source: 'canonical';
  documentId: string;
};

function parseJson(value: unknown): any {
  try { return value ? JSON.parse(String(value)) : {}; } catch { return {}; }
}

function inScope(account: Record<string, any>, scope: string) {
  const owner = String(account.ownerUserId || account.userId || '').trim();
  return scope === 'shared'
    ? ['', 'admin', 'admincrm', 'super_admin'].includes(owner) || (account.scopeType === 'super_admin' && account.scopeKey === 'super_admin')
    : owner === scope;
}

export async function resolveGoogleAccounts(scope: string): Promise<GoogleAccount[]> {
  const accounts: GoogleAccount[] = [];
  try {
    const result = await bunnyExecute({
      sql: `SELECT document_id, scope_type, scope_key, owner_user_id, tenant_slug, platform, account_id, account_name, account_handle, is_connected, connected_at, updated_at, data_json
            FROM social_media_accounts_sql
            WHERE platform IN ('google_forms', 'google') AND is_connected = 1
            ORDER BY COALESCE(updated_at, connected_at) DESC`,
    });
    for (const row of result.rows) {
      const data = parseJson(row.data_json);
      const account = {
        ...data,
        _id: String(data._id || row.document_id),
        scopeType: data.scopeType || row.scope_type,
        scopeKey: data.scopeKey || row.scope_key,
        ownerUserId: data.ownerUserId || row.owner_user_id || '',
        tenantSlug: data.tenantSlug || row.tenant_slug || undefined,
        platform: data.platform || row.platform,
        accountId: data.accountId || row.account_id,
        accountName: data.accountName || row.account_name,
        isConnected: Number(row.is_connected) !== 0,
      };
      if (!account.accessToken) continue;
      // Allow if explicitly matching scope, or shared scope, or if it is the platform's super admin connection
      if (inScope(account, scope) || scope === 'shared' || account.scopeType === 'super_admin' || ['', 'admin', 'admincrm', 'super_admin'].includes(account.ownerUserId)) {
        accounts.push({ account, source: 'canonical', documentId: String(account._id) });
      }
    }
  } catch (error) {
    console.error('[Google Forms] Account lookup failed from social_media_accounts_sql:', error instanceof Error ? error.message : error);
  }

  // Deduplicate by refresh token or access token
  const seen = new Set<string>();
  const filtered = accounts.filter(entry => {
    const key = `${entry.account.platform}:${entry.account.refreshToken || entry.account.accessToken}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return filtered;
}

export async function getGoogleAccessToken(entry: GoogleAccount) {
  return decryptGoogleCredential(entry.account.accessToken);
}

function decryptGoogleCredential(value: unknown) {
  const encrypted = String(value || '');
  const decrypted = decryptCredential(encrypted);
  if (!decrypted || (/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/i.test(encrypted) && decrypted === encrypted)) {
    throw new Error('Stored Google credential cannot be decrypted. Reconnect Google Forms.');
  }
  return decrypted;
}

export async function refreshGoogleAccessToken(entry: GoogleAccount) {
  const refreshed = await requestGoogleFormsTokens({
    refreshToken: decryptGoogleCredential(entry.account.refreshToken),
    oauthClientId: entry.account.oauthClientId,
  });
  const updated = {
    ...entry.account,
    accessToken: encryptCredential(refreshed.accessToken),
    oauthClientId: refreshed.clientId,
    tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await bunnyExecute({
    sql: `UPDATE social_media_accounts_sql SET data_json = ?, updated_at = ? WHERE document_id = ?`,
    args: [JSON.stringify(updated), updated.updatedAt, entry.documentId],
  });
  entry.account = updated;
  return refreshed.accessToken;
}
