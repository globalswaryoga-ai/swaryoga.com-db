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
    appSecret: account.metaAppSecret ? decryptCredential(String(account.metaAppSecret)) : process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET,
  };
}

let initialization: Promise<void> | undefined;
export async function initBunnyWhatsAppAccountsSchema() {
  if (!initialization) initialization = initializeSchema().catch(error => { initialization = undefined; throw error; });
  await initialization;
}

async function initializeSchema() {
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

export async function saveBunnyWhatsAppAccount(data: {
  userId: string;
  metaPhoneNumber?: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  metaAccessToken: string;
  metaVerifyToken?: string;
  accountName?: string;
}) {
  await initBunnyWhatsAppAccountsSchema();
  const existing = await findAccount("created_by_user_id = ?", [data.userId]);
  const docId = existing?.document_id || existing?._id || crypto.randomUUID();
  const now = new Date().toISOString();
  const { encryptCredential } = await import('@/lib/encryption');
  
  const payload = {
    _id: docId,
    document_id: docId,
    accountType: 'meta',
    accountName: data.accountName || `WhatsApp - ${data.metaPhoneNumber || data.metaPhoneNumberId}`,
    createdByUserId: data.userId,
    metaPhoneNumber: data.metaPhoneNumber || '',
    metaPhoneNumberId: data.metaPhoneNumberId,
    metaBusinessAccountId: data.metaBusinessAccountId || '',
    metaAppId: data.metaAppId || '',
    metaAppSecret: data.metaAppSecret ? encryptCredential(data.metaAppSecret) : '',
    metaAccessToken: encryptCredential(data.metaAccessToken),
    metaVerifyToken: data.metaVerifyToken ? encryptCredential(data.metaVerifyToken) : '',
    isActive: true,
    status: 'connected',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `INSERT INTO whatsapp_accounts_sql (document_id, account_type, created_by_user_id, meta_phone_number_id, meta_phone_number, is_active, status, data_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, 'connected', ?, ?, ?)
          ON CONFLICT(document_id) DO UPDATE SET
            meta_phone_number_id = excluded.meta_phone_number_id,
            meta_phone_number = excluded.meta_phone_number,
            is_active = 1,
            status = 'connected',
            data_json = excluded.data_json,
            updated_at = excluded.updated_at`,
    args: [
      docId,
      'meta',
      data.userId,
      data.metaPhoneNumberId,
      data.metaPhoneNumber || null,
      JSON.stringify(payload),
      payload.createdAt,
      now
    ]
  });

  return {
    success: true,
    account: {
      _id: docId,
      accountName: payload.accountName,
      metaPhoneNumber: payload.metaPhoneNumber,
      metaPhoneNumberId: payload.metaPhoneNumberId,
      metaBusinessAccountId: payload.metaBusinessAccountId,
      metaAppId: payload.metaAppId,
      hasAccessToken: true,
      hasAppSecret: Boolean(data.metaAppSecret),
      status: 'connected',
      updatedAt: now,
    }
  };
}

export async function getBunnyWhatsAppAccount(tenantUserId: string) {
  const account = await findAccount("created_by_user_id = ?", [tenantUserId]);
  if (!account) return null;
  return {
    _id: account._id || account.document_id,
    accountName: account.accountName,
    metaPhoneNumber: account.metaPhoneNumber,
    metaPhoneNumberId: account.metaPhoneNumberId,
    metaBusinessAccountId: account.metaBusinessAccountId,
    metaAppId: account.metaAppId,
    hasAccessToken: Boolean(account.metaAccessToken),
    hasAppSecret: Boolean(account.metaAppSecret),
    status: account.status || 'connected',
    isActive: account.isActive !== false,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function deleteBunnyWhatsAppAccount(tenantUserId: string) {
  await initBunnyWhatsAppAccountsSchema();
  await bunnyExecute({
    sql: `UPDATE whatsapp_accounts_sql SET is_active = 0, status = 'disconnected', updated_at = ? WHERE created_by_user_id = ?`,
    args: [new Date().toISOString(), tenantUserId]
  });
  return { success: true };
}
