import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

function parse<T = Record<string, any>>(value: unknown, fallback: T): T {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
}

function text(value: unknown): string { return String(value ?? ''); }

export type BunnyQrMessage = Record<string, any> & {
  userId: string; connectedPhone: string; chatJid: string; messageId: string;
};
export type BunnyQrChat = Record<string, any> & {
  userId: string; connectedPhone: string; chatJid: string;
};

export async function initBunnyQrSchema() {
  // Runtime-safe initialization for deployments where numbered migrations have
  // not yet been recorded. The canonical DDL remains migrations/0019_*.sql.
  await bunnyBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS qr_chats_sql (user_id TEXT NOT NULL,connected_phone TEXT NOT NULL,chat_jid TEXT NOT NULL,conversation_timestamp INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0,pinned INTEGER NOT NULL DEFAULT 0,unread_count INTEGER NOT NULL DEFAULT 0,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT,PRIMARY KEY(user_id,connected_phone,chat_jid))', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_qr_chats_sort ON qr_chats_sql(user_id,connected_phone,archived,conversation_timestamp DESC)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS qr_messages_sql (user_id TEXT NOT NULL,connected_phone TEXT NOT NULL,chat_jid TEXT NOT NULL,message_id TEXT NOT NULL,timestamp INTEGER NOT NULL DEFAULT 0,direction TEXT NOT NULL DEFAULT \'inbound\',status INTEGER NOT NULL DEFAULT 0,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT,PRIMARY KEY(user_id,connected_phone,chat_jid,message_id))', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_qr_messages_chat_time ON qr_messages_sql(user_id,connected_phone,chat_jid,timestamp DESC)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS qr_archive_manifest_sql (user_id TEXT NOT NULL,connected_phone TEXT NOT NULL,chat_jid TEXT NOT NULL,date_key TEXT NOT NULL,bunny_path TEXT NOT NULL,byte_size INTEGER NOT NULL DEFAULT 0,message_count INTEGER NOT NULL DEFAULT 0,archived_at TEXT,data_json TEXT NOT NULL,PRIMARY KEY(user_id,connected_phone,chat_jid,date_key))', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_qr_archive_lookup ON qr_archive_manifest_sql(user_id,connected_phone,chat_jid,date_key)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS qr_sessions_sql (session_key TEXT PRIMARY KEY,user_id TEXT NOT NULL,connected_phone TEXT,data_json TEXT NOT NULL,created_at TEXT,updated_at TEXT)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS qr_storage_usage_sql (user_id TEXT NOT NULL,connected_phone TEXT NOT NULL,bunny_bytes INTEGER NOT NULL DEFAULT 0,bunny_file_count INTEGER NOT NULL DEFAULT 0,bunny_message_count INTEGER NOT NULL DEFAULT 0,last_archived_at TEXT,last_purged_at TEXT,data_json TEXT NOT NULL,PRIMARY KEY(user_id,connected_phone))', args: [] },
  ]);
}

export async function upsertBunnyQrMessage(message: Record<string, any>) {
  await initBunnyQrSchema();
  const now = new Date().toISOString();
  const row: Record<string, any> = { ...message, userId: text(message.userId), connectedPhone: text(message.connectedPhone), chatJid: text(message.chatJid), messageId: text(message.messageId) };
  if (!row.userId || !row.connectedPhone || !row.chatJid || !row.messageId) throw new Error('QR message identity is incomplete');
  await bunnyExecute({ sql: `INSERT INTO qr_messages_sql (user_id,connected_phone,chat_jid,message_id,timestamp,direction,status,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid,message_id) DO UPDATE SET timestamp=excluded.timestamp,direction=excluded.direction,status=CASE WHEN excluded.status > qr_messages_sql.status THEN excluded.status ELSE qr_messages_sql.status END,data_json=excluded.data_json,updated_at=excluded.updated_at`, args: [row.userId, row.connectedPhone, row.chatJid, row.messageId, Number(row.timestamp || 0), text(row.direction || 'inbound'), Number(row.status || 0), JSON.stringify(row), row.createdAt ? new Date(row.createdAt).toISOString() : now, now] });
  return row as BunnyQrMessage;
}

// Super Admin history is stored under both legacy owner IDs; read them as one inbox.
const SUPER_ADMIN_QR_OWNER_IDS = ['admin', 'admincrm'];

export function getQrOwnerIds(userId: string): string[] {
  const id = text(userId).trim();
  return SUPER_ADMIN_QR_OWNER_IDS.includes(id) ? SUPER_ADMIN_QR_OWNER_IDS : [id];
}

function ownerClause(userId: string) {
  const ids = getQrOwnerIds(userId);
  return { sql: `user_id IN (${ids.map(() => '?').join(',')})`, args: ids };
}

