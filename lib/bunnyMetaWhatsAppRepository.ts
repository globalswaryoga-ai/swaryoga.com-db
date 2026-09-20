import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

function parse<T = Record<string, any>>(value: unknown, fallback: T): T {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
}
function stringValue(value: unknown): string { return String(value ?? ''); }
function iso(value: unknown): string | null { return value ? new Date(value as any).toISOString() : null; }

export async function initBunnyMetaWhatsAppSchema() {
  await bunnyBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS meta_messages_sql (document_id TEXT PRIMARY KEY,lead_id TEXT,phone_number TEXT NOT NULL DEFAULT \'\',provider TEXT NOT NULL DEFAULT \'meta\',direction TEXT NOT NULL DEFAULT \'outbound\',message_type TEXT NOT NULL DEFAULT \'text\',status TEXT NOT NULL DEFAULT \'queued\',wa_message_id TEXT,sender_number TEXT,sent_by_user_id TEXT,sent_at TEXT,created_at TEXT,updated_at TEXT,data_json TEXT NOT NULL)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_phone_time ON meta_messages_sql(phone_number,sent_at DESC,created_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_lead_time ON meta_messages_sql(lead_id,sent_at DESC,created_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_provider ON meta_messages_sql(provider,sent_at DESC)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_wa_id ON meta_messages_sql(wa_message_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_messages_owner ON meta_messages_sql(sent_by_user_id)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS meta_archive_manifest_sql (document_id TEXT PRIMARY KEY,tenant_user_id TEXT NOT NULL,phone_number TEXT NOT NULL,date_key TEXT NOT NULL,bunny_path TEXT NOT NULL,byte_size INTEGER NOT NULL DEFAULT 0,message_count INTEGER NOT NULL DEFAULT 0,archived_at TEXT,data_json TEXT NOT NULL)', args: [] },
    { sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_archive_phone_day ON meta_archive_manifest_sql(tenant_user_id,phone_number,date_key)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_meta_archive_phone ON meta_archive_manifest_sql(phone_number,date_key DESC)', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS meta_template_payloads_sql (template_hash TEXT PRIMARY KEY, payload_json TEXT NOT NULL, created_at TEXT)', args: [] },
  ]);
}
import crypto from 'node:crypto';

export async function upsertBunnyMetaMessage(message: Record<string, any>) {
  await initBunnyMetaWhatsAppSchema();
  const row: Record<string, any> = { ...message };
  
  // Deduplication for all messages with media or substantial text
  const payloadToHash = row.media?.url || (row.messageContent && row.messageContent.length > 50 ? row.messageContent : null);
  
  if (payloadToHash) {
    const payload = { messageContent: row.messageContent, media: row.media };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    await bunnyExecute({
      sql: `INSERT OR IGNORE INTO meta_template_payloads_sql (template_hash, payload_json, created_at) VALUES (?, ?, ?)`,
      args: [hash, JSON.stringify(payload), new Date().toISOString()]
    });
    delete row.messageContent;
    delete row.media;
    row.templateHash = hash;
  }

  const documentId = stringValue(row._id || row.documentId || row.waMessageId);
  if (!documentId || !row.phoneNumber) throw new Error('Meta message identity is incomplete');
  row.documentId = documentId;
  row.provider = 'meta';
  await bunnyExecute({
    sql: `INSERT INTO meta_messages_sql (document_id,lead_id,phone_number,provider,direction,message_type,status,wa_message_id,sender_number,sent_at,created_at,updated_at,data_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET lead_id=excluded.lead_id,phone_number=excluded.phone_number,direction=excluded.direction,message_type=excluded.message_type,status=excluded.status,wa_message_id=excluded.wa_message_id,sender_number=excluded.sender_number,sent_at=excluded.sent_at,updated_at=excluded.updated_at,data_json=excluded.data_json`,
    args: [documentId, row.leadId ? stringValue(row.leadId) : null, stringValue(row.phoneNumber), 'meta', stringValue(row.direction || 'outbound'), stringValue(row.messageType || 'text'), stringValue(row.status || 'queued'), row.waMessageId ? stringValue(row.waMessageId) : null, row.senderNumber ? stringValue(row.senderNumber) : null, iso(row.sentAt), iso(row.createdAt), iso(row.updatedAt) || new Date().toISOString(), JSON.stringify(row)],
  });
  return row;
}

const templatePayloadCache = new Map<string, any>();

