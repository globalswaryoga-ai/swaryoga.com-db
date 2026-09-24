import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { decryptCredential } from '@/lib/encryption';

function parse(value: unknown): any { try { return value ? JSON.parse(String(value)) : null; } catch { return null; } }
function mapCredentials(account: any) {
  if (!account?.metaAccessToken || !account?.metaPhoneNumberId) return null;
  return {
    accessToken: decryptCredential(String(account.metaAccessToken)),
    phoneNumberId: String(account.metaPhoneNumberId),
    phoneNumber: String(account.metaPhoneNumber || ''),
    wabaId: account.metaBusinessAccountId ? String(account.metaBusinessAccountId) : undefined,
  };
}

export async function initBunnyWhatsAppAccountsSchema() {
  await bunnyBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS whatsapp_accounts_sql (document_id TEXT PRIMARY KEY,account_type TEXT NOT NULL DEFAULT \'meta\',created_by_user_id TEXT NOT NULL,meta_phone_number_id TEXT,meta_phone_number TEXT,is_active INTEGER NOT NULL DEFAULT 1,status TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_owner ON whatsapp_accounts_sql(created_by_user_id,account_type,is_active)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_meta_phone_id ON whatsapp_accounts_sql(meta_phone_number_id)', args: [] },
  ]);
}

async function findAccount(whereSql: string, args: (string | number)[]) {
  await initBunnyWhatsAppAccountsSchema();
  const result = await bunnyExecute({ sql: `SELECT data_json FROM whatsapp_accounts_sql WHERE account_type = 'meta' AND is_active = 1 AND ${whereSql} LIMIT 1`, args });
  return parse(result.rows[0]?.data_json);
}

export async function getBunnyMetaCredentialsForTenant(tenantUserId: string) {
  const account = await findAccount("created_by_user_id = ?", [tenantUserId]);
  return mapCredentials(account);
}

export async function getBunnyMetaCredentialsByPhoneNumberId(phoneNumberId: string) {
  const account = await findAccount("meta_phone_number_id = ?", [phoneNumberId]);
  const creds = mapCredentials(account);
  if (!creds || !account?.createdByUserId) return null;
  return { tenantUserId: String(account.createdByUserId), creds };
}