export async function listBunnyQrMessages(input: { userId: string; connectedPhone: string; chatJid: string; limit?: number; before?: number }) {
  await initBunnyQrSchema();
  const limit = Math.min(Math.max(Number(input.limit || 100), 1), 500);
  const owner = ownerClause(input.userId);
  const args: (string | number)[] = [...owner.args, input.connectedPhone, input.chatJid];
  let sql = `SELECT data_json FROM qr_messages_sql WHERE ${owner.sql} AND connected_phone = ? AND chat_jid = ?`;
  if (input.before) { sql += ' AND timestamp < ?'; args.push(input.before); }
  sql += ' ORDER BY timestamp DESC LIMIT ?'; args.push(limit);
  const result = await bunnyExecute({ sql, args });
  const seen = new Set<string>();
  const messages: BunnyQrMessage[] = [];
  for (const row of result.rows) {
    const message = parse<BunnyQrMessage>(row.data_json, {} as BunnyQrMessage);
    const key = text(message.messageId);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    messages.push(message);
  }
  return messages;
}

export async function upsertBunnyQrChat(chat: Record<string, any>) {
  await initBunnyQrSchema();
  const now = new Date().toISOString();
  const row: Record<string, any> = { ...chat, userId: text(chat.userId), connectedPhone: text(chat.connectedPhone), chatJid: text(chat.chatJid) };
  if (!row.userId || !row.connectedPhone || !row.chatJid) throw new Error('QR chat identity is incomplete');
  await bunnyExecute({ sql: `INSERT INTO qr_chats_sql (user_id,connected_phone,chat_jid,conversation_timestamp,archived,pinned,unread_count,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid) DO UPDATE SET conversation_timestamp=excluded.conversation_timestamp,archived=excluded.archived,pinned=excluded.pinned,unread_count=excluded.unread_count,data_json=excluded.data_json,updated_at=excluded.updated_at`, args: [row.userId, row.connectedPhone, row.chatJid, Number(row.conversationTimestamp || 0), row.archived ? 1 : 0, row.pinned ? 1 : 0, Number(row.unreadCount || 0), JSON.stringify(row), row.createdAt ? new Date(row.createdAt).toISOString() : now, now] });
  return row as BunnyQrChat;
}

export async function listBunnyQrChats(input: { userId: string; connectedPhone: string; limit?: number }) {
  await initBunnyQrSchema();
  const limit = Math.min(Math.max(Number(input.limit || 500), 1), 5000);
  const owner = ownerClause(input.userId);
  const result = await bunnyExecute({ sql: `SELECT data_json FROM qr_chats_sql WHERE ${owner.sql} AND connected_phone = ? ORDER BY pinned DESC, conversation_timestamp DESC, updated_at DESC LIMIT ?`, args: [...owner.args, input.connectedPhone, limit] });
  const seen = new Set<string>();
  const chats: BunnyQrChat[] = [];
  for (const row of result.rows) {
    const chat = parse<BunnyQrChat>(row.data_json, {} as BunnyQrChat);
    const key = text(chat.chatJid);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    chats.push(chat);
  }
  return chats;
}

/**
 * Returns the permanent 9-digit Bunny folder for one QR WhatsApp number.
 * The ID is derived from owner + number, so it is stable across deployments.
 */
export async function getQrStorageFolder(userId: string, connectedPhone: string) {
  await initBunnyQrSchema();
  const ownerKey = getQrOwnerIds(userId).length > 1 ? 'superadmin' : text(userId).trim();
  const phone = text(connectedPhone).replace(/\D/g, '');
  const sessionKey = `storage-folder:${ownerKey}:${phone}`;
  const existing = await bunnyExecute({ sql: 'SELECT data_json FROM qr_sessions_sql WHERE session_key = ? LIMIT 1', args: [sessionKey] });
  const stored = existing.rows[0] ? parse<Record<string, any>>(existing.rows[0].data_json, {}) : null;
  if (stored?.folderId && stored?.folderPath) return { folderId: String(stored.folderId), folderPath: String(stored.folderPath), created: false };

  const { createHash } = await import('crypto');
  const hashNumber = parseInt(createHash('sha256').update(sessionKey).digest('hex').slice(0, 12), 16);
  const folderId = String(100000000 + (hashNumber % 900000000));
  const folderPath = `qr-whatsapp/${folderId}`;
  const now = new Date().toISOString();
  await bunnyExecute({ sql: 'INSERT INTO qr_sessions_sql (session_key,user_id,connected_phone,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(session_key) DO NOTHING', args: [sessionKey, ownerKey, phone, JSON.stringify({ folderId, folderPath, ownerKey, connectedPhone: phone, createdAt: now }), now, now] });
  return { folderId, folderPath, created: true };
}

export async function listBunnyQrArchiveManifest(input: { userId: string; connectedPhone: string; chatJid: string; sinceDateKey: string; untilDateKey: string }) {
  await initBunnyQrSchema();
  const result = await bunnyExecute({ sql: 'SELECT data_json FROM qr_archive_manifest_sql WHERE user_id = ? AND connected_phone = ? AND chat_jid = ? AND date_key BETWEEN ? AND ? ORDER BY date_key ASC', args: [input.userId, input.connectedPhone, input.chatJid, input.sinceDateKey, input.untilDateKey] });
  return result.rows.map((row) => parse(row.data_json, {}));
}