export async function listBunnyMetaMessages(input: { phoneNumber?: string; leadId?: string; limit?: number; skip?: number; before?: string }) {
  await initBunnyMetaWhatsAppSchema();
  const clauses = ["provider = 'meta'"];
  const args: (string | number)[] = [];
  
  if (input.phoneNumber) {
    const rawDigits = stringValue(input.phoneNumber).replace(/\D/g, '');
    const last10 = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    if (last10) {
      clauses.push('(phone_number = ? OR phone_number LIKE ?)');
      args.push(input.phoneNumber, `%${last10}`);
    } else {
      clauses.push('phone_number = ?');
      args.push(input.phoneNumber);
    }
  } else if (input.leadId) {
    clauses.push('lead_id = ?');
    args.push(input.leadId);
  }

  if (input.before) { clauses.push('(sent_at < ? OR (sent_at IS NULL AND created_at < ?))'); args.push(input.before, input.before); }
  const limit = Math.min(Math.max(Number(input.limit || 100), 1), 500);
  const skip = Math.max(Number(input.skip || 0), 0);
  args.push(limit, skip);
  const result = await bunnyExecute({ sql: `SELECT document_id, sent_at, created_at, data_json FROM meta_messages_sql WHERE ${clauses.join(' AND ')} ORDER BY COALESCE(sent_at,created_at) DESC LIMIT ? OFFSET ?`, args });
  const messages = result.rows.map((row) => {
    const msg: any = parse(row.data_json, {});
    return {
      ...msg,
      _id: String(msg._id?.$oid || msg._id || row.document_id),
      sentAt: msg.sentAt?.$date ? new Date(Number(msg.sentAt.$date.$numberLong || msg.sentAt.$date)).toISOString() : (msg.sentAt || row.sent_at),
      createdAt: msg.createdAt?.$date ? new Date(Number(msg.createdAt.$date.$numberLong || msg.createdAt.$date)).toISOString() : (msg.createdAt || row.created_at),
      provider: 'meta'
    };
  });

  for (const msg of messages) {
    if (msg.templateHash) {
      if (!templatePayloadCache.has(msg.templateHash)) {
        const payloadRes = await bunnyExecute({ sql: `SELECT payload_json FROM meta_template_payloads_sql WHERE template_hash = ?`, args: [msg.templateHash] });
        if (payloadRes.rows[0]) {
          templatePayloadCache.set(msg.templateHash, parse(payloadRes.rows[0].payload_json, {}));
        }
      }
      const cachedPayload = templatePayloadCache.get(msg.templateHash);
      if (cachedPayload) {
        msg.messageContent = cachedPayload.messageContent;
        msg.media = cachedPayload.media;
      }
    }
  }
  return messages;
}

export async function countBunnyMetaMessages(input: { phoneNumber?: string; leadId?: string }) {
  await initBunnyMetaWhatsAppSchema();
  const clauses = ["provider = 'meta'"]; 
  const args: string[] = [];
  
  if (input.phoneNumber) {
    const rawDigits = stringValue(input.phoneNumber).replace(/\D/g, '');
    const last10 = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    if (last10) {
      clauses.push('(phone_number = ? OR phone_number LIKE ?)');
      args.push(input.phoneNumber, `%${last10}`);
    } else {
      clauses.push('phone_number = ?');
      args.push(input.phoneNumber);
    }
  } else if (input.leadId) {
    clauses.push('lead_id = ?');
    args.push(input.leadId);
  }

  const result = await bunnyExecute({ sql: `SELECT COUNT(*) AS count FROM meta_messages_sql WHERE ${clauses.join(' AND ')}`, args });
  return Number(result.rows[0]?.count || 0);
}

export async function listBunnyMetaConversations(limit = 100) {
  await initBunnyMetaWhatsAppSchema();
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  
  const result = await bunnyExecute({ 
    sql: `SELECT phone_number, COUNT(*) AS message_count, MAX(COALESCE(sent_at,created_at)) AS last_at, MAX(created_at) AS updated_at FROM meta_messages_sql WHERE provider = 'meta' GROUP BY phone_number ORDER BY last_at DESC LIMIT ?`, 
    args: [safeLimit] 
  });
  
  const rows: Array<Record<string, any>> = [];
  const seen = new Set<string>();

  if (result.rows.length > 0) {
    const phoneNumbers = result.rows.map(r => String(r.phone_number));
    const placeholders = phoneNumbers.map(() => '?').join(',');

    // Fetch latest messages in a single query using window function
    const latestMessages = await bunnyExecute({
      sql: `SELECT document_id, phone_number, sent_at, created_at, data_json FROM (
              SELECT *, ROW_NUMBER() OVER(PARTITION BY phone_number ORDER BY COALESCE(sent_at,created_at) DESC) as rn
              FROM meta_messages_sql
              WHERE provider = 'meta' AND phone_number IN (${placeholders})
            ) WHERE rn = 1`,
      args: phoneNumbers
    });

    const messageMap = new Map<string, Record<string, any>>();
    for (const row of latestMessages.rows) {
      messageMap.set(String(row.phone_number), parse<Record<string, any>>(row.data_json, {}));
    }

    // Fetch unread counts in a single query
    const unreadCounts = await bunnyExecute({ 
      sql: `SELECT phone_number, COUNT(*) AS count FROM meta_messages_sql WHERE provider = 'meta' AND phone_number IN (${placeholders}) AND direction = 'inbound' AND status <> 'read' GROUP BY phone_number`, 
      args: phoneNumbers 
    });
    
    const unreadMap = new Map<string, number>();
    for (const row of unreadCounts.rows) {
      unreadMap.set(String(row.phone_number), Number(row.count));
    }

    for (const summary of result.rows) {
      const phone = String(summary.phone_number);
      const message = messageMap.get(phone) || {};
      const unreadCount = unreadMap.get(phone) || 0;

      rows.push({
        _id: phone,
        leadId: message.leadId || '',
        phoneNumber: phone,
        lastMessageContent: message.messageContent || '',
        lastMessageAt: summary.last_at || summary.updated_at,
        lastDirection: message.direction || 'inbound',
        unreadCount: unreadCount,
        hasLead: Boolean(message.leadId),
        source: 'whatsapp',
      });
      seen.add(phone);
    }
  }

  const archived = await bunnyExecute({ sql: 'SELECT phone_number,MAX(date_key) AS last_date,SUM(message_count) AS message_count FROM meta_archive_manifest_sql GROUP BY phone_number ORDER BY last_date DESC LIMIT ?', args: [Math.min(Math.max(limit, 1), 5000)] });
  for (const summary of archived.rows) {
    const phone = String(summary.phone_number);
    if (seen.has(phone)) continue;
    rows.push({ _id: phone, leadId: '', phoneNumber: phone, lastMessageContent: 'Archived WhatsApp history', lastMessageAt: summary.last_date, lastDirection: 'inbound', unreadCount: 0, hasLead: false, source: 'whatsapp', archivedMessageCount: Number(summary.message_count || 0) });
  }
  
  rows.sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')));
  return rows;
}

