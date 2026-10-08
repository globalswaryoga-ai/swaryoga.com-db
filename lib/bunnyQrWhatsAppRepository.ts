import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';

export async function initBunnyQrWhatsAppSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS qr_whatsapp_messages_sql (
        message_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        connected_phone TEXT NOT NULL,
        chat_jid TEXT NOT NULL,
        direction TEXT NOT NULL,
        from_me INTEGER NOT NULL,
        text TEXT,
        type TEXT,
        participant TEXT,
        push_name TEXT,
        timestamp INTEGER NOT NULL,
        status INTEGER,
        has_media INTEGER,
        media_url TEXT,
        media_mimetype TEXT,
        media_filename TEXT,
        raw_message TEXT,
        created_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_qr_msg_user_phone ON qr_whatsapp_messages_sql(user_id, connected_phone)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_qr_msg_chat ON qr_whatsapp_messages_sql(chat_jid)`, args: [] },
    
    {
      sql: `CREATE TABLE IF NOT EXISTS qr_whatsapp_chats_sql (
        chat_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        connected_phone TEXT NOT NULL,
        chat_jid TEXT NOT NULL,
        name TEXT,
        is_group INTEGER,
        last_message TEXT,
        last_message_time TEXT,
        last_message_from_me INTEGER,
        unread_count INTEGER,
        conversation_timestamp INTEGER,
        pinned INTEGER,
        archived INTEGER,
        profile_pic_url TEXT,
        created_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_qr_chat_user_phone ON qr_whatsapp_chats_sql(user_id, connected_phone)`, args: [] }
  ]);
}

export async function saveQrMessageToBunny(msg: any) {
  await initBunnyQrWhatsAppSchema();
  await bunnyExecute(
    `INSERT INTO qr_whatsapp_messages_sql (
      message_id, user_id, connected_phone, chat_jid, direction, from_me,
      text, type, participant, push_name, timestamp, status, has_media,
      media_url, media_mimetype, media_filename, raw_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(message_id) DO UPDATE SET
      status = excluded.status,
      media_url = excluded.media_url`,
    [
      msg.messageId, msg.userId, msg.connectedPhone, msg.chatJid, msg.direction, msg.fromMe ? 1 : 0,
      msg.text || '', msg.type || 'text', msg.participant || '', msg.pushName || '', msg.timestamp,
      msg.status || 0, msg.hasMedia ? 1 : 0, msg.mediaUrl || '', msg.mediaMimetype || '',
      msg.mediaFileName || '', JSON.stringify(msg.rawMessage || {}), new Date().toISOString()
    ]
  );
}

export async function saveQrChatToBunny(chat: any) {
  await initBunnyQrWhatsAppSchema();
  const chatId = chat.userId + ':' + chat.connectedPhone + ':' + chat.chatJid;
  await bunnyExecute(
    `INSERT INTO qr_whatsapp_chats_sql (
      chat_id, user_id, connected_phone, chat_jid, name, is_group,
      last_message, last_message_time, last_message_from_me, unread_count,
      conversation_timestamp, pinned, archived, profile_pic_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      last_message = excluded.last_message,
      last_message_time = excluded.last_message_time,
      last_message_from_me = excluded.last_message_from_me,
      conversation_timestamp = excluded.conversation_timestamp,
      unread_count = unread_count + excluded.unread_count,
      name = CASE WHEN excluded.name != '' THEN excluded.name ELSE name END`,
    [
      chatId, chat.userId, chat.connectedPhone, chat.chatJid, chat.name || '', chat.isGroup ? 1 : 0,
      chat.lastMessage || '', chat.lastMessageTime ? new Date(chat.lastMessageTime).toISOString() : new Date().toISOString(),
      chat.lastMessageFromMe ? 1 : 0, chat.unreadCount || 0, chat.conversationTimestamp || 0,
      chat.pinned ? 1 : 0, chat.archived ? 1 : 0, chat.profilePicUrl || '', new Date().toISOString()
    ]
  );
}

export async function getBunnyQrChats(userId: string, connectedPhone: string, limit: number = 1000) {
  const result = await bunnyExecute({
    sql: `SELECT * FROM qr_whatsapp_chats_sql 
          WHERE user_id = ? AND connected_phone = ? 
          ORDER BY conversation_timestamp DESC, created_at DESC 
          LIMIT ?`,
    args: [userId, connectedPhone, limit]
  });
  return result.rows.map((r: any) => ({
    chatId: r.chat_id,
    userId: r.user_id,
    connectedPhone: r.connected_phone,
    chatJid: r.chat_jid,
    name: r.name,
    isGroup: r.is_group === 1,
    lastMessage: r.last_message,
    lastMessageTime: r.last_message_time ? new Date(r.last_message_time) : null,
    lastMessageFromMe: r.last_message_from_me === 1,
    unreadCount: r.unread_count,
    conversationTimestamp: r.conversation_timestamp,
    pinned: r.pinned === 1,
    archived: r.archived === 1,
    profilePicUrl: r.profile_pic_url,
    createdAt: r.created_at ? new Date(r.created_at) : null
  }));
}
