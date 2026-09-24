#!/usr/bin/env node

/** Restore archived Mongo documents already stored in Bunny SQL into the new
 * typed WhatsApp tables. This does not connect to or modify MongoDB. */
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { EJSON } from 'bson';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();
if (!process.env.BUNNY_DATABASE_URL || !process.env.BUNNY_DATABASE_AUTH_TOKEN) throw new Error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required');
const bunny = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const parse = (value) => { try { return EJSON.parse(String(value)); } catch { return {}; } };
const str = (value) => value == null ? '' : String(value?.toHexString?.() || value);
const iso = (value) => { const raw = value?.$date ?? value; if (!raw) return null; const d = new Date(typeof raw === 'object' && raw.$numberLong ? Number(raw.$numberLong) : raw); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
const oid = (doc, fallback) => str(doc?._id) || fallback;
async function applySchema(file) { const sql = await fs.readFile(path.join(process.cwd(), file), 'utf8'); for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) { if (!statement.toUpperCase().startsWith('CREATE TABLE IF NOT EXISTS __BUNNY_MIGRATIONS')) await bunny.execute(statement); } await bunny.execute({ sql: 'INSERT INTO __bunny_migrations (name,checksum) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET checksum=excluded.checksum', args: [file.split('/').pop(), crypto.createHash('sha256').update(sql).digest('hex')] }); }
async function rowsFor(names) {
  const placeholders = names.map(() => '?').join(',');
  const rows = [];
  for (let offset = 0; ; offset += 2000) {
    const result = await bunny.execute({ sql: `SELECT collection_name,document_id,document_json,created_at,updated_at FROM mongo_documents WHERE collection_name IN (${placeholders}) ORDER BY collection_name,document_id LIMIT 2000 OFFSET ?`, args: [...names, offset] });
    rows.push(...result.rows);
    if (result.rows.length < 2000) return rows;
  }
}
async function batch(statements) { for (let i = 0; i < statements.length; i += 100) await bunny.batch(statements.slice(i, i + 100), 'write'); }
async function main() {
  await applySchema('migrations/0019_qr_whatsapp_sql.sql');
  await applySchema('migrations/0020_meta_whatsapp_sql.sql');
  await applySchema('migrations/0021_whatsapp_accounts_sql.sql');
  const [qrMessages, qrChats, qrManifests, qrUsage, metaMessages, accounts] = await Promise.all([
    rowsFor(['qr_whatsapp_messages']), rowsFor(['qr_whatsapp_chats']), rowsFor(['qr_whatsapp_archive_manifest']), rowsFor(['qr_whatsapp_storage_usage']), rowsFor(['whatsapp_messages', 'whatsappmessages']), rowsFor(['whatsapp_accounts']),
  ]);
  console.log(JSON.stringify({ archivedSourceCounts: { qrMessages: qrMessages.length, qrChats: qrChats.length, qrManifests: qrManifests.length, qrUsage: qrUsage.length, metaMessages: metaMessages.length, accounts: accounts.length }, dryRun }, null, 2));
  if (dryRun) return;
  const statements = [];
  for (const source of qrMessages) { const d = parse(source.document_json); const userId = str(d.userId), phone = str(d.connectedPhone), chat = str(d.chatJid), messageId = str(d.messageId) || source.document_id; if (!userId || !phone || !chat || !messageId) continue; statements.push({ sql: `INSERT INTO qr_messages_sql (user_id,connected_phone,chat_jid,message_id,timestamp,direction,status,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid,message_id) DO UPDATE SET data_json=excluded.data_json,status=CASE WHEN excluded.status > qr_messages_sql.status THEN excluded.status ELSE qr_messages_sql.status END,updated_at=excluded.updated_at`, args: [userId, phone, chat, messageId, Number(d.timestamp || 0), str(d.direction || 'inbound'), Number(d.status || 0), source.document_json, iso(d.createdAt) || source.created_at, iso(d.updatedAt) || source.updated_at] }); }
  await batch(statements.splice(0));
  for (const source of qrChats) { const d = parse(source.document_json); const userId = str(d.userId), phone = str(d.connectedPhone), chat = str(d.chatJid); if (!userId || !phone || !chat) continue; statements.push({ sql: `INSERT INTO qr_chats_sql (user_id,connected_phone,chat_jid,conversation_timestamp,archived,pinned,unread_count,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid) DO UPDATE SET data_json=excluded.data_json,conversation_timestamp=excluded.conversation_timestamp,archived=excluded.archived,pinned=excluded.pinned,unread_count=excluded.unread_count,updated_at=excluded.updated_at`, args: [userId, phone, chat, Number(d.conversationTimestamp || 0), d.archived ? 1 : 0, d.pinned ? 1 : 0, Number(d.unreadCount || 0), source.document_json, iso(d.createdAt) || source.created_at, iso(d.updatedAt) || source.updated_at] }); }
  await batch(statements.splice(0));
  for (const source of qrManifests) { const d = parse(source.document_json); if (!d.userId || !d.connectedPhone || !d.chatJid || !d.dateKey) continue; statements.push({ sql: `INSERT INTO qr_archive_manifest_sql (user_id,connected_phone,chat_jid,date_key,bunny_path,byte_size,message_count,archived_at,data_json) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone,chat_jid,date_key) DO UPDATE SET data_json=excluded.data_json,bunny_path=excluded.bunny_path,byte_size=excluded.byte_size,message_count=excluded.message_count,archived_at=excluded.archived_at`, args: [str(d.userId), str(d.connectedPhone), str(d.chatJid), str(d.dateKey), str(d.bunnyPath), Number(d.byteSize || 0), Number(d.messageCount || 0), iso(d.archivedAt) || source.created_at, source.document_json] }); }
  await batch(statements.splice(0));
  for (const source of qrUsage) { const d = parse(source.document_json); if (!d.userId || !d.connectedPhone) continue; statements.push({ sql: `INSERT INTO qr_storage_usage_sql (user_id,connected_phone,bunny_bytes,bunny_file_count,bunny_message_count,last_archived_at,last_purged_at,data_json) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,connected_phone) DO UPDATE SET data_json=excluded.data_json,bunny_bytes=excluded.bunny_bytes,bunny_file_count=excluded.bunny_file_count,bunny_message_count=excluded.bunny_message_count,last_archived_at=excluded.last_archived_at,last_purged_at=excluded.last_purged_at`, args: [str(d.userId), str(d.connectedPhone), Number(d.bunnyBytes || 0), Number(d.bunnyFileCount || 0), Number(d.bunnyMessageCount || 0), iso(d.lastArchivedAt), iso(d.lastPurgedAt), source.document_json] }); }
  await batch(statements.splice(0));
  for (const source of metaMessages) { const d = parse(source.document_json); const documentId = oid(d, source.document_id); if (!d.phoneNumber || !documentId) continue; statements.push({ sql: `INSERT INTO meta_messages_sql (document_id,lead_id,phone_number,provider,direction,message_type,status,wa_message_id,sender_number,sent_by_user_id,sent_at,created_at,updated_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,status=excluded.status,updated_at=excluded.updated_at`, args: [documentId, d.leadId ? str(d.leadId) : null, str(d.phoneNumber), 'meta', str(d.direction || 'outbound'), str(d.messageType || 'text'), str(d.status || 'queued'), d.waMessageId ? str(d.waMessageId) : null, d.senderNumber ? str(d.senderNumber) : null, d.sentByUserId ? str(d.sentByUserId) : null, iso(d.sentAt), iso(d.createdAt) || source.created_at, iso(d.updatedAt) || source.updated_at, source.document_json] }); }
  await batch(statements.splice(0));
  for (const source of accounts) { const d = parse(source.document_json); const documentId = oid(d, source.document_id); if (!d.createdByUserId || !documentId) continue; statements.push({ sql: `INSERT INTO whatsapp_accounts_sql (document_id,account_type,created_by_user_id,meta_phone_number_id,meta_phone_number,is_active,status,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,is_active=excluded.is_active,status=excluded.status,updated_at=excluded.updated_at`, args: [documentId, str(d.accountType || 'meta'), str(d.createdByUserId), d.metaPhoneNumberId ? str(d.metaPhoneNumberId) : null, d.metaPhoneNumber ? str(d.metaPhoneNumber) : null, d.isActive === false ? 0 : 1, str(d.status || 'disconnected'), source.document_json, iso(d.createdAt) || source.created_at, iso(d.updatedAt) || source.updated_at] }); }
  await batch(statements.splice(0));
  for (const table of ['qr_messages_sql','qr_chats_sql','qr_archive_manifest_sql','qr_storage_usage_sql','meta_messages_sql','whatsapp_accounts_sql']) { const result = await bunny.execute(`SELECT COUNT(*) AS count FROM ${table}`); console.log(table, Number(result.rows[0].count)); }
}
main().catch((error) => { console.error('Bunny archive restore failed:', error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => bunny.close());
