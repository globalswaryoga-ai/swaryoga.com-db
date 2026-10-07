import { bunnyExecute } from '@/lib/bunnyDatabase';
import crypto from 'node:crypto';

export type BunnySocialInboxCounts = {
  accounts: number;
  conversations: number;
  messages: number;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const raw = typeof value === 'object' && value && '$date' in (value as any)
    ? (value as any).$date
    : value;
  const date = new Date(raw as any);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function id(value: unknown): string {
  if (value && typeof value === 'object' && '$oid' in (value as any)) return String((value as any).$oid);
  return String(value ?? '');
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export async function ensureBunnySocialInboxSchema() {
  // Schema creation is intentionally kept in migrations. This helper only
  // checks availability so request handlers never silently mutate schema.
  const result = await bunnyExecute("SELECT name FROM sqlite_master WHERE type='table' AND name='social_inbox_messages_sql'");
  if (!result.rows.length) throw new Error('Bunny social inbox schema is not applied (migration 0024)');
}

function parseJson(value: unknown): any {
  try { return value ? JSON.parse(String(value)) : {}; } catch { return {}; }
}

function accountFromRow(row: any): any {
  const account = parseJson(row.data_json);
  return {
    ...account,
    _id: String(account._id || row.document_id),
    scopeType: account.scopeType || row.scope_type,
    scopeKey: account.scopeKey || row.scope_key,
    ownerUserId: account.ownerUserId || row.owner_user_id || '',
    tenantSlug: account.tenantSlug || row.tenant_slug || undefined,
    platform: account.platform || row.platform,
    accountId: account.accountId || row.account_id,
    isConnected: Number(row.is_connected) !== 0,
  };
}

export async function listBunnySocialAccounts(input?: { scopeType?: string; scopeKey?: string; connectedOnly?: boolean }): Promise<any[]> {
  await ensureBunnySocialInboxSchema();
  const clauses: string[] = [];
  const args: any[] = [];
  if (input?.scopeType) { clauses.push('scope_type = ?'); args.push(input.scopeType); }
  if (input?.scopeKey) { clauses.push('scope_key = ?'); args.push(input.scopeKey); }
  if (input?.connectedOnly !== false) clauses.push('is_connected = 1');
  const result = await bunnyExecute({
    sql: `SELECT * FROM social_media_accounts_sql${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY COALESCE(updated_at, connected_at) DESC`,
    args,
  });
  return result.rows.map(accountFromRow);
}

export async function upsertBunnySocialAccount(account: any): Promise<any> {
  await ensureBunnySocialInboxSchema();
  const documentId = id(account._id || crypto.randomUUID());
  const updated = { ...account, _id: documentId, updatedAt: new Date().toISOString() };
  await bunnyExecute({
    sql: `INSERT INTO social_media_accounts_sql
      (document_id,scope_type,scope_key,owner_user_id,tenant_slug,platform,account_id,account_name,account_handle,is_connected,connected_at,updated_at,data_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(scope_type,scope_key,platform,account_id) DO UPDATE SET
        document_id=excluded.document_id,owner_user_id=excluded.owner_user_id,tenant_slug=excluded.tenant_slug,
        account_name=excluded.account_name,account_handle=excluded.account_handle,is_connected=excluded.is_connected,
        connected_at=COALESCE(social_media_accounts_sql.connected_at, excluded.connected_at),updated_at=excluded.updated_at,data_json=excluded.data_json`,
    args: [documentId, account.scopeType || 'super_admin', account.scopeKey || 'super_admin', account.ownerUserId || null, account.tenantSlug || null, account.platform || '', account.accountId || '', account.accountName || null, account.accountHandle || null, account.isConnected === false ? 0 : 1, iso(account.connectedAt) || new Date().toISOString(), updated.updatedAt, JSON.stringify(updated)],
  });
  const rows = await listBunnySocialAccounts({ scopeType: account.scopeType || 'super_admin', scopeKey: account.scopeKey || 'super_admin', connectedOnly: false });
  return rows.find((row) => row.platform === account.platform && row.accountId === account.accountId) || updated;
}

export async function updateBunnySocialAccount(documentId: string, updates: Record<string, any>): Promise<any | null> {
  await ensureBunnySocialInboxSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM social_media_accounts_sql WHERE document_id = ?', args: [documentId] });
  if (!result.rows[0]) return null;
  const current = accountFromRow(result.rows[0]);
  return upsertBunnySocialAccount({ ...current, ...updates, _id: documentId });
}

export async function getBunnySocialInboxCounts(): Promise<BunnySocialInboxCounts> {
  const result = await bunnyExecute(`SELECT
    (SELECT count(*) FROM social_media_accounts_sql) AS accounts,
    (SELECT count(*) FROM social_inbox_conversations_sql) AS conversations,
    (SELECT count(*) FROM social_inbox_messages_sql) AS messages`);
  const row: any = result.rows[0] || {};
  return { accounts: Number(row.accounts || 0), conversations: Number(row.conversations || 0), messages: Number(row.messages || 0) };
}

export function socialAccountSqlArgs(row: any) {
  return [
    id(row._id), text(row.scopeType) || 'super_admin', text(row.scopeKey) || 'super_admin',
    text(row.ownerUserId), text(row.tenantSlug), text(row.platform) || '', text(row.accountId) || '',
    text(row.accountName), text(row.accountHandle), row.isConnected === false ? 0 : 1,
    iso(row.connectedAt), iso(row.updatedAt), json(row),
  ];
}

export function socialConversationSqlArgs(row: any) {
  return [
    id(row._id), text(row.conversationKey) || '', text(row.platform) || '',
    text(row.accountScopeType) || 'super_admin', text(row.accountScopeKey) || 'super_admin',
    text(row.accountId) || '', text(row.participantId) || '', text(row.participantName),
    text(row.participantUsername), text(row.createdByUserId), text(row.assignedToUserId),
    text(row.status), Number(row.unreadCount || 0), text(row.lastMessage), iso(row.lastMessageAt),
    text(row.lastMessageDirection), row.isBlocked ? 1 : 0, json(row),
  ];
}

export function socialMessageSqlArgs(row: any) {
  return [
    id(row._id), id(row.conversationId), text(row.conversationKey) || '', text(row.platform) || '',
    text(row.accountScopeType) || 'super_admin', text(row.accountScopeKey) || 'super_admin',
    text(row.accountId) || '', text(row.externalMessageId), text(row.senderId), text(row.recipientId),
    text(row.direction) || 'inbound', text(row.messageType) || 'text', row.isRead ? 1 : 0,
    iso(row.sentAt), json(row),
  ];
}
