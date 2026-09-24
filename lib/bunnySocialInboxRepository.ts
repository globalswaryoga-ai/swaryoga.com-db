import { bunnyExecute } from '@/lib/bunnyDatabase';

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
