import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { decryptCredential, encryptCredential } from '@/lib/auth';
import { listBunnySocialAccounts, updateBunnySocialAccount } from '@/lib/bunnySocialInboxRepository';
import { requestGoogleFormsTokens } from '@/lib/googleFormsOAuth';

export type GoogleAccount = {
  account: Record<string, any>;
  source: 'canonical' | 'bunny_archive';
  documentId: string;
};

function inScope(account: Record<string, any>, scope: string) {
  const owner = String(account.ownerUserId || account.userId || '').trim();
  return scope === 'shared'
    ? ['', 'admin', 'admincrm', 'super_admin'].includes(owner) || (account.scopeType === 'super_admin' && account.scopeKey === 'super_admin')
    : owner === scope;
}

export async function resolveGoogleAccounts(scope: string): Promise<GoogleAccount[]> {
  const accounts: GoogleAccount[] = [];
  let canonicalAvailable = false;
  try {
    const stored = await listBunnySocialAccounts({ connectedOnly: false });
    canonicalAvailable = true;
    for (const account of stored) {
      if (!['google_forms', 'google'].includes(String(account.platform).toLowerCase()) ||
          account.isConnected === false || !account.accessToken || !account._id || !inScope(account, scope)) continue;
      accounts.push({ account, source: 'canonical', documentId: String(account._id) });
    }
  } catch (error) {
    console.warn('[Google Forms] Canonical account lookup unavailable:', error instanceof Error ? error.message : 'Unknown error');
  }
  // A newly authorized connection must not fall back to another account's old token.
  if (accounts.some(entry => entry.account.platform === 'google_forms')) return accounts;
  try {
    const archive = await bunnyExecute({
      sql: "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts' ORDER BY updated_at DESC",
    });
    for (const row of archive.rows) {
      let account: Record<string, any>;
      try { account = cleanMongoJson(JSON.parse(String(row.document_json || '{}'))); }
      catch { console.warn('[Google Forms] Malformed archived account skipped.'); continue; }
      if (!['google_forms', 'google'].includes(String(account.platform).toLowerCase()) ||
          account.isConnected === false || !account.accessToken || !inScope(account, scope)) continue;
      accounts.push({ account, source: 'bunny_archive', documentId: String(row.document_id) });
    }
  } catch (error) {
    if (!canonicalAvailable) throw new Error('Both Bunny Google account stores are unavailable.');
    console.warn('[Google Forms] Archived account lookup unavailable:', error instanceof Error ? error.message : 'Unknown error');
  }
  const seen = new Set<string>();
  const filtered = accounts.filter(entry => {
    const key = `${entry.account.platform}:${entry.account.refreshToken || entry.account.accessToken}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (filtered.length === 0 && scope !== 'shared') {
    return resolveGoogleAccounts('shared');
  }

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
    ...entry.account, accessToken: encryptCredential(refreshed.accessToken),
    oauthClientId: refreshed.clientId,
    tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (entry.source === 'canonical') {
    if (!await updateBunnySocialAccount(entry.documentId, updated)) throw new Error('Refreshed Google token could not be saved.');
  } else {
    const result = await bunnyExecute({
      sql: "UPDATE mongo_documents SET document_json = ?, updated_at = datetime('now') WHERE collection_name = 'socialmediaaccounts' AND document_id = ?",
      args: [JSON.stringify(updated), entry.documentId],
    });
    if (!result.rowsAffected) throw new Error('Refreshed Google token could not be saved.');
  }
  entry.account = updated;
  return refreshed.accessToken;
}