export async function getBunnyMetaMessage(messageId: string) {
  const result = await bunnyExecute({ sql: "SELECT document_id, sent_at, created_at, data_json FROM meta_messages_sql WHERE document_id = ?", args: [messageId] });
  if (!result.rows[0]) return null;
  const rawMsg: any = parse(result.rows[0].data_json, {});
  const msg: any = {
    ...rawMsg,
    _id: String(rawMsg._id?.$oid || rawMsg._id || result.rows[0].document_id),
    sentAt: rawMsg.sentAt?.$date ? new Date(Number(rawMsg.sentAt.$date.$numberLong || rawMsg.sentAt.$date)).toISOString() : (rawMsg.sentAt || result.rows[0].sent_at),
    createdAt: rawMsg.createdAt?.$date ? new Date(Number(rawMsg.createdAt.$date.$numberLong || rawMsg.createdAt.$date)).toISOString() : (rawMsg.createdAt || result.rows[0].created_at),
    provider: 'meta'
  };
  
  if (msg.templateHash) {
    if (!templatePayloadCache.has(msg.templateHash)) {
      const payloadRes = await bunnyExecute({ sql: `SELECT payload_json FROM meta_template_payloads_sql WHERE template_hash = ?`, args: [msg.templateHash] });
      if (payloadRes.rows[0]) {
        templatePayloadCache.set(msg.templateHash, parse(payloadRes.rows[0].payload_json, {}));
      }
    }
    const cachedPayload = templatePayloadCache.get(msg.templateHash);
    if (cachedPayload) {
      msg.messageContent = cachedPayload.messageContent;
      msg.media = cachedPayload.media;
    }
  }
  
  return msg;
}

export async function updateBunnyMetaMessage(messageId: string, updates: Record<string, any>) {
  const existing = await getBunnyMetaMessage(messageId);
  if (!existing) return null;
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await upsertBunnyMetaMessage(merged);
  return merged;
}

export async function updateBunnyMetaMessagesMany(filter: { phoneNumber?: string, leadId?: string, direction?: string, statusNot?: string }, updates: Record<string, any>) {
  const clauses = ["provider = 'meta'"];
  const args: any[] = [];
  if (filter.phoneNumber) { clauses.push("phone_number = ?"); args.push(filter.phoneNumber); }
  if (filter.leadId) { clauses.push("lead_id = ?"); args.push(filter.leadId); }
  if (filter.direction) { clauses.push("direction = ?"); args.push(filter.direction); }
  if (filter.statusNot) { clauses.push("status != ?"); args.push(filter.statusNot); }
  
  const result = await bunnyExecute({ sql: `SELECT document_id, sent_at, created_at, data_json FROM meta_messages_sql WHERE ${clauses.join(' AND ')}`, args });
  let modifiedCount = 0;
  for (const row of result.rows) {
    const existing = parse(row.data_json, {});
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await upsertBunnyMetaMessage(merged);
    modifiedCount++;
  }
  return { modifiedCount };
}

export async function deleteBunnyMetaMessage(messageId: string) {
  await bunnyExecute({ sql: "DELETE FROM meta_messages_sql WHERE document_id = ?", args: [messageId] });
  return { deleted: true };
}

export async function getBunnyMetaAnalytics(scope: Record<string, any>, startDate: Date, endDate: Date) {
  // This is a complex one, we'll implement it manually in the analytics route or here.
  // For now, exporting a dummy so the route can use it or we implement logic here.
}
